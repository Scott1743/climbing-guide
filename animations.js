/* Original instructional schematics. No external dependencies. */
(function () {
  'use strict';
  var serial = 0;
  var COLORS = { ink: '#17121f', muted: '#6d6478', line: '#ded6e9', wall: '#f4effa', cyan: '#7928ca', orange: '#ad247c', soft: '#eee1fa' };
  function pose(h, s, lh, rh, le, re, lk, rk, lf, rf) { return { h:h, s:s, lh:lh, rh:rh, le:le, re:re, lk:lk, rk:rk, lf:lf, rf:rf }; }
  var base = pose([158,194],[157,133],[91,76],[218,76],[99,119],[216,119],[115,231],[211,231],[103,275],[223,275]);
  function P(changes) { var out={}; Object.keys(base).forEach(function(k){out[k]=base[k].slice();}); Object.keys(changes).forEach(function(k){out[k]=changes[k];}); return out; }
  var lessons = {
    swap: { title:'换脚 留出空间再交接', view:'swap', stages:[
      ['左脚先承重','选宽大、低处的脚点练习；双手帮助稳定，先看清可用位置。'],
      ['挪出空间，右脚靠近','承重脚小幅调整，给右脚鞋尖留位置；身体保持平稳。'],
      ['两脚短暂交接','右脚轻放到可用面，再逐步把重量转过去；不是突然踢开原来的脚。'],
      ['右脚压稳，左脚离开','确认新脚有支撑，再移走旧脚。先学这种可控交接，不急着跳换脚。']
    ]},
    feet: { title:'精准踩点', view:'feet', stages:[
      ['看准接触点','视线留在目标脚点上；先想清楚鞋尖落在哪里。'],
      ['脚尖安静落下','用前端橡胶轻放在可用面，不用脚心盲踩。'],
      ['压实后再移动','逐渐把重量交给脚；脚稳定后，再移动身体。']
    ]},
    straight: {title:'长手臂与腿部发力', active:'both', holds:[[91,76,'hand'],[218,76,'hand'],[103,275,'foot'],[223,275,'foot']], stages:[
      ['发现持续屈肘','这是“缩着吊住”的示意：双肘一直弯，手臂容易先累。'],
      ['下沉并伸长手臂','弯腿调整身体，让手臂伸长；肩部仍然受控，不要耸肩松垮悬吊。'],
      ['由腿把身体送高','脚压稳，腿逐渐蹬直。向上移动时允许弯肘，不必僵硬锁直。']
    ], frames:[base,P({h:[158,210],s:[157,151],le:[118,113],re:[194,113],lk:[116,241],rk:[211,241]}),P({h:[159,179],s:[158,119],le:[116,98],re:[195,98],lk:[119,226],rk:[210,226]})]},
    same: {title:'同手同脚', active:'right', holds:[[91,76,'hand'],[218,76,'hand'],[247,44,'target'],[103,275,'foot'],[223,275,'foot'],[226,234,'foot']], stages:[
      ['计划右手出手','此例要把右手移向右上目标点，先为右脚找支撑。'],
      ['先放好右脚','右脚踩到合适脚点；此时两手继续帮助稳定。'],
      ['移髋并压右脚','髋向右脚靠近，让右脚真正分担重量。'],
      ['右腿驱动右手','右腿发力送身体，右手够点；这是协调练习，不是所有线路的铁律。']
    ],frames:[base,P({rf:[226,234],rk:[218,212]}),P({h:[196,193],s:[183,132],rf:[226,234],rk:[224,211],le:[125,111],re:[218,110],lk:[145,231]}),P({h:[204,167],s:[195,108],rf:[226,234],rk:[222,202],rh:[247,44],re:[226,78],le:[133,92],lk:[151,221]})]},
    rockover: {title:'Rock over 重心移到脚上', active:'right', holds:[[91,76,'hand'],[218,76,'hand'],[258,49,'target'],[103,275,'foot'],[223,275,'foot'],[230,234,'foot']], stages:[
      ['先放脚','选择能站上的右脚点；不要一边脚还没稳，一边急着远够。'],
      ['向脚点移髋','先做横向转移，把髋带到承重脚附近。'],
      ['站上这只脚','右腿逐渐承重蹬起，身体从脚点上方升高。'],
      ['最后再出手','身体位置到位后再够点，减少靠手硬拉的距离。']
    ],frames:[P({rf:[230,234],rk:[214,211]}),P({h:[210,190],s:[192,129],rf:[230,234],rk:[232,215],le:[130,109],re:[216,105],lk:[145,237]}),P({h:[229,159],s:[212,102],rf:[230,234],rk:[230,199],le:[143,90],re:[222,87],lk:[161,218]}),P({h:[229,159],s:[212,102],rf:[230,234],rk:[230,199],rh:[258,49],re:[244,78],le:[143,90],lk:[161,218]})]},
    reading: {title:'从地面读动作顺序', view:'reading', stages:[
      ['先认起点与终点','先认清本线路允许用的点和起终点；颜色规则以本馆为准。'],
      ['把手点与脚点配对','不能只记手往哪里抓，还要想象哪只脚为下一手提供支撑。'],
      ['预演关键的身体位置','把“脚—髋—手”连起来。转髋、移重心和旗式都是可选方案。'],
      ['尝试后修改计划','Beta 是你实际能用的动作方案；身高和柔韧不同，解法可以不同。']
    ]},
    dropknee: {title:'Drop knee 转髋下膝', active:'right', holds:[[80,80,'hand'],[213,77,'hand'],[248,43,'target'],[98,267,'foot'],[236,229,'foot']], stages:[
      ['两脚建立对抗','在适合练习的大点上，两脚分别施力；先保证可控、无痛。'],
      ['脚和髋一起转','以脚尖接触区为轴调整鞋的方向，髋随之转近墙；不是把膝硬拧下去。'],
      ['同侧膝自然下转','右髋向墙，右膝随转体下转。幅度服从脚点与个人活动度。'],
      ['借侧身完成伸手','右肩更接近目标，右手伸出；膝痛或卡住应停止，不追求更深。']
    ],frames:[P({lh:[80,80],rh:[213,77],h:[164,190],s:[159,131],lf:[98,267],rf:[236,229],lk:[115,230],rk:[214,195]}),P({lh:[80,80],rh:[213,77],h:[176,192],s:[171,132],lf:[98,267],rf:[236,229],lk:[121,231],rk:[205,218],le:[114,107],re:[202,103]}),P({lh:[80,80],rh:[213,77],h:[183,190],s:[178,129],lf:[98,267],rf:[236,229],lk:[124,230],rk:[195,242],le:[120,105],re:[204,101]}),P({lh:[80,80],rh:[248,43],h:[187,177],s:[185,117],lf:[98,267],rf:[236,229],lk:[128,224],rk:[197,236],le:[125,99],re:[220,78]})]},
    flag: {title:'外旗式 用自由腿平衡', active:'left', holds:[[91,76,'hand'],[218,76,'hand'],[258,47,'target'],[207,275,'foot']], stages:[
      ['右脚作为支点','此例用右脚承重，准备移动右手；左腿不需要硬找一个脚点。'],
      ['左腿向左伸开','自由腿留在身体同侧，向外伸展；可轻抵墙面。'],
      ['先平衡，再动手','自由腿改变身体质量分布；稳定后，右脚驱动身体，右手出手。']
    ],frames:[P({h:[190,190],s:[182,132],rf:[207,275],rk:[211,233],lf:[174,267],lk:[160,234],le:[128,109],re:[218,112]}),P({h:[194,190],s:[186,132],rf:[207,275],rk:[211,233],lf:[55,264],lk:[122,227],le:[132,109],re:[218,112]}),P({h:[200,175],s:[194,117],rf:[207,275],rk:[211,225],lf:[55,260],lk:[128,222],rh:[258,47],re:[233,82],le:[136,99]})]},
    backflag: {title:'后旗式 自由腿从后方跨过', active:'right', backLeg:'right', holds:[[91,76,'hand'],[218,76,'hand'],[258,47,'target'],[132,275,'foot']], stages:[
      ['左脚承重，右手想出手','此例脚点不方便换成右脚；左手与左脚继续构成支撑。'],
      ['右腿从左腿后方穿过','右脚不踩点，右腿经过承重腿后方，伸到身体左侧。'],
      ['保持支点后出手','利用自由腿帮助抗旋转、调平衡，再移动右手；不是把两腿绞死。']
    ],frames:[P({h:[169,190],s:[169,132],lf:[132,275],lk:[131,233],rf:[211,270],rk:[214,231],le:[117,105],re:[211,107]}),P({h:[152,190],s:[160,130],lf:[132,275],lk:[132,232],rf:[59,263],rk:[115,226],le:[112,103],re:[206,106]}),P({h:[157,181],s:[168,121],lf:[132,275],lk:[136,229],rf:[55,258],rk:[116,222],rh:[258,47],re:[222,84],le:[117,98]})]},
    layback: {title:'Layback 手拉脚蹬的对抗', view:'layback', stages:[
      ['辨认侧向手点','侧拉点需要侧向用力；只向下拉，可能无法保持稳定。'],
      ['身体与脚形成对抗','手向身体拉，脚向墙推，身体保持张力。箭头表示对岩壁的施力方向。'],
      ['保持对抗再移动','维持脚压与手拉的配合，再小步移动；这与“移髋站上脚”的 rock over 不同。']
    ]}
  };
  var css = '.climb-anim{color:#17121f;max-width:720px;margin:0 auto;font-family:inherit}.climb-anim *{box-sizing:border-box}.climb-anim .ca-stage{font-size:15px;font-weight:700;margin:0 0 8px}.climb-anim .ca-svg{display:block;width:100%;max-height:390px;background:#faf7fd;border-radius:14px}.climb-anim .ca-svg text{font-family:inherit;font-size:14px;fill:#17121f}.climb-anim .ca-detail{font-size:14px;line-height:1.75;min-height:3.5em;margin:10px 0}.climb-anim .ca-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.climb-anim button{font:inherit;font-size:13px;border:1px solid #c2a9dd;border-radius:7px;background:#fff;color:#17121f;min-height:36px;padding:7px 12px;cursor:pointer}.climb-anim button:focus-visible,.climb-anim input:focus-visible{outline:3px solid #7928ca;outline-offset:3px}.climb-anim button:disabled{opacity:.4;cursor:default}.climb-anim .ca-play{background:#7928ca;color:white;border-color:#7928ca}.climb-anim .ca-range{width:100%;accent-color:#7928ca;margin:12px 0 5px}.climb-anim .ca-caption{font-size:12px;line-height:1.6;color:#6d6478;margin:6px 0}.climb-anim .ca-count{font-variant-numeric:tabular-nums;margin-left:auto;font-size:13px}.climb-anim .ca-bone{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:8}.climb-anim .ca-arrow{fill:none;stroke-width:2.5;stroke-linecap:round}.climb-anim .ca-gravity{stroke:#ad247c;stroke-width:1.5;stroke-dasharray:4 4}.climb-anim .ca-hold{fill:#bd8ce6;stroke:#74459b;stroke-width:1}.climb-anim .ca-target{fill:#fff0d5;stroke:#ad247c;stroke-width:1.5;stroke-dasharray:3 2}.climb-anim .ca-label-bg{fill:#fff;fill-opacity:.94}.climb-anim .ca-free{stroke:#7928ca}.climb-anim .ca-rear{stroke-dasharray:6 4}@media(max-width:420px){.climb-anim button{min-height:42px}.climb-anim .ca-detail{min-height:5.25em}.climb-anim .ca-svg{border-radius:8px}}';
  function injectStyles(){ if(document.getElementById('climb-animation-css')) return; var s=document.createElement('style');s.id='climb-animation-css';s.textContent=css;document.head.appendChild(s); }
  function path(points){return points.map(function(p,i){return (i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');}
  function lerp(a,b,t){return a+(b-a)*t;}
  function blend(a,b,t){var r={};Object.keys(a).forEach(function(k){r[k]=[lerp(a[k][0],b[k][0],t),lerp(a[k][1],b[k][1],t)];});return r;}
  function text(x,y,str,anchor,extra){return '<text x="'+x+'" y="'+y+'" text-anchor="'+(anchor||'start')+'" '+(extra||'')+'>'+str+'</text>';}
  function label(x,y,str,anchor){var w=str.length*14+12, sx=anchor==='end'?x-w:anchor==='middle'?x-w/2:x-6;return '<rect class="ca-label-bg" x="'+sx+'" y="'+(y-14)+'" width="'+w+'" height="20" rx="4"/>'+text(x,y,str,anchor);}
  function arrow(id,x1,y1,x2,y2,color){return '<path class="ca-arrow" stroke="'+(color||COLORS.cyan)+'" d="M '+x1+' '+y1+' L '+x2+' '+y2+'" marker-end="url(#'+id+(color===COLORS.orange?'-o':'-a')+')"/>';}
  function hold(x,y,kind){ if(kind==='foot')return '<path class="ca-hold" d="M '+(x-13)+' '+(y+3)+' L '+(x+13)+' '+(y+3)+' L '+(x+9)+' '+(y+13)+' L '+(x-10)+' '+(y+10)+' Z"/>'; return '<rect class="'+(kind==='target'?'ca-target':'ca-hold')+'" x="'+(x-17)+'" y="'+(y-6)+'" width="34" height="12" rx="5"/>'; }
  function body(p,l,amount){
    var ls=[p.s[0]-12,p.s[1]],rs=[p.s[0]+12,p.s[1]],lhp=[p.h[0]-8,p.h[1]],rhp=[p.h[0]+8,p.h[1]];
    function limb(points,color,klass){return '<path class="ca-bone '+(klass||'')+'" stroke="'+color+'" d="'+path(points)+'"/>';}
    var rc=l.active==='right'?COLORS.cyan:COLORS.ink,lc=l.active==='left'?COLORS.cyan:COLORS.ink;
    var left=limb([lhp,p.lk,p.lf],lc),right=limb([rhp,p.rk,p.rf],rc,l.backLeg==='right'&&amount>.3?'ca-rear':'');
    var out=l.backLeg==='right'?right+left:left+right;
    out+='<path d="'+path([ls,rs,rhp,lhp,ls])+'" fill="#e4cef7" stroke="#17121f" stroke-width="4" stroke-linejoin="round"/>';
    out+=limb([ls,p.le,p.lh],l.active==='both'?COLORS.cyan:COLORS.ink)+limb([rs,p.re,p.rh],l.active==='both'||l.active==='right'?COLORS.cyan:COLORS.ink);
    out+='<circle cx="'+p.s[0]+'" cy="'+(p.s[1]-23)+'" r="13" fill="#f7e2cc" stroke="#17121f" stroke-width="3"/>';
    [p.lh,p.rh].forEach(function(pt){out+='<circle cx="'+pt[0]+'" cy="'+pt[1]+'" r="5" fill="#f7e2cc" stroke="#17121f" stroke-width="1.5"/>';});
    [p.lf,p.rf].forEach(function(pt){out+='<ellipse cx="'+(pt[0]-2)+'" cy="'+(pt[1]-1)+'" rx="10" ry="4.5" fill="#17121f"/>';});
    out+='<circle cx="'+p.h[0]+'" cy="'+p.h[1]+'" r="5.5" fill="#ad247c" stroke="white" stroke-width="1.5"/>';
    return out;
  }
  function defs(id){return '<defs><marker id="'+id+'-a" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L6 3.5 L0 7" fill="none" stroke="#7928ca" stroke-width="1.4"/></marker><marker id="'+id+'-o" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L6 3.5 L0 7" fill="none" stroke="#ad247c" stroke-width="1.4"/></marker></defs>';}
  function feetScene(id,q){
    var a=Math.min(q,1),x=lerp(172,219,a),y=lerp(139,215,a),r=lerp(-13,-4,a),loaded=Math.max(0,q-1);
    var s=text(20,30,'侧面放大：眼睛跟着鞋尖');
    s+='<path d="M 250 57 L250 275" stroke="#ded6e9" stroke-width="5"/>'+hold(220,215,'foot');
    s+='<path d="M74 76 Q108 51 142 76 Q108 101 74 76 Z" fill="#fff" stroke="#6d6478" stroke-width="2"/><circle cx="108" cy="76" r="10" fill="#7928ca"/>';
    s+='<path d="M 120 84 L 220 209" stroke="#7928ca" stroke-width="1.6" stroke-dasharray="4 4"/>';
    s+='<g transform="translate('+x+' '+y+') rotate('+r+')"><path d="M0 0 C-6 -13 -26 -18 -45 -18 L-82 -32 L-99 -21 L-96 -4 Q-49 3 0 0 Z" fill="#e4cef7" stroke="#17121f" stroke-width="3"/><path d="M-96 -4 Q-49 3 0 0" fill="none" stroke="#17121f" stroke-width="7"/><path d="M-78 -29 L-71 -52 L-48 -47 L-50 -20" fill="#e8eef1" stroke="#17121f" stroke-width="2"/></g>';
    s+='<circle cx="220" cy="215" r="7" fill="none" stroke="#ad247c" stroke-width="2"/>';
    s+=label(215,253,'有效接触面','end');
    if(q<1)s+=arrow(id,190,151,212,194);else s+=arrow(id,203,159,214,198,COLORS.orange);
    if(loaded>.2)s+=label(32,285,'先稳定脚，再转移身体');
    return s;
  }
  function readingScene(id,q){
    var points=[[89,250,'hand'],[150,242,'hand'],[210,180,'hand'],[117,130,'hand'],[224,62,'target'],[92,282,'foot'],[189,263,'foot'],[238,226,'foot'],[128,209,'foot'],[95,174,'foot'],[213,150,'foot']];
    var s=text(20,27,'示意线路：不代表原片的具体线路');
    points.forEach(function(p){s+=hold(p[0],p[1],p[2]);});s+=label(43,244,'起点','middle')+label(268,58,'终点','middle');
    var seq=[[150,242,210,180],[210,180,117,130],[117,130,224,62]];
    if(q>=.4){seq.forEach(function(a,i){s+='<path d="M '+a[0]+' '+a[1]+' L '+a[2]+' '+a[3]+'" fill="none" stroke="#7928ca" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#'+id+'-a)"/>';s+=label((a[0]+a[2])/2+10,(a[1]+a[3])/2,String(i+1));});}
    if(q>=1.3){s+='<path d="M 238 226 Q 261 197 210 180" fill="none" stroke="#ad247c" stroke-width="2" marker-end="url(#'+id+'-o)"/>';s+=label(276,215,'右脚','end')+label(269,178,'右手','end');}
    if(q>=2.5)s+=label(160,308,'试爬后：调整脚点或顺序','middle');
    return s;
  }
  function swapScene(id,q){
    var a=Math.min(q,1),b=Math.max(0,Math.min(q-1,1)),c=Math.max(0,Math.min(q-2,1));
    var lx=lerp(164,145,a)-48*c,ly=233-52*c,rx=lerp(262,193,a)-12*b-22*c,ry=lerp(153,198,a)+35*b;
    function shoe(x,y,mirror,color){return '<g transform="translate('+x+' '+y+') scale('+(mirror?-1:1)+' 1)"><path d="M0 0 C-7 -12 -24 -18 -38 -18 L-72 -31 L-88 -21 L-86 -3 Q-40 4 0 0 Z" fill="'+color+'" stroke="#17121f" stroke-width="2.5"/><path d="M-86 -3 Q-40 4 0 0" fill="none" stroke="#17121f" stroke-width="5"/></g>';}
    var s=text(18,28,'大脚点放大：小幅挤脚与交接');
    s+='<path d="M 133 237 L 198 237 L 187 256 L 143 253 Z" fill="#bd8ce6" stroke="#74459b" stroke-width="2"/>';
    s+=shoe(lx,ly,false,'#dcbdf5')+shoe(rx,ry,true,'#e7e5dd');
    s+=label(65,121,'原承重脚','middle')+label(254,121,'要换上的脚','middle');
    if(q<2)s+=arrow(id,160,157,lx,211,COLORS.orange);else s+=arrow(id,165,157,rx,211,COLORS.orange);
    if(q>=1&&q<2)s+=arrow(id,220,184,190,215);
    s+=label(163,289,q<2?'保持双手辅助稳定':'确认新脚踩稳，再移走旧脚','middle');
    return s;
  }
  function laybackScene(id,q){
    var t=Math.min(1,q),px=lerp(146,112,t),py=lerp(184,194,t); if(q>1){py-=16*(q-1);}
    var p=pose([px,py],[px+25,py-58],[226,91],[228,126],[186,99],[178,147],[184,215],[158,250],[236,234],[233,279]);
    var s=text(16,28,'侧面受力示意');s+='<path d="M244 54 L244 292" stroke="#ded6e9" stroke-width="9"/>';
    s+=hold(226,91,'hand')+hold(228,126,'hand')+hold(236,234,'foot')+hold(233,279,'foot')+body(p,{active:'both'},q);
    if(q>.4){s+=arrow(id,219,95,175,95,COLORS.orange)+arrow(id,193,236,228,236);s+=label(290,78,'手向外拉','end')+label(290,218,'脚向墙推','end');}
    s+=label(24,293,'两种力形成对抗');return s;
  }
  function topView(id,q){
    var turn=Math.min(q/2,1),cx=162,cy=353;
    var s='<path d="M55 330 L267 330" stroke="#c2a9dd" stroke-width="5"/>'+text(270,335,'墙');
    s+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="22" ry="9" fill="#e4cef7" stroke="#17121f" stroke-width="2" transform="rotate('+(-55*turn)+' '+cx+' '+cy+')"/>';
    s+='<circle cx="'+(cx+20*Math.cos(-55*turn*Math.PI/180))+'" cy="'+(cy+20*Math.sin(-55*turn*Math.PI/180))+'" r="4" fill="#7928ca"/>';
    s+='<path d="M 192 362 Q211 347 199 338" fill="none" stroke="#7928ca" stroke-width="2" marker-end="url(#'+id+'-a)"/>';
    s+=text(20,389,'俯视：右髋（紫点）转近墙面');return s;
  }
  function frameMarkup(id,l,q){
    var s=defs(id),height=l.title.indexOf('Drop')===0?408:326;
    if(l.view==='feet')s+=feetScene(id,q);
    else if(l.view==='swap')s+=swapScene(id,q);
    else if(l.view==='reading')s+=readingScene(id,q);
    else if(l.view==='layback')s+=laybackScene(id,q);
    else {
      s+=text(160,23,'背面视角：左 ← 攀爬者 → 右','middle');
      l.holds.forEach(function(h){s+=hold(h[0],h[1],h[2]);});
      var i=Math.min(Math.floor(q),l.frames.length-1),j=Math.min(i+1,l.frames.length-1),t=q-i,p=blend(l.frames[i],l.frames[j],t);
      s+='<path class="ca-gravity" d="M '+p.h[0]+' '+p.h[1]+' L '+p.h[0]+' 287"/>';
      s+=body(p,l,q);
      s+='<circle cx="19" cy="307" r="4" fill="#ad247c"/>'+text(29,311,'髋位置提示（非精确全身重心）');
      if(l.title.indexOf('Rock')===0){if(q<1.8)s+=arrow(id,164,190,204,190,COLORS.orange);else s+=arrow(id,259,213,259,170,COLORS.orange);}
      if(l.title==='同手同脚'&&q>=1)s+=arrow(id,244,226,244,195);
      if(l.title.indexOf('外旗')===0&&q>=.5){s+=label(49,288,'自由腿','middle')+label(256,286,'承重脚','middle');}
      if(l.title.indexOf('后旗')===0&&q>=.5){s+=label(48,286,'自由腿','middle')+label(169,287,'承重脚','middle');s+=text(20,48,'虚线腿从支撑腿后方经过');}
      if(l.title.indexOf('Drop')===0)s+=topView(id,q);
      if(l.title.indexOf('长手臂')===0&&q>=.5&&q<1.6){s+=label(42,169,'伸长','middle')+label(274,169,'伸长','middle');}
    }
    return '<svg class="ca-svg" viewBox="0 0 320 '+height+'" role="img" aria-label="'+l.title+'分步动作示意">'+s+'</svg>';
  }
  window.mountClimbingStoryboard = function(container,type){
    var lesson=lessons[type]; if(!container||!lesson)return; injectStyles();
    var last=lesson.stages.length-1,steps=[0,Math.ceil(last/2),last];
    if(last===2)steps=[0,1,2];
    container.innerHTML=steps.map(function(n,i){var id='story-'+(++serial);return '<figure class="frame-step climb-anim"><figcaption><span>'+(i+1)+'</span> '+lesson.stages[n][0]+'</figcaption>'+frameMarkup(id,lesson,n)+'<p>'+lesson.stages[n][1]+'</p></figure>';}).join('');
  };
  window.mountClimbingAnimation = function(container,type){
    if(typeof container==='string')container=document.querySelector(container);
    if(!container)throw new Error('Climbing animation container not found');
    var lesson=lessons[type];if(!lesson)throw new Error('Unknown climbing animation: '+type);
    if(container.__climbDestroy)container.__climbDestroy();injectStyles();
    var id='ca-'+(++serial),last=lesson.stages.length-1,q=0,raf=null,playing=false,start=0,from=0;
    var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.innerHTML='<div class="climb-anim"><p class="ca-stage"></p><div class="ca-canvas"></div><p class="ca-detail" aria-live="polite"></p><div class="ca-controls"><button class="ca-play" type="button">播放动画</button><button class="ca-prev" type="button">上一步</button><button class="ca-next" type="button">下一步</button><span class="ca-count"></span></div><label class="ca-caption" for="'+id+'-range">拖动查看动作过程</label><input class="ca-range" id="'+id+'-range" type="range" min="0" max="'+(last*100)+'" step="1" value="0" aria-label="'+lesson.title+'动作进度"><p class="ca-caption">原创教学示意；点位与人体比例已简化。请结合正文、真人演示和现场指导理解。</p></div>';
    var stage=container.querySelector('.ca-stage'),canvas=container.querySelector('.ca-canvas'),detail=container.querySelector('.ca-detail'),play=container.querySelector('.ca-play'),prev=container.querySelector('.ca-prev'),next=container.querySelector('.ca-next'),count=container.querySelector('.ca-count'),range=container.querySelector('.ca-range'),announced=-1;
    function draw(){
      q=Math.max(0,Math.min(last,q));canvas.innerHTML=frameMarkup(id,lesson,q);
      var n=Math.min(last,Math.round(q));stage.textContent=(n+1)+' · '+lesson.stages[n][0];
      if(n!==announced){detail.textContent=lesson.stages[n][1];announced=n;}
      count.textContent=(n+1)+' / '+(last+1);range.value=Math.round(q*100);prev.disabled=q<=0;next.disabled=q>=last;
      range.setAttribute('aria-valuetext','第 '+(n+1)+' 步：'+lesson.stages[n][0]);
    }
    function stop(){playing=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;play.textContent=q>=last?'重新播放':'播放动画';}
    function tick(now){if(!playing)return;if(!start)start=now;var elapsed=(now-start)/2100;q=Math.min(last,from+(reduced?Math.floor(elapsed):elapsed));draw();if(q>=last)stop();else raf=requestAnimationFrame(tick);}
    play.addEventListener('click',function(){if(playing){stop();return;}if(q>=last)q=0;from=q;start=0;playing=true;play.textContent='暂停';raf=requestAnimationFrame(tick);});
    prev.addEventListener('click',function(){stop();q=Math.max(0,Math.ceil(q-.001)-1);draw();});
    next.addEventListener('click',function(){stop();q=Math.min(last,Math.floor(q+.001)+1);draw();});
    range.addEventListener('input',function(){stop();q=Number(range.value)/100;draw();});
    if(reduced)play.textContent='播放（可随时暂停）';
    draw();container.__climbDestroy=function(){stop();};
    return {setStep:function(n){stop();q=Math.max(0,Math.min(last,n));draw();},pause:stop,destroy:container.__climbDestroy};
  };
})();
