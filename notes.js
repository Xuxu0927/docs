'use strict';
let notes = [];
let language = 'zh';
let failed = false;
const text = {
  zh:{title:'学习笔记',caption:'笔记目录',other:'其他',navigation:'导航',columns:['序号','主题','中文 Markdown','英文 Markdown','中文 PDF','英文 PDF'],error:'目录加载失败'},
  en:{title:'Study Notes',caption:'Notes',other:'Other',navigation:'Navigation',columns:['No.','Topic','Chinese Markdown','English Markdown','Chinese PDF','English PDF'],error:'Unable to load notes'}
};
const fileKeys = ['md_zh','md_en','pdf_zh','pdf_en'];
function validPath(path,key) {
  if(typeof path!=='string')return false;
  const [kind,lang]=key.split('_');
  return path.startsWith(`${kind}/${lang}/`)&&path.endsWith(kind==='md'?'.md':'.pdf')&&!/[\x00-\x1f\x7f<>:"\\|?*%#]/.test(path)&&path.split('/').every(part=>part&&!part.startsWith('.'));
}
function makeTable(items,label) {
  const t=text[language];
  const wrap=document.createElement('div');wrap.className='table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',label);
  const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=label;table.append(caption);
  const head=document.createElement('thead'),columns=document.createElement('tr');
  for(const label of t.columns){const th=document.createElement('th');th.scope='col';th.textContent=label;columns.append(th);}
  head.append(columns);table.append(head);const body=document.createElement('tbody');
  items.forEach((note,index)=>{
    const row=document.createElement('tr');
    for(const value of [String(index+1),note.title[language]||note.title.zh]){const td=document.createElement('td');td.textContent=value;row.append(td);}
    for(const key of fileKeys){
      const td=document.createElement('td');
      if(note[key]){const a=document.createElement('a');a.textContent=key.startsWith('md')?'MD':'PDF';a.href=note[key].split('/').map(encodeURIComponent).join('/');a.download=note[key].split('/').pop();td.append(a);}
      else{td.textContent='—';td.className='missing';}
      row.append(td);
    }
    body.append(row);
  });
  table.append(body);wrap.append(table);return wrap;
}
function render() {
  const t=text[language];document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=t.title;
  document.getElementById('heading').textContent=t.title;document.querySelector('nav').setAttribute('aria-label',t.navigation);
  const button=document.getElementById('language');button.textContent=language==='zh'?'English':'简体中文';button.setAttribute('aria-label',language==='zh'?'Switch to English':'切换为简体中文');
  const groups=new Map();
  for(const note of notes){const key=note.category?.zh||'';if(!groups.has(key))groups.set(key,{category:note.category,items:[]});groups.get(key).items.push(note);}
  if(!groups.size)groups.set('',{items:[]});
  const categorized=notes.some(note=>note.category);
  const container=document.getElementById('categories');container.replaceChildren();
  for(const group of groups.values()){
    const section=document.createElement('section');section.className='category';
    const name=group.category?(group.category[language]||group.category.zh):categorized?t.other:'';
    if(name){const heading=document.createElement('h2');heading.textContent=name;section.append(heading);}
    section.append(makeTable(group.items,name||t.caption));container.append(section);
  }
  const error=document.getElementById('error');error.hidden=!failed;error.textContent=failed?t.error:'';
}
document.getElementById('language').addEventListener('click',()=>{language=language==='zh'?'en':'zh';render();});
render();
fetch('./notes.json',{cache:'no-store'})
  .then(response=>{if(!response.ok)throw new Error();return response.json();})
  .then(data=>{
    if(!Array.isArray(data)||data.some(note=>!note||typeof note.title?.zh!=='string'||!note.title.zh.trim()||(note.title.en!==undefined&&typeof note.title.en!=='string')||(note.category!=null&&(typeof note.category.zh!=='string'||!note.category.zh.trim()||(note.category.en!==undefined&&typeof note.category.en!=='string')))||fileKeys.some(key=>note[key]!=null&&!validPath(note[key],key))))throw new Error();
    notes=data;render();
  })
  .catch(()=>{failed=true;render();});
