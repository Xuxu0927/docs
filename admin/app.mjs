import {FILE_KEYS,prepareUpload,encodeBase64,validateCatalog,restoreDraft,MAX_BATCH_SIZE} from './catalog.mjs';
import {createClient} from './github.mjs';

const $ = id => document.getElementById(id);
const labels = {md_zh:'中文 Markdown',md_en:'英文 Markdown',pdf_zh:'中文 PDF',pdf_en:'英文 PDF'};
let client=null,snapshot=null,notes=[],uploads=new Map(),selected=-1,workingId='',formDirty=false,busy=false;
const picked = new Map(),removed = new Set();
const newId = () => 'note-' + crypto.randomUUID();
const changed = () => snapshot && JSON.stringify(notes)!==JSON.stringify(snapshot.notes) || uploads.size>0;
const pendingUploads = () => {
  const referenced=new Set(notes.flatMap(note=>FILE_KEYS.map(key=>note[key]).filter(Boolean)));
  return [...uploads.values()].filter(upload=>referenced.has(upload.path));
};
function status(message,kind='',link) {
  $('status').className='status'+(kind?' '+kind:'');$('status').textContent=message;
  if(link){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.textContent='查看提交 ↗';$('status').append(a);}
}
function setBusy(value) {
  busy=value;
  for(const control of document.querySelectorAll('button,input'))control.disabled=value;
  $('workspace').inert=value;if(!value)renderList();updateSummary();
}
function updateSummary() {
  $('summary').textContent=`${notes.length} 篇笔记`;
  const count=pendingUploads().length;
  $('pending').textContent=changed()?`有待发布更改${count?' · '+count+' 个文件':''}`:'与仓库保持一致';
  $('publish').disabled=busy||!changed();
}
function discardForm() {return !formDirty || confirm('当前笔记还没有保存到待发布列表，是否放弃这次编辑？');}
function updateFileCard(key) {
  const current=selected>=0?notes[selected]?.[key]:null;
  const file=picked.get(key);
  $('name-'+key).textContent=file?'待上传：'+file.name:removed.has(key)?'此版本已移除，保存后生效':current?'已保存：'+current.split('/').pop():'拖入文件，或点击选择';
  $('remove-'+key).hidden=!file&&(!current||removed.has(key));
}
function openNote(index) {
  if(!discardForm())return;
  selected=index;picked.clear();removed.clear();
  const note=index>=0?notes[index]:null;workingId=note?.id||newId();
  $('title-zh').value=note?.title.zh||'';$('title-en').value=note?.title.en||'';
  $('editor-title').textContent=note?'编辑笔记':'新增笔记';$('editor-mode').textContent=note?'已加入目录':'未保存';
  for(const key of FILE_KEYS){$('file-'+key).value='';updateFileCard(key);}
  formDirty=false;renderList();
}
function renderList() {
  const list=$('note-list');list.replaceChildren();
  if(!notes.length){const div=document.createElement('div');div.className='list-empty';div.textContent='还没有笔记。\n从右侧添加第一篇吧。';list.append(div);}
  notes.forEach((note,index)=>{
    const card=document.createElement('div');card.className='note-item'+(selected===index?' selected':'');
    const select=document.createElement('button');select.type='button';select.className='note-select';select.textContent=`${index+1}. ${note.title.zh}`;select.onclick=()=>openNote(index);card.append(select);
    const actions=document.createElement('div');actions.className='note-actions';
    for(const [text,dir] of [['↑',-1],['↓',1]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',text==='↑'?'上移 '+note.title.zh:'下移 '+note.title.zh);b.disabled=index+dir<0||index+dir>=notes.length;b.onclick=()=>{
      if(!discardForm())return;formDirty=false;const target=index+dir;[notes[index],notes[target]]=[notes[target],notes[index]];
      if(selected===index)selected=target;else if(selected===target)selected=index;
      renderAll();if(selected>=0)openNote(selected);else openNote(-1);
    };actions.append(b);}
    const remove=document.createElement('button');remove.type='button';remove.textContent='移出目录';remove.onclick=()=>{
      if(!discardForm()||!confirm('将这篇笔记移出网站目录？源文件仍保留在仓库中，发布后生效。'))return;
      formDirty=false;notes.splice(index,1);for(const path of uploads.keys())if(!notes.some(n=>FILE_KEYS.some(k=>n[k]===path)))uploads.delete(path);
      openNote(-1);renderAll();
    };actions.append(remove);
    const count=document.createElement('span');count.className='note-count';count.textContent=FILE_KEYS.filter(k=>note[k]).length+'/4';actions.append(count);card.append(actions);list.append(card);
  });
}
function renderPreview() {
  const body=$('preview-body');body.replaceChildren();
  notes.forEach((note,index)=>{const row=document.createElement('tr');for(const text of [index+1,note.title.zh]){const td=document.createElement('td');td.textContent=text;row.append(td);}for(const key of FILE_KEYS){const td=document.createElement('td');td.textContent=note[key]?key.startsWith('md')?'MD':'PDF':'待补充';td.className=note[key]?'available':'unavailable';row.append(td);}body.append(row);});
  if(!notes.length){const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.className='empty-row';td.textContent='暂无笔记，添加后会出现在这里。';row.append(td);body.append(row);}
}
function renderAll(){renderList();renderPreview();updateSummary();}
function buildUploadCards() {
  for(const key of FILE_KEYS){
    const card=document.createElement('div');card.className='upload-card';
    const heading=document.createElement('h4');heading.textContent=labels[key];const name=document.createElement('p');name.id='name-'+key;name.className='file-name';
    const actions=document.createElement('div');actions.className='file-actions';const label=document.createElement('label');label.className='button';label.textContent='选择文件';label.htmlFor='file-'+key;
    const input=document.createElement('input');input.type='file';input.id='file-'+key;input.accept=key.startsWith('md')?'.md':'.pdf';input.className='visually-hidden';input.setAttribute('aria-label',labels[key]+'文件');
    function pick(file){if(!file||busy)return;picked.set(key,file);removed.delete(key);formDirty=true;updateFileCard(key);}
    input.onchange=()=>pick(input.files[0]);label.append(input);
    const clear=document.createElement('button');clear.type='button';clear.id='remove-'+key;clear.textContent='移除';clear.setAttribute('aria-label','移除'+labels[key]);clear.onclick=()=>{picked.delete(key);removed.add(key);input.value='';formDirty=true;updateFileCard(key);};
    actions.append(label,clear);card.append(heading,name,actions);card.ondragover=e=>{e.preventDefault();if(!busy)card.classList.add('dragging');};card.ondragleave=()=>card.classList.remove('dragging');card.ondrop=e=>{e.preventDefault();card.classList.remove('dragging');if(e.dataTransfer.files.length!==1){status('每个版本一次请选择一个文件。','error');return;}pick(e.dataTransfer.files[0]);};$('upload-grid').append(card);
  }
}
$('connect-form').onsubmit=async e=>{
  e.preventDefault();const token=$('token').value.trim();if(!token)return;setBusy(true);status('正在连接 GitHub 并读取目录…');
  const nextClient=createClient(token);$('token').value='';
  try{const loaded=await nextClient.load();client=nextClient;snapshot=loaded;notes=structuredClone(loaded.notes);uploads.clear();$('connection').hidden=true;$('workspace').hidden=false;$('disconnect').hidden=false;formDirty=false;openNote(-1);renderAll();status('已连接仓库。你可以添加笔记并发布更新。','success');}
  catch(error){status(error.message,'error');}finally{setBusy(false);}
};
$('note-form').onsubmit=async e=>{
  e.preventDefault();if(!snapshot)return;setBusy(true);
  try{
    const title=$('title-zh').value.trim(),english=$('title-en').value.trim()||title;
    if(!title)throw new Error('请填写中文标题。');
    const note=selected>=0?structuredClone(notes[selected]):{id:workingId,title:{},...Object.fromEntries(FILE_KEYS.map(k=>[k,null]))};
    note.id=workingId;note.title={zh:title,en:english};const prepared=[];
    for(const key of FILE_KEYS){if(removed.has(key))note[key]=null;if(picked.has(key)){const upload=await prepareUpload(picked.get(key),key,workingId);prepared.push(upload);note[key]=upload.path;}}
    const next=structuredClone(notes);const index=selected>=0?selected:next.length;next[index]=note;
    const nextUploads=new Map(uploads);for(const upload of prepared)nextUploads.set(upload.path,upload);
    const refs=new Set(next.flatMap(n=>FILE_KEYS.map(k=>n[k]).filter(Boolean)));for(const path of nextUploads.keys())if(!refs.has(path))nextUploads.delete(path);
    if([...nextUploads.values()].reduce((n,u)=>n+u.bytes.length,0)>MAX_BATCH_SIZE)throw new Error('待发布文件总大小超过 40 MB，请分批发布。');
    validateCatalog(next,[...snapshot.entries,...[...nextUploads.values()].map(u=>({path:u.path,mode:'100644',type:'blob'}))]);
    notes=next;uploads=nextUploads;formDirty=false;openNote(index);renderAll();status('笔记已保存到待发布列表。确认预览后，点击“发布更新”。','success');
  }catch(error){status(error.message,'error');}finally{setBusy(false);}
};
$('title-zh').oninput=$('title-en').oninput=()=>{formDirty=true;};
$('new').onclick=()=>{openNote(-1);$('title-zh').focus();};
$('reload').onclick=async()=>{
  if((changed()||formDirty)&&!confirm('重新加载会丢弃当前未发布更改。需要保留时，请先点击“备份草稿”。是否继续？'))return;
  setBusy(true);status('正在读取仓库最新内容…');
  try{snapshot=await client.load();notes=structuredClone(snapshot.notes);uploads.clear();formDirty=false;openNote(-1);renderAll();status('已加载最新目录。','success');}catch(error){status(error.message,'error');}finally{setBusy(false);}
};
$('disconnect').onclick=()=>{
  if((changed()||formDirty)&&!confirm('断开后将清空未发布更改，是否继续？'))return;
  client=null;snapshot=null;notes=[];uploads.clear();picked.clear();removed.clear();formDirty=false;$('note-form').reset();$('connection').hidden=false;$('workspace').hidden=true;$('disconnect').hidden=true;status('已断开连接。令牌已从页面中清除。');
};
$('publish').onclick=async()=>{
  if(formDirty){status('请先把当前编辑的笔记保存到待发布列表。','error');return;}
  if(!changed()||!client)return;
  setBusy(true);
  try{snapshot=await client.publish(snapshot,notes,pendingUploads(),message=>status(message));uploads.clear();notes=structuredClone(snapshot.notes);renderAll();status('已发布到仓库。GitHub Pages 通常需要几分钟更新；若尚未启用，请到仓库 Settings → Pages 开启。','success','https://github.com/Xuxu0927/docs/commit/'+snapshot.head);}
  catch(error){status(error.message,'error');}finally{setBusy(false);}
};
$('backup').onclick=()=>{
  if(formDirty){status('请先保存当前笔记，再备份草稿。','error');return;}
  const data={version:1,repository:'Xuxu0927/docs',notes,uploads:pendingUploads().map(u=>({path:u.path,content:encodeBase64(u.bytes)}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='notes-draft-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('草稿已下载到本机，包含待上传的文件；不包含令牌。','success');
};
$('restore').onchange=async()=>{
  const file=$('restore').files[0];$('restore').value='';if(!file)return;
  if((changed()||formDirty)&&!confirm('恢复草稿会替换当前未发布列表，是否继续？'))return;
  setBusy(true);
  try{
    if(file.size>60*1024*1024)throw new Error('草稿文件超过 60 MB。');
    const restored=await restoreDraft(JSON.parse(await file.text()),snapshot.entries);
    notes=restored.notes;uploads=new Map(restored.uploads.map(u=>[u.path,u]));formDirty=false;openNote(-1);renderAll();status('已恢复草稿，请核对目录预览后发布。草稿将替换当前目录。','success');
  }catch(error){status(error instanceof SyntaxError?'草稿文件格式错误。':error.message,'error');}finally{setBusy(false);}
};
window.addEventListener('beforeunload',e=>{if(changed()||formDirty){e.preventDefault();e.returnValue='';}});
buildUploadCards();openNote(-1);
