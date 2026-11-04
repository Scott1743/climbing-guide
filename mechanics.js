/* Original beginner mechanics diagrams. Offline, dependency-free. */
(function () {
  'use strict';
  let serial = 0;
  const lessons = {
    lever: {
      title: '身体没变轻，为什么手能少拉一点？',
      intro: '看侧面。人离脚下的支撑越远，体重越容易把人向后翻。手要把你拉回来。把身体移近，手需要抵消的后倒趋势就减小。',
      before: '原来：重心离支撑较远', after: '调整中：让身体靠近支撑', final: '调整后：后倒趋势变小',
      labels: ['先看后倒', '再移身体', '比较拉力'],
      steps: [
        ['体重一直向下，方向没有变', '黑色箭头表示同样的体重。它的作用线离脚点较远，就更容易把人翻离岩壁。'],
        ['移动身体，让横向距离缩短', '看底部紫色的 d。缩短的是重心到脚支撑的横向距离，不是你的体重。'],
        ['手不用那么费劲地抵消后倒', '同样的手脚高度下，d 变短，手部所需的向墙水平拉力也变小。这里没有把总肌肉用力换算成百分比。']
      ],
      takeaway: '省下的是“阻止自己后倒”的额外拉力。把自己抬高仍要做功，重力没有消失。',
      assumption: '简化静止模型：体重、手脚接触高度相同，只比较后倒。图中只画重量与手部水平拉力，脚处反力省略。实际攀爬还取决于墙角、岩点方向和身体姿势。',
      slider: '身体从远处移近支撑'
    },
    turn: {
      title: '转髋的作用，是把肩送到更有利的位置',
      intro: '从头顶往下看。右侧身体转向墙后，右肩也跟着靠近目标方向。手没有变长，却少了一段需要先把身体拉过去的距离。',
      before: '原来：胸口正对墙', after: '调整中：脚允许转，髋肩跟着转', final: '调整后：右肩更靠近目标方向',
      labels: ['先让脚能转', '髋肩一起转', '再伸手'],
      steps: [
        ['先给转动留出条件', '鞋尖接触区是转动的支点。脚跟与膝盖要能顺着身体调整；不是把脚卡死后硬拧膝盖。'],
        ['髋转进去，肩的位置跟着变', '紫色肩点向墙靠近，虚线所示的方向距离缩短。右侧进入墙面方向，是这一例的解法。'],
        ['在更好的位置伸手', '身体先到位，再让手完成最后的伸展。另一手与双脚仍参与支撑；不能为了贴墙丢掉脚压。']
      ],
      takeaway: '不是“扭一下就获得力量”，而是改变身体几何位置：脚更好推、肩更接近、手更少补救。',
      assumption: '俯视教学投影，点位与身体比例简化。只比较肩到目标的墙面方向距离，不代表真实臂长或完整三维距离。转髋并非任何线路都更省力，落膝也不要求越深越好。',
      slider: '从正对墙到右侧靠墙'
    },
    balance: {
      title: '空着的腿，也在搬运身体的重量',
      intro: '右腿从身后伸到左侧时，腿这一部分的重量也跟着移走。髋可以几乎不动，但整个人的重心会改变，帮助减少身体向外转开的趋势。',
      before: '原来：右腿收在右侧', after: '调整中：自由腿从身后移向左侧', final: '调整后：在这个点位组合里更稳定',
      labels: ['先找支撑', '移动自由腿', '稳定后出手'],
      steps: [
        ['先分清哪只脚真的承重', '这一例是左手与左脚保持支撑，准备出右手。右腿没有踩点，但它仍然有重量。'],
        ['自由腿换位置，整体重心也会变', '紫色虚线腿从身后经过。空心圆代表整体重心的示意位置；小方块才是髋，二者不是同一个点。'],
        ['用腿的位置帮助控制开门', '在合适的支撑组合下，背旗能减小需要手部补救的转动。另一种点位布置可能要向相反方向旗式，或直接换脚。']
      ],
      takeaway: '旗式不是把人变轻，也不是多一只脚踩点；它利用自由腿的位置，帮助身体保持平衡。',
      assumption: '这是背旗的一个有利点位示例。正视图只显示重量分布变化，开门是三维旋转；弧箭头仅表示趋势，不是精确力矩或受力比例。实际效果需在低位、可控的动作中比较。',
      slider: '把右侧自由腿从身后移向左侧'
    }
  };
  const css = `
  .mech{--m-purple:var(--sport-purple,#7928ca);--m-ink:var(--sport-black,#121016);--m-muted:#61596b;--m-line:#ded8e5;--m-soft:#f3edf9;color:var(--m-ink);font:inherit;margin:0 auto;max-width:1100px}
  .mech *{box-sizing:border-box}.mech h3{font-size:clamp(22px,3vw,31px);line-height:1.35;margin:0 0 12px}.mech p{margin:0}.mech .mech-intro{font-size:16px;line-height:1.85;max-width:850px;margin-bottom:22px}
  .mech .mech-compare{display:grid;grid-template-columns:1fr 1fr;gap:18px}.mech .mech-panel{min-width:0;background:white;border:1px solid var(--m-line);border-radius:8px;overflow:hidden}.mech .mech-panel-head{padding:12px 16px;background:var(--m-ink);color:#fff;font-weight:700;font-size:15px;line-height:1.5;min-height:48px}.mech .mech-panel:last-child .mech-panel-head{background:var(--m-purple)}
  .mech .mech-svg{display:block;width:100%;max-width:430px;height:auto;margin:0 auto;overflow:visible}.mech .mech-svg text{font-family:inherit;font-size:16px;fill:var(--m-ink)}.mech .mech-svg .purple{fill:var(--m-purple)}.mech .mech-svg .small-text{font-size:15px}.mech .mech-svg .body-line{fill:none;stroke:var(--m-ink);stroke-width:10;stroke-linecap:round;stroke-linejoin:round}.mech .mech-svg .limb-free{stroke:var(--m-purple);stroke-dasharray:7 5}.mech .mech-panel-note{font-size:14px;line-height:1.65;padding:0 16px 15px;min-height:64px;color:var(--m-muted)}
  .mech .mech-steps{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 14px}.mech button{font:inherit;font-size:14px;padding:10px 14px;border:1px solid var(--m-line);border-radius:4px;background:#fff;color:var(--m-ink);cursor:pointer;min-height:44px}.mech button[aria-pressed=true]{background:var(--m-ink);border-color:var(--m-ink);color:white}.mech .mech-play{background:var(--m-purple);border-color:var(--m-purple);color:#fff}.mech button:focus-visible,.mech input:focus-visible{outline:3px solid var(--m-purple);outline-offset:4px}
  .mech .mech-readout{border-left:4px solid var(--m-purple);padding:3px 0 3px 16px;margin:0 0 18px;min-height:88px}.mech .mech-readout strong{display:block;font-size:18px;margin-bottom:5px}.mech .mech-readout p{font-size:15px;line-height:1.8}.mech .mech-control{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center}.mech .mech-control label{font-size:14px;display:block}.mech .mech-control input{display:block;width:100%;accent-color:var(--m-purple);margin:10px 0 0;height:24px}
  .mech .mech-takeaway{font-size:17px;font-weight:700;line-height:1.8;background:var(--m-soft);padding:18px 20px;margin-top:20px}.mech .mech-model{font-size:12px;line-height:1.8;color:var(--m-muted);margin-top:12px}.mech .mech-legend{display:flex;gap:18px;flex-wrap:wrap;margin:14px 0;font-size:13px;color:var(--m-muted)}.mech .mech-dot{display:inline-block;width:11px;height:11px;border:2px solid var(--m-ink);border-radius:50%;vertical-align:-1px;margin-right:5px}.mech .mech-square{display:inline-block;width:9px;height:9px;background:var(--m-purple);vertical-align:0;margin-right:5px}
  @media(max-width:760px){.mech .mech-compare{grid-template-columns:1fr}.mech .mech-panel-note{min-height:0}.mech .mech-control{grid-template-columns:1fr;gap:12px}.mech .mech-readout{min-height:0}.mech .mech-steps{gap:6px}.mech .mech-steps button{flex:1 1 85px;padding:10px 8px}.mech .mech-svg{max-width:400px}.mech .mech-panel-head{font-size:14px;padding:11px 13px}.mech .mech-intro{font-size:15px}.mech .mech-takeaway{font-size:16px;padding:15px}}
  `;
  function styles(){if(document.getElementById('mechanics-style'))return;const el=document.createElement('style');el.id='mechanics-style';el.textContent=css;document.head.appendChild(el);}
  const lerp=(a,b,t)=>a+(b-a)*t;
  const txt=(x,y,t,anchor='start',cl='')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cl}">${t}</text>`;
  const line=(x,y,a,b,color='var(--m-ink)',width=2,dash='')=>`<line x1="${x}" y1="${y}" x2="${a}" y2="${b}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
  function arrow(id,x,y,a,b,purple=false,width=3){return `<path d="M${x},${y} L${a},${b}" stroke="${purple?'var(--m-purple)':'var(--m-ink)'}" stroke-width="${width}" fill="none" marker-end="url(#${id}-${purple?'p':'k'})"/>`;}
  function defs(id){return `<defs><marker id="${id}-p" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="var(--m-purple)"/></marker><marker id="${id}-k" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="var(--m-ink)"/></marker></defs>`;}
  function com(x,y){return `<circle cx="${x}" cy="${y}" r="8" fill="#fff" stroke="var(--m-ink)" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="2" fill="var(--m-ink)"/>`;}
  function foot(x,y){return `<rect x="${x-12}" y="${y}" width="25" height="9" rx="3" fill="var(--m-purple)"/>`;}
  function svg(content,title,id,height=365){return `<svg class="mech-svg" viewBox="0 0 340 ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">${defs(id)}${content}</svg>`;}
  function lever(q,id){
    const hip=lerp(218,126,q),cx=hip-5,shoulder=hip-22,footX=72,handY=104,footY=287,weightArrow=80,force=weightArrow*(cx-footX)/(footY-handY);
    let s=txt(22,29,'侧视 · 墙在左边');
    s+=`<path d="M60 50 V301" stroke="var(--m-line)" stroke-width="12"/>`+foot(72,287)+foot(72,105);
    s+=`<path class="body-line" d="M${shoulder},151 L${hip},218 L${lerp(140,103,q)},251 L72,287 M${shoulder},151 L${lerp(129,92,q)},132 L72,104"/><ellipse cx="${hip-10}" cy="187" rx="24" ry="46" fill="var(--m-soft)" stroke="var(--m-ink)" stroke-width="3" transform="rotate(-15 ${hip-10} 187)"/><circle cx="${shoulder-3}" cy="123" r="16" fill="#fff" stroke="var(--m-ink)" stroke-width="3"/>`;
    s+=line(cx,213,cx,321,'var(--m-ink)',1.5,'5 4')+com(cx,213)+arrow(id,cx,223,cx,223+weightArrow,false,3);
    s+=txt(292,259,'体重','end')+txt(292,279,'始终相同','end','small-text');
    s+=arrow(id,72+force,79,72,79,true,4)+txt(72,59,'手部向墙拉力','start','small-text');
    s+=line(72,305,72,333,'var(--m-purple)',1.5)+line(cx,305,cx,333,'var(--m-purple)',1.5)+line(72,322,cx,322,'var(--m-purple)',2);
    s+=txt((72+cx)/2,349,'d：横向距离','middle','purple');
    s+=txt(23,293,'脚','start','small-text');
    return svg(s,'侧视：体重不变，重心到脚支撑的横向距离缩短，所需手部水平拉力变小',id,365);
  }
  function turn(q,id){
    const a=-q*Math.PI*.33,cx=169,cy=lerp(197,172,q),co=Math.cos(a),si=Math.sin(a);
    const ls=[cx-52*co,cy-52*si],rs=[cx+52*co,cy+52*si],hip=[cx-si*25,cy+co*25],lh=[hip[0]-32*co,hip[1]-32*si],rh=[hip[0]+32*co,hip[1]+32*si];
    const target=[247,69];
    let s=txt(22,29,'俯视 · 墙在上边');
    s+=`<rect x="22" y="46" width="296" height="13" fill="var(--m-line)"/>`;
    s+=`<rect x="235" y="61" width="24" height="14" rx="4" fill="var(--m-purple)"/>`+txt(306,96,'目标','end','small-text');
    s+=`<g transform="translate(96 64) rotate(${-q*34})"><path d="M-7 0 Q-12 16 -7 39 L7 39 Q12 15 7 0 Z" fill="var(--m-ink)"/></g><g transform="translate(219 64) rotate(${-q*46})"><path d="M-7 0 Q-12 16 -7 39 L7 39 Q12 15 7 0 Z" fill="var(--m-ink)"/></g><circle cx="96" cy="66" r="4" fill="#fff"/><circle cx="219" cy="66" r="4" fill="#fff"/>`;
    s+=`<path class="body-line" d="M${lh[0]} ${lh[1]} Q100 168 96 96 M${rh[0]} ${rh[1]} Q237 178 224 96" stroke-width="7"/>`;
    s+=`<path d="M${ls.join(' ')} L${rs.join(' ')} L${rh.join(' ')} L${lh.join(' ')} Z" fill="var(--m-soft)" stroke="var(--m-ink)" stroke-width="3"/>`;
    s+=`<ellipse cx="${cx}" cy="${cy}" rx="12" ry="15" fill="#fff" stroke="var(--m-ink)" stroke-width="2"/>`;
    s+=line(rs[0],rs[1],target[0],target[1],'var(--m-purple)',2.5,'5 4');
    s+=`<circle cx="${rs[0]}" cy="${rs[1]}" r="7" fill="var(--m-purple)"/>`+line(rs[0]+4,rs[1]+9,289,240,'var(--m-purple)',1.5)+txt(304,260,'右肩','end','purple');
    s+=`<rect x="${rh[0]-4}" y="${rh[1]-4}" width="8" height="8" fill="var(--m-purple)"/>`+txt(25,314,'鞋尖留在接触区，脚跟跟着转','start','small-text');
    if(q>.45)s+=`<path d="M115 280 Q172 292 218 269" stroke="var(--m-purple)" stroke-width="2.5" fill="none" marker-end="url(#${id}-p)"/>`;
    s+=txt(25,343,q>.7?'紫线变短，肩更靠近目标':'紫线：肩到目标的方向距离','start','small-text');
    return svg(s,'从上方观察：脚允许转动，右髋与右肩随身体转向墙，肩到目标方向的距离缩短',id,365);
  }
  function balance(q,id){
    const hip=[186,200],free=[lerp(246,54,q),lerp(286,272,q)],knee=[lerp(227,126,q),lerp(244,240,q)],cx=lerp(205,179,q);
    let s=txt(22,29,'背面视角 · 左右按攀爬者');
    s+=`<path d="M28 56 H312 V312 H28 Z" fill="var(--m-soft)"/>`;
    s+=foot(143,84)+foot(165,288)+`<rect x="258" y="68" width="25" height="10" rx="3" fill="#fff" stroke="var(--m-purple)" stroke-width="2"/>`;
    s+=`<path class="body-line limb-free" d="M194 200 L${knee[0]} ${knee[1]} L${free[0]} ${free[1]}"/><path class="body-line" d="M178 200 L166 249 L165 287"/><path d="M166 134 L202 134 L199 204 L175 204 Z" fill="#fff" stroke="var(--m-ink)" stroke-width="3"/><circle cx="184" cy="110" r="15" fill="#fff" stroke="var(--m-ink)" stroke-width="3"/><path class="body-line" d="M167 139 L144 120 L143 89 M201 140 L240 126 L261 99"/>`;
    s+=`<rect x="${hip[0]-4}" y="${hip[1]-4}" width="8" height="8" fill="var(--m-purple)"/>`;
    s+=com(cx,178)+line(cx,189,cx,309,'var(--m-ink)',1.5,'4 4');
    s+=txt(48,330,'左脚继续踩点','start','small-text')+line(145,314,165,300,'var(--m-ink)',1.2);
    s+=txt(305,348,'右腿是自由腿','end','small-text')+line(263,332,free[0],free[1]+8,'var(--m-purple)',1.2);
    const ar=lerp(40,17,q);s+=`<path d="M${236-ar/2} 169 Q${261+ar/2} 172 ${255+ar/2} 211" fill="none" stroke="var(--m-ink)" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#${id}-k)"/>`;
    return svg(s,'背旗示例：左手左脚支撑保留，右腿从后方移到左侧，整体重量分布改变，帮助控制三维开门趋势',id,365);
  }
  const renderers={lever,turn,balance};
  function mountMechanics(container,type){
    if(!container || !lessons[type]) return null;styles();const data=lessons[type],id='mechanics-'+(++serial);let value=100,playing=false,raf=0,last=0;
    container.innerHTML=`<div class="mech" id="${id}" role="group" aria-label="${data.title}"><div class="mech-compare"><figure class="mech-panel" style="margin:0"><figcaption class="mech-panel-head">${data.before}</figcaption><div class="mech-before"></div><p class="mech-panel-note">${type==='lever'?'同样的体重，离支撑较远；需要较大的水平拉力来抵消后倒。':type==='turn'?'手还没动，先看肩在什么位置。只伸手，不能改变肩到目标的距离。':'手脚支撑没有变。腿收在这一侧时，身体更容易出现需要补救的转动。'}</p></figure><figure class="mech-panel" style="margin:0"><figcaption class="mech-panel-head mech-after-title">${data.after}</figcaption><div class="mech-after"></div><p class="mech-panel-note mech-after-note"></p></figure></div><div class="mech-legend">${type==='lever'||type==='balance'?'<span><i class="mech-dot"></i>整体重心示意</span>':''}${type==='balance'?'<span><i class="mech-square"></i>髋的位置</span>':''}<span>箭头与虚线是解释线，不是运动轨迹测量</span></div><div class="mech-steps" aria-label="因果分步">${data.labels.map((x,i)=>`<button type="button" data-step="${i}" aria-pressed="${i===2}">${i+1} · ${x}</button>`).join('')}</div><div class="mech-readout" aria-live="polite"><strong></strong><p></p></div><div class="mech-control"><button type="button" class="mech-play">播放变化</button><label>${data.slider}<input class="mech-range" type="range" min="0" max="100" step="1" value="100" aria-label="${data.slider}"></label></div><p class="mech-takeaway">${data.takeaway}</p><p class="mech-model">${data.assumption}</p></div>`;
    const root=container.querySelector('.mech'),range=root.querySelector('.mech-range'),play=root.querySelector('.mech-play'),after=root.querySelector('.mech-after'),readout=root.querySelector('.mech-readout');
    root.querySelector('.mech-before').innerHTML=renderers[type](0,id+'-before');
    function fitText(){root.querySelectorAll('.mech-svg').forEach(el=>{const w=el.getBoundingClientRect().width;if(!w)return;const size=Math.max(16,14*340/w);el.querySelectorAll('text').forEach(t=>{t.style.fontSize=size+'px';});});}
    function draw(){const q=value/100,stage=q<.34?0:q<.78?1:2;after.innerHTML=renderers[type](q,id+'-after');range.value=String(Math.round(value));root.querySelector('.mech-after-title').textContent=q>.9?data.final:data.after;root.querySelector('.mech-after-note').textContent=type==='lever'?(q>.7?'紫色距离缩短，手部水平拉力箭头也缩短；黑色体重箭头长度保持相同。':'拖动下方滑杆，观察紫色距离与拉力箭头一起变化。'):type==='turn'?(q>.7?'右肩随转体靠近目标方向。先改变位置，再完成出手。':'看脚跟、髋和右肩的配合；不要只盯膝盖转了多少。'):(q>.7?'髋几乎不动，自由腿改变了整体重量分布；这一布局下更容易控制开门。':'看自由腿和整体重心示意点；支撑的左手、左脚一直保留。');readout.querySelector('strong').textContent=data.steps[stage][0];readout.querySelector('p').textContent=data.steps[stage][1];root.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===stage)));fitText();}
    function stop(){playing=false;cancelAnimationFrame(raf);play.textContent='播放变化';}
    function tick(ts){if(!playing)return;if(last)value=Math.min(100,value+(ts-last)/85);last=ts;draw();if(value>=100)stop();else raf=requestAnimationFrame(tick);}
    range.addEventListener('input',()=>{stop();value=Number(range.value);draw();});
    root.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{stop();value=[0,55,100][Number(b.dataset.step)];draw();}));
    play.addEventListener('click',()=>{if(playing){stop();return;}if(value>=100)value=0;if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){value=value<50?55:100;draw();return;}playing=true;last=0;play.textContent='暂停变化';raf=requestAnimationFrame(tick);});
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(fitText):null;if(observer)observer.observe(root);
    draw();return {setProgress(v){stop();value=Math.max(0,Math.min(100,Number(v)||0));draw();},destroy(){stop();if(observer)observer.disconnect();container.innerHTML='';}};
  }
  window.mountMechanics=mountMechanics;
})();
