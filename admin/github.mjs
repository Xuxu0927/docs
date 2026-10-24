import {validateCatalog,generatedFiles,encodeBase64,MAX_BATCH_SIZE} from './catalog.mjs';
const BASE = 'https://api.github.com/repos/Xuxu0927/docs';
const CONFLICT = '仓库内容已发生变化。请先导出草稿，再重新加载最新目录后发布。';

export function createClient(token, fetcher = globalThis.fetch) {
  async function request(path, method = 'GET', body) {
    let response;
    try {
      response = await fetcher(BASE + path, {method, headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(body ? {'Content-Type':'application/json'} : {})}, body:body ? JSON.stringify(body) : undefined, cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(60000)});
    } catch { throw new Error('无法连接 GitHub，请检查网络后重试。'); }
    if (!response.ok) {
      const messages = {401:'令牌无效或已过期，请重新连接。',403:'GitHub 拒绝请求：请检查令牌的 docs 仓库 Contents 读写权限、有效期或请求频率。',404:'无法访问仓库，请确认令牌已授权 Xuxu0927/docs。',409:CONFLICT,422:'GitHub 未接受更新：可能存在分支冲突或保护规则，请重新加载检查。'};
      const error = new Error(messages[response.status] || `GitHub 请求失败（${response.status}），请稍后重试。`);error.status=response.status;throw error;
    }
    return response.json();
  }
  async function readBlob(entry) {
    if (!entry || entry.type !== 'blob' || entry.mode === '120000') throw new Error('仓库缺少必要的目录或模板文件。');
    const blob = await request('/git/blobs/' + entry.sha);
    if (blob.encoding !== 'base64') throw new Error('无法读取仓库文件编码。');
    return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(blob.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
  }
  async function load() {
    const repo = await request('');
    if (repo.archived || !repo.permissions?.push) throw new Error('此令牌或账号没有仓库写入权限。');
    const ref = await request('/git/ref/heads/main');const head = ref.object.sha;
    const commit = await request('/git/commits/' + head);
    const result = await request('/git/trees/' + commit.tree.sha + '?recursive=1');
    if (result.truncated) throw new Error('仓库文件目录过大，无法完整读取。');
    const entries = result.tree;
    const [catalog,template] = await Promise.all([readBlob(entries.find(e=>e.path==='notes.json')),readBlob(entries.find(e=>e.path==='site.html'))]);
    let notes;try { notes=JSON.parse(catalog); } catch { throw new Error('notes.json 格式错误，请先修复仓库目录。'); }
    validateCatalog(notes, entries);
    return {head,tree:commit.tree.sha,entries,notes,template};
  }
  async function publish(snapshot, notes, uploads, progress = ()=>{}) {
    if (uploads.reduce((sum,u)=>sum+u.bytes.byteLength,0) > MAX_BATCH_SIZE) throw new Error('一次发布的文件总大小不能超过 40 MB。');
    const entries = [...snapshot.entries,...uploads.map(u=>({path:u.path,type:'blob',mode:'100644'}))];
    validateCatalog(notes, entries);
    const referenced = new Set(notes.flatMap(n=>['md_zh','md_en','pdf_zh','pdf_en'].map(k=>n[k]).filter(Boolean)));
    if (uploads.some(u=>!referenced.has(u.path)) || new Set(uploads.map(u=>u.path)).size !== uploads.length) throw new Error('上传清单与笔记目录不一致，请重新选择文件。');
    const files = generatedFiles(notes,snapshot.template);
    progress('检查仓库最新版本…');
    const latest = await request('/git/ref/heads/main');if (latest.object.sha !== snapshot.head) throw new Error(CONFLICT);
    const tree = [];
    for (const [i,upload] of uploads.entries()) {
      progress(`上传文件 ${i+1} / ${uploads.length}…`);
      const blob = await request('/git/blobs','POST',{content:encodeBase64(upload.bytes),encoding:'base64'});
      tree.push({path:upload.path,mode:'100644',type:'blob',sha:blob.sha});
    }
    for (const [path,content] of Object.entries(files)) tree.push({path,mode:'100644',type:'blob',content});
    progress('同步表格与网页…');
    const newTree = await request('/git/trees','POST',{base_tree:snapshot.tree,tree});
    const commit = await request('/git/commits','POST',{message:`Update notes via online manager (${notes.length} notes)`,tree:newTree.sha,parents:[snapshot.head]});
    progress('发布到 main 分支…');
    try { await request('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false}); }
    catch (error) {
      if (error.status === 409 || error.status === 422) throw new Error(CONFLICT);
      let confirmed;
      try { confirmed = await request('/git/ref/heads/main'); } catch { throw new Error('未能确认发布结果。请先打开仓库检查最新提交，再重新连接后台，避免重复发布。'); }
      if (confirmed.object.sha !== commit.sha) throw error;
    }
    return {...snapshot,head:commit.sha,tree:newTree.sha,notes:structuredClone(notes),entries};
  }
  return {load,publish};
}
