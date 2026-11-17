(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DialogueText=api})(globalThis,()=>{
 const text=value=>String(value??'').replace(/\r\n?/g,'\n');
 const time=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):text(value);
 function matches(row,{status='',search=''}={}){return (!status||row.status===status)&&(!search||[row.text,row.answer,row.result,row.error].some(value=>text(value).toLowerCase().includes(search.toLowerCase())))}
 function format(rows,names={}){const sorted=[...rows].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||text(a.id).localeCompare(text(b.id)));return '小曼对话记录\n时区：北京时间（UTC+8）\n记录数：'+sorted.length+'\n\n'+sorted.map((r,i)=>['──────── 对话 '+(i+1)+' ────────','时间：'+time(r.at),'用户名称：'+text(names[r.deviceId]||r.deviceName||'未命名用户'),'用户：'+text(r.text||'（无文本）'),'小曼：'+text((['local','ai_control'].includes(r.route)?r.result||r.answer:r.answer||r.result)||'（无文字回复）'),'执行：'+text(r.result||'无'),'异常：'+text(r.error||'无'),'状态：'+(r.status==='error'?'异常':'完成')].join('\n')).join('\n\n')+'\n'}
 return {format,matches};
});
