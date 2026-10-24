import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// A DOM test harness, with requests routed to an in-memory GitHub fixture.
// No browser credentials or remote repository writes are used in this test.
test('connect, upload, edit, reorder, publish and disconnect through UI handlers',async()=>{
 const byId=new Map(),all=[];
 class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.files=[];this.attributes={};this.hidden=false;this.disabled=false;this.classList={add(){},remove(){}};all.push(this);}
  set id(value){this._id=value;byId.set(value,this);}get id(){return this._id;}
  append(...children){this.children.push(...children);}replaceChildren(){this.children=[];}
  setAttribute(k,v){this.attributes[k]=v;}focus(){}reset(){}click(){this.onclick?.();}
 }
 const ids=['status','summary','pending','workspace','publish','token','connection','disconnect','connect-form','note-form','title-zh','title-en','editor-title','editor-mode','note-list','preview-body','upload-grid','new','reload','backup','restore'];
 for(const id of ids){const e=new Element();e.id=id;}
 globalThis.document={getElementById:id=>byId.get(id),createElement:tag=>new Element(tag),querySelectorAll:()=>all.filter(e=>['button','input'].includes(e.tagName))};
 let allowConfirm=true;globalThis.window={addEventListener(){}};globalThis.confirm=()=>allowConfirm;
 const template=readFileSync(new URL('../site.html',import.meta.url),'utf8');
 let head='head',lastTree,patches=0;const requests=[];
 const response=value=>new Response(JSON.stringify(value));
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname.replace('/repos/Xuxu0927/docs','');const body=options.body?JSON.parse(options.body):null;requests.push({path,body,options});
  if(path==='')return response({permissions:{push:true}});
  if(path==='/git/ref/heads/main')return response({object:{sha:head}});
  if(path==='/git/commits/head')return response({tree:{sha:'base'}});
  if(path==='/git/trees/base')return response({tree:[{path:'notes.json',sha:'catalog',type:'blob',mode:'100644'},{path:'site.html',sha:'template',type:'blob',mode:'100644'}]});
  if(path==='/git/blobs/catalog')return response({encoding:'base64',content:Buffer.from('[]').toString('base64')});
  if(path==='/git/blobs/template')return response({encoding:'base64',content:Buffer.from(template).toString('base64')});
  if(path==='/git/blobs')return response({sha:'upload'});
  if(path==='/git/trees'){lastTree=body;return response({sha:'new-tree'});}
  if(path==='/git/commits')return response({sha:'new-commit'});
  if(path==='/git/refs/heads/main'){patches++;head=body.sha;return response({});}
  throw Error('Unexpected request '+path);
 };
 await import('../admin/app.mjs');
 const $=id=>byId.get(id),event={preventDefault(){}};
 $('token').value='synthetic-test-token';await $('connect-form').onsubmit(event);
 assert.equal($('token').value,'');assert.equal($('workspace').hidden,false);
 $('title-zh').value='草稿';$('title-zh').oninput();allowConfirm=false;$('new').onclick();assert.equal($('title-zh').value,'草稿');allowConfirm=true;
 $('file-md_zh').files=[new File(['bad'],'wrong.pdf')];$('file-md_zh').onchange();await $('note-form').onsubmit(event);assert.match($('status').textContent,/扩展名/);assert.equal($('title-zh').value,'草稿');assert.equal($('summary').textContent,'0 篇笔记');
 $('remove-md_zh').onclick();await $('note-form').onsubmit(event);assert.equal($('summary').textContent,'1 篇笔记','title-only outlines can be saved');$('note-list').children[0].children[1].children[2].onclick();assert.equal($('summary').textContent,'0 篇笔记');
 $('title-zh').value='第一篇笔记';$('title-zh').oninput();$('file-md_zh').files=[new File(['# 中文'],'学习.md')];$('file-md_zh').onchange();
 await $('note-form').onsubmit(event);
 assert.equal($('summary').textContent,'1 篇笔记');assert.equal($('title-en').value,'第一篇笔记');assert.match($('pending').textContent,/1 个文件/);assert.equal($('publish').disabled,false);
 assert.equal($('note-list').children[0].children[1].children[0].disabled,true,'first note cannot move up');
 $('new').onclick();$('title-zh').value='第二篇';$('title-zh').oninput();$('file-pdf_en').files=[new File(['%PDF-1.7\nfixture'],'paper.pdf')];$('file-pdf_en').onchange();await $('note-form').onsubmit(event);
 assert.equal($('summary').textContent,'2 篇笔记');
 $('note-list').children[1].children[1].children[0].onclick();
 assert.equal($('preview-body').children[0].children[1].textContent,'第二篇');
 await $('publish').onclick();assert.equal(patches,1);assert.match($('status').textContent,/已发布到仓库/);assert.equal($('publish').disabled,true);
 const catalog=JSON.parse(lastTree.tree.find(e=>e.path==='notes.json').content);assert.equal(catalog[0].title.zh,'第二篇');assert.equal(catalog[1].title.zh,'第一篇笔记');assert.equal(lastTree.tree.filter(e=>e.sha==='upload').length,2);
 assert(!JSON.stringify(lastTree).includes('synthetic-test-token'));
 $('disconnect').onclick();assert.equal($('workspace').hidden,true);assert.equal($('connection').hidden,false);
});
