const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('notes.js','utf8');
function node(tag){return {tag,children:[],textContent:'',hidden:true,attributes:{},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,f){this[k]=f}};}
async function page(data){const ids=Object.fromEntries(['heading','language','categories','error'].map(id=>[id,node('div')]));const document={documentElement:{},getElementById:id=>ids[id],createElement:node,querySelector:()=>node('nav')};vm.runInNewContext(script,{document,encodeURIComponent,fetch:async()=>({ok:true,json:async()=>data})});await new Promise(r=>setImmediate(r));return{ids,document};}
(async()=>{
 const data=JSON.parse(fs.readFileSync('notes.json','utf8'));assert.equal(data.length,2);assert(data.every(n=>n.category.zh&&fs.existsSync(n.md_zh)&&fs.existsSync(n.md_en)));
 const {ids,document}=await page(data);assert.equal(ids.categories.children.length,2);
 const heads=()=>ids.categories.children.map(s=>s.children.find(c=>c.tag==='h2')?.textContent);
 assert.deepEqual(heads(),['基础知识','实践记录']);ids.language.click();assert.equal(document.documentElement.lang,'en');assert.deepEqual(heads(),['Fundamentals','Practice']);
 const grouped=await page([data[0],{...data[0],title:{zh:'第二篇',en:'Second'}},data[1]]);assert.equal(grouped.ids.categories.children.length,2);
 const empty=await page([]);assert.equal(empty.ids.categories.children.length,1);assert(!empty.ids.categories.children[0].children.some(c=>c.tag==='h2'));
 const legacy=await page([{title:{zh:'旧笔记'},md_zh:null}]);assert.equal(legacy.ids.error.hidden,true);
 const invalid=await page([{title:{zh:'坏笔记'},category:{zh:123}}]);assert.equal(invalid.ids.error.hidden,false);
 console.log('PASS: categorized bilingual examples, grouped tables, empty/legacy catalogs and validation');
})().catch(e=>{console.error(e);process.exitCode=1});
