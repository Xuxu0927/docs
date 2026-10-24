export const defaultColumns=['序号','主题','中文 Markdown','英文 Markdown','中文 PDF','英文 PDF'];
export function localFile(value,extension){
  let path;try{path=decodeURIComponent(value.trim());}catch{throw new Error('文件路径编码无效');}
  if(path.startsWith('./'))path=path.slice(2);
  if(!path.endsWith('.'+extension)||/[\x00-\x1f\x7f<>:"\\|?*#%]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error('请使用仓库内的相对文件路径');
  return path;
}
function cells(line){return line.trim().replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/).map(s=>s.trim().replace(/\\\|/g,'|'));}
export function parseReadme(source){
  const result={title:'',groups:[]};let group=null,fence=null,table=false;
  const lines=source.replace(/\r/g,'').split('\n');
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim(),marker=line.match(/^(`{3,}|~{3,})/);
    if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence=null;continue;}
    if(fence)continue;
    const main=line.match(/^#\s+(.+)$/),category=line.match(/^##\s+(.+)$/);
    if(main){if(!result.title)result.title=main[1];table=false;continue;}
    if(category){group={name:category[1],columns:[...defaultColumns],notes:[]};result.groups.push(group);table=false;continue;}
    const separator=lines[i+1]?.trim();
    if(line.includes('|')&&separator&&cells(separator).length===6&&cells(separator).every(s=>/^:?-{3,}:?$/.test(s))){
      const header=cells(line);if(header.length!==6)throw new Error('目录表格须保留六列');
      if(!group){group={name:'',columns:header,notes:[]};result.groups.push(group);}else if(table)throw new Error('每个分类请使用一张表格');
      group.columns=header;table=true;i++;continue;
    }
    if(!table||!line.includes('|')){if(line)table=false;continue;}
    const row=cells(line);if(row.length!==6)throw new Error('目录行须保留六列');if(row.every(s=>!s))continue;
    if(!row[1])throw new Error('请填写主题名称');
    const files=row.slice(2).map((value,index)=>{
      if(!value||['—','-','待补充','Coming soon'].includes(value))return null;
      const link=value.match(/^\[([^\]]+)\]\((?:<([^>]+)>|([^\s]+))\)$/);
      if(!link)throw new Error('文件单元格请使用 Markdown 链接');
      return{label:link[1],path:localFile(link[2]||link[3],index<2?'md':'pdf')};
    });
    group.notes.push({number:row[0]||String(group.notes.length+1),title:row[1],files});
  }
  return result;
}
