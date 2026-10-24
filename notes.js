import {parseReadme,defaultColumns} from './readme.mjs';
let language='zh',failed=false;
let catalog={title:'学习笔记',groups:[]},english=null;
const copy={zh:{title:'学习笔记',navigation:'导航',error:'目录加载失败，请检查 README 表格'},en:{title:'Study Notes',navigation:'Navigation',error:'Unable to load the README tables'}};
const englishColumns=['No.','Topic','Chinese Markdown','English Markdown','Chinese PDF','English PDF'];
function translatedGroup(group){
  if(!english)return null;
  const paths=new Set(group.notes.flatMap(n=>n.files.filter(Boolean).map(f=>f.path)));
  return english.groups.find(g=>g.name===group.name||g.notes.some(n=>n.files.some(f=>f&&paths.has(f.path))));
}
function translatedNote(note,group){return group?.notes.find(n=>n.files.some(f=>f&&note.files.some(o=>o&&o.path===f.path)));}
function render(){
  const t=copy[language],en=language==='en';
  document.documentElement.lang=en?'en':'zh-CN';document.title=en?(english?.title||catalog.title):catalog.title;
  document.getElementById('heading').textContent=document.title;
  document.querySelector('nav').setAttribute('aria-label',t.navigation);
  const button=document.getElementById('language');button.textContent=en?'简体中文':'English';button.setAttribute('aria-label',en?'切换为简体中文':'Switch to English');
  const container=document.getElementById('categories');container.replaceChildren();
  const groups=catalog.groups.length?catalog.groups:[{name:'',columns:defaultColumns,notes:[]}];
  for(const group of groups){
    const translation=en?translatedGroup(group):null,name=translation?.name||group.name;
    const section=document.createElement('section');section.className='category';
    if(name){const h=document.createElement('h2');h.textContent=name;section.append(h);}
    const wrap=document.createElement('div');wrap.className='table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',name||document.title);
    const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=name||document.title;table.append(caption);
    const head=document.createElement('thead'),row=document.createElement('tr');
    for(const label of (en?(translation?.columns||englishColumns):group.columns)){const th=document.createElement('th');th.scope='col';th.textContent=label;row.append(th);}head.append(row);table.append(head);
    const body=document.createElement('tbody');
    for(const note of group.notes){
      const row=document.createElement('tr'),translated=en?translatedNote(note,translation):null;
      for(const value of [note.number,translated?.title||note.title]){const td=document.createElement('td');td.textContent=value;row.append(td);}
      for(const file of note.files){const td=document.createElement('td');if(file){const a=document.createElement('a');a.textContent=file.label;a.href=file.path.split('/').map(encodeURIComponent).join('/');a.download=file.path.split('/').pop();td.append(a);}else{td.textContent='—';td.className='missing';}row.append(td);}
      body.append(row);
    }
    table.append(body);wrap.append(table);section.append(wrap);container.append(section);
  }
  const error=document.getElementById('error');error.hidden=!failed;error.textContent=failed?t.error:'';
}
document.getElementById('language').addEventListener('click',()=>{language=language==='zh'?'en':'zh';render();});
async function read(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error();return parseReadme(await response.text());}
render();
read('./README.md').then(data=>{catalog=data;render();}).catch(()=>{failed=true;render();});
read('./README.en.md').then(data=>{english=data;render();}).catch(()=>{});
