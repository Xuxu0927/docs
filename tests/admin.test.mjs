import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalog, generatedFiles, prepareUpload, encodeBase64, restoreDraft} from '../admin/catalog.mjs';
import {createClient} from '../admin/github.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const note = {id:'note-1',title:{zh:'中文 | <b>标题</b>',en:'English'},md_zh:'md/zh/note-1/中文.md',md_en:null,pdf_zh:null,pdf_en:null};
const entries = [{path:note.md_zh,type:'blob',mode:'100644',sha:'file'}];
const template = '<script id="catalog" type="application/json">__CATALOG__</script>';
test('empty catalog and bilingual generated pages keep six-column table',()=>{
 const f=generatedFiles([],template);assert.match(f['README.md'],/序号.*中文 Markdown.*英文 PDF/);assert.match(f['README.en.md'],/No\..*Chinese Markdown/);assert.match(f['index.html'],/>\[\]</);assert.deepEqual(JSON.parse(f['notes.json']),[]);
});
test('titles cannot break the embedded JSON or Markdown table',()=>{
 const f=generatedFiles([{...note,title:{zh:'</script> | [link](bad)\nnext',en:'English'}}],template);
 assert(!f['index.html'].includes('</script> |'));assert(f['README.md'].includes('&#124;'));assert(!f['README.md'].includes('[link](bad)'));assert.equal(JSON.parse(f['index.html'].match(/>(.*)</)[1])[0].title.zh,'</script> | [link](bad)\nnext');
});
test('rejects traversal, external links, duplicate ids and missing files',()=>{
 for(const path of ['../secret.md','https://example.com/file.md','md/zh/../../x.md','md/zh/x%2f.md','md/zh/x\\y.md'])assert.throws(()=>validateCatalog([{...note,md_zh:path}],entries));
 assert.throws(()=>validateCatalog([note],[]),/文件/);assert.throws(()=>validateCatalog([note,note],entries),/重复/);assert.throws(()=>validateCatalog([{...note,title:{zh:'',en:'ok'}}],entries),/标题/);validateCatalog([note],entries);
});
test('uploads retain Unicode file names and reject wrong content/types/size',async()=>{
 const md=new File(['# 中文'],'中文.md');const upload=await prepareUpload(md,'md_zh','note-1');assert.equal(upload.path,note.md_zh);assert.equal(new TextDecoder().decode(upload.bytes),'# 中文');
 await assert.rejects(prepareUpload(new File(['bad'],'x.pdf'),'pdf_zh','note-1'),/PDF/);
 await assert.rejects(prepareUpload(new File([new Uint8Array([255])],'x.md'),'md_zh','note-1'),/UTF-8/);
 await assert.rejects(prepareUpload(new File(['x'],'x.html'),'md_zh','note-1'),/扩展名/);
 await assert.rejects(prepareUpload({name:'large.pdf',size:21*1024*1024},'pdf_zh','note-1'),/20 MB/);
 const pdf=await prepareUpload(new File(['%PDF-1.7\n...'],'x.pdf'),'pdf_zh','note-1');assert.equal(atob(encodeBase64(pdf.bytes)),'%PDF-1.7\n...');
});
test('draft restore round-trips files and rejects duplicates and unreferenced uploads',async()=>{
 const upload=await prepareUpload(new File(['# 中文'],'中文.md'),'md_zh','note-1');
 const draft={version:1,repository:'Xuxu0927/docs',notes:[note],uploads:[{path:upload.path,content:encodeBase64(upload.bytes)}]};
 const result=await restoreDraft(draft,[]);assert.deepEqual(result.notes,[note]);assert.deepEqual(result.uploads[0].bytes,upload.bytes);
 await assert.rejects(restoreDraft({...draft,uploads:[...draft.uploads,...draft.uploads]},[]),/重复/);
 await assert.rejects(restoreDraft({...draft,notes:[]},[]),/目录/);
 await assert.rejects(restoreDraft({...draft,repository:'other/repo'},[]),/草稿/);
 const empty={...note,md_zh:null};validateCatalog([empty],[]);
});

function server({conflict=false,race=false,timeoutAfterPatch=false}={}){
 let head=conflict?'other':'head';const calls=[];let tree,commit;
 const fetcher=async(url,options={})=>{
  const path=new URL(url).pathname.replace('/repos/Xuxu0927/docs','');const body=options.body?JSON.parse(options.body):null;calls.push({url,path,options,body});let result;
  if(path==='/git/ref/heads/main')result={object:{sha:head}};
  else if(path==='/git/blobs'&&options.method==='POST')result={sha:'upload'};
  else if(path==='/git/trees'&&options.method==='POST'){tree=body;result={sha:'newtree'};}
  else if(path==='/git/commits'&&options.method==='POST'){commit=body;result={sha:'newcommit'};}
  else if(path==='/git/refs/heads/main'){if(race)return new Response('{}',{status:422});head=body.sha;if(timeoutAfterPatch)throw new Error('network');result={object:{sha:head}};}
  else throw new Error('Unexpected request '+path);
  return new Response(JSON.stringify(result),{status:200});
 };return {fetcher,calls,getTree:()=>tree,getCommit:()=>commit};
}
const snapshot={head:'head',tree:'base-tree',notes:[],entries,template};
test('atomic publish preserves base tree, Unicode bytes and unrelated files; never forces',async()=>{
 const s=server();const c=createClient('secret-test',s.fetcher);const upload=await prepareUpload(new File(['# 中文'],'中文.md'),'md_zh','note-1');const result=await c.publish(snapshot,[note],[upload]);
 assert.equal(result.head,'newcommit');assert.equal(s.getTree().base_tree,'base-tree');assert.deepEqual(s.getCommit().parents,['head']);
 for(const path of ['notes.json','README.md','README.en.md','index.html',note.md_zh])assert(s.getTree().tree.some(e=>e.path===path));
 assert.equal(s.calls.find(c=>c.path==='/git/refs/heads/main').body.force,false);
 assert(s.calls.every(c=>c.url.startsWith('https://api.github.com/repos/Xuxu0927/docs/')));
 assert(s.calls.every(c=>!c.options.body?.includes('secret-test')));
});
test('upstream changes block publishing before any write',async()=>{
 const s=server({conflict:true});await assert.rejects(createClient('token',s.fetcher).publish(snapshot,[],[]),/变化/);assert(s.calls.every(c=>(c.options.method||'GET')==='GET'));
});
test('a race at the final update reports conflict instead of overwriting',async()=>{
 const s=server({race:true});await assert.rejects(createClient('token',s.fetcher).publish(snapshot,[],[]),/变化|冲突/);
});
test('network failure after successful ref update is checked before retrying',async()=>{
 const s=server({timeoutAfterPatch:true});const result=await createClient('token',s.fetcher).publish(snapshot,[],[]);assert.equal(result.head,'newcommit');
});
test('authorization failures explain permissions without echoing the token',async()=>{
 for(const status of [401,403,404]){const c=createClient('secret-test',async()=>new Response('{}',{status}));await assert.rejects(c.load(),e=>!e.message.includes('secret-test')&&/令牌|权限|仓库/.test(e.message));}
});

test('online generated READMEs and catalog match the local Python builder',()=>{
 const root=mkdtempSync(join(tmpdir(),'notes-build-'));
 try{
  mkdirSync(join(root,'tools'));mkdirSync(join(root,'md/zh/note-1'),{recursive:true});
  copyFileSync(new URL('../tools/build.py',import.meta.url),join(root,'tools/build.py'));
  writeFileSync(join(root,note.md_zh),'# 笔记');writeFileSync(join(root,'site.html'),template);writeFileSync(join(root,'notes.json'),JSON.stringify([note]));
  execFileSync('python',[join(root,'tools/build.py')]);
  const online=generatedFiles([note],template);
  for(const file of ['README.md','README.en.md'])assert.equal(readFileSync(join(root,file),'utf8').replace(/\r\n/g,'\n'),online[file]);
  const localPayload=readFileSync(join(root,'index.html'),'utf8').match(/>(.*)</)[1];assert.deepEqual(JSON.parse(localPayload),JSON.parse(online['index.html'].match(/>(.*)</)[1]));
 }finally{assert(root.startsWith(join(tmpdir(),'notes-build-')));rmSync(root,{recursive:true,force:true});}
});
