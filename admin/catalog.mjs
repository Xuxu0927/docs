export const FILE_KEYS = ['md_zh', 'md_en', 'pdf_zh', 'pdf_en'];
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_BATCH_SIZE = 40 * 1024 * 1024;

function validPath(path, key) {
  const [kind, lang] = key.split('_');
  return typeof path === 'string' && path.startsWith(`${kind}/${lang}/`) &&
    path.endsWith(`.${kind === 'md' ? 'md' : 'pdf'}`) &&
    !/[\x00-\x1f\x7f<>:"\\|?*%#]/.test(path) &&
    path.split('/').every(part => part && !part.startsWith('.') && part.trim() === part);
}

export function validateCatalog(notes, entries) {
  if (!Array.isArray(notes) || notes.length > 2000) throw new Error('笔记目录格式错误或超过 2000 篇。');
  const files = new Map(entries.filter(e => e.type === 'blob' && e.mode !== '120000').map(e => [e.path, e]));
  const ids = new Set();
  for (const note of notes) {
    if (!note || typeof note !== 'object') throw new Error('笔记格式错误。');
    for (const lang of ['zh', 'en']) {
      if (typeof note.title?.[lang] !== 'string' || !note.title[lang].trim() || note.title[lang].length > 200) throw new Error('请填写标题（每种语言最多 200 字）。');
    }
    if (note.id !== undefined) {
      if (typeof note.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(note.id)) throw new Error('笔记编号格式错误。');
      if (ids.has(note.id)) throw new Error('笔记编号重复。');
      ids.add(note.id);
    }
    for (const key of FILE_KEYS) {
      const path = note[key];
      if (path === null || path === undefined) continue;
      if (!validPath(path, key)) throw new Error('文件路径或扩展名不正确。');
      if (!files.has(path)) throw new Error(`目录中的文件不存在：${path}`);
    }
  }
}

export function encodeBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

export async function prepareUpload(file, key, id) {
  if (!FILE_KEYS.includes(key) || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)) throw new Error('上传目标无效。');
  if (file.size > MAX_FILE_SIZE) throw new Error('单个文件不能超过 20 MB。');
  if (!file.size) throw new Error('不能上传空文件。');
  const [kind, lang] = key.split('_');
  const ext = kind === 'md' ? 'md' : 'pdf';
  if (!file.name.toLowerCase().endsWith(`.${ext}`)) throw new Error(`扩展名应为 .${ext}。`);
  const name = file.name.normalize('NFC').replace(/[\x00-\x1f\x7f<>:"/\\|?*%#]/g, '-').replace(/^\.+/, '').trim().replace(/\.(md|pdf)$/i, `.${ext}`);
  const path = `${kind}/${lang}/${id}/${name}`;
  if (name.length > 160 || !validPath(path, key)) throw new Error('文件名过长或无效，请重命名后上传。');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (ext === 'md') {
    try { const text = new TextDecoder('utf-8', {fatal:true}).decode(bytes); if (text.includes('\0')) throw new Error(); }
    catch { throw new Error('Markdown 文件必须是 UTF-8 编码的文本。'); }
  } else if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new Error('此文件不是有效的 PDF 格式。');
  return {path, bytes};
}

export async function restoreDraft(data, entries) {
  if(data?.version!==1||data.repository!=='Xuxu0927/docs'||!Array.isArray(data.uploads))throw new Error('此文件不是本后台的草稿。');
  const paths=new Set();
  for(const item of data.uploads){
    if(typeof item?.path!=='string'||typeof item.content!=='string')throw new Error('草稿文件格式错误。');
    if(paths.has(item.path))throw new Error('草稿中存在重复文件路径。');paths.add(item.path);
  }
  validateCatalog(data.notes,[...entries,...[...paths].map(path=>({path,mode:'100644',type:'blob'}))]);
  const referenced=new Set(data.notes.flatMap(note=>FILE_KEYS.map(key=>note[key]).filter(Boolean)));
  if([...paths].some(path=>!referenced.has(path)))throw new Error('草稿中存在未收录到目录的上传文件。');
  const uploads=[];let size=0;
  for(const item of data.uploads){
    const parts=item.path.split('/');if(parts.length!==4)throw new Error('草稿文件路径错误。');
    let bytes;try{bytes=Uint8Array.from(atob(item.content),c=>c.charCodeAt(0));}catch{throw new Error('草稿中的文件编码无效。');}
    size+=bytes.length;if(size>MAX_BATCH_SIZE)throw new Error('草稿文件总大小超过 40 MB。');
    const upload=await prepareUpload(new File([bytes],parts[3]),parts[0]+'_'+parts[1],parts[2]);
    if(upload.path!==item.path)throw new Error('草稿文件路径不匹配。');uploads.push(upload);
  }
  return {notes:structuredClone(data.notes),uploads};
}

const tableText = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;').replace(/[\r\n]/g, ' ');
const encodedPath = path => path.split('/').map(p => encodeURIComponent(p).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())).join('/');
function readme(notes, lang) {
  const zh = lang === 'zh';
  const headers = zh ? ['序号','主题','中文 Markdown','英文 Markdown','中文 PDF','英文 PDF'] : ['No.','Topic','Chinese Markdown','English Markdown','Chinese PDF','English PDF'];
  const lines = [zh ? '# 学习笔记' : '# Study Notes', '', zh ? '**简体中文** | [English](README.en.md)' : '[简体中文](README.md) | **English**', '', zh ? '个人学习笔记与资料整理，持续更新。' : 'Personal study notes and learning materials.', '', '| ' + headers.join(' | ') + ' |', '|---|---|---|---|---|---|'];
  notes.forEach((note,i) => {
    const cells = [String(i+1),tableText(note.title[lang])];
    for (const key of FILE_KEYS) cells.push(note[key] ? `[${key.startsWith('md') ? 'MD' : 'PDF'}](${encodedPath(note[key])})` : zh ? '待补充' : 'Coming soon');
    lines.push('| ' + cells.join(' | ') + ' |');
  });
  lines.push('', notes.length ? '' : zh ? '暂无笔记，后续持续更新。' : 'No notes yet. More to come.', '', zh ? '[添加笔记与网站发布说明](GUIDE.md)' : '[Adding notes and publishing](GUIDE.md)', '');
  return lines.join('\n');
}

export function generatedFiles(notes, template) {
  if (template.split('__CATALOG__').length !== 2) throw new Error('网站模板缺少唯一目录标记，请检查 site.html。');
  const payload = JSON.stringify(notes).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return {'notes.json':JSON.stringify(notes,null,2)+'\n', 'index.html':template.replace('__CATALOG__',()=>payload), 'README.md':readme(notes,'zh'), 'README.en.md':readme(notes,'en')};
}
