(function(root,factory){if(typeof module==='object')module.exports=factory();else root.LogView=factory()})(globalThis,()=>{
 'use strict';const PAGE_SIZE=90,beijing=n=>new Date(n+8*3600000).toISOString().slice(0,19);
 function range(mode,start,end,now=Date.now()){
  if(mode==='all')return {all:'1'};
  if(mode==='week'||mode==='month')return {start:new Date(now-(mode==='week'?7:30)*86400000).toISOString(),end:new Date(now).toISOString()};
  if(mode==='today'){const day=beijing(now).slice(0,10);return {start:day+'T00:00:00+08:00',end:day+'T23:59:59.999+08:00'}}
  if(mode!=='custom'||!start||!end)throw Error('请填写完整的北京时间起止时间');
  const a=Date.parse(start+'+08:00'),b=Date.parse(end+'+08:00');
  if(!Number.isFinite(a)||!Number.isFinite(b)||beijing(a).slice(0,start.length)!==start||beijing(b).slice(0,end.length)!==end||a>b)throw Error('起止时间无效，开始时间不能晚于结束时间');
  return {start:new Date(a).toISOString(),end:new Date(b).toISOString()};
 }
 return {PAGE_SIZE,range,beijing};
});
