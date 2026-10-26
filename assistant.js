'use strict';
// Reuses the endpoint and request contract in the original LEDMAN.html.
const WORKER_URL = 'https://1255468956-lz8he75wor.ap-guangzhou.tencentscf.com';
const MODEL = 'doubao-seed-2-0-mini-260428';
const SYSTEM_PROMPT = `你是「雷曼家庭巨幕墙智能管家」。全程中文，自然、温暖、简短克制，通常1到3句话、80字以内，不使用Markdown、列表或表情。可介绍空调、灯光、窗帘、音响、巨幕等设备及观影、睡眠、会客场景。当前接口仅提供文字对话，没有设备控制、传感器或实时资讯数据。不要编造设备操作成功、温湿度、天气或新闻；涉及这些请求时，简洁说明需要连接相应设备或数据源，可以给出合适的设置建议。`;
const $ = id => document.getElementById(id);
const canvas = $('particles'), ctx = canvas.getContext('2d');
const colors = [[106,232,204],[123,179,247],[237,193,128]];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let state = 'idle', mode = 'orbit', targetMode = 'orbit', morph = 1, energy = .04;
let analyser = null, audioContext = null, mediaStream = null, samples = null;
let history = [], request = null, generation = 0, speakingToken = 0, typingTimer = null;
let ttsEnabled = true, voices = [], voiceIndex = 0, recognition = null, listening = false, micStarting = false, micEpoch = 0;
let previewUntil = 0, lastFrame = 0, frameId = 0, toastTimer, speechTimer, width = 600, height = 360;
const synth = window.speechSynthesis;
const particles = Array.from({length: innerWidth < 700 ? 1900 : 3400}, (_,i) => ({u:Math.random()*Math.PI*2,v:Math.random()*Math.PI*2,r:Math.random(),size:.45+Math.random()*.85,color:i%3,phase:Math.random()*Math.PI*2}));
const bars = Array.from({length:25},()=>{const b=document.createElement('i');$('signal').appendChild(b);return b;});
function notify(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function setState(next){state=next;const labels={idle:'STANDBY · 静候您的声音',listening:'LISTENING · 正在聆听',thinking:'THINKING · 正在为您思考',speaking:'SPEAKING · 与您共鸣',error:'RECONNECT · 请稍后重试'};$('stateLabel').textContent=labels[next];$('connection').textContent=next==='thinking'?'正在连接':next==='error'?'连接异常':'系统就绪';$('signalCaption').textContent=next==='listening'?'LIVE MICROPHONE':next==='speaking'?'SPEECH ANIMATION':'AUDIO REACTIVE';$('audioNote').textContent=next==='speaking'?'播报韵律 · 视觉模拟':'声之所至，光之所随';}
function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe(canvas);
function shape(p,kind,t){
 const u=p.u,v=p.v,layer=p.color;
 if(kind==='orbit'){const ring=1.04+.16*Math.sin(v*3+u*2+t*.25)+.09*(p.r-.5),tube=.23*Math.sin(v)+.06*Math.sin(u*5+t*.5+p.phase);const x=(ring+tube)*Math.cos(u),z=(ring+tube)*Math.sin(u),y=.26*Math.cos(v)+.09*Math.sin(u*3+t*.3),tilt=.47+layer*.13;return[x,y*Math.cos(tilt)-z*Math.sin(tilt),y*Math.sin(tilt)+z*Math.cos(tilt)];}
 if(kind==='fluid'){const x=(u/Math.PI-1)*1.45,wave=Math.sin(x*2.5+t*.7+layer*1.5)*.24+Math.sin(x*4-t*.5)*.12;return[x,wave+Math.cos(v)*.13+(layer-1)*.14,Math.sin(v)*.33+(p.r-.5)*.3];}
 const phi=Math.acos(2*p.r-1),radius=.9+.15*Math.sin(u*3+phi*4+t*.4+layer)+.07*Math.sin(v*5);return[radius*Math.sin(phi)*Math.cos(u),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(u)];
}
function frame(ms){
 frameId=requestAnimationFrame(frame);if(ms-lastFrame<(reducedMotion.matches?66:30))return;lastFrame=ms;
 let level=0;const t=ms*.001;
 if(analyser&&samples){analyser.getByteTimeDomainData(samples);let sum=0;for(const n of samples)sum+=((n-128)/128)**2;level=Math.min(1,Math.sqrt(sum/samples.length)*5.5);}
 // SpeechSynthesis does not expose its waveform. Playback animation is a rhythm simulation.
 if(state==='speaking')level=.15+Math.abs(Math.sin(t*7.3)*Math.sin(t*4.1))*.6;
 if(ms<previewUntil)level=Math.max(level,.1+Math.abs(Math.sin(t*5.7)*Math.sin(t*2.9))*.7);
 energy+=(Math.max(level,.045+Math.sin(t*.9)*.022)-energy)*.13;
 document.documentElement.style.setProperty('--energy',energy.toFixed(3));bars.forEach((bar,i)=>bar.style.height=`${3+energy*24*(.3+.7*Math.abs(Math.sin(i*.68+t*3)))}px`);
 if(!ctx)return;ctx.clearRect(0,0,width,height);
 const scale=Math.min(width*.258,height*.39),rotation=reducedMotion.matches?.35:t*.075;
 if(morph<1)morph=Math.min(1,morph+.025);const mix=morph*morph*(3-2*morph),speed=reducedMotion.matches?.15:t,active=1+energy*(reducedMotion.matches?.05:.23);
 const glow=ctx.createRadialGradient(width/2,height*.48,0,width/2,height*.48,scale*1.6);glow.addColorStop(0,`rgba(60,151,155,${.025+energy*.035})`);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
 ctx.strokeStyle='rgba(113,183,184,.08)';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(width/2,height*.83,scale*1.2,scale*.13,0,0,Math.PI*2);ctx.stroke();ctx.globalCompositeOperation='lighter';
 for(const p of particles){const a=shape(p,mode,speed),b=mode===targetMode?a:shape(p,targetMode,speed);let x=a[0]+(b[0]-a[0])*mix,y=a[1]+(b[1]-a[1])*mix,z=a[2]+(b[2]-a[2])*mix;const ripple=1+energy*.12*Math.sin(p.u*7-t*8+p.color);x*=ripple;y*=ripple;const rx=x*Math.cos(rotation)-z*Math.sin(rotation),rz=x*Math.sin(rotation)+z*Math.cos(rotation),depth=3.8/(3.8-rz),px=width/2+rx*scale*depth*active,py=height*.46+y*scale*depth*active,rgb=colors[p.color],alpha=Math.max(.12,Math.min(.85,(rz+1.9)/4.7))*(.75+energy*.35);ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;ctx.beginPath();ctx.arc(px,py,p.size*depth*(1+energy*.25),0,Math.PI*2);ctx.fill();if(p.r>.975){ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},.035)`;ctx.beginPath();ctx.arc(px,py,p.size*depth*4,0,Math.PI*2);ctx.fill();}}
 ctx.globalCompositeOperation='source-over';if(morph===1)mode=targetMode;
}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{if(morph<1)mode=targetMode;targetMode=button.dataset.mode;morph=0;previewUntil=performance.now()+3500;document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(frameId);else{lastFrame=0;frameId=requestAnimationFrame(frame);}});frameId=requestAnimationFrame(frame);
function updateClock(){$('clock').textContent=new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).replaceAll('/',' . ');}updateClock();setInterval(updateClock,10000);
function loadVoices(){voices=(synth?.getVoices()||[]).filter(v=>v.lang.toLowerCase().startsWith('zh'));voiceIndex%=Math.max(1,voices.length);}if(synth){loadVoices();synth.addEventListener('voiceschanged',loadVoices);}
function stopSpeak(){speakingToken++;clearTimeout(speechTimer);synth?.cancel();if(state==='speaking')setState('idle');}
function speak(text){stopSpeak();if(!ttsEnabled||!synth)return;const token=speakingToken,utter=new SpeechSynthesisUtterance(text.replace(/（[^）]*）/g,''));utter.lang='zh-CN';utter.rate=1;utter.pitch=1;if(voices[voiceIndex])utter.voice=voices[voiceIndex];utter.onstart=()=>{if(token===speakingToken){setState('speaking');speechTimer=setTimeout(()=>{if(token===speakingToken)stopSpeak();},90000);}};const done=()=>{if(token===speakingToken){clearTimeout(speechTimer);if(state==='speaking')setState('idle');}};utter.onend=done;utter.onerror=done;synth.speak(utter);}
$('ttsBtn').addEventListener('click',()=>{ttsEnabled=!ttsEnabled;$('ttsBtn').setAttribute('aria-pressed',String(ttsEnabled));$('ttsBtn').setAttribute('aria-label',ttsEnabled?'关闭语音播报':'开启语音播报');if(!ttsEnabled)stopSpeak();else notify('语音播报已开启');});
$('voiceSwitchBtn').addEventListener('click',()=>{loadVoices();if(voices.length<2){notify(voices.length?'当前设备仅提供一种中文音色':'当前设备没有可用的中文音色');return;}voiceIndex=(voiceIndex+1)%voices.length;notify('当前音色：'+voices[voiceIndex].name);speak('你好，很高兴继续陪伴你。');});
function busy(on){$('input').disabled=on;$('sendBtn').disabled=on;$('micBtn').disabled=on;document.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=on);}
function renderText(text,token){return new Promise(resolve=>{let i=0;const chars=Array.from(text);$('aiText').textContent='';$('aiText').classList.add('response');function step(){if(token!==generation){resolve();return;}const fragment=document.createDocumentFragment();for(let j=0;j<(reducedMotion.matches?chars.length:2)&&i<chars.length;j++,i++){const span=document.createElement('span');span.className='char';span.textContent=chars[i];fragment.appendChild(span);}$('aiText').appendChild(fragment);$('aiText').scrollTop=$('aiText').scrollHeight;if(i<chars.length)typingTimer=setTimeout(step,26);else resolve();}step();});}
async function send(value){
 const text=(typeof value==='string'?value:$('input').value).trim();if(!text||request)return;stopListening(true);stopSpeak();const token=++generation,controller=new AbortController();request=controller;const timeout=setTimeout(()=>controller.abort('timeout'),30000);
 $('input').value='';$('userEcho').textContent='你说 · '+text;$('subtitle').textContent='正在连接家的每一份灵感';$('aiText').textContent='让我想一想…';$('aiText').classList.remove('response');setState('thinking');busy(true);const messages=[...history,{role:'user',content:text}];
 try{const response=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({model:MODEL,messages:[{role:'system',content:SYSTEM_PROMPT},...messages],stream:false,temperature:.85,max_tokens:600})});if(!response.ok)throw new Error('HTTP '+response.status);const json=await response.json(),full=json.choices?.[0]?.message?.content;if(typeof full!=='string'||!full.trim())throw new Error('Empty response');if(token!==generation)return;clearTimeout(timeout);history=[...messages,{role:'assistant',content:full}].slice(-12);setState('idle');$('subtitle').textContent='雷曼 · 陪伴每一种生活';await renderText(full,token);if(token===generation)speak(full);
 }catch(error){if(token!==generation)return;setState('error');$('subtitle').textContent='请检查网络连接，稍后再试';await renderText('连接暂时没有回应，再试一次好吗？',token);
 }finally{clearTimeout(timeout);if(token===generation){request=null;busy(false);$('input').focus();}}
}
$('composer').addEventListener('submit',event=>{event.preventDefault();send();});document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>send(button.dataset.prompt)));
$('newChatBtn').addEventListener('click',()=>{generation++;request?.abort();request=null;stopListening(true);stopSpeak();clearTimeout(typingTimer);history=[];busy(false);setState('idle');$('aiText').classList.remove('response');$('aiText').textContent='一声呼唤，家的回应。';$('subtitle').textContent='我是雷曼，让美好生活，自然发生。';$('userEcho').textContent='';$('input').value='';notify('新的对话，新的灵感');});
function releaseAudio(){analyser=null;samples=null;mediaStream?.getTracks().forEach(track=>track.stop());mediaStream=null;if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}}
function stopListening(cancel=false){micEpoch++;micStarting=false;if(recognition){recognition.onend=null;recognition.onerror=null;recognition.onresult=null;try{recognition.abort();}catch{}recognition=null;}listening=false;releaseAudio();$('micBtn').classList.remove('recording');$('micBtn').setAttribute('aria-pressed','false');$('micBtn').setAttribute('aria-label','开始语音输入');if(state==='listening')setState('idle');if(!cancel&&$('input').value.trim())send();}
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
$('micBtn').addEventListener('click',async()=>{
 if(listening||micStarting){stopListening(false);return;}if(!SpeechRecognition){notify('此浏览器暂不支持语音识别，请使用 Edge / Chrome 或文字输入');return;}if(!navigator.mediaDevices?.getUserMedia){notify('语音输入需要 HTTPS 或 localhost 安全环境');return;}stopSpeak();micStarting=true;const epoch=++micEpoch;$('input').value='';
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});if(epoch!==micEpoch){stream.getTracks().forEach(t=>t.stop());return;}mediaStream=stream;const AudioCtx=window.AudioContext||window.webkitAudioContext;if(AudioCtx){audioContext=new AudioCtx();await audioContext.resume();if(epoch!==micEpoch)return;analyser=audioContext.createAnalyser();analyser.fftSize=512;samples=new Uint8Array(analyser.fftSize);audioContext.createMediaStreamSource(stream).connect(analyser);}recognition=new SpeechRecognition();recognition.lang='zh-CN';recognition.continuous=false;recognition.interimResults=true;recognition.onresult=event=>{let transcript='';for(let i=0;i<event.results.length;i++)transcript+=event.results[i][0].transcript;$('input').value=transcript;$('userEcho').textContent='正在聆听 · '+transcript;};recognition.onend=()=>stopListening(false);recognition.onerror=event=>{const msg=event.error==='not-allowed'?'请允许麦克风权限后再试':event.error==='no-speech'?'没有听清您的声音，请再试一次':'语音识别暂不可用，请使用文字输入';stopListening(true);notify(msg);};recognition.start();micStarting=false;listening=true;setState('listening');$('micBtn').classList.add('recording');$('micBtn').setAttribute('aria-pressed','true');$('micBtn').setAttribute('aria-label','结束语音并发送');
 }catch(error){if(epoch!==micEpoch)return;stopListening(true);notify(error.name==='NotAllowedError'?'请在浏览器中允许麦克风权限':'无法启动麦克风，请检查设备后重试');}
});
if(!SpeechRecognition)$('inputNote').textContent='当前浏览器支持文字对话 · 语音输入请使用 Edge / Chrome';if(!synth){ttsEnabled=false;$('ttsBtn').disabled=true;$('ttsBtn').setAttribute('aria-pressed','false');}
window.addEventListener('pagehide',()=>{request?.abort();stopListening(true);stopSpeak();cancelAnimationFrame(frameId);});
