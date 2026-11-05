(() => {
 'use strict';
 const $=s=>document.querySelector(s),R=window.ClimbingRenderer,S=window.ClimbingSolver,E=window.ClimbingExamples;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={lh:'左手',rh:'右手',lf:'左脚',rf:'右脚'},limbs=Object.keys(names),storageKey='climbing-guide-beta-v1';
 const clone=x=>JSON.parse(JSON.stringify(x)),board=$('#wall-board');
 const example=()=>E.example();
 let input=example(),selected=null,tool='select',history=[],routes=[],activeRoute=0,step=0,playing=false,raf=0,animationStart=0,drag=null,worker=null,job=0,working=false,diagnostic=null,photoUI=null;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 function normalize(raw){const x=raw.layout||raw;if(!x||typeof x!=='object'||!Array.isArray(x.holds)||x.holds.length>24)throw Error('点位文件格式不正确，最多支持24个岩点。');
  const out={width:Number(x.width),height:Number(x.height),bodyHeight:Number(x.bodyHeight),armSpan:Number(x.armSpan),holds:[],starts:{},finish:x.finish||null};
  for(const [k,min,max] of [['width',1,6],['height',1.5,6],['bodyHeight',1,2.3],['armSpan',1,2.5]])if(!Number.isFinite(out[k])||out[k]<min||out[k]>max)throw Error('墙面或身体尺寸超出可用范围。');
  const ids=new Set();out.holds=x.holds.map(h=>{if(!h||typeof h.id!=='string'||!/^[A-Za-z0-9_-]{1,20}$/.test(h.id)||ids.has(h.id)||!['hand','foot','both'].includes(h.type))throw Error('岩点编号或类型无效。');ids.add(h.id);const p={id:h.id,x:Number(h.x),y:Number(h.y),type:h.type};if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>out.width||p.y<0||p.y>out.height)throw Error('岩点位置必须在墙面范围内。');return p;});
  for(const l of limbs){out.starts[l]=x.starts?.[l]||null;if(out.starts[l]&&!ids.has(out.starts[l]))throw Error('起点引用了不存在的岩点。');}if(out.finish&&!ids.has(out.finish))throw Error('终点不存在。');return out;
 }
 let restored=false,migrated=false;try{const raw=localStorage.getItem(storageKey);if(raw){const saved=JSON.parse(raw),previous=normalize(saved),result=E.restore(previous,saved.exampleRevision);input=result.layout;restored=true;migrated=result.migrated;if(migrated)history.push(previous);save();}}catch{}
 function save(){try{localStorage.setItem(storageKey,JSON.stringify({version:1,exampleRevision:E.revision,layout:input}));}catch{}}
 function status(text,error=false){$('#solver-status').textContent=text;$('#solver-status').classList.toggle('error',error);}
 function stop(){playing=false;cancelAnimationFrame(raf);$('#play-route').textContent='播放动作';if(routes[activeRoute])updateStep();}
 function invalidate(message='点位已更新。重新生成后查看对应解法。'){stop();routes=[];diagnostic=null;renderEmpty();step=0;job++;working=false;if(worker){worker.terminate();worker=null;}$('#solve-route').disabled=false;$('#solve-route').innerHTML='生成候选解法 <span>↗</span>';$('#result-content').hidden=true;$('#result-empty').hidden=false;status(message);}
 function record(){history.push(clone(input));if(history.length>30)history.shift();}
 function change(fn){record();invalidate();fn();save();render();}
 function selectHold(id){selected=id;renderFields();renderBoard();}
 function renderFields(){const h=input.holds.find(h=>h.id===selected);$('#hold-count').textContent=`${input.holds.length} / 24 点`;$('#scale-summary').textContent=`当前墙面 ${input.width} × ${input.height} 米 · 身高 ${Math.round(input.bodyHeight*100)} cm · 臂展 ${Math.round(input.armSpan*100)} cm。岩点距离会按这个标尺计算。`;
  $('#selected-hold').innerHTML=input.holds.length?input.holds.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.id)}</option>`).join(''):'<option value="">先添加岩点</option>';
  for(const sel of ['#hold-x','#hold-y','#hold-type','#delete-hold','#set-finish'])$(sel).disabled=!h;
  $('#selected-hold').disabled=!h;$('#hold-x').value=h?Math.round(h.x*100):'';$('#hold-y').value=h?Math.round(h.y*100):'';$('#hold-x').max=input.width*100;$('#hold-y').max=input.height*100;$('#hold-type').value=h?.type||'both';
  document.querySelectorAll('[data-role]').forEach(b=>{const l=b.dataset.role;b.disabled=!h||(l.endsWith('h')?h.type==='foot':h.type==='hand');b.setAttribute('aria-pressed',String(Boolean(h&&input.starts[l]===h.id)));});$('#set-finish').disabled=!h||h.type==='foot';$('#set-finish').setAttribute('aria-pressed',String(Boolean(h&&input.finish===h.id)));
  $('#start-summary').textContent=limbs.map(l=>`${names[l]} ${input.starts[l]||'未指定'}`).join(' · ')+` ｜ 终点 ${input.finish||'未指定'}`;
  for(const [id,key] of [['wall-width','width'],['wall-height','height'],['body-height','bodyHeight'],['arm-span','armSpan']])$('#'+id).value=Math.round(input[key]*100);
  $('#undo-edit').disabled=!history.length;
 }
 function renderArmPosture(frame,state,animated,move){
  const arms=R.measureArms(input,frame);
  $('#arm-angles').innerHTML=['left','right'].map(side=>{const arm=arms[side];if(!arm)return '';const moving=animated&&move?.limb===(side==='left'?'lh':'rh');const extended=arm.extensionRatio>=.995&&!arm.belowShoulder;const label=moving?'换手中':arm.belowShoulder?'手点低于肩':extended?'接近直臂':'保留屈臂';return `<div class="arm-card ${extended?'extended':''}"><span>${side==='left'?'左臂':'右臂'} · ${label}</span><b>${Math.round(arm.elbowDegrees)}°</b></div>`;}).join('');
  const bothExtended=['left','right'].every(side=>arms[side]?.extensionRatio>=.995&&!arms[side]?.belowShoulder);
  const posture=state.pose.armPosture,reasons=[...new Set(['left','right'].map(side=>posture?.[side]).filter(arm=>arm&&arm.mode!=='extended').map(arm=>arm.reason))];
  $('#arm-note').textContent=animated?`${frame.phase}。换点过程中允许屈臂，优先让保留接触的手臂伸展。`:reasons.length?reasons.join(' '):bothExtended?'当前双臂接近伸直，手脚仍接触同一组岩点。换点和调整身体时，可以保留必要的屈臂。':'当前姿势保留了手脚接触，不能只凭肘角判断省力；结合手点高度和脚点位置理解。';
 }
 function renderBoard(progress){
  const route=routes[activeRoute];
  if(route){
   const animated=progress!==undefined&&step<route.moves.length,state=route.states[animated?step+1:step];
   const opts={showLabels:true,photo:photoUI?.get(),stepLabel:animated?`第 ${step+1} 步 · 换点中`:step===0?'出发姿势':`第 ${step} 步`,...(animated?{previousState:route.states[step],move:route.moves[step],progress}:step?{move:route.moves[step-1]}:{})};
   board.innerHTML=R.poseSvg(input,state,{...opts,selectedId:selected});$('#mobile-preview').innerHTML=R.poseSvg(input,state,opts);
   renderArmPosture(R.frameAt(input,state,opts),state,animated,animated?route.moves[step]:null);
  }else{board.innerHTML=R.wallSvg(input,{selectedId:selected,showLabels:true,diagnostic,photo:photoUI?.get()});$('#mobile-preview').innerHTML='';}
  board.classList.toggle('adding',tool!=='select');
 }
 function render(){if(!input.holds.some(h=>h.id===selected))selected=input.holds[0]?.id||null;renderFields();renderBoard();}
 function position(e){const svg=board.querySelector('svg');if(!svg)return null;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const matrix=svg.getScreenCTM();if(!matrix)return null;const q=p.matrixTransform(matrix.inverse()),v=R.viewport(input);return {x:Math.round((q.x-v.wall.x)/v.scale*100)/100,y:Math.round((v.wall.y+v.wall.height-q.y)/v.scale*100)/100};}
 function freshId(){let n=1;while(input.holds.some(h=>h.id==='H'+n))n++;return 'H'+n;}
 document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{photoUI?.setEditing(false);tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#tool-help').textContent=tool==='select'?'拖动岩点改位置。也可选中点，在下方输入精确位置。':`点击墙内空白处添加${{both:'通用点',hand:'手点',foot:'脚点'}[tool]}；已有岩点仍可拖动。`;board.classList.toggle('adding',tool!=='select');});
 board.addEventListener('pointerdown',e=>{if(e.button!==0)return;const id=e.target.closest('[data-hold-id]')?.dataset.holdId;const p=position(e);if(!p)return;if(id){e.preventDefault();selected=id;renderFields();drag={id,start:p,moved:false};board.setPointerCapture(e.pointerId);}else if(tool!=='select'){e.preventDefault();if(p.x<0||p.x>input.width||p.y<0||p.y>input.height)return;if(input.holds.length>=24){status('最多支持24个岩点。可删除无关的点后再添加。',true);return;}change(()=>{selected=freshId();input.holds.push({id:selected,...p,type:tool});});}});
 board.addEventListener('pointermove',e=>{if(!drag)return;const p=position(e);if(!p)return;const h=input.holds.find(h=>h.id===drag.id);if(!h)return;if(!drag.moved&&Math.hypot(p.x-drag.start.x,p.y-drag.start.y)<.015)return;if(!drag.moved){record();invalidate();drag.moved=true;board.classList.add('dragging');}h.x=Math.max(0,Math.min(input.width,p.x));h.y=Math.max(0,Math.min(input.height,p.y));renderFields();renderBoard();});
 function finishDrag(){if(!drag)return;drag=null;board.classList.remove('dragging');save();render();}
 board.addEventListener('pointerup',finishDrag);board.addEventListener('pointercancel',finishDrag);
 board.addEventListener('focusin',e=>{const id=e.target.closest('[data-hold-id]')?.dataset.holdId;if(id){selected=id;renderFields();}});
 board.addEventListener('keydown',e=>{if(!selected)return;const d=e.shiftKey?.05:.01,delta={ArrowLeft:[-d,0],ArrowRight:[d,0],ArrowUp:[0,d],ArrowDown:[0,-d]}[e.key];if(delta){e.preventDefault();change(()=>{const h=input.holds.find(h=>h.id===selected);h.x=Math.max(0,Math.min(input.width,Math.round((h.x+delta[0])*100)/100));h.y=Math.max(0,Math.min(input.height,Math.round((h.y+delta[1])*100)/100));});board.focus();}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteHold();}});
 $('#selected-hold').onchange=e=>selectHold(e.target.value);
 for(const [id,axis] of [['hold-x','x'],['hold-y','y']])$('#'+id).onchange=e=>{const max=axis==='x'?input.width:input.height,n=Number(e.target.value)/100;if(!Number.isFinite(n)||n<0||n>max){status('岩点坐标必须在墙面范围内。',true);renderFields();return;}change(()=>{input.holds.find(h=>h.id===selected)[axis]=n;});};
 $('#hold-type').onchange=e=>{const type=e.target.value;change(()=>{const h=input.holds.find(h=>h.id===selected);h.type=type;for(const l of limbs)if(input.starts[l]===h.id&&(l.endsWith('h')?type==='foot':type==='hand'))input.starts[l]=null;if(type==='foot'&&input.finish===h.id)input.finish=null;});};
 document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>change(()=>{input.starts[b.dataset.role]=input.starts[b.dataset.role]===selected?null:selected;}));
 $('#set-finish').onclick=()=>change(()=>{input.finish=input.finish===selected?null:selected;});
 function deleteHold(){if(!selected)return;change(()=>{input.holds=input.holds.filter(h=>h.id!==selected);for(const l of limbs)if(input.starts[l]===selected)input.starts[l]=null;if(input.finish===selected)input.finish=null;selected=input.holds[0]?.id||null;});}
 $('#delete-hold').onclick=deleteHold;
 for(const [id,key,min,max] of [['wall-width','width',1,6],['wall-height','height',1.5,6],['body-height','bodyHeight',1,2.3],['arm-span','armSpan',1,2.5]])$('#'+id).onchange=e=>{const n=Number(e.target.value)/100;if(!Number.isFinite(n)||n<min||n>max){status(`请输入 ${min*100}–${max*100} cm 范围内的尺寸。`,true);renderFields();return;}change(()=>{if(key==='width'||key==='height'){const axis=key==='width'?'x':'y',factor=n/input[key];input.holds.forEach(h=>h[axis]=Math.round(h[axis]*factor*1000)/1000);}input[key]=n;});};
 $('#undo-edit').onclick=()=>{if(!history.length)return;invalidate('已撤销上次修改。');input=history.pop();save();render();};
 function loadTraverse(){change(()=>{input=S.traverseExample();});status('横移示例已载入，点击生成即可逐步查看；可用“撤销修改”恢复原线路。');}
 $('#load-traverse').onclick=loadTraverse;$('#empty-traverse').onclick=loadTraverse;
 function renderEmpty(){const failed=diagnostic?.kind==='start-unreachable';$('#empty-title').textContent=failed?'先检查起步，尚未搜索换点':'让每一只手脚都有去处';$('#empty-copy').textContent=failed?'先核对墙宽、墙高与实际岩点间距，再检查四个起步接触。图上的跨度是点与点之间的距离，不是人体可达上限。也可以载入横移示例对照，之后撤销恢复原线路。':'设置四个起步接触和一个终点。生成后，你可以切换方案、查看每一步，并把整条动作导出成 SVG。';}
 $('#load-example').onclick=()=>{change(()=>{input=example();});status('示例已载入。可以直接生成，也可以先拖动岩点。');};
 $('#clear-wall').onclick=()=>{change(()=>{input.holds=[];input.starts={lh:null,rh:null,lf:null,rf:null};input.finish=null;});status('墙面已清空。选择“＋ 通用点”，点击墙面开始画线；可撤销。');};
 function download(text,type,name){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('#save-layout').onclick=()=>download(JSON.stringify({version:1,layout:input},null,2),'application/json','climbing-guide-layout.json');
 $('#load-layout').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>100000)throw Error('点位文件过大，请选择本工具导出的 JSON。');const next=normalize(JSON.parse(await file.text()));change(()=>{input=next;});status('点位已导入，请检查尺寸和起终点。');}catch(err){status(err instanceof SyntaxError?'文件不是有效的 JSON。':err.message,true);}e.target.value='';};
 function updateStep(displayStep=step){const route=routes[activeRoute];if(!route)return;const move=displayStep?route.moves[displayStep-1]:null;$('#step-number').textContent=displayStep?`${playing?'正在播放 · ':''}第 ${displayStep} / ${route.moves.length} 步`:'出发姿势';$('#step-title').textContent=!route.moves.length?'双手已经在终点':move?`${names[move.limb]}：${move.from} → ${move.to}`:'先确认四个起步接触';$('#step-reason').textContent=!route.moves.length?'当前起步设置已经满足双手匹配终点，不需要额外换点。':move?(move.reason||'先调整身体位置，保留其余支撑，再换到目标点。'):'四个标记分别对应起步左手、右手、左脚、右脚。先看清它们，再按顺序换点。';$('#contact-summary').innerHTML=limbs.map(l=>`<div class="${move?.limb===l?'moving':''}">${names[l]}<b>${esc(route.states[displayStep].contacts[l])}</b></div>`).join('');$('#play-route').disabled=route.moves.length===0;$('#previous-step').disabled=step===0;$('#next-step').disabled=step>=route.moves.length;$('#route-progress').max=route.moves.length;$('#route-progress').value=displayStep;$('#route-steps').innerHTML=[`<li><button type="button" data-step="0" class="${displayStep===0?'current':''}">00　出发姿势</button></li>`,...route.moves.map((m,i)=>`<li><button type="button" data-step="${i+1}" class="${displayStep===i+1?'current':''}">${String(i+1).padStart(2,'0')}　${names[m.limb]}　${esc(m.from)} → ${esc(m.to)}</button></li>`)].join('');}
 function chooseRoute(i){stop();activeRoute=i;step=0;const route=routes[i];$('#route-options').innerHTML=routes.map((r,n)=>`<button type="button" data-route="${n}" aria-pressed="${n===i}">方案 ${n+1}<small>${r.moves.length} 次换点</small></button>`).join('');$('#route-overview').textContent=`按动作数量与姿势偏好排序；此方案共 ${route.moves.length} 次换点。模型排序不代表真实肌肉用力。`;updateStep();renderBoard();}
 function acceptResult(result,token){if(token!==job)return;working=false;if(worker){worker.terminate();worker=null;}$('#solve-route').disabled=false;$('#solve-route').innerHTML='重新生成解法 <span>↗</span>';if(result?.routes?.length){routes=result.routes;$('#result-content').hidden=false;$('#result-empty').hidden=true;status(`找到 ${routes.length} 条候选方案。请结合实际岩点方向与现场指导判断。`);chooseRoute(0);}else{routes=[];diagnostic=result?.diagnostic||null;renderEmpty();$('#result-content').hidden=true;$('#result-empty').hidden=false;status(result?.message||'本次没有找到候选方案。请检查起点、标尺和中间脚点。',true);renderBoard();}}
 function solve(){if(working)return;stop();const validation=S.validate(input);if(!validation.valid){status(validation.errors.join('；'),true);return;}invalidate('正在比较接触点与身体位置，通常几秒内完成…');working=true;const token=++job;$('#solve-route').disabled=true;$('#solve-route').textContent='正在寻找动作…';const snapshot=clone(input);let fallbackUsed=false;const fallback=()=>{if(fallbackUsed||token!==job)return;fallbackUsed=true;if(worker){worker.terminate();worker=null;}setTimeout(()=>{try{acceptResult(S.solve(snapshot),token);}catch{acceptResult({message:'计算未完成，请调整点位后重试。'},token);}},50);};try{worker=new Worker('solver-worker.js?v=posture-20261105');worker.onmessage=e=>acceptResult(e.data.result||{message:e.data.error},token);worker.onerror=fallback;worker.postMessage({input:snapshot});}catch{fallback();}}
 $('#solve-route').onclick=solve;
 $('#route-options').onclick=e=>{const b=e.target.closest('[data-route]');if(b)chooseRoute(Number(b.dataset.route));};
 function go(n){stop();if(!routes.length)return;step=Math.max(0,Math.min(routes[activeRoute].moves.length,n));updateStep();renderBoard();}
 $('#route-steps').onclick=e=>{const b=e.target.closest('[data-step]');if(b)go(Number(b.dataset.step));};$('#previous-step').onclick=()=>go(step-1);$('#next-step').onclick=()=>go(step+1);$('#route-progress').oninput=e=>go(Number(e.target.value));
 $('#play-route').onclick=()=>{if(playing){stop();renderBoard();return;}const route=routes[activeRoute];if(!route||!route.moves.length)return;if(step>=route.moves.length)step=0;playing=true;animationStart=performance.now();$('#play-route').textContent='暂停播放';updateStep(step+1);const tick=now=>{if(!playing)return;const p=Math.min(1,(now-animationStart)/(reduced?1100:1900));if(!reduced)renderBoard(p);if(p>=1){step++;updateStep();renderBoard();if(step>=route.moves.length){stop();return;}animationStart=now;updateStep(step+1);}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);};
 $('#export-svg').onclick=()=>{const r=routes[activeRoute];if(r)download(R.storyboardSvg(input,r),'image/svg+xml','climbing-guide-beta.svg');};$('#export-frame').onclick=()=>{const r=routes[activeRoute];if(r)download(R.poseSvg(input,r.states[step],{exported:true,showLabels:true,stepLabel:step?`第 ${step} 步`:'出发姿势'}),'image/svg+xml',`climbing-guide-step-${step}.svg`);};
 photoUI=window.ClimbingPhotoUI.mount({root:$('#photo-controls'),board,getWall:()=>input,onChange:()=>{stop();renderBoard();}});
 selected=input.holds[0]?.id||null;render();if(migrated){status('默认示例已更新：提高起步手点并补充中间脚点。可用“撤销修改”恢复旧示例。');setTimeout(solve,150);}else if(restored)status('已恢复上次的点位。确认后点击生成候选解法。');else setTimeout(solve,150);
})();
