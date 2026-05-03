
/* ════ PARTICLE SYSTEM ══════════════════════════════════
   Subtle drifting dots behind all UI — canvas at z-index:2
   Scroll parallax: particles shift at different rates by depth
════════════════════════════════════════════════════════ */
(function(){
  const cv=document.getElementById('particles');
  const ctx=cv.getContext('2d');
  let W,H;
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize);

  const N=60;
  const pts=[];
  for(let i=0;i<N;i++){
    const depth=Math.random();
    pts.push({
      x:Math.random()*W,
      y:Math.random()*H,
      r:0.8+depth*3.2,
      vx:(Math.random()-.5)*(0.22+depth*0.38),   // faster
      vy:(Math.random()-.5)*(0.16+depth*0.28),   // faster
      base:0.08+depth*0.18,                       // slightly lower opacity
      phase:Math.random()*Math.PI*2,
      ps:(Math.random()*.0022+.0006),             // faster phase
      depth,
    });
  }

  // Track scroll position across the whole page-stack
  let lastScroll=0,scrollVel=0;
  const stack=document.getElementById('page-stack');
  if(stack){
    stack.addEventListener('scroll',()=>{
      const s=stack.scrollTop;
      scrollVel=s-lastScroll;
      lastScroll=s;
    },{passive:true});
  }

  function draw(){
    if(cv.style.display==='none'){requestAnimationFrame(draw);return;}
    // Decay scroll velocity each frame
    scrollVel*=0.88;

    ctx.clearRect(0,0,W,H);
    for(const p of pts){
      p.phase+=p.ps;

      // Base drift
      p.x+=p.vx+Math.sin(p.phase)*0.04;
      p.y+=p.vy+Math.cos(p.phase*.7)*0.03;

      // Scroll parallax — near (high depth) particles shift more
      p.y-=scrollVel*(0.15+p.depth*0.55);

      // Wrap
      if(p.x<-4)p.x=W+4;if(p.x>W+4)p.x=-4;
      if(p.y<-4)p.y=H+4;if(p.y>H+4)p.y=-4;

      const op=p.base*(0.75+0.25*Math.sin(p.phase*1.4));
      const g=Math.round(155-p.depth*80); // far=light grey (155), near=darker (75)
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${g},${g},${g},${op})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ════ CURSOR + COMET TRAIL ══════════════════════════════ */
const cdot=document.getElementById('cdot');
const dCtx=cdot.getContext('2d');
const trailCanvas=document.getElementById('ctrail');
const tCtx=trailCanvas.getContext('2d');

function resizeTrail(){trailCanvas.width=window.innerWidth;trailCanvas.height=window.innerHeight;}
resizeTrail();window.addEventListener('resize',resizeTrail);

let mx=-200,my=-200;

// Cursor morph state: 0=circle, >0=down arrow, <0=up arrow (range -1..1)
let cursorMorph=0;       // current displayed value, lerped
let cursorMorphTarget=0; // driven by scroll velocity
let dotScale=1;          // for click squish

const TRAIL_LEN=36;
const trailPts=Array(TRAIL_LEN).fill(null).map(()=>({x:-400,y:-400,age:0}));
let trailHead=0;

// Shared scroll velocity (read by both particles and cursor)
let globalScrollVel=0;
const pageStackEl=document.getElementById('page-stack');
let _lastScroll2=0;
if(pageStackEl){
  pageStackEl.addEventListener('scroll',()=>{
    const s=pageStackEl.scrollTop;
    globalScrollVel=s-_lastScroll2;
    _lastScroll2=s;
  },{passive:true});
}

document.addEventListener('mousemove',e=>{
  mx=e.clientX;my=e.clientY;
  cdot.style.left=mx+'px';cdot.style.top=my+'px';
  trailPts[trailHead]={x:mx,y:my,age:1};
  trailHead=(trailHead+1)%TRAIL_LEN;
});

document.addEventListener('click',e=>{
  if(!perfMode&&fancyCursor){
    dotScale=0.44;
    setTimeout(()=>{dotScale=1;},130);
    const N=9;for(let i=0;i<N;i++){
      const p=document.createElement('div');p.className='cpar';
      const ang=(i/N)*Math.PI*2,dist=14+Math.random()*20;
      const pCol=document.body.classList.contains('night')?'rgba(220,225,255,.9)':'rgba(15,15,15,.85)';
      p.style.cssText=`left:${e.clientX}px;top:${e.clientY}px;width:${2.5+Math.random()*3}px;height:${2.5+Math.random()*3}px;background:${pCol};--tx:${Math.cos(ang)*dist}px;--ty:${Math.sin(ang)*dist}px;animation-duration:${.38+Math.random()*.2}s`;
      document.body.appendChild(p);setTimeout(()=>p.remove(),700);
    }
  }
});

// Draw the cursor shape on the cdot canvas
// t: -1=up arrow, 0=circle, 1=down arrow (lerped)
function drawCursor(t,scale){
  const S=24;
  dCtx.clearRect(0,0,S,S);
  const cx=S/2,cy=S/2;
  const absT=Math.abs(t);
  const dir=t>=0?1:-1; // 1=down, -1=up
  dCtx.save();
  dCtx.translate(cx,cy);
  dCtx.scale(scale,scale);

  // Lerp: circle radius shrinks as arrow grows
  const circleR=4*(1-absT);
  // Arrow params
  const arrowH=9*absT;       // height of arrowhead
  const arrowW=5.5*absT;     // half-width of arrowhead
  const stemW=1.8*absT;      // half-width of stem
  const stemH=5*absT;        // stem length (above/below arrowhead)

  dCtx.beginPath();

  if(absT<0.01){
    // Pure circle
    dCtx.arc(0,0,4,0,Math.PI*2);
  }else if(absT>0.98){
    // Pure arrow (down if dir=1, up if dir=-1)
    // tip at (0, dir*arrowH*0.5), tail at (0, -dir*(stemH+arrowH*0.5))
    const tip=dir*arrowH*0.5;
    const tailY=-dir*(stemH+arrowH*0.5);
    const arrowBaseY=tip-dir*arrowH;
    // Stem rect
    dCtx.moveTo(-stemW,tailY);
    dCtx.lineTo(-stemW,arrowBaseY);
    // Left wing of arrowhead
    dCtx.lineTo(-arrowW,arrowBaseY);
    // Tip
    dCtx.lineTo(0,tip);
    // Right wing
    dCtx.lineTo(arrowW,arrowBaseY);
    // Stem right side
    dCtx.lineTo(stemW,arrowBaseY);
    dCtx.lineTo(stemW,tailY);
    dCtx.closePath();
  }else{
    // Morphing blend: draw circle shrinking + arrow growing
    // Circle
    if(circleR>0.3){
      dCtx.arc(0,0,circleR,0,Math.PI*2);
      dCtx.closePath();
    }
    // Arrow (partially formed)
    const tip=dir*arrowH*0.5;
    const tailY=-dir*(stemH+arrowH*0.5);
    const arrowBaseY=tip-dir*arrowH;
    dCtx.moveTo(-stemW,tailY);
    dCtx.lineTo(-stemW,arrowBaseY);
    dCtx.lineTo(-arrowW,arrowBaseY);
    dCtx.lineTo(0,tip);
    dCtx.lineTo(arrowW,arrowBaseY);
    dCtx.lineTo(stemW,arrowBaseY);
    dCtx.lineTo(stemW,tailY);
    dCtx.closePath();
  }

  const fsOpen=document.getElementById('focus-fs')?.classList.contains('open');
  const cursorColor=fsOpen?'rgba(255,255,255,0.85)':document.body.classList.contains('night')?'rgba(240,240,255,1)':'rgba(15,15,15,1)';
  dCtx.fillStyle=cursorColor;
  dCtx.fill();
  dCtx.restore();
}

(function anim(){
  // Drive morph target from scroll velocity, clamped -1..1
  const vel=globalScrollVel;
  globalScrollVel*=0.55; // fast decay — clears within ~4 frames after scroll stops
  cursorMorphTarget=Math.max(-1,Math.min(1,vel*0.35)); // more sensitive

  // Very fast lerp — essentially instant on scroll, snaps back quickly when stopped
  cursorMorph+=(cursorMorphTarget-cursorMorph)*0.45;
  if(Math.abs(cursorMorph)<0.008)cursorMorph=0;

  // Smooth scale lerp for click squish
  // (dotScale is set instantly on click, we lerp back)
  const dispScale=dotScale+(1-dotScale)*(1-0.22); // quick
  // Draw the morphed cursor
  drawCursor(cursorMorph,dispScale);

  // Age trail points
  for(let i=0;i<TRAIL_LEN;i++){trailPts[i].age*=0.78;}

  tCtx.clearRect(0,0,trailCanvas.width,trailCanvas.height);

  // Build ordered array newest→oldest, skip dead points
  const ordered=[];
  for(let i=0;i<TRAIL_LEN;i++){
    const idx=(trailHead-1-i+TRAIL_LEN)%TRAIL_LEN;
    const p=trailPts[idx];
    if(p.age<0.01)break;
    ordered.push(p);
  }

  if(ordered.length>=2){
    // Measure speed at head (px moved between newest two points)
    const dx=ordered[0].x-ordered[1].x;
    const dy=ordered[0].y-ordered[1].y;
    const speed=Math.hypot(dx,dy);
    // Width: thicker when moving fast, thinner when slow
    const maxW=Math.min(5.5,1.8+speed*0.18);
    // Night mode: white trail; day: dark trail
    const _fsOpen=document.getElementById('focus-fs')?.classList.contains('open');
    const trailRGB=_fsOpen?'255,255,255':document.body.classList.contains('night')?'245,245,255':'15,15,15';

    // Draw trail as a series of line segments with lineWidth tapering head→tail
    for(let i=0;i<ordered.length-1;i++){
      const a=ordered[i],b=ordered[i+1];
      const progress=i/(ordered.length-1);
      const alpha=ordered[0].age*(1-progress)*0.6;
      const w=Math.max(0.3,maxW*(1-progress));

      tCtx.beginPath();
      tCtx.moveTo(a.x,a.y);
      tCtx.lineTo(b.x,b.y);
      tCtx.strokeStyle=`rgba(${trailRGB},${alpha})`;
      tCtx.lineWidth=w;
      tCtx.lineCap='round';
      tCtx.lineJoin='round';
      tCtx.stroke();
    }
  }

  requestAnimationFrame(anim);
})();

/* ════ PILL SIDEBAR — proximity + drag ══════════════════ */
const pill=document.getElementById('pill'),mainEl=document.getElementById('main'),pbtn=document.getElementById('pinbtn'),grip=document.getElementById('pill-grip');
let pinned=localStorage.getItem('stpin4')==='1';
let pillX=parseFloat(localStorage.getItem('stpx4')||'14');
let pillY=parseFloat(localStorage.getItem('stpy4')||String(window.innerHeight/2-120));
const PROX=130;
let pillHov=false;

function setPillPos(x,y){
  const pw=pill.classList.contains('open')?216:56;
  const ph=pill.getBoundingClientRect().height||300;
  pillX=Math.max(8,Math.min(window.innerWidth-pw-8,x));
  pillY=Math.max(8,Math.min(window.innerHeight-ph-8,y));
  pill.style.left=pillX+'px';pill.style.top=pillY+'px';pill.style.transform='none';
  localStorage.setItem('stpx4',pillX);localStorage.setItem('stpy4',pillY);
}
setPillPos(pillX,pillY);

const pageStack=document.getElementById('page-stack');

function setSBPush(on){
  pageStack.style.left = on ? '222px' : '0px';
}

function applySB(){
  if(pinned){
    pill.classList.add('open');
    pbtn.classList.add('on');
    setSBPush(true);
  } else {
    if(!pillHov) pill.classList.remove('open');
    pbtn.classList.remove('on');
    setSBPush(false);
  }
}
function togglePin(){
  pinned=!pinned;
  localStorage.setItem('stpin4',pinned?'1':'0');
  if(pinned){
    // Animate to default home position
    const homeX=14;
    const homeY=Math.round(window.innerHeight/2-120);
    pill.style.left=homeX+'px';
    pill.style.top=homeY+'px';
    pill.style.transform='none';
    // Update tracked position after animation settles
    setTimeout(()=>{
      pillX=homeX;pillY=homeY;
      localStorage.setItem('stpx4',pillX);
      localStorage.setItem('stpy4',pillY);
    },480);
  }
  applySB();
  showToast(pinned?'Sidebar pinned':'Sidebar unpinned');
}

// Drag — suppress position transition while dragging, restore after
let dragging=false,dragOX=0,dragOY=0;
grip.addEventListener('mousedown',e=>{
  e.preventDefault();
  dragging=true;
  dragOX=e.clientX-pillX;
  dragOY=e.clientY-pillY;
  document.body.style.userSelect='none';
  // Strip left/top from transition so cursor tracks instantly
  pill.style.transition='width .34s cubic-bezier(.4,0,.2,1),border-radius .34s,background .2s';
});
document.addEventListener('mousemove',e=>{if(!dragging)return;setPillPos(e.clientX-dragOX,e.clientY-dragOY);});
document.addEventListener('mouseup',()=>{
  if(dragging){
    dragging=false;
    document.body.style.userSelect='';
    pill.style.transition=''; // Restore CSS transition (falls back to stylesheet)
  }
});

// Proximity hover expand
document.addEventListener('mousemove',e=>{
  if(pinned||dragging)return;
  const r=pill.getBoundingClientRect();
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const dist=Math.hypot(e.clientX-cx,e.clientY-cy);
  if(dist<PROX&&!pillHov){pillHov=true;pill.classList.add('open');}
  else if(dist>PROX+35&&pillHov){pillHov=false;pill.classList.remove('open');}
});
applySB();

/* ════ SUBJECT ICONS ════════════════════════════════════ */
const SIC={
  mathematics:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M12 4v16M4 12h16M6 6l12 12M18 6L6 18"/></svg>`,
  english:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>`,
  science:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v8L5.5 18.5a1 1 0 00.9 1.5h11.2a1 1 0 00.9-1.5L15 11V3M9 3h6"/></svg>`,
  music:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  commerce:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h18v4H3zM5 7v14M19 7v14M9 11h6M9 15h6"/></svg>`,
  geography:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M3 12h18M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18"/></svg>`,
  history:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  'history elective':`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  pdhpe:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 20l3-7 4 3 4-3 3 7M8 13l4-8 4 8"/></svg>`,
  pe:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 20l3-7 4 3 4-3 3 7M8 13l4-8 4 8"/></svg>`,
  'extra pe':`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 20l3-7 4 3 4-3 3 7M8 13l4-8 4 8"/></svg>`,
  careers:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path stroke-linecap="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`,
  volleyball:`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 6 6 0 18M12 3c-3 3-6 6 0 18M3 12h18"/></svg>`,
  'roll call':`<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
};

/* ════ TIMETABLE DATA ═══════════════════════════════════ */
// Times are AEDT local (UTC+11), sourced from ICS + PDF
const TT={monday:[],tuesday:[],wednesday:[],thursday:[],friday:[]};
const DKEYS=['','monday','tuesday','wednesday','thursday','friday'];
function toM(h,m){return h*60+m;}
// MM:SS under an hour; H:MM:SS once it crosses 60 minutes. Hours unpadded so
// "1:15:30" reads naturally instead of "01:15:30". Floors to whole seconds.
function fmtCountdown(remSec){
  let s=Math.max(0,Math.floor(remSec));
  const h=Math.floor(s/3600);s-=h*3600;
  const m=Math.floor(s/60);s-=m*60;
  const p=n=>String(n).padStart(2,'0');
  return h>0?`${h}:${p(m)}:${p(s)}`:`${p(m)}:${p(s)}`;
}
function getCurNxt(){
  const now=new Date(),nm=toM(now.getHours(),now.getMinutes())+now.getSeconds()/60,dow=now.getDay();
  if(dow<1||dow>5)return{cur:null,nxt:null,weekend:true};
  const s=TT[DKEYS[dow]];let cur=null,nxt=null,ci=-1;
  for(let i=0;i<s.length;i++){const p=s[i];if(nm>=toM(...p.s)&&nm<toM(...p.e)){cur=p;ci=i;break;}}
  for(let i=ci>=0?ci+1:0;i<s.length;i++){if(toM(...s[i].s)>nm){nxt=s[i];break;}}
  return{cur,nxt,weekend:false};
}

/* ════ TAB TITLE ════════════════════════════════════════ */
function updateTabTitle(){
  const pad=n=>String(n).padStart(2,'0');
  // Focus timer running
  if(ftRunning&&!ftPaused){
    const m=Math.floor(ftRemSecs/60),s=ftRemSecs%60;
    document.title=`${pad(m)}:${pad(s)} | stream.`;
    return;
  }
  // Stopwatch running
  if(swRunning){
    const ms=swElapsed+(Date.now()-swStart);
    const sec=Math.floor(ms/1000),min=Math.floor(sec/60),hr=Math.floor(min/60);
    document.title=`${pad(hr)}:${pad(min%60)}:${pad(sec%60)} | stream.`;
    return;
  }
  // Neither: show time to next period
  try{
    const{cur,nxt,weekend}=getCurNxt();
    if(!weekend&&nxt){
      const now=new Date(),nm=toM(now.getHours(),now.getMinutes())+now.getSeconds()/60;
      const rem=toM(...nxt.s)-nm;
      const label=nxt.subj||nxt.l||'next period';
      document.title=`${fmtCountdown(rem*60)} to ${label} | stream.`;
      return;
    }
  }catch(e){}
  document.title='stream.';
}

/* ════ TICK ══════════════════════════════════════════════ */
function tick(){
  const now=new Date(),h=now.getHours(),nm=toM(h,now.getMinutes())+now.getSeconds()/60;
  let gr='good morning';if(h>=17)gr='good evening';else if(h>=12)gr='good afternoon';
  const eyeEl=document.getElementById('h-eye');if(eyeEl)eyeEl.textContent=gr;

  // Floating clock widget — 24h with seconds, centred
  const cwt=document.getElementById('cw-time'),cwsc=document.getElementById('cw-secs'),cwd=document.getElementById('cw-date');
  if(cwt){
    // Set just the text node (first child), leaving the <span> intact
    cwt.firstChild.textContent=`${String(h).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if(cwsc)cwsc.textContent=`:${String(now.getSeconds()).padStart(2,'0')}`;
    if(cwd)cwd.textContent=now.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  }

  const T=document.getElementById('h-timer'),L=document.getElementById('h-lbl'),P=document.getElementById('h-per'),R=document.getElementById('h-room'),G=document.getElementById('h-prog');
  if(!T)return;
  const{cur,nxt,weekend}=getCurNxt();
  // Outside school (weekend or no periods left today): defer to calendar event
  // countdown if an event is active or upcoming. School timetable always wins
  // when in session, so a calendar event labelled "school" is ignored then.
  if(!cur&&!nxt){
    const calCd=(typeof getActiveCalCountdown==='function')?getActiveCalCountdown(now):null;
    if(calCd){
      const remSec=Math.max(0,calCd.remSec);
      T.textContent=fmtCountdown(remSec);
      if(calCd.type==='active'){
        L.textContent='in progress';
        P.textContent=calCd.ev.name||'event';
        R.textContent=calCd.ev.endTime?`until ${calCd.ev.endTime}`:'';
        const pct=calCd.totalSec>0?Math.max(0,remSec/calCd.totalSec):0;
        G.style.width=Math.min(100,(1-pct)*100)+'%';
      }else{
        L.textContent='until '+(calCd.ev.name||'event');
        P.textContent=calCd.ev.name||'event';
        R.textContent=calCd.ev.time||'';
        G.style.width='0%';
      }
      if(!pinnedSubj)updateSubjTile(null);
      if(curPage==='cal')renderExamList();
      updateTabTitle();
      if(typeof zenSyncTimer==='function')zenSyncTimer();
      return;
    }
  }
  if(weekend){T.textContent='—';L.textContent='no school';P.textContent='Weekend';R.textContent='';G.style.width='0%';if(!pinnedSubj)updateSubjTile(null);return;}
  const ib=p=>!p||!p.subj;
  if(cur){
    const pe=toM(...cur.e),rem=pe-nm;
    const tot=pe-toM(...cur.s),el=nm-toM(...cur.s);
    L.textContent=ib(cur)?cur.l:'in session';
    P.textContent=ib(cur)?cur.l:cur.subj;
    R.textContent=ib(cur)?'':(cur.room||'');
    T.textContent=fmtCountdown(rem*60);
    G.style.width=Math.min(el/tot*100,100)+'%';
    if(!pinnedSubj)updateSubjTile(ib(cur)?null:cur.subj);
  }else if(nxt){
    const ps=toM(...nxt.s),rem=ps-nm;
    L.textContent=ib(nxt)?'next up':'next period';
    P.textContent=ib(nxt)?nxt.l:nxt.subj;
    R.textContent=ib(nxt)?'':(nxt.room||'');
    T.textContent=fmtCountdown(rem*60);
    G.style.width='0%';if(!pinnedSubj)updateSubjTile(null);
  }else{
    T.textContent='done';L.textContent='school ended';P.textContent='See you tomorrow';R.textContent='';G.style.width='100%';if(!pinnedSubj)updateSubjTile(null);
  }
  if(curPage==='cal')renderExamList();
  updateTabTitle();
  if(typeof zenSyncTimer==='function')zenSyncTimer();
}
setInterval(tick,1000);

let pinnedSubj=null;

function pinSubjTile(subj){
  pinnedSubj=(pinnedSubj===subj)?null:subj;
  // Show/hide unpin X
  const unpin=document.getElementById('sched-unpin');
  if(unpin)unpin.style.display=pinnedSubj?'flex':'none';
  // Update ts-row highlights
  document.querySelectorAll('.ts-row[data-subj]').forEach(r=>{
    r.classList.toggle('ts-pinned',r.dataset.subj===pinnedSubj);
  });
  animateSubjTile(pinnedSubj||getCurSubj()||null);
}

function unpinSubj(){
  pinnedSubj=null;
  const unpin=document.getElementById('sched-unpin');
  if(unpin)unpin.style.display='none';
  document.querySelectorAll('.ts-row[data-subj]').forEach(r=>r.classList.remove('ts-pinned'));
  animateSubjTile(getCurSubj()||null);
}

function animateSubjTile(subj){
  const wrap=document.getElementById('st-content');
  if(!wrap){updateSubjTile(subj);return;}
  wrap.classList.add('fading');
  setTimeout(()=>{
    updateSubjTile(subj);
    wrap.classList.remove('fading');
    wrap.classList.remove('faded-in');
    void wrap.offsetWidth; // force reflow
    wrap.classList.add('faded-in');
    setTimeout(()=>wrap.classList.remove('faded-in'),360);
  },180);
}

function stQuickAdd(){
  const subj=pinnedSubj||getCurSubj()||'';
  // Open homework modal pre-filled with this subject
  openHWModal();
  if(subj)setTimeout(()=>{document.getElementById('hw-subj').value=subj;},50);
}

function updateSubjTile(subj){
  const eye=document.getElementById('st-eye'),name=document.getElementById('st-name'),remsEl=document.getElementById('st-rems'),addBtn=document.getElementById('st-add-btn');
  if(!eye)return;
  if(!subj){
    eye.textContent='between classes';
    name.textContent='free';
    remsEl.innerHTML='<div class="st-lucky">Nothing on right now.</div>';
    if(addBtn)addBtn.style.display='none';
    return;
  }
  const sc=subjColour(subj);
  const isPinned=!!pinnedSubj;
  eye.textContent=isPinned?`pinned · ${subj}`:'in session';
  name.textContent=subj;
  // Tint the tile subtly with the subject colour
  const tile=document.getElementById('subj-tile');
  if(tile&&sc){
    tile.style.background=`linear-gradient(135deg,color-mix(in srgb,${sc} 22%,rgba(15,15,20,.9)) 0%,color-mix(in srgb,${sc} 12%,rgba(28,28,40,.92)) 100%)`;
  }else if(tile){
    tile.style.background='';
  }

  const sr=rems.filter(r=>!r.done&&r.subj===subj);
  const sh=hw.filter(h=>!h.done&&h.subj===subj);

  let html='';
  if(sr.length===0&&sh.length===0){
    const luckys=['lucky you — nothing due.','all clear for '+subj+' ✓','you\'re on top of it.','nothing logged here.'];
    html=`<div class="st-lucky">${luckys[Math.floor(Math.random()*luckys.length)]}</div>`;
  }else{
    sh.forEach(h=>{
      const overdue=h.due&&h.due<new Date().toISOString().split('T')[0];
      html+=`<div class="st-rem" style="display:flex;align-items:center;gap:6px">
        <span style="font-size:9px;opacity:.5">📚</span>
        <span style="flex:1">${esc(h.task)}${h.due?` <span style="font-size:10px;opacity:.55">${overdue?'⚠ ':''}`+formatHWDate(h.due)+'</span>':''}</span>
        ${h.link?`<a href="${esc(h.link)}" target="_blank" rel="noopener" style="font-size:9px;opacity:.5;color:inherit;text-decoration:none;cursor:none" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.5">↗</a>`:''}
      </div>`;
    });
    sr.forEach(r=>{
      html+=`<div class="st-rem" style="display:flex;align-items:center;gap:6px"><span style="font-size:9px;opacity:.5">📌</span><span>${esc(r.text)}</span></div>`;
    });
  }
  remsEl.innerHTML=html;
  if(addBtn)addBtn.style.display='';
}

/* ════ TIMETABLE RENDER ═════════════════════════════════ */
function renderTT(){
  const g=document.getElementById('ttg');g.innerHTML='';
  const days=['monday','tuesday','wednesday','thursday','friday'];

  // Check if any timetable data exists
  const hasData=days.some(d=>TT[d]&&TT[d].length>0);
  if(!hasData){
    g.style.display='block';
    g.innerHTML=`<div class="es" style="padding:40px;text-align:center;grid-column:1/-1">
      <div style="font-size:32px;margin-bottom:14px;opacity:.3">📅</div>
      <div style="font-size:15px;font-weight:500;margin-bottom:8px">No timetable imported yet</div>
      <div style="font-size:13px;color:var(--t3);margin-bottom:18px;line-height:1.6">Import your <span style="font-family:'Geist Mono',monospace;font-size:11px">.ics</span> file to populate your timetable.</div>
      <button class="btn bd" onclick="showTTImport()" style="margin:0 auto">Import .ics file</button>
    </div>`;
    return;
  }
  g.style.display='';
  const{cur}=getCurNxt();
  const corner=document.createElement('div');corner.className='tt-corner';g.appendChild(corner);
  days.forEach(d=>{const el=document.createElement('div');el.className='tt-dh';el.innerHTML=`<div class="dds">${d.slice(0,3).toUpperCase()}</div><div>${d[0].toUpperCase()+d.slice(1)}</div>`;g.appendChild(el);});
  const rows=['roll call','period 1','period 2','recess','period 3','period 4','period 5','period 6','lunch','period 7','period 8'];
  // Baulko Wednesday: lunch bell is in the period 6 slot, period 6 is in the lunch slot
  const wedSwap={'period 6':'lunch','lunch':'period 6'};
  const dm={};days.forEach(d=>{dm[d]={};TT[d].forEach(p=>{const k=p.l.startsWith('period')?p.l:p.l.includes('lunch')?'lunch':p.l.includes('recess')?'recess':p.l;dm[d][k]=p;});});
  rows.forEach(rk=>{
    const ph=document.createElement('div');ph.className='tt-ph';
    let ts='';for(const d of days){const p=dm[d][rk];if(p){const pad=n=>String(n).padStart(2,'0');ts=`${p.s[0]}:${pad(p.s[1])}–${p.e[0]}:${pad(p.e[1])}`;break;}}
    ph.innerHTML=`<div class="phn">${rk}</div><div class="pht">${ts}</div>`;g.appendChild(ph);
    days.forEach((d,di)=>{
      // For Wednesday, swap the lookup key so lunch shows in p6 row and vice versa
      const lookupKey=d==='wednesday'&&wedSwap[rk]?wedSwap[rk]:rk;
      const p=dm[d][lookupKey];const cell=document.createElement('div');
      const displayBreak=d==='wednesday'?wedSwap[rk]||rk:rk;
      if(rk==='recess'||(rk==='lunch'&&d!=='wednesday')||(rk==='period 6'&&d==='wednesday'&&!p)){
        cell.className='ttbr';cell.innerHTML=`<div class="ttbrl">${rk==='recess'?'recess':'lunch'}</div>`;
      }else if(rk==='lunch'&&d==='wednesday'){
        // Wednesday: lunch row shows period 6 content
        if(p&&p.subj){
          const isNow=cur&&cur.subj===p.subj&&cur.l===p.l&&new Date().getDay()===di+1;
          cell.className='ttc'+(isNow?' now':'');
          const icon=p.icon&&TT_ICONS[p.icon]?TT_ICONS[p.icon]:(SIC[p.subj]||SIC['roll call']);
          const sc=subjColour(p.subj);
          if(sc)cell.style.borderTopColor=sc;
          cell.innerHTML=`<div class="tt-sj"><div class="tt-ic">${icon}</div><div><div class="ttn">${p.subj}</div><div class="ttr">${p.room||''}</div></div></div>`;
          cell.dataset.day=d;cell.dataset.period=lookupKey;
          cell.addEventListener('dblclick',()=>openTTEdit(d,lookupKey,p));
        }else{cell.className='ttbr';cell.innerHTML=`<div class="ttbrl">—</div>`;}
      }else if(rk==='period 6'&&d==='wednesday'){
        cell.className='ttbr';cell.innerHTML=`<div class="ttbrl">lunch</div>`;
      }else if(rk==='lunch'){
        cell.className='ttbr';cell.innerHTML=`<div class="ttbrl">lunch</div>`;
      }else if(p&&p.subj){
        const isNow=cur&&cur.subj===p.subj&&cur.l===p.l&&new Date().getDay()===di+1;
        cell.className='ttc'+(isNow?' now':'');
        const icon=p.icon&&TT_ICONS[p.icon]?TT_ICONS[p.icon]:(SIC[p.subj]||SIC['roll call']);
        const sc=subjColour(p.subj);
        if(sc)cell.style.borderTopColor=sc;
        cell.innerHTML=`<div class="tt-sj"><div class="tt-ic">${icon}</div><div><div class="ttn">${p.subj}</div><div class="ttr">${p.room||''}</div></div></div>`;
        cell.dataset.day=d;cell.dataset.period=rk;
        cell.addEventListener('dblclick',()=>openTTEdit(d,rk,p));
      }else{cell.className='ttbr';cell.innerHTML=`<div class="ttbrl">—</div>`;}
      g.appendChild(cell);
    });
  });
}

/* ════ SUPABASE SYNC ═════════════════════════════════════
   All user data keys are synced to Supabase under the
   authenticated user's ID. localStorage stays as the
   offline/fallback cache — both are always written together.
════════════════════════════════════════════════════════ */
const SB_URL='https://wbbiqcdmkmydwshzvize.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiYmlxY2Rta215ZHdzaHp2aXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc1MzMsImV4cCI6MjA4OTkyMzUzM30.EACRq05DU5NErRKl8NY6MvrQNnDv9HbgqGDIX5-Wan8';
const SB_SYNC_KEYS=['st_r5','st_e5','st_l5','st_p5','st_x5','st_hw','st_mb1','st_name','st_ics','st_friends','st_deleted_ids'];
let sbUserId=null;
let sbAuthToken=null;

async function sbFetch(path,opts={}){
  const headers={'apikey':SB_KEY,'Content-Type':'application/json',...(sbAuthToken?{'Authorization':'Bearer '+sbAuthToken}:{}),...(opts.headers||{})};
  return fetch(SB_URL+path,{...opts,headers});
}

// Dirty queue: keys whose local value has not yet been confirmed pushed.
// Persisted in localStorage so failed/aborted pushes survive a refresh.
function _sbDirtyGet(){try{return JSON.parse(localStorage.getItem('sb_dirty')||'{}');}catch{return{};}}
function _sbDirtySet(o){try{localStorage.setItem('sb_dirty',JSON.stringify(o));}catch{}}
function _sbMarkDirty(k,ts){const d=_sbDirtyGet();d[k]=ts;_sbDirtySet(d);}
function _sbClearDirty(k,ts){const d=_sbDirtyGet();if(d[k]===ts){delete d[k];_sbDirtySet(d);}}
function _sbIsDirty(k){const d=_sbDirtyGet();return Object.prototype.hasOwnProperty.call(d,k);}

let _sbRetryTimer=null;
function _sbScheduleRetry(ms=3000){if(_sbRetryTimer)return;_sbRetryTimer=setTimeout(()=>{_sbRetryTimer=null;_sbReplayDirty();},ms);}

// Push a single key. On success, advance sb_push_ts and clear dirty for that ts.
// On failure, leave dirty intact and schedule a retry.
async function _sbPushKey(k,v,ts){
  if(!sbUserId)return false;
  try{
    const r=await sbFetch('/rest/v1/entries',{
      method:'POST',
      headers:{'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({user_id:sbUserId,key:k,value:JSON.stringify(v),updated_at:ts})
    });
    if(!r.ok)throw 0;
    const localTs=JSON.parse(localStorage.getItem('sb_push_ts')||'{}');
    localTs[k]=ts;
    localStorage.setItem('sb_push_ts',JSON.stringify(localTs));
    _sbClearDirty(k,ts);
    return true;
  }catch{
    _sbScheduleRetry();
    return false;
  }
}

// Replay every dirty key from localStorage. Called on init, on visibility return,
// and on push failure backoff. Idempotent — same ts means upsert overwrites with
// identical row.
async function _sbReplayDirty(){
  if(!sbUserId)return;
  const d=_sbDirtyGet();
  const keys=Object.keys(d);
  for(const k of keys){
    const ts=d[k];
    const raw=localStorage.getItem(k);
    if(raw==null){_sbClearDirty(k,ts);continue;}
    let parsed;try{parsed=JSON.parse(raw);}catch{parsed=raw;}
    await _sbPushKey(k,parsed,ts);
  }
}

// Flush dirty queue using keepalive fetch so the request survives page close /
// navigation. Browsers cap keepalive bodies at ~64KB but our rows are tiny.
function _sbFlushOnHide(){
  if(!sbUserId||!sbAuthToken)return;
  const d=_sbDirtyGet();
  const keys=Object.keys(d);
  if(!keys.length)return;
  for(const k of keys){
    const ts=d[k];
    const raw=localStorage.getItem(k);
    if(raw==null)continue;
    try{
      fetch(SB_URL+'/rest/v1/entries',{
        method:'POST',
        keepalive:true,
        headers:{
          'apikey':SB_KEY,
          'Content-Type':'application/json',
          'Authorization':'Bearer '+sbAuthToken,
          'Prefer':'resolution=merge-duplicates'
        },
        body:JSON.stringify({user_id:sbUserId,key:k,value:raw,updated_at:ts})
      });
    }catch{}
  }
}
window.addEventListener('pagehide',_sbFlushOnHide);
window.addEventListener('beforeunload',_sbFlushOnHide);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')_sbFlushOnHide();});

// Write one key to Supabase (upsert). Marks dirty before push so an aborted /
// failed request can be replayed on next load.
async function sbSet(k,v){
  const ts=new Date().toISOString();
  _sbMarkDirty(k,ts); // mark dirty BEFORE checking login so offline edits survive session restore
  if(!sbUserId)return;
  return _sbPushKey(k,v,ts);
}

// Read all keys for the current user from Supabase (includes timestamps for conflict resolution)
async function sbLoadAll(){
  if(!sbUserId)return null;
  try{
    const r=await sbFetch(`/rest/v1/entries?select=key,value,updated_at&user_id=eq.${sbUserId}`);
    if(!r.ok)return null;
    const rows=await r.json();
    const out={};
    rows.forEach(row=>{
      try{out[row.key]={data:JSON.parse(row.value),updated_at:row.updated_at};}catch{out[row.key]={data:row.value,updated_at:row.updated_at};}
    });
    return out;
  }catch{return null;}
}

// sv — write to localStorage + Supabase
function sv(k,v){
  localStorage.setItem(k,JSON.stringify(v));
  sbSet(k,v);
}

// Auth: send magic link
// Auth: sign in with email+password
async function sbSignIn(email,password){
  const r=await sbFetch('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
  if(!r.ok){const e=await r.json();return{error:e.error_description||e.msg||'Invalid email or password'};}
  return await r.json();
}

// Auth: sign up with email+password
async function sbSignUp(email,password){
  const r=await sbFetch('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});
  const d=await r.json();
  if(!r.ok){return{error:d.error_description||d.msg||'Sign up failed'};}
  // Auto sign-in after sign-up
  if(d.access_token)return d;
  // Email confirmation required — sign in immediately
  return sbSignIn(email,password);
}

// Auth: get session from Supabase (checks stored token)
async function sbGetSession(){
  const stored=localStorage.getItem('sb_session');
  if(!stored)return null;
  try{
    const sess=JSON.parse(stored);
    if(sess.expires_at&&Date.now()/1000>sess.expires_at-60){
      const r=await sbFetch('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:sess.refresh_token})});
      if(!r.ok){localStorage.removeItem('sb_session');return null;}
      const fresh=await r.json();
      localStorage.setItem('sb_session',JSON.stringify(fresh));
      return fresh;
    }
    return sess;
  }catch{return null;}
}

// Apply remote data over local state.
// Keys present in the dirty queue (local edit not yet confirmed pushed) are
// skipped — local is authoritative until the push is acknowledged. This is
// what makes deletions stick: a stale remote pull cannot resurrect a deleted
// item if the deletion is still pending push.
function _getDeletedIds(){try{return new Set(JSON.parse(localStorage.getItem('st_deleted_ids')||'[]'));}catch{return new Set();}}
function _addDeletedId(id){const ids=_getDeletedIds();ids.add(id);const arr=[...ids];localStorage.setItem('st_deleted_ids',JSON.stringify(arr));sbSet('st_deleted_ids',arr);}
function _filterDeleted(arr){const ids=_getDeletedIds();return Array.isArray(arr)?arr.filter(x=>x&&!ids.has(x.id)):arr;}

function applyRemoteData(remote){
  if(!remote)return;
  const dirty=_sbDirtyGet();
  // remote[key] is {data, updated_at}; return undefined for dirty keys so we skip them.
  const get=(k)=>{
    if(dirty[k])return undefined;
    const v=remote[k];return v!==undefined?(v.data!==undefined?v.data:v):undefined;
  };
  // Apply remote deleted_ids first (union — IDs are never un-deleted)
  const remDelRaw=remote['st_deleted_ids'];
  const remDel=remDelRaw?(remDelRaw.data!==undefined?remDelRaw.data:remDelRaw):undefined;
  if(remDel&&Array.isArray(remDel)&&!dirty['st_deleted_ids']){
    const local=_getDeletedIds();let ch=false;
    remDel.forEach(id=>{if(!local.has(id)){local.add(id);ch=true;}});
    if(ch)localStorage.setItem('st_deleted_ids',JSON.stringify([...local]));
  }
  const r5=get('st_r5');if(r5!==undefined){rems=_filterDeleted(r5);localStorage.setItem('st_r5',JSON.stringify(rems));}
  const e5=get('st_e5');if(e5!==undefined){evs=_filterDeleted(e5);localStorage.setItem('st_e5',JSON.stringify(evs));}
  const l5=get('st_l5');if(l5!==undefined){logs=l5;localStorage.setItem('st_l5',JSON.stringify(logs));}
  const p5=get('st_p5');if(p5!==undefined){papers=p5;localStorage.setItem('st_p5',JSON.stringify(papers));}
  const x5=get('st_x5');if(x5!==undefined){exams=_filterDeleted(x5);localStorage.setItem('st_x5',JSON.stringify(exams));}
  const hw5=get('st_hw');if(hw5!==undefined){hw=_filterDeleted(hw5);localStorage.setItem('st_hw',JSON.stringify(hw));}
  const mb=get('st_mb1');if(mb!==undefined){marks=mb;localStorage.setItem('st_mb1',JSON.stringify(marks));}
  const name=get('st_name');if(name){localStorage.setItem('st_name',name);applyName(name);}
  const ics=get('st_ics');
  if(ics){
    const parsed=typeof ics==='string'?JSON.parse(ics):ics;
    localStorage.setItem('st_ics',JSON.stringify(parsed));applyICS(parsed);
  }
  // Friends use union-merge (never drops on stale remote) so dirty-skip doesn't apply here.
  const fr=remote['st_friends']!==undefined?(remote['st_friends'].data!==undefined?remote['st_friends'].data:remote['st_friends']):undefined;
  if(fr!==undefined){
    // Merge remote + local by user_id — never drop a friend due to a stale remote snapshot
    const merged=[...lbFriends];
    for(const f of (Array.isArray(fr)?fr:[])){
      if(f?.user_id&&!merged.some(m=>m.user_id===f.user_id))merged.push(f);
    }
    lbFriends=merged;
    localStorage.setItem('st_friends',JSON.stringify(lbFriends));
  }
  if(window.innerWidth<=640){mhRenderHeroPanel();mhRenderRems();mhRenderHW();mhRenderCal();mhRenderExams();mhRenderTodayEvs();}
}

// Push all local data to Supabase (for first-time sync after login)
async function sbPushAll(){
  if(!sbUserId)return;
  const keys=['st_r5','st_e5','st_l5','st_p5','st_x5','st_hw','st_mb1','st_deleted_ids'];
  for(const k of keys){
    const v=localStorage.getItem(k);
    if(v)await sbSet(k,JSON.parse(v));
  }
  const name=localStorage.getItem('st_name');if(name)await sbSet('st_name',name);
  const ics=localStorage.getItem('st_ics');if(ics)await sbSet('st_ics',JSON.parse(ics));
}

// Push any local keys that have never been confirmed pushed to Supabase.
// Called on every session restore so data added while logged-out (or before
// the account existed) reaches the cloud before we pull remote state.
// Skips empty arrays/objects so a blank device can't clobber good remote data.
async function sbPushMissing(){
  if(!sbUserId)return;
  const pushed=JSON.parse(localStorage.getItem('sb_push_ts')||'{}');
  const skip=new Set(['st_friends']); // friends handled by lbFetchFriendsFromServer
  for(const k of SB_SYNC_KEYS){
    if(skip.has(k)||pushed[k])continue; // already pushed at least once
    const raw=localStorage.getItem(k);
    if(!raw)continue;
    let val;try{val=JSON.parse(raw);}catch{val=raw;}
    if(val===null||val===undefined)continue;
    if(Array.isArray(val)&&val.length===0)continue; // don't clobber remote with empty
    if(typeof val==='object'&&!Array.isArray(val)&&Object.keys(val).length===0)continue;
    await sbSet(k,val);
  }
}

async function manualSync(){
  const btn=document.getElementById('manual-sync-btn');
  if(btn){btn.disabled=true;btn.textContent='Syncing…';}
  try{
    await sbPushAll();
    const remote=await sbLoadAll();
    if(remote)applyRemoteData(remote);
    renderDash();renderTT();renderRems();renderHW();
    if(btn){btn.textContent='Synced ✓';setTimeout(()=>{btn.textContent='Sync';btn.disabled=false;},2000);}
  }catch{if(btn){btn.textContent='Failed';setTimeout(()=>{btn.textContent='Sync';btn.disabled=false;},2000);}}}

/* ════ STATE ════════════════════════════════════════════ */
let rems=JSON.parse(localStorage.getItem('st_r5')||'[]');
let evs=JSON.parse(localStorage.getItem('st_e5')||'[]');
let logs=JSON.parse(localStorage.getItem('st_l5')||'[]');
let papers=JSON.parse(localStorage.getItem('st_p5')||'[]');
let exams=JSON.parse(localStorage.getItem('st_x5')||'[]');
let marks=JSON.parse(localStorage.getItem('st_mb1')||'[]');
let calY,calM,calSel,qdate=null;
let curPage='dash',curStudyTab='log',curPaperSubj='mathematics',curMarkSubj=null;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const COLS=['#111','#2563eb','#16a34a','#dc2626','#9333ea','#ea580c','#0891b2','#ca8a04'];

const ICOS=['📘','📗','📙','📕','📓','📔','📒','📃'];
// sv defined earlier (line ~3918) — writes to localStorage AND Supabase. Do not redefine.
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function wkS(d){const dy=d.getDay(),df=dy===0?-6:1-dy,s=new Date(d);s.setDate(d.getDate()+df);s.setHours(0,0,0,0);return s;}

/* ════ NAV ══════════════════════════════════════════════ */
// Subtle whoosh via Web Audio API — no file needed
let _ac=null;
function playWhoosh(){
  try{
    if(!_ac)_ac=new(window.AudioContext||window.webkitAudioContext)();
    const ac=_ac;
    // Noise burst filtered into a swoosh
    const buf=ac.createBuffer(1,ac.sampleRate*0.18,ac.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
    const src=ac.createBufferSource();src.buffer=buf;
    // Bandpass — sweeps from high to low for "whoosh" feel
    const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.setValueAtTime(2200,ac.currentTime);bp.frequency.exponentialRampToValueAtTime(380,ac.currentTime+0.16);bp.Q.value=1.4;
    // Gain envelope — quick fade in, fade out
    const gain=ac.createGain();gain.gain.setValueAtTime(0,ac.currentTime);gain.gain.linearRampToValueAtTime(0.09,ac.currentTime+0.03);gain.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+0.17);
    src.connect(bp);bp.connect(gain);gain.connect(ac.destination);
    src.start();src.stop(ac.currentTime+0.18);
  }catch{}
}

function goTo(pg,el){
  if(pg===curPage)return;
  playWhoosh();
  const out=document.getElementById('pg-'+curPage);
  const inn=document.getElementById('pg-'+pg);
  if(!inn)return;

  // Freeze backdrop-filters during transition to save GPU
  document.body.classList.add('transitioning');
  setTimeout(()=>document.body.classList.remove('transitioning'),520);

  pageStack.scrollTop=0;

  if(out){
    out.classList.remove('act');
    out.classList.add('leaving');
    setTimeout(()=>out.classList.remove('leaving'),320);
  }

  inn.classList.remove('act');
  requestAnimationFrame(()=>inn.classList.add('act'));

  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('act'));
  el.classList.add('act');
  curPage=pg;

  // Show/hide floating stopwatch widget
  if((swRunning||swElapsed>0)&&pg!=='study'){
    swFloatShow();
  }else{
    swFloatHide();
  }

  if(pg==='dash'){renderDash();setupScroll();}
  if(pg==='cal'){renderCal();renderExamList();}
  if(pg==='tt')renderTT();
  if(pg==='study')renderStudy();
  if(pg==='friends')initFriendsTab();
  // Keep mobile bottom nav in sync
  if(typeof syncMobileNav==='function')syncMobileNav();
}

/* ════ SCROLL ANIMATIONS ════════════════════════════════ */
let sObs=null;
let scrollFirstSeen=false;
function setupScroll(){
  if(sObs)sObs.disconnect();
  const stack=document.getElementById('page-stack');
  const homeScroll=document.getElementById('home-scroll');

  sObs=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const card=entry.target;
      if(entry.isIntersecting){
        card.classList.remove('exit-up');
        void card.offsetHeight;
        card.classList.add('vis');
        // Once the last card has been seen, mark as revisit for future scrolls
        if(!scrollFirstSeen&&homeScroll){
          const cards=homeScroll.querySelectorAll('.drop-card');
          const allSeen=[...cards].every(c=>c.classList.contains('vis'));
          if(allSeen){scrollFirstSeen=true;homeScroll.classList.add('revisit');}
        }
      }else{
        const rect=entry.boundingClientRect;
        if(rect.top<0){
          card.classList.remove('vis');
          card.classList.add('exit-up');
        }else{
          card.classList.remove('vis','exit-up');
        }
      }
    });
  },{root:stack,threshold:0.06,rootMargin:'0px 0px -30px 0px'});

  document.querySelectorAll('.drop-card').forEach(c=>{
    c.classList.remove('vis','exit-up');
    sObs.observe(c);
  });
}

/* ════ DASHBOARD ════════════════════════════════════════ */
function renderDash(){
  tick();
  const now=new Date(),td=now.toISOString().split('T')[0];

  // Quick stats
  const qr=document.getElementById('qs-rem-count'),qe=document.getElementById('qs-exam-count'),qh=document.getElementById('qs-hw-count');
  if(qr)qr.textContent=rems.filter(r=>!r.done).length;
  if(qe)qe.textContent=exams.filter(ex=>new Date(ex.date+'T09:00:00')>=now).length;
  if(qh)qh.textContent=hw.filter(h=>!h.done).length;
  renderHW();

  // Today's schedule mini-list
  const dow=now.getDay();
  const sched=document.getElementById('today-sched');
  if(sched){
    if(dow<1||dow>5){sched.innerHTML='<div class="es" style="padding:4px"><div class="ei">—</div>No school today.</div>';}
    else{
      const nm=toM(now.getHours(),now.getMinutes());
      const day=TT[DKEYS[dow]];
      const rows=day.filter(p=>p.subj&&p.subj!=='roll call').map(p=>{
        const pad=n=>String(n).padStart(2,'0');
        const isNow=nm>=toM(...p.s)&&nm<toM(...p.e);
        const isPinned=p.subj===pinnedSubj;
        const sc=subjColour(p.subj);
        return`<div class="ts-row${isNow?' ts-now':''}${isPinned?' ts-pinned':''}" data-subj="${esc(p.subj)}" onclick="pinSubjTile('${esc(p.subj)}')" style="${sc&&!isNow?`border-left:2.5px solid ${sc};padding-left:9px`:isNow&&sc?`border-left:2.5px solid rgba(255,255,255,.6);padding-left:9px`:''}">
          <div class="ts-time">${p.s[0]}:${pad(p.s[1])}</div>
          <div class="ts-dot"></div>
          <div class="ts-name">${p.subj}</div>
          <div class="ts-room">${p.room||''}</div>
        </div>`;
      });
      sched.innerHTML=rows.length?rows.join(''):'<div class="es" style="padding:4px"><div class="ei">—</div>No periods today.</div>';
    }
  }

  // Today's events
  const te=getEventsForDate(td).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const tl=document.getElementById('tdl');
  if(tl)tl.innerHTML=te.length?te.map(e=>{const col=e.color||'#6366f1';return`<div class="sci"><div class="sct">${e.time||'—'}</div><div class="scd" style="background:${col}"></div><div class="scn">${esc(e.name)}${e.subj?` <span style="font-size:10px;color:var(--t3);font-family:'Geist Mono',monospace">${e.subj}</span>`:''}</div></div>`}).join(''):'<div class="es" style="padding:10px"><div class="ei">—</div>No events today.</div>';

  // Next exam
  const upcoming=exams.filter(ex=>new Date(ex.date+'T09:00:00')>=now).sort((a,b)=>a.date.localeCompare(b.date));
  const nei=document.getElementById('next-exam-inner');
  if(nei){
    if(!upcoming.length){nei.innerHTML='<div class="es" style="padding:6px"><div class="ei">—</div>No exams added yet. Head to Study Log to add one.</div>';}
    else{
      const ex=upcoming[0];
      const ed=new Date(ex.date+'T09:00:00'),diff=ed-now,days=Math.max(0,Math.floor(diff/86400000));
      const pct=Math.max(2,100-days/90*100);
      nei.innerHTML=`<div style="display:flex;align-items:center;gap:16px">
        <div style="flex:1">
          <div style="font-size:17px;font-weight:600;letter-spacing:-.02em">${esc(ex.name)}</div>
          <div style="font-size:11px;font-family:'Geist Mono',monospace;color:var(--t3);margin-top:3px;text-transform:uppercase;letter-spacing:.06em">${ex.subj} · ${ex.date}</div>
          <div style="margin-top:10px;height:3px;background:rgba(0,0,0,.08);border-radius:10px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--text);border-radius:10px;transition:width .6s"></div></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:38px;font-weight:200;letter-spacing:-.04em;line-height:1">${days}</div>
          <div style="font-size:11px;font-family:'Geist Mono',monospace;color:var(--t3)">days left</div>
        </div>
      </div>
      ${upcoming.length>1?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,.06);font-size:12px;color:var(--t3)">${upcoming.slice(1,3).map(e=>{const d=Math.max(0,Math.floor((new Date(e.date+'T09:00:00')-now)/86400000));return`<span style="margin-right:14px">${e.subj} <b style="color:var(--text)">${d}d</b></span>`;}).join('')}</div>`:''}`
    }
  }

  renderRems();
}

/* ════ REMINDERS ════════════════════════════════════════ */
/* Returns the subject currently in session, or '' if none */
function getCurSubj(){
  const{cur}=getCurNxt();
  return(cur&&cur.subj&&cur.subj!=='roll call')?cur.subj:'';
}

function openRM(){
  document.getElementById('rem-subj').value=getCurSubj();
  setTimeout(cddSyncAll,0);
  document.getElementById('rm').classList.add('open');
  setTimeout(()=>document.getElementById('rem-text').focus(),200);
}
function closeRM(){document.getElementById('rm').classList.remove('open');}
document.getElementById('rm').addEventListener('click',e=>{if(e.target===document.getElementById('rm'))closeRM();});
function saveRem(){
  const text=document.getElementById('rem-text').value.trim();if(!text)return;
  rems.unshift({id:Date.now(),text,pri:document.getElementById('rem-pri').value,subj:document.getElementById('rem-subj').value,done:false,ld:null});
  sv('st_r5',rems);document.getElementById('rem-text').value='';document.getElementById('rem-subj').value='';
  closeRM();renderRems();
  const{cur}=getCurNxt();updateSubjTile(cur&&cur.subj?cur.subj:null);
}
function renderRems(){
  const el=document.getElementById('rl');if(!el)return;
  if(!rems.length){el.innerHTML='<div class="es"><div class="ei">—</div>No reminders. Hit "Add Reminder" above.</div>';return;}
  el.innerHTML=rems.map(r=>{
    const sc=subjColour(r.subj);
    const borderStyle=sc?`border-left-color:${sc}`:'';
    return`<div class="ri ${r.done?'done':''}" id="r${r.id}" data-id="${r.id}" style="${borderStyle}">
    <div class="drag-handle" title="Drag to reorder"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg></div>
    <div class="rck" onclick="togRem(${r.id})">${r.done?'<svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>':''}</div>
    <div style="flex:1"><div class="rt">${esc(r.text)}</div>${r.ld?`<div style="font-size:10px;font-family:'Geist Mono',monospace;color:var(--t3)">📅 ${r.ld}</div>`:''}</div>
    ${r.subj?`<div class="r-subj"${sc?` style="background:${sc}22;color:${sc};border:1px solid ${sc}44"`:''}">${r.subj}</div>`:''}
    <div class="badge b${r.pri?r.pri[0]:'n'}">${r.pri||'normal'}</div>
    <div class="db" onclick="delRem(${r.id})">✕</div>
  </div>`;
  }).join('');
  el.querySelectorAll('.ri[data-id]').forEach(el=>makeDraggable(el,'rem'));
}
function togRem(id){const r=rems.find(r=>r.id===id);if(r){r.done=!r.done;sv('st_r5',rems);renderRems();}}
function delRem(id){_addDeletedId(id);rems=rems.filter(r=>r.id!==id);sv('st_r5',rems);renderRems();}

/* ════ HOMEWORK ═════════════════════════════════════════ */
let hw=JSON.parse(localStorage.getItem('st_hw')||'[]');
let hwFilter='all';

function openHWModal(){
  document.getElementById('hw-task').value='';
  document.getElementById('hw-subj').value=getCurSubj();
  document.getElementById('hw-due').value='';
  document.getElementById('hw-link').value='';
  document.getElementById('hw-cal').checked=true;
  setTimeout(cddSyncAll,0);
  document.getElementById('hw-modal').classList.add('open');
  setTimeout(()=>document.getElementById('hw-task').focus(),200);
}
function closeHWModal(){document.getElementById('hw-modal').classList.remove('open');}
document.getElementById('hw-modal').addEventListener('click',function(e){if(e.target===this)closeHWModal();});

function saveHW(){
  const task=document.getElementById('hw-task').value.trim();
  if(!task)return;
  const subj=document.getElementById('hw-subj').value;
  const due=document.getElementById('hw-due').value;
  const link=document.getElementById('hw-link').value.trim();
  const addToCal=document.getElementById('hw-cal').checked;
  const id=Date.now();
  hw.unshift({id,task,subj,due,link,done:false});
  sv('st_hw',hw);
  // Sync to calendar if due date + opted in
  if(due&&addToCal){
    evs.push({id:id+1,name:`📚 ${task}`,date:due,time:'',note:subj,subj,hwId:id});
    evs.sort((a,b)=>a.date.localeCompare(b.date));sv('st_e5',evs);
    icalStartAutoRefresh();
  }
  closeHWModal();
  renderHW();
  // Update qs counter
  const qr=document.getElementById('qs-rem-count');
  if(qr)qr.textContent=rems.filter(r=>!r.done).length;
}

function setHWFilter(f,el){
  hwFilter=f;
  document.querySelectorAll('.hw-filter').forEach(e=>e.classList.remove('act'));
  el.classList.add('act');
  const list=document.getElementById('hw-list');
  if(list){list.classList.remove('switching');void list.offsetWidth;list.classList.add('switching');}
  renderHW();
}

function togHW(id){
  const item=hw.find(h=>h.id===id);
  if(item){item.done=!item.done;sv('st_hw',hw);renderHW();}
}
function delHW(id){
  _addDeletedId(id);hw=hw.filter(h=>h.id!==id);sv('st_hw',hw);
  // Remove calendar event if synced
  evs=evs.filter(e=>e.hwId!==id);sv('st_e5',evs);
  renderHW();
}

function renderHW(){
  const el=document.getElementById('hw-list');if(!el)return;
  const now=new Date();
  const today=now.toISOString().split('T')[0];
  let list=hw;
  if(hwFilter==='pending')list=hw.filter(h=>!h.done);
  else if(hwFilter==='done')list=hw.filter(h=>h.done);
  if(!list.length){
    el.innerHTML=`<div class="es"><div class="ei">—</div>${hwFilter==='done'?'Nothing done yet.':hwFilter==='pending'?'All clear!':'No homework yet.'}</div>`;
    return;
  }
  el.innerHTML=list.map(h=>{
    const overdue=h.due&&h.due<today&&!h.done;
    const dueLabel=h.due?`due ${formatHWDate(h.due)}`:'';
    const sc=subjColour(h.subj);
    const borderStyle=sc?`border-left-color:${sc}`:'';
    return`<div class="hw-item${h.done?' done':''}" data-id="${h.id}" style="${borderStyle}">
      <div class="drag-handle"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg></div>
      <div class="hw-check" onclick="togHW(${h.id})">${h.done?`<svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>`:''}</div>
      <div style="flex:1">
        <div class="hw-task-text">${esc(h.task)}</div>
        <div class="hw-meta">
          ${dueLabel?`<span class="${overdue?'hw-overdue':''}">${dueLabel}${overdue?' · overdue':''}</span>`:''}
          ${h.link?`<a href="${esc(h.link)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:3px;color:var(--t2);text-decoration:none;font-size:10px;font-family:'Geist Mono',monospace;padding:1px 6px;border-radius:4px;background:rgba(0,0,0,.05);transition:background .12s;cursor:none" onmouseover="this.style.background='rgba(37,99,235,.10)';this.style.color='#2563eb'" onmouseout="this.style.background='rgba(0,0,0,.05)';this.style.color='var(--t2)'"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="10" height="10"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>open</a>`:''}
        </div>
      </div>
      ${h.subj?`<div class="hw-subj-badge"${sc?` style="background:${sc}22;color:${sc};border:1px solid ${sc}44"`:''}">${h.subj}</div>`:''}
      <div class="db" onclick="delHW(${h.id})">✕</div>
    </div>`;
  }).join('');
  el.querySelectorAll('.hw-item[data-id]').forEach(e=>makeDraggable(e,'hw'));
}

function formatHWDate(ds){
  const d=new Date(ds+'T12:00');
  const today=new Date();today.setHours(0,0,0,0);
  const diff=Math.round((d-today)/86400000);
  if(diff===0)return'today';
  if(diff===1)return'tomorrow';
  if(diff===-1)return'yesterday';
  if(diff>0&&diff<7)return d.toLocaleDateString('en-AU',{weekday:'short'});
  return d.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
}

/* ════ CALENDAR ═════════════════════════════════════════ */
let calTapTimer=null,calTapDs=null;
function renderCal(){
  const now=new Date();if(calY===undefined){calY=now.getFullYear();calM=now.getMonth();}
  document.getElementById('cml').textContent=`${MONTHS[calM]} ${calY}`;

  const first=new Date(calY,calM,1),last=new Date(calY,calM+1,0);
  let dow=first.getDay();dow=dow===0?6:dow-1;
  const today=now.toISOString().split('T')[0];
  const g=document.getElementById('cg');g.innerHTML='';
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d=>{const e=document.createElement('div');e.className='cdn';e.textContent=d;g.appendChild(e);});
  const prev=new Date(calY,calM,0).getDate();
  for(let i=0;i<dow;i++){const e=document.createElement('div');e.className='cd oth';e.textContent=prev-dow+1+i;g.appendChild(e);}
  for(let d=1;d<=last.getDate();d++){
    const ds=`${calY}-${String(calM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvs=getEventsForDate(ds);
    const el=document.createElement('div');
    let cls='cd'+(ds===today?' tdy':'')+(ds===calSel?' sel':'');
    el.className=cls;

    // Chips — events only
    let chipsHtml='';
    if(dayEvs.length){
      const show=dayEvs.slice(0,2);
      const extra=dayEvs.length-show.length;
      const isTdy=ds===today;
      chipsHtml=`<div class="cd-chips">${show.map(ev=>{
        const chipStyle=ev.color&&!isTdy?`background:${ev.color}22;color:${ev.color};font-weight:600`:'';
        return `<div class="cd-chip" style="${chipStyle}">${esc(ev.name)}</div>`;
      }).join('')}${extra?`<div class="cd-chip" style="opacity:.55">+${extra} more</div>`:''}</div>`;
    }
    el.innerHTML=`<span class="cd-num">${d}</span>${chipsHtml}`;
    el.ondblclick=function(ev){ev.preventDefault();ev.stopPropagation();openQM(ds);};
    el.onclick=function(ev){
      if(calTapDs===ds){
        clearTimeout(calTapTimer);calTapTimer=null;calTapDs=null;
        openQM(ds);
      }else{
        calTapDs=ds;
        calTapTimer=setTimeout(()=>{selDay(ds);calTapDs=null;},350);
      }
    };
    g.appendChild(el);
    // Staggered entry animation
    const animCls=_calNavDir<0?'anim-l':_calNavDir>0?'anim-r':'anim-in';
    el.classList.add(animCls);
    el.style.animationDelay=`${(d-1)*12}ms`;
  }
  const tot=dow+last.getDate();for(let i=1;i<=(tot%7===0?0:7-tot%7);i++){const e=document.createElement('div');e.className='cd oth';e.textContent=i;g.appendChild(e);}
  renderEvs();
}
let _calNavDir=0;
function calNav(d){_calNavDir=d;calM+=d;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}renderCal();_calNavDir=0;}
function selDay(ds){calSel=calSel===ds?null:ds;document.getElementById('cfl').textContent=calSel?new Date(calSel+'T12:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'}):'All';renderCal();}

function openQM(ds){
  qdate=ds;const d=new Date(ds+'T12:00');
  document.getElementById('qm-dl').textContent=d.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'});
  ['qen','qet','qet2','qeno','qeuntil'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('qes').value=getCurSubj();
  document.getElementById('qer').checked=false;
  document.getElementById('qerecur').value='none';
  document.getElementById('recur-days-row').classList.remove('show');
  document.getElementById('recur-until-row').classList.remove('show');
  qRecurDays=[];
  document.querySelectorAll('.rday').forEach(b=>b.classList.remove('on'));
  qSelectColor('#6366f1',document.querySelector('.ev-color-opt[data-c="#6366f1"]'));
  setTimeout(cddSyncAll,0);
  document.getElementById('qm').classList.add('open');
  setTimeout(()=>document.getElementById('qen').focus(),220);
}
function closeQM(){document.getElementById('qm').classList.remove('open');qdate=null;}
document.getElementById('qm').addEventListener('click',e=>{if(e.target===document.getElementById('qm'))closeQM();});
function saveQEv(){
  const name=document.getElementById('qen').value.trim();if(!name||!qdate)return;
  const subj=document.getElementById('qes').value;
  const startTime=document.getElementById('qet').value||'';
  const endTime=document.getElementById('qet2').value||'';
  const color=document.getElementById('qecolor').value||'#6366f1';
  const recurFreq=document.getElementById('qerecur').value;
  const ev={id:Date.now(),name,date:qdate,time:startTime,note:document.getElementById('qeno').value,subj,color};
  if(endTime)ev.endTime=endTime;
  if(recurFreq&&recurFreq!=='none'){
    ev.recur={freq:recurFreq,start:qdate,days:qRecurDays.length?[...qRecurDays]:null,until:document.getElementById('qeuntil').value||null};
  }
  evs.push(ev);
  evs.sort((a,b)=>a.date.localeCompare(b.date));sv('st_e5',evs);
  icalStartAutoRefresh();
  if(document.getElementById('qer').checked){
    rems.unshift({id:Date.now()+1,text:name,pri:document.getElementById('qert').value,subj,done:false,ld:new Date(qdate+'T12:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'})});
    sv('st_r5',rems);renderRems();
  }
  // Push to iCloud if connected
  if(icalState==='connected')icalPushEvent(ev);
  closeQM();renderCal();if(calView==='week')renderWeekView();else if(calView==='day')renderDayView();renderDash();
}
function renderEvs(){
  const el=document.getElementById('evl');
  const showList=calSel?getEventsForDate(calSel):evs;
  if(!showList.length){el.innerHTML='<div class="es" style="padding:10px">No events.<br><span style="font-size:11px">Double-click a day to add one.</span></div>';return;}
  el.innerHTML=showList.map((e,i)=>{
    const col=e.color||COLS[i%COLS.length];
    const recurBadge=e.recur?`<div class="ev-stag" style="background:${col}18;color:${col}">↻ ${e.recur.freq==='weekdays'?'Weekdays':e.recur.freq}</div>`:'';
    const delId=e._v?null:e.id; // don't show delete for virtual recurring instances
    return `<div class="evi">
      <div style="width:3px;border-radius:4px;background:${col};align-self:stretch;flex-shrink:0"></div>
      <div style="flex:1"><div class="en">${esc(e.name)}</div><div class="em">${e.date}${e.time?' · '+e.time:''}${e.endTime?' → '+e.endTime:''}${e.note?' · '+esc(e.note):''}</div>${e.subj?`<div class="ev-stag">${e.subj}</div>`:''} ${recurBadge}</div>
      ${delId?`<div class="db" onclick="delEv(${delId})">✕</div>`:''}
    </div>`;
  }).join('');
}
function delEv(id){
  const ev=evs.find(e=>e.id===id);
  if(ev&&ev.icalUid&&icalState==='connected')icalDeleteEvent(ev.icalUid,ev.icalCalHref);
  _addDeletedId(id);evs=evs.filter(e=>e.id!==id);sv('st_e5',evs);renderCal();if(calView==='week')renderWeekView();else if(calView==='day')renderDayView();
}

/* ════ RECURRING + COLOR HELPERS ════════════════════════ */
let qRecurDays=[];

function qSelectColor(hex,el){
  document.getElementById('qecolor').value=hex;
  document.querySelectorAll('.ev-color-opt').forEach(b=>b.classList.remove('sel'));
  if(el)el.classList.add('sel');
}
function qToggleDay(d,el){
  const i=qRecurDays.indexOf(d);
  if(i>=0){qRecurDays.splice(i,1);el.classList.remove('on');}
  else{qRecurDays.push(d);el.classList.add('on');}
}
function qRecurChange(v){
  document.getElementById('recur-days-row').classList.toggle('show',v==='weekly');
  document.getElementById('recur-until-row').classList.toggle('show',v!=='none');
}

/* ════ RECURRING EVENT EXPANSION ════════════════════════ */
function getEventsForDate(ds){
  const result=[];
  const d=new Date(ds+'T12:00');
  const dow=d.getDay(); // 0=Sun,1=Mon,...
  for(const ev of evs){
    if(!ev.recur){
      if(ev.date===ds)result.push(ev);
    }else{
      const r=ev.recur;
      if(ds<r.start)continue;
      if(r.until&&ds>r.until)continue;
      if(r.exceptions&&r.exceptions.includes(ds))continue;
      if(r.freq==='daily'){result.push({...ev,date:ds,_v:1});continue;}
      if(r.freq==='monthly'){
        const sd=new Date(r.start+'T12:00');
        if(d.getDate()===sd.getDate())result.push({...ev,date:ds,_v:1});
        continue;
      }
      const chkDays=r.freq==='weekdays'?[1,2,3,4,5]:(r.days&&r.days.length?r.days:[new Date(r.start+'T12:00').getDay()]);
      if(chkDays.includes(dow))result.push({...ev,date:ds,_v:1});
    }
  }
  return result;
}

// Outside-school countdown: returns the most relevant timed calendar event for
// today — currently active (between start/end) takes precedence over upcoming.
// Skips homework/exam markers (those have time:''). Callers must only invoke
// when school is NOT in session (no current/next period) so timetable always
// beats a calendar entry like "school" that overlaps school hours.
function getActiveCalCountdown(now){
  if(!now)now=new Date();
  if(typeof getEventsForDate!=='function')return null;
  const ds=(typeof localDateStr==='function')?localDateStr(now):
    (now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0'));
  const todayEvs=getEventsForDate(ds).filter(e=>e.time&&!e.hwId&&!e.examId);
  if(!todayEvs.length)return null;
  const nm=toM(now.getHours(),now.getMinutes())+now.getSeconds()/60;
  const parseHM=s=>{const[h,m]=String(s).split(':').map(Number);return h*60+(m||0);};
  let active=null,activeEm=Infinity;
  for(const e of todayEvs){
    if(!e.endTime)continue;
    const sm=parseHM(e.time),em=parseHM(e.endTime);
    if(em<=sm)continue;
    if(nm>=sm&&nm<em&&em<activeEm){active=e;activeEm=em;}
  }
  if(active){
    const sm=parseHM(active.time),em=parseHM(active.endTime);
    return{ev:active,type:'active',startM:sm,endM:em,totalSec:(em-sm)*60,remSec:(em-nm)*60};
  }
  let upcoming=null,upSm=Infinity;
  for(const e of todayEvs){
    const sm=parseHM(e.time);
    if(sm>nm&&sm<upSm){upcoming=e;upSm=sm;}
  }
  if(upcoming){
    const sm=parseHM(upcoming.time);
    const em=upcoming.endTime?parseHM(upcoming.endTime):sm;
    return{ev:upcoming,type:'upcoming',startM:sm,endM:em,totalSec:Math.max(0,(em-sm)*60),remSec:(sm-nm)*60};
  }
  return null;
}

/* ════ WEEK VIEW ════════════════════════════════════════ */
const WV_START_H=0,WV_END_H=24,WV_HOUR_PX=76;
const WV_TOTAL=(WV_END_H-WV_START_H)*WV_HOUR_PX;
let calView='month';
let wvWeekStart=wvGetWeekStart(new Date());
let wvDrag=null,wvNowTimer=null,wvPopEvId=null,dvDrag=null;
let _wvSavedScroll=0,_dvSavedScroll=0;

function localDateStr(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function wvGetWeekStart(d){
  const dow=d.getDay();
  const diff=dow===0?-6:1-dow;
  const m=new Date(d);m.setHours(0,0,0,0);m.setDate(m.getDate()+diff);return m;
}

const CAL_VIEWS=['month','week','day'];
function setCalView(v){
  if(calView===v)return;
  playWhoosh();
  const fromIdx=CAL_VIEWS.indexOf(calView);
  const toIdx=CAL_VIEWS.indexOf(v);
  const goRight=toIdx>fromIdx;
  const prevView=calView;
  if(v==='week')renderWeekView();
  else if(v==='day')renderDayView();
  calView=v;
  document.querySelectorAll('.cvt-btn').forEach(b=>b.classList.toggle('act',b.dataset.v===v));

  const CP=['cp-visible','cp-pre-right','cp-pre-left','cp-exit-right','cp-exit-left'];

  // Outgoing: slide out, then park in the pre-enter position for next time
  const outEl=document.getElementById('cal-'+prevView+'-layout');
  if(outEl){
    outEl.classList.remove(...CP);
    outEl.classList.add(goRight?'cp-exit-right':'cp-exit-left');
    setTimeout(()=>{
      outEl.classList.remove('cp-exit-right','cp-exit-left');
      outEl.classList.add(goRight?'cp-pre-left':'cp-pre-right');
    },360);
  }

  // Incoming: snap to start position, then transition to visible
  const inEl=document.getElementById('cal-'+v+'-layout');
  if(inEl){
    inEl.classList.remove(...CP);
    inEl.classList.add(goRight?'cp-pre-right':'cp-pre-left');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      inEl.classList.remove('cp-pre-right','cp-pre-left');
      inEl.classList.add('cp-visible');
    }));
  }

  if(v==='week')wvScheduleNow();
  else if(v==='day')dvScheduleNow();
  else{if(wvNowTimer)clearInterval(wvNowTimer);wvNowTimer=null;if(dvNowTimer)clearInterval(dvNowTimer);dvNowTimer=null;}
}

let _wvNavDir=0;
function wvNavWeek(d){_wvNavDir=d;wvWeekStart=new Date(wvWeekStart);wvWeekStart.setDate(wvWeekStart.getDate()+d*7);renderWeekView();_wvNavDir=0;}
function wvNavToday(){_wvNavDir=0;wvWeekStart=wvGetWeekStart(new Date());renderWeekView();}

function wvScheduleNow(){
  if(wvNowTimer)clearInterval(wvNowTimer);
  wvDrawNowLine();
  wvNowTimer=setInterval(wvDrawNowLine,30000);
}

function wvFmtTime(h,m){
  const h24=h%24;
  const ap=h24>=12?'pm':'am',hh=h24%12||12;
  return `${hh}:${String(m).padStart(2,'0')} ${ap}`;
}

function wvMinsFromY(y){
  const raw=Math.round((y/WV_HOUR_PX)*60/15)*15;
  return WV_START_H*60+Math.max(0,Math.min(raw,(WV_END_H-WV_START_H)*60));
}

function wvGetSubjColour(subj){
  const SUBJ_LIST=['mathematics','english','science','music','commerce','geography','history','history elective','pdhpe','pe','careers'];
  const SUBJ_COLS=['#2563eb','#7c3aed','#16a34a','#ea580c','#0891b2','#65a30d','#dc2626','#db2777','#ca8a04','#059669','#6366f1'];
  const i=SUBJ_LIST.indexOf((subj||'').toLowerCase());
  return i>=0?SUBJ_COLS[i]:'#6366f1';
}

function renderWeekView(){
  const container=document.getElementById('wv-grid-container');
  if(!container)return;
  const today=new Date();
  const todayDs=localDateStr(today);
  const days=[];
  for(let i=0;i<7;i++){const d=new Date(wvWeekStart);d.setDate(d.getDate()+i);days.push(d);}

  // Range label
  const start=days[0],end=days[6];
  const lblA=start.toLocaleDateString('en-AU',{month:'short',year:'numeric'});
  const lblB=end.toLocaleDateString('en-AU',{month:'short',year:'numeric'});
  document.getElementById('wv-range-lbl').textContent=lblA===lblB?lblA:`${start.toLocaleDateString('en-AU',{month:'short'})} – ${lblB}`;

  const totalHours=WV_END_H-WV_START_H;
  const colTmpl=`66px repeat(7,1fr)`;

  // Header
  const hdrHtml=`<div class="wv-corner"></div>`+days.map(d=>{
    const ds=localDateStr(d);
    const isT=ds===todayDs;
    return `<div class="wv-day-hd">
      <div class="wv-day-hd-name">${d.toLocaleDateString('en-AU',{weekday:'short'}).toUpperCase()}</div>
      <div class="wv-day-hd-num${isT?' today':''}">${d.getDate()}</div>
    </div>`;
  }).join('');

  // Time labels
  let timeLblHtml='';
  for(let h=WV_START_H;h<WV_END_H;h++){
    const top=(h-WV_START_H)*WV_HOUR_PX;
    timeLblHtml+=`<div class="wv-time-lbl" style="top:${top}px">${wvFmtTime(h,0)}</div>`;
  }

  // Hour lines
  let hlHtml='';
  for(let h=WV_START_H;h<=WV_END_H;h++){
    const top=(h-WV_START_H)*WV_HOUR_PX;
    const mark=(h===5||h===22)?' wv-hl-mark':'';
    hlHtml+=`<div class="wv-hl${mark}" style="top:${top}px"></div>`;
    if(h<WV_END_H)hlHtml+=`<div class="wv-hl-half" style="top:${top+WV_HOUR_PX/2}px"></div>`;
  }

  // Day columns
  const dayCols=days.map((d,ci)=>{
    const ds=localDateStr(d);
    const isT=ds===todayDs;
    const dayEvs=getEventsForDate(ds).filter(e=>e.time);
    const evHtml=dayEvs.map(ev=>{
      const[sh,sm]=(ev.time||'00:00').split(':').map(Number);
      const startMins=sh*60+sm;
      const endMins=ev.endTime?(parseInt(ev.endTime.split(':')[0])*60+parseInt(ev.endTime.split(':')[1])):startMins+60;
      const durMins=Math.max(endMins-startMins,15);
      const top=((startMins-WV_START_H*60)/60)*WV_HOUR_PX;
      const height=Math.max((durMins/60)*WV_HOUR_PX,22);
      if(top<0||top>WV_TOTAL)return'';
      const col=ev.color||wvGetSubjColour(ev.subj);
      const timeLbl=ev.endTime?`${wvFmtTime(sh,sm)} – ${wvFmtTime(...ev.endTime.split(':').map(Number))}`:wvFmtTime(sh,sm);
      const delAction=ev._v?`delRecurOccurrence(${ev.id},'${ds}')`:(`delEv(${ev.id})`);
      const popAction=`wvShowPop(${ev.id},event)`;
      const evDelay=_wvNavDir===0?`${40+Math.random()*60|0}ms`:'0ms';
      return `<div class="wv-event anim-ev" style="top:${top}px;height:${height}px;background:${col};animation-delay:${evDelay}"
        onmousedown="event.stopPropagation()"
        onclick="event.stopPropagation();${popAction}">
        <div class="wv-event-del" onclick="event.stopPropagation();${delAction}">
          <svg fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3" width="8" height="8"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
        </div>
        <div class="wv-event-name">${esc(ev.name)}</div>
        ${height>30?`<div class="wv-event-time">${timeLbl}</div>`:''}
        ${height>46&&ev.subj?`<div class="wv-event-subj">${esc(ev.subj)}</div>`:''}
      </div>`;
    }).join('');
    const colAnimCls=_wvNavDir<0?' anim-col-l':_wvNavDir>0?' anim-col':'';
    const colDelay=ci*25;
    return `<div class="wv-day-col${isT?' today-col':''}${colAnimCls}" data-ds="${ds}" data-ci="${ci}" style="height:${WV_TOTAL}px;animation-delay:${colDelay}ms">${evHtml}</div>`;
  }).join('');

  container.innerHTML=`
    <div class="wv-outer">
      <div class="wv-header" style="display:grid;grid-template-columns:${colTmpl}">${hdrHtml}</div>
      <div class="wv-scroll" id="wv-scroll">
        <div class="wv-body">
          <div class="wv-time-col" style="height:${WV_TOTAL}px">${timeLblHtml}</div>
          <div class="wv-days-wrap" id="wv-days-wrap" style="display:grid;grid-template-columns:repeat(7,1fr);position:relative">
            <div class="wv-hour-lines">${hlHtml}</div>
            ${dayCols}
            <div class="wv-ghost" id="wv-ghost"><div class="wv-ghost-lbl" id="wv-ghost-lbl"></div></div>
            <div class="wv-now-line" id="wv-now-line" style="display:none"><div class="wv-now-dot"></div><div class="wv-now-bar"></div></div>
          </div>
        </div>
      </div>
    </div>`;

  requestAnimationFrame(()=>{
    const scrollEl=document.getElementById('wv-scroll');
    if(scrollEl)scrollEl.scrollTop=_wvSavedScroll>0?_wvSavedScroll:5*WV_HOUR_PX;
  });
  wvAttachDrag();
  wvDrawNowLine();
}

function wvAttachDrag(){
  const daysWrap=document.getElementById('wv-days-wrap');
  if(!daysWrap)return;

  daysWrap.querySelectorAll('.wv-day-col').forEach(col=>{
    col.addEventListener('mousedown',e=>{
      if(e.target.closest('.wv-event'))return;
      e.preventDefault();
      const rect=col.getBoundingClientRect();
      const y=e.clientY-rect.top; // rect.top already accounts for scroll
      const startMins=wvMinsFromY(y);
      wvDrag={col,ds:col.dataset.ds,startMins,endMins:startMins+60,colRect:rect};
      wvUpdateGhost();
    });
  });

  // Save scroll position on every scroll so re-renders can restore it
  const wvScroll=document.getElementById('wv-scroll');
  if(wvScroll&&!wvScroll._scrollSaving){
    wvScroll._scrollSaving=true;
    wvScroll.addEventListener('scroll',()=>{_wvSavedScroll=wvScroll.scrollTop;},{passive:true});
  }
  // Attach global listeners once
  if(!window._wvDragAttached){
    window._wvDragAttached=true;
    document.addEventListener('mousemove',wvOnMouseMove);
    document.addEventListener('mouseup',wvOnMouseUp);
  }
}

function dvAttachDrag(){
  const col=document.getElementById('dv-col');
  if(!col)return;
  col.addEventListener('mousedown',e=>{
    if(e.target.closest('.dv-event')||e.target.closest('.wv-event-del'))return;
    e.preventDefault();
    const rect=col.getBoundingClientRect();
    const y=e.clientY-rect.top;
    const startMins=wvMinsFromY(y);
    dvDrag={col,ds:col.dataset.ds,startMins,endMins:startMins+60};
    dvUpdateGhost();
  });
  const dvScroll=document.getElementById('dv-scroll');
  if(dvScroll&&!dvScroll._scrollSaving){
    dvScroll._scrollSaving=true;
    dvScroll.addEventListener('scroll',()=>{_dvSavedScroll=dvScroll.scrollTop;},{passive:true});
  }
  if(!window._wvDragAttached){
    window._wvDragAttached=true;
    document.addEventListener('mousemove',wvOnMouseMove);
    document.addEventListener('mouseup',wvOnMouseUp);
  }
}
function dvUpdateGhost(){
  const ghost=document.getElementById('dv-ghost');
  const lbl=document.getElementById('dv-ghost-lbl');
  if(!ghost||!dvDrag)return;
  const s=Math.min(dvDrag.startMins,dvDrag.endMins);
  const en=Math.max(dvDrag.startMins,dvDrag.endMins);
  const top=((s-WV_START_H*60)/60)*WV_HOUR_PX;
  const h=Math.max(((en-s)/60)*WV_HOUR_PX,WV_HOUR_PX/2);
  ghost.style.cssText=`left:3px;right:3px;top:${top}px;height:${h}px;display:block`;
  lbl.textContent=`${wvFmtTime(Math.floor(s/60),s%60)} – ${wvFmtTime(Math.floor(en/60),en%60)}`;
}

function wvUpdateGhost(){
  const ghost=document.getElementById('wv-ghost');
  const lbl=document.getElementById('wv-ghost-lbl');
  if(!ghost||!wvDrag)return;
  const daysWrap=document.getElementById('wv-days-wrap');
  if(!daysWrap)return;
  const wrapRect=daysWrap.getBoundingClientRect();
  const colRect=wvDrag.col.getBoundingClientRect();
  const colL=colRect.left-wrapRect.left;
  const colW=colRect.width;
  const s=Math.min(wvDrag.startMins,wvDrag.endMins);
  const en=Math.max(wvDrag.startMins,wvDrag.endMins);
  const top=((s-WV_START_H*60)/60)*WV_HOUR_PX;
  const h=Math.max(((en-s)/60)*WV_HOUR_PX,WV_HOUR_PX/2);
  ghost.style.cssText=`left:${colL+3}px;width:${colW-6}px;top:${top}px;height:${h}px;display:block`;
  lbl.textContent=`${wvFmtTime(Math.floor(s/60),s%60)} – ${wvFmtTime(Math.floor(en/60),en%60)}`;
}

function wvOnMouseMove(e){
  if(wvDrag){
    const rect=wvDrag.col.getBoundingClientRect();
    const y=e.clientY-rect.top;
    wvDrag.endMins=wvMinsFromY(y);
    wvUpdateGhost();
  }
  if(dvDrag){
    const rect=dvDrag.col.getBoundingClientRect();
    const y=e.clientY-rect.top;
    dvDrag.endMins=wvMinsFromY(y);
    dvUpdateGhost();
  }
}

function wvOnMouseUp(e){
  if(wvDrag){
    const ghost=document.getElementById('wv-ghost');
    if(ghost)ghost.style.display='none';
    const s=Math.min(wvDrag.startMins,wvDrag.endMins);
    const en=Math.max(wvDrag.startMins,wvDrag.endMins);
    if(en-s>=15){
      const st=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
      const et=`${String(Math.floor(en/60)).padStart(2,'0')}:${String(en%60).padStart(2,'0')}`;
      wvOpenQMWithTime(wvDrag.ds,st,et);
    }
    wvDrag=null;
  }
  if(dvDrag){
    const ghost=document.getElementById('dv-ghost');
    if(ghost)ghost.style.display='none';
    const s=Math.min(dvDrag.startMins,dvDrag.endMins);
    const en=Math.max(dvDrag.startMins,dvDrag.endMins);
    if(en-s>=15){
      const st=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
      const et=`${String(Math.floor(en/60)).padStart(2,'0')}:${String(en%60).padStart(2,'0')}`;
      wvOpenQMWithTime(dvDrag.ds,st,et);
    }
    dvDrag=null;
  }
}

function wvOpenQMWithTime(ds,startTime,endTime){
  openQM(ds);
  setTimeout(()=>{
    if(startTime&&document.getElementById('qet'))document.getElementById('qet').value=startTime;
    if(endTime&&document.getElementById('qet2'))document.getElementById('qet2').value=endTime;
  },60);
}

function wvDrawNowLine(){
  const nl=document.getElementById('wv-now-line');
  if(!nl)return;
  const now=new Date();
  const todayDs=localDateStr(now);
  const col=document.querySelector(`.wv-day-col[data-ds="${todayDs}"]`);
  if(!col){nl.style.display='none';return;}
  const mins=now.getHours()*60+now.getMinutes();
  if(mins<WV_START_H*60||mins>WV_END_H*60){nl.style.display='none';return;}
  const top=((mins-WV_START_H*60)/60)*WV_HOUR_PX;
  const daysWrap=document.getElementById('wv-days-wrap');
  if(!daysWrap)return;
  const wrapRect=daysWrap.getBoundingClientRect();
  const colRect=col.getBoundingClientRect();
  nl.style.cssText=`display:block;top:${top}px;left:${colRect.left-wrapRect.left}px;width:${colRect.width}px`;
}

/* ════ DAY VIEW ═════════════════════════════════════════ */
let dvDate=new Date();
let dvNowTimer=null;

function dvNavDay(d){dvDate=new Date(dvDate);dvDate.setDate(dvDate.getDate()+d);renderDayView();}
function dvNavToday(){dvDate=new Date();renderDayView();}

function dvScheduleNow(){
  if(dvNowTimer)clearInterval(dvNowTimer);
  dvDrawNowLine();
  dvNowTimer=setInterval(()=>{
    dvDrawNowLine();
    // Refresh "Next Up" countdown every minute
    const ds=localDateStr(dvDate);
    const isToday=ds===localDateStr(new Date());
    if(isToday){const nc=document.getElementById('dv-next-ctn');if(nc)renderDayViewSidebar(ds,true);}
  },60000);
}

function dvDrawNowLine(){
  const nl=document.getElementById('dv-now-line');
  if(!nl)return;
  const now=new Date();
  const ds=localDateStr(dvDate);
  const todayDs=localDateStr(now);
  if(ds!==todayDs){nl.style.display='none';return;}
  const mins=now.getHours()*60+now.getMinutes();
  if(mins<WV_START_H*60||mins>WV_END_H*60){nl.style.display='none';return;}
  const top=((mins-WV_START_H*60)/60)*WV_HOUR_PX;
  nl.style.cssText=`display:block;top:${top}px;left:0;right:0`;
}

function renderDayView(){
  const container=document.getElementById('dv-grid-container');
  if(!container)return;
  const ds=localDateStr(dvDate);
  const todayDs=localDateStr(new Date());
  const isToday=ds===todayDs;

  // Header
  const dayName=dvDate.toLocaleDateString('en-AU',{weekday:'long'});
  const dayNum=dvDate.toLocaleDateString('en-AU',{day:'numeric'});
  const monthYear=dvDate.toLocaleDateString('en-AU',{month:'long',year:'numeric'});

  // All-day events (no time set)
  const allEvs=getEventsForDate(ds);
  const allDayEvs=allEvs.filter(e=>!e.time);
  const timedEvs=allEvs.filter(e=>e.time);

  const allDayHtml=allDayEvs.length
    ? allDayEvs.map(ev=>`<div class="dv-allday-chip" style="background:${ev.color||'#6366f1'}">${esc(ev.name)}</div>`).join('')
    : `<span style="font-size:10.5px;color:var(--t3);font-family:'Geist Mono',monospace">no all-day events</span>`;

  // Time labels + hour lines
  let timeLblHtml='',hlHtml='';
  for(let h=WV_START_H;h<=WV_END_H;h++){
    const top=(h-WV_START_H)*WV_HOUR_PX;
    timeLblHtml+=`<div class="dv-time-lbl" style="top:${top}px">${wvFmtTime(h,0)}</div>`;
    const dvMark=(h===5||h===22)?' wv-hl-mark':'';
    hlHtml+=`<div class="dv-hl${dvMark}" style="top:${top}px"></div>`;
    if(h<WV_END_H) hlHtml+=`<div class="dv-hl-half" style="top:${top+WV_HOUR_PX/2}px"></div>`;
  }

  // Events
  const evHtml=timedEvs.map(ev=>{
    const[sh,sm]=(ev.time||'00:00').split(':').map(Number);
    const startMins=sh*60+sm;
    const endMins=ev.endTime?(parseInt(ev.endTime.split(':')[0])*60+parseInt(ev.endTime.split(':')[1])):startMins+60;
    const durMins=Math.max(endMins-startMins,15);
    const top=((startMins-WV_START_H*60)/60)*WV_HOUR_PX;
    const height=Math.max((durMins/60)*WV_HOUR_PX,24);
    if(top<0||top>WV_TOTAL)return'';
    const col=ev.color||wvGetSubjColour(ev.subj);
    const timeLbl=ev.endTime?`${wvFmtTime(sh,sm)} – ${wvFmtTime(...ev.endTime.split(':').map(Number))}`:wvFmtTime(sh,sm);
    const delAction=ev._v?`delRecurOccurrence(${ev.id},'${ds}')`:(`delEv(${ev.id})`);
    const safeName=esc(ev.name).replace(/'/g,'&#39;');
    const safeTime=timeLbl.replace(/'/g,'&#39;');
    return `<div class="dv-event anim-ev" style="top:${top}px;height:${height}px;background:${col}"
      onclick="event.stopPropagation();wvShowPop(${ev.id},event)">
      <div class="wv-event-del" onclick="event.stopPropagation();${delAction}">
        <svg fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3" width="8" height="8"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
      </div>
      <div class="dv-event-name">${esc(ev.name)}</div>
      ${height>34?`<div class="dv-event-time">${timeLbl}</div>`:''}
    </div>`;
  }).join('');

  container.innerHTML=`
    <div class="dv-outer">
      <div class="dv-header">
        <div class="dv-date-big">${dayNum} ${monthYear.split(' ')[0]} <span>${monthYear.split(' ')[1]}</span></div>
        <div class="dv-dow${isToday?' today-dow':''}">${isToday?`<span style="color:var(--text);font-weight:600">Today \u00b7 </span>`:``}${dayName}</div>
      </div>
      <div class="dv-allday">
        <div class="dv-allday-lbl">all-day</div>
        <div class="dv-allday-chips">${allDayHtml}</div>
      </div>
      <div class="dv-scroll" id="dv-scroll">
        <div class="dv-body">
          <div class="dv-time-col" style="height:${WV_TOTAL}px">${timeLblHtml}</div>
          <div class="dv-col" id="dv-col" data-ds="${ds}" style="height:${WV_TOTAL}px" ondblclick="openQM('${ds}')">
            ${hlHtml}
            ${evHtml}
            <div class="dv-now-line" id="dv-now-line" style="display:none">
              <div class="dv-now-dot"></div>
              <div class="dv-now-bar"></div>
            </div>
            <div class="wv-ghost" id="dv-ghost"><div class="wv-ghost-lbl" id="dv-ghost-lbl"></div></div>
          </div>
        </div>
      </div>
    </div>`;

  dvDrawNowLine();
  dvAttachDrag();
  renderDayViewSidebar(ds,isToday);
  requestAnimationFrame(()=>{
    const scroll=document.getElementById('dv-scroll');
    if(!scroll)return;
    scroll.scrollTop=_dvSavedScroll>0?_dvSavedScroll:5*WV_HOUR_PX;
  });
}

function renderDayViewSidebar(ds,isToday){
  const nextEl=document.getElementById('dv-next-ctn');
  const agEl=document.getElementById('dv-agenda-list');
  const hdEl=document.getElementById('dv-agenda-hd');
  if(!nextEl||!agEl)return;

  const allEvs=getEventsForDate(ds).sort((a,b)=>(a.time||'00:00').localeCompare(b.time||'00:00'));
  const now=new Date();
  const nowMins=now.getHours()*60+now.getMinutes();

  // Update agenda heading
  if(hdEl){
    const d=new Date(ds+'T12:00');
    hdEl.textContent=isToday?`Today's Agenda`:d.toLocaleDateString('en-AU',{weekday:'long'})+`'s Events`;
  }

  // Next event countdown (only meaningful today)
  if(isToday){
    const next=allEvs.find(e=>{
      if(!e.time)return false;
      const[h,m]=e.time.split(':').map(Number);
      return h*60+m>nowMins;
    });
    if(next){
      const[h,m]=next.time.split(':').map(Number);
      const diffMins=(h*60+m)-nowMins;
      const dh=Math.floor(diffMins/60),dm=diffMins%60;
      const countdown=dh>0?`${dh}h ${dm}m`:`${dm}m`;
      const col=next.color||'#6366f1';
      nextEl.innerHTML=`
        <div style="display:flex;align-items:center;gap:10px;padding:4px 0 6px">
          <div style="flex-shrink:0;width:4px;align-self:stretch;border-radius:4px;background:${col}"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(next.name)}</div>
            <div style="font-size:10px;font-family:'Geist Mono',monospace;color:var(--t3);margin-top:2px">${wvFmtTime(h,m)}${next.endTime?` → ${wvFmtTime(...next.endTime.split(':').map(Number))}`:''}${next.recur?` · recurring`:''}</div>
          </div>
          <div style="flex-shrink:0;text-align:right">
            <div style="font-size:20px;font-weight:700;letter-spacing:-.04em;color:${col};line-height:1">${countdown}</div>
            <div style="font-size:9px;color:var(--t3);margin-top:1px;font-family:'Geist Mono',monospace">away</div>
          </div>
        </div>`;
    }else{
      nextEl.innerHTML=`<div class="es" style="padding:8px;font-size:11px">No more events today</div>`;
    }
  }else{
    // For non-today: show event count summary
    const cnt=allEvs.length;
    const totalMins=allEvs.filter(e=>e.time&&e.endTime).reduce((s,e)=>{
      const[sh,sm]=e.time.split(':').map(Number);
      const[eh,em]=e.endTime.split(':').map(Number);
      return s+Math.max(0,(eh*60+em)-(sh*60+sm));
    },0);
    if(cnt===0){
      nextEl.innerHTML=`<div class="es" style="padding:8px;font-size:11px">Free day</div>`;
    }else{
      const th=Math.floor(totalMins/60),tm=totalMins%60;
      nextEl.innerHTML=`
        <div style="display:flex;gap:12px;padding:4px 0 6px">
          <div style="text-align:center">
            <div style="font-size:24px;font-weight:700;letter-spacing:-.04em;color:var(--text);line-height:1">${cnt}</div>
            <div style="font-size:9px;color:var(--t3);font-family:'Geist Mono',monospace;margin-top:2px">event${cnt!==1?'s':''}</div>
          </div>
          ${totalMins>0?`<div style="text-align:center">
            <div style="font-size:24px;font-weight:700;letter-spacing:-.04em;color:var(--text);line-height:1">${th>0?th+'h':tm+'m'}</div>
            <div style="font-size:9px;color:var(--t3);font-family:'Geist Mono',monospace;margin-top:2px">scheduled</div>
          </div>`:''}
        </div>`;
    }
  }

  // Agenda list
  if(allEvs.length===0){
    agEl.innerHTML=`<div class="es" style="padding:8px">No events</div>`;
    return;
  }
  agEl.innerHTML=allEvs.map(ev=>{
    const col=ev.color||'#6366f1';
    const[sh,sm]=(ev.time||'00:00').split(':').map(Number);
    const timeLbl=ev.time?(ev.endTime?`${wvFmtTime(sh,sm)} → ${wvFmtTime(...ev.endTime.split(':').map(Number))}`:wvFmtTime(sh,sm)):'all-day';
    const isPast=isToday&&ev.time&&(sh*60+sm+((ev.endTime?(parseInt(ev.endTime.split(':')[0])*60+parseInt(ev.endTime.split(':')[1])):sh*60+sm+60)))/2<nowMins;
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);opacity:${isPast?'.45':'1'}">
      <div style="flex-shrink:0;width:3px;height:32px;border-radius:3px;background:${col}"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.name)}</div>
        <div style="font-size:10px;font-family:'Geist Mono',monospace;color:var(--t3);margin-top:1px">${timeLbl}${ev.recur?` · ↻`:''}</div>
      </div>
    </div>`;
  }).join('')+'<div style="height:4px"></div>';
}

// Event popover
let _wvPopCloseTimer=null;
let _wvPopCurrentColor=null;
const POP_COLS=['#6366f1','#0891b2','#16a34a','#ca8a04','#dc2626','#9333ea','#ea580c','#0d9488','#db2777','#64748b'];
function _wvPopPosition(pop,e){
  const r=e.currentTarget?e.currentTarget.getBoundingClientRect():{top:e.clientY,left:e.clientX,width:0,height:0};
  const pw=278,ph=270;
  let left=r.right+8,top=r.top;
  if(left+pw>window.innerWidth)left=Math.max(8,r.left-pw-8);
  if(top+ph>window.innerHeight)top=Math.max(8,window.innerHeight-ph-8);
  pop.style.left=left+'px';pop.style.top=top+'px';
}
function _wvPopColorSwatches(selectedCol){
  return POP_COLS.map(c=>`<div class="pop-swatch${c===selectedCol?' sel':''}" onclick="event.stopPropagation();wvPopPickColor('${c}')" style="width:18px;height:18px;border-radius:50%;background:${c};cursor:pointer;outline:${c===selectedCol?'2.5px solid '+c:'2px solid transparent'};outline-offset:2px;transition:outline .1s;flex-shrink:0"></div>`).join('');
}
function _wvPopOpen(pop){
  pop.classList.remove('show');
  pop.style.display='block';
  pop.offsetHeight;
  pop.classList.add('show');
  const outside=ev2=>{if(!pop.contains(ev2.target)&&!ev2.target.closest('.wv-event')&&!ev2.target.closest('.dv-event')){pop.style.display='none';document.removeEventListener('click',outside);}};
  setTimeout(()=>document.addEventListener('click',outside),50);
}
function wvShowPop(id,e){
  wvPopEvId=id;
  const ev=evs.find(x=>x.id===id);
  if(!ev)return;
  _wvPopCurrentColor=ev.color||POP_COLS[0];
  const pop=document.getElementById('wv-ev-pop');
  document.getElementById('wv-pop-title').textContent=ev.recur?'Recurring Event':'Event';
  document.getElementById('wv-pop-name').value=ev.name||'';
  document.getElementById('wv-pop-start').value=ev.time||'';
  document.getElementById('wv-pop-end').value=ev.endTime||'';
  document.getElementById('wv-pop-note').value=ev.note||'';
  document.getElementById('wv-pop-colors').innerHTML=_wvPopColorSwatches(_wvPopCurrentColor);
  document.getElementById('wv-pop-del').style.display='';
  _wvPopPosition(pop,e);
  _wvPopOpen(pop);
}
function wvShowPopV(name,timeLbl,col,e){
  const ev=evs.find(x=>x.name===name&&(x.color===col||!x.color));
  if(ev){wvShowPop(ev.id,e);return;}
  wvPopEvId=null;
  _wvPopCurrentColor=col;
  const pop=document.getElementById('wv-ev-pop');
  document.getElementById('wv-pop-title').textContent='Recurring Event';
  document.getElementById('wv-pop-name').value=name;
  document.getElementById('wv-pop-start').value='';
  document.getElementById('wv-pop-end').value='';
  document.getElementById('wv-pop-note').value='';
  document.getElementById('wv-pop-colors').innerHTML=_wvPopColorSwatches(col);
  document.getElementById('wv-pop-del').style.display='none';
  _wvPopPosition(pop,e);
  _wvPopOpen(pop);
}
function wvPopPickColor(c){
  _wvPopCurrentColor=c;
  document.getElementById('wv-pop-colors').innerHTML=_wvPopColorSwatches(c);
}
function wvPopSave(){
  if(wvPopEvId==null)return;
  const ev=evs.find(x=>x.id===wvPopEvId);
  if(!ev)return;
  const name=document.getElementById('wv-pop-name').value.trim();
  const start=document.getElementById('wv-pop-start').value;
  const end=document.getElementById('wv-pop-end').value;
  const note=document.getElementById('wv-pop-note').value.trim();
  if(name)ev.name=name;
  if(start)ev.time=start; else delete ev.time;
  if(end)ev.endTime=end; else delete ev.endTime;
  ev.note=note||undefined;
  if(_wvPopCurrentColor)ev.color=_wvPopCurrentColor;
  // Persist edits for iCloud events so auto-refresh doesn't revert them
  if(ev.icalUid){
    const fields={};
    if(name)fields.name=ev.name;
    if(_wvPopCurrentColor)fields.color=ev.color;
    if(start)fields.time=ev.time; else fields.time=null;
    if(end)fields.endTime=ev.endTime; else fields.endTime=null;
    fields.note=ev.note;
    icalSaveOverride(ev.icalUid,fields);
  }
  _wvPopCurrentColor=null;
  sv('st_e5',evs);
  document.getElementById('wv-ev-pop').style.display='none';
  renderCal();if(calView==='week')renderWeekView();else if(calView==='day')renderDayView();
  showToast('Event updated');
}
function wvPopClose(){
  _wvPopCurrentColor=null;
  document.getElementById('wv-ev-pop').style.display='none';
}
function wvPopDelete(){
  if(wvPopEvId!=null){delEv(wvPopEvId);wvPopEvId=null;document.getElementById('wv-ev-pop').style.display='none';}
}

// ICS Export
function exportICS(){
  const now=new Date();
  const stamp=now.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//stream.//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:stream. Calendar'];
  function fold(line){// RFC 5545: fold long lines
    if(line.length<=75)return line;
    let out='',i=0;
    while(i<line.length){out+=(i>0?'\r\n ':'')+line.slice(i,i+75);i+=75;}
    return out;
  }
  evs.forEach(ev=>{
    const[y,mo,d]=ev.date.split('-');
    lines.push('BEGIN:VEVENT');
    if(ev.time){
      const[sh,sm]=ev.time.split(':');
      lines.push(fold('DTSTART:'+y+mo+d+'T'+sh+sm+'00'));
      if(ev.endTime){const[eh,em]=ev.endTime.split(':');lines.push(fold('DTEND:'+y+mo+d+'T'+eh+em+'00'));}
      else{const eh=String(parseInt(sh,10)+1).padStart(2,'0');lines.push(fold('DTEND:'+y+mo+d+'T'+eh+sm+'00'));}
    }else{
      lines.push(fold('DTSTART;VALUE=DATE:'+y+mo+d));
      const nd=new Date(ev.date+'T12:00');nd.setDate(nd.getDate()+1);
      lines.push(fold('DTEND;VALUE=DATE:'+nd.toISOString().split('T')[0].replace(/-/g,'')));
    }
    lines.push(fold('SUMMARY:'+ev.name.replace(/[\\;,]/g,c=>'\\'+c)));
    if(ev.note)lines.push(fold('DESCRIPTION:'+ev.note.replace(/[\\;,]/g,c=>'\\'+c)));
    if(ev.subj)lines.push(fold('CATEGORIES:'+ev.subj));
    lines.push('UID:stream-ev-'+ev.id+'@stream.app');
    lines.push('DTSTAMP:'+stamp);
    lines.push('END:VEVENT');
  });
  exams.forEach(ex=>{
    const[y,mo,d]=ex.date.split('-');
    lines.push('BEGIN:VEVENT');
    lines.push(fold('DTSTART;VALUE=DATE:'+y+mo+d));
    const nd=new Date(ex.date+'T12:00');nd.setDate(nd.getDate()+1);
    lines.push(fold('DTEND;VALUE=DATE:'+nd.toISOString().split('T')[0].replace(/-/g,'')));
    lines.push(fold('SUMMARY:\uD83D\uDCDD '+ex.name+' — '+ex.subj));
    lines.push('CATEGORIES:Exam');
    lines.push('UID:stream-exam-'+ex.id+'@stream.app');
    lines.push('DTSTAMP:'+stamp);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='stream-calendar.ics';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Calendar exported — open the .ics to import into Apple Calendar');
}
let _delRecurId=null,_delRecurDs=null;
function delRecurOccurrence(id,ds){
  const ev=evs.find(e=>e.id===id);if(!ev)return;
  _delRecurId=id;_delRecurDs=ds;
  const m=document.getElementById('del-recur-modal');
  const titleEl=document.getElementById('del-recur-title');
  const subEl=document.getElementById('del-recur-sub');
  if(titleEl)titleEl.textContent='Delete "'+ev.name+'"';
  if(subEl)subEl.textContent=(ev.recur?.freq||'recurring')+' event';
  if(m){
    const c=document.getElementById('del-recur-card');
    m.style.animation='none';c.style.animation='none';
    void m.offsetHeight;
    m.style.animation='delModalBgIn .22s ease both';
    c.style.animation='delModalCardIn .28s cubic-bezier(.34,1.28,.64,1) both';
    m.style.display='flex';
  }
}
function closeDelRecurModal(){
  const m=document.getElementById('del-recur-modal');
  const c=document.getElementById('del-recur-card');
  if(!m){_delRecurId=null;_delRecurDs=null;return;}
  c.style.animation='delModalCardIn .18s cubic-bezier(.4,0,.2,1) reverse both';
  m.style.animation='delModalBgIn .18s ease reverse both';
  setTimeout(()=>{m.style.display='none';c.style.animation='';m.style.animation=''},190);
  _delRecurId=null;_delRecurDs=null;
}
function delRecurAll(){
  if(_delRecurId!=null)delEv(_delRecurId);
  closeDelRecurModal();
}
function delRecurThis(){
  if(_delRecurId==null)return;
  const ev=evs.find(e=>e.id===_delRecurId);
  if(ev&&ev.recur&&_delRecurDs){
    ev.recur.exceptions=ev.recur.exceptions||[];
    if(!ev.recur.exceptions.includes(_delRecurDs))ev.recur.exceptions.push(_delRecurDs);
    if(ev.icalUid)icalSaveOverride(ev.icalUid,{recur:ev.recur});
    sv('st_e5',evs);
    renderCal();
    if(calView==='week')renderWeekView();
    else if(calView==='day')renderDayView();
    showToast('Occurrence removed');
  }
  closeDelRecurModal();
}

/* ════ iCLOUD CALDAV SYNC ═══════════════════════════════ */
// We connect to iCloud CalDAV via a CORS proxy since browsers can't
// make cross-origin PROPFIND/REPORT requests directly.
const ICAL_PROXY_DEFAULT='https://streamcalendar.daniel-garg.workers.dev';
function icalNormalizeProxy(u){if(!u)return'';return u.startsWith('http')?u:'https://'+u;}
let icalProxyUrl=icalNormalizeProxy(localStorage.getItem('st_ical_proxy'))||ICAL_PROXY_DEFAULT;
let icalCreds=null;
let icalState='disconnected'; // disconnected | connecting | connected | error
let icalCalendars=[];
let icalHomeUrl='';
// Restore saved session
(()=>{
  const s=localStorage.getItem('st_ical_creds');
  if(s){try{icalCreds=JSON.parse(s);icalHomeUrl=localStorage.getItem('st_ical_home')||'';icalState='connected';}catch(e){}}
})();
// Auto-refresh every 30 seconds when connected + visible countdown
let _icalAutoRefreshTimer=null;
let _icalCountdownTimer=null;
let _icalCountdown=30;
function _icalUpdatePill(syncing){
  const pill=document.getElementById('cal-sync-pill');
  const lbl=document.getElementById('cal-sync-lbl');
  if(!pill||!lbl)return;
  if(icalState!=='connected'){pill.style.visibility='hidden';return;}
  pill.style.visibility='visible';
  if(syncing){
    pill.classList.add('syncing');
    lbl.textContent='syncing…';
  }else{
    pill.classList.remove('syncing');
    lbl.textContent=`sync in ${_icalCountdown}s`;
  }
}
function icalStartAutoRefresh(){
  if(_icalAutoRefreshTimer)clearInterval(_icalAutoRefreshTimer);
  if(_icalCountdownTimer)clearInterval(_icalCountdownTimer);
  _icalCountdown=30;
  _icalUpdatePill(false);
  _icalCountdownTimer=setInterval(()=>{
    _icalCountdown--;
    if(_icalCountdown<=0)_icalCountdown=30;
    _icalUpdatePill(false);
  },1000);
  _icalAutoRefreshTimer=setInterval(async()=>{
    if(icalState!=='connected')return;
    _icalCountdown=30;
    _icalUpdatePill(true);
    try{
      await icalFetchCalendars();await icalFetchAllEvents();
      renderCal();if(calView==='week')renderWeekView();else if(calView==='day')renderDayView();renderDash();
    }catch(e){console.warn('iCloud auto-refresh failed:',e);}
    _icalUpdatePill(false);
  },30000);
}
icalStartAutoRefresh();

// Prevent page scroll when mouse is over the calendar time grid
(function(){
  const calWrap=document.getElementById('cal-views-wrap');
  if(!calWrap)return;
  calWrap.addEventListener('wheel',e=>{
    if(!document.getElementById('pg-cal')?.classList.contains('act'))return;
    e.preventDefault();
    const scrollEl=document.getElementById(calView==='day'?'dv-scroll':'wv-scroll');
    if(scrollEl)scrollEl.scrollTop+=e.deltaY;
  },{passive:false});
})();

async function icalRequest(url,method,body,extraHeaders={}){
  if(!icalProxyUrl)throw new Error('No proxy configured — see Apple Sync setup guide');
  const auth='Basic '+btoa(icalCreds.appleId+':'+icalCreds.password);
  const proxyUrl=icalProxyUrl.replace(/\/+$/,'')+'?target='+encodeURIComponent(url);
  // Always POST to the Worker; real CalDAV method goes in x-caldav-method header.
  // This works around Cloudflare Workers' outbound fetch restriction on WebDAV methods.
  const resp=await fetch(proxyUrl,{
    method:'POST',
    headers:{Authorization:auth,'Content-Type':'application/xml; charset=utf-8',Depth:'1','x-caldav-method':method,...extraHeaders},
    body:body||undefined
  });
  return{status:resp.status,text:await resp.text()};
}

function icalXml(str){return new DOMParser().parseFromString(str,'text/xml');}
// Namespace-safe helpers — iCloud uses DAV:/caldav namespace prefixes
// querySelector fails on prefixed XML; getElementsByTagNameNS('*',local) always works
function icalEl(node,n){return node.getElementsByTagNameNS('*',n)[0]||null;}
function icalEls(node,n){return Array.from(node.getElementsByTagNameNS('*',n));}
function icalHref(node){const h=node&&node.getElementsByTagNameNS('*','href')[0];return h?h.textContent.trim():'';}
function icalText(node,n){const el=icalEl(node,n);return el?el.textContent.trim():'';}
// Legacy shim (unused path kept for safety)
function icalTextOf(doc,...tags){for(const t of tags){const v=icalText(doc,t);if(v)return v;}return '';}

async function icalConnect(appleId,password){
  if(!appleId||!password){showToast('Enter Apple ID and app-specific password');return;}
  icalCreds={appleId,password};icalState='connecting';updateICalUI();
  try{
    // 1. Discover principal
    const r1=await icalRequest('https://caldav.icloud.com/','PROPFIND',
      '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>',
      {Depth:'0'});
    if(r1.status===401||r1.status===403)throw new Error('Wrong Apple ID or app-specific password');
    if(r1.status>=500)throw new Error('iCloud server error ('+r1.status+') — try again');
    const doc1=icalXml(r1.text);
    const principalPath=icalHref(icalEl(doc1,'current-user-principal'));
    if(!principalPath)throw new Error('Could not find iCloud principal — check your Apple ID and app-specific password (status '+r1.status+')');
    const principalUrl=principalPath.startsWith('http')?principalPath:'https://caldav.icloud.com'+principalPath;

    // 2. Get calendar home
    const r2=await icalRequest(principalUrl,'PROPFIND',
      '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/><d:displayname/></d:prop></d:propfind>',
      {Depth:'0'});
    const doc2=icalXml(r2.text);
    const homePath=icalHref(icalEl(doc2,'calendar-home-set'));
    if(!homePath)throw new Error('Could not find iCloud calendar home (status '+r2.status+')');
    icalHomeUrl=homePath.startsWith('http')?homePath:'https://caldav.icloud.com'+homePath;

    // 3. List calendars
    await icalFetchCalendars();
    // 4. Import events
    await icalFetchAllEvents();

    localStorage.setItem('st_ical_creds',JSON.stringify(icalCreds));
    localStorage.setItem('st_ical_home',icalHomeUrl);
    icalState='connected';updateICalUI();icalStartAutoRefresh();
    renderCal();if(calView==='week')renderWeekView();else if(calView==='day')renderDayView();
    showToast('Connected to iCloud — '+evs.filter(e=>e.icalUid).length+' events imported');
  }catch(err){
    icalState='error';icalCreds=null;
    updateICalUI(err.message||'Connection failed');
  }
}

async function icalFetchCalendars(){
  const r=await icalRequest(icalHomeUrl,'PROPFIND',
    '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>',
    {Depth:'1'});
  const doc=icalXml(r.text);icalCalendars=[];
  icalEls(doc,'response').forEach(resp=>{
    const href=icalHref(resp);
    const name=icalText(resp,'displayname')||'Calendar';
    const isCalendar=!!icalEl(resp,'calendar');
    if(href&&isCalendar&&href!==icalHomeUrl&&!href.endsWith('/inbox/')&&!href.endsWith('/outbox/'))
      icalCalendars.push({href:href.trim(),name:name.trim()});
  });
  if(!icalCalendars.length)icalCalendars=[{href:icalHomeUrl,name:'iCloud Calendar'}];
}

function icalSaveOverride(icalUid,fields){
  const ov=JSON.parse(localStorage.getItem('st_ical_ov')||'{}');
  ov[icalUid]=Object.assign(ov[icalUid]||{},fields);
  localStorage.setItem('st_ical_ov',JSON.stringify(ov));
}
function icalApplyOverrides(){
  const ov=JSON.parse(localStorage.getItem('st_ical_ov')||'{}');
  evs.forEach(ev=>{
    if(ev.icalUid&&ov[ev.icalUid])Object.assign(ev,ov[ev.icalUid]);
  });
}

async function icalFetchAllEvents(){
  evs=evs.filter(e=>!e.icalUid);
  for(const cal of icalCalendars){
    try{await icalFetchCalendarEvents(cal);}catch(e){console.warn('Failed to fetch',cal.name,e);}
  }
  icalApplyOverrides();
  sv('st_e5',evs);
}

async function icalFetchCalendarEvents(cal){
  const calUrl=cal.href.startsWith('http')?cal.href:'https://caldav.icloud.com'+cal.href;
  const now=new Date();
  const from=now.toISOString().split('T')[0].replace(/-/g,'')+'T000000Z';
  const future=new Date(now);future.setMonth(future.getMonth()+6);
  const to=future.toISOString().split('T')[0].replace(/-/g,'')+'T000000Z';
  const r=await icalRequest(calUrl,'REPORT',
    `<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${from}" end="${to}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`,
    {Depth:'1','Content-Type':'application/xml; charset=utf-8'});
  const doc=icalXml(r.text);
  icalEls(doc,'calendar-data').forEach(cd=>{
    try{icalParseVEvent(cd.textContent,cal.href);}catch(e){}
  });
}

function icalParseVEvent(icsText,calHref){
  const blocks=icsText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)||[];
  const DN={MO:1,TU:2,WE:3,TH:4,FR:5,SA:6,SU:0};
  blocks.forEach(block=>{
    const get=key=>{const m=block.match(new RegExp('^'+key+'(?:;[^:\\r\\n]+)?:(.+)','m'));return m?m[1].trim().replace(/\\,/g,',').replace(/\\n/g,'\n'):null;};
    const uid=get('UID'),summary=get('SUMMARY');
    const dtstart=get('DTSTART(?:;[^:]+)?')||get('DTSTART');
    if(!uid||!summary||!dtstart)return;
    let date,time,endTime;
    if(dtstart.includes('T')){
      const dt=dtstart.replace(/[^0-9]/g,'');
      date=dt.slice(0,4)+'-'+dt.slice(4,6)+'-'+dt.slice(6,8);
      const h=dt.slice(8,10),mi=dt.slice(10,12);time=h+':'+mi;
      const dtend=get('DTEND(?:;[^:]+)?')||get('DTEND');
      if(dtend&&dtend.includes('T')){const ed=dtend.replace(/[^0-9]/g,'');endTime=ed.slice(8,10)+':'+ed.slice(10,12);}
    }else{
      const dt=dtstart.replace(/[^0-9]/g,'');
      date=dt.slice(0,4)+'-'+dt.slice(4,6)+'-'+dt.slice(6,8);
    }
    // Parse RRULE for recurring events
    const rruleLine=get('RRULE');
    let recur=null;
    if(rruleLine){
      const freq=(rruleLine.match(/FREQ=([^;]+)/i)||[])[1]?.toUpperCase();
      const bydayStr=(rruleLine.match(/BYDAY=([^;]+)/i)||[])[1];
      const untilStr=(rruleLine.match(/UNTIL=([^;]+)/i)||[])[1];
      if(freq==='DAILY'){
        recur={freq:'daily',start:date};
      }else if(freq==='WEEKLY'){
        if(bydayStr){
          const days=bydayStr.split(',').map(d=>DN[d.replace(/[-\d]/g,'').toUpperCase()]).filter(x=>x!==undefined);
          const isWeekdays=days.length===5&&[1,2,3,4,5].every(d=>days.includes(d));
          recur={freq:isWeekdays?'weekdays':'weekly',start:date,days:isWeekdays?null:days};
        }else{
          recur={freq:'weekly',start:date,days:[new Date(date+'T12:00').getDay()]};
        }
      }else if(freq==='MONTHLY'){
        recur={freq:'monthly',start:date};
      }
      if(recur&&untilStr){
        const u=untilStr.replace(/[^0-9]/g,'');
        recur.until=u.slice(0,4)+'-'+u.slice(4,6)+'-'+u.slice(6,8);
      }
    }
    // Dedup: recurring events by uid only (one entry handles all occurrences via recur expansion);
    // non-recurring by uid+date (allows iCloud-expanded occurrences to coexist)
    const occKey=recur?uid:(uid+'__'+date);
    if(evs.some(e=>e._icalKey===occKey))return;
    const col='#0891b2';
    const ev={id:Date.now()+Math.random()*1000|0,name:summary,date,icalUid:uid,_icalKey:occKey,icalCalHref:calHref,color:col};
    if(time)ev.time=time;if(endTime)ev.endTime=endTime;
    if(recur)ev.recur=recur;
    evs.push(ev);
  });
}

async function icalPushEvent(ev){
  if(!icalCreds||!icalCalendars.length)return;
  const calHref=ev.icalCalHref||icalCalendars[0]?.href;if(!calHref)return;
  const calUrl=calHref.startsWith('http')?calHref:'https://caldav.icloud.com'+calHref;
  const uid=ev.icalUid||('stream-'+ev.id+'@stream.app');
  const[y,mo,d]=ev.date.split('-');
  const stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  let dtLines='';
  if(ev.time){
    const[sh,sm]=ev.time.split(':');
    dtLines='DTSTART:'+y+mo+d+'T'+sh+sm+'00\r\n';
    if(ev.endTime){const[eh,em]=ev.endTime.split(':');dtLines+='DTEND:'+y+mo+d+'T'+eh+em+'00\r\n';}
    else dtLines+='DTEND:'+y+mo+d+'T'+String(parseInt(sh,10)+1).padStart(2,'0')+sm+'00\r\n';
  }else{
    const nd=new Date(ev.date+'T12:00');nd.setDate(nd.getDate()+1);
    dtLines='DTSTART;VALUE=DATE:'+y+mo+d+'\r\nDTEND;VALUE=DATE:'+nd.toISOString().split('T')[0].replace(/-/g,'')+'\r\n';
  }
  let rrule='';
  if(ev.recur){
    const r=ev.recur,DN=['SU','MO','TU','WE','TH','FR','SA'];
    if(r.freq==='daily')rrule='RRULE:FREQ=DAILY\r\n';
    else if(r.freq==='weekdays')rrule='RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR\r\n';
    else if(r.freq==='weekly'&&r.days?.length)rrule='RRULE:FREQ=WEEKLY;BYDAY='+r.days.map(x=>DN[x]).join(',')+'\r\n';
    else if(r.freq==='monthly')rrule='RRULE:FREQ=MONTHLY\r\n';
    if(r.until&&rrule)rrule=rrule.trimEnd()+';UNTIL='+r.until.replace(/-/g,'')+'T000000Z\r\n';
  }
  const ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//stream.//EN\r\nBEGIN:VEVENT\r\nDTSTAMP:'+stamp+'\r\nUID:'+uid+'\r\n'+dtLines+rrule+
    'SUMMARY:'+ev.name.replace(/[\\;,]/g,c=>'\\'+c)+'\r\n'+
    (ev.note?'DESCRIPTION:'+ev.note.replace(/[\\;,]/g,c=>'\\'+c)+'\r\n':'')+
    'END:VEVENT\r\nEND:VCALENDAR';
  try{
    await icalRequest(calUrl+uid+'.ics','PUT',ics,{'Content-Type':'text/calendar; charset=utf-8','If-None-Match':'*'});
    // Update the event with icalUid so we can delete it later
    const i=evs.findIndex(e=>e.id===ev.id);
    if(i>=0){evs[i].icalUid=uid;evs[i].icalCalHref=calHref;sv('st_e5',evs);}
  }catch(e){console.warn('iCloud push failed:',e);}
}

async function icalDeleteEvent(uid,calHref){
  if(!icalCreds||!uid||!calHref)return;
  const calUrl=calHref.startsWith('http')?calHref:'https://caldav.icloud.com'+calHref;
  try{await icalRequest(calUrl+uid+'.ics','DELETE',null,{});}
  catch(e){console.warn('iCloud delete failed:',e);}
}

async function icalRefresh(){
  if(!icalCreds)return;
  document.getElementById('wv-pop-del')&&(document.getElementById('wv-ev-pop').style.display='none');
  try{
    await icalFetchCalendars();await icalFetchAllEvents();
    renderCal();if(calView==='week')renderWeekView();else if(calView==='day')renderDayView();
    updateICalUI();showToast('Calendar refreshed from iCloud');
  }catch(e){showToast('Refresh failed: '+e.message);}
}

function icalDisconnect(){
  if(!confirm('Disconnect Apple Calendar? iCloud events will be removed from stream.'))return;
  icalCreds=null;icalState='disconnected';icalCalendars=[];icalHomeUrl='';
  localStorage.removeItem('st_ical_creds');localStorage.removeItem('st_ical_home');
  evs=evs.filter(e=>!e.icalUid);sv('st_e5',evs);
  updateICalUI();_icalUpdatePill(false);renderCal();if(calView==='week')renderWeekView();else if(calView==='day')renderDayView();
}

function openICalModal(){
  document.getElementById('ical-modal').classList.add('open');
  updateICalUI();
}
function closeICalModal(){document.getElementById('ical-modal').classList.remove('open');}

function updateICalUI(errorMsg){
  const ctn=document.getElementById('ical-status-ctn');if(!ctn)return;
  if(icalState==='connected'){
    const count=evs.filter(e=>e.icalUid).length;
    ctn.innerHTML=`<div class="ical-connected-banner">
      <div style="width:10px;height:10px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.2);flex-shrink:0"></div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${icalCreds.appleId}</div>
        <div style="font-size:11px;color:var(--t2);font-family:'Geist Mono',monospace;margin-top:2px">${icalCalendars.length||'—'} calendar${icalCalendars.length!==1?'s':''} · ${count} event${count!==1?'s':''} synced</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="btn bo" style="flex:1;font-size:12px" onclick="icalRefresh()">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0115 3M20 15a8 8 0 01-15-3"/></svg>
        Refresh
      </button>
      <button class="btn bo" style="font-size:12px;color:#e53e3e;border-color:rgba(229,62,62,.25)" onclick="icalDisconnect()">Disconnect</button>
    </div>`;
  }else if(icalState==='connecting'){
    ctn.innerHTML=`<div style="text-align:center;padding:20px 0;font-size:13px;color:var(--t2);font-family:'Geist Mono',monospace">Connecting to iCloud…</div>`;
  }else{
    ctn.innerHTML=`
    ${errorMsg?`<div style="font-size:11.5px;color:#e53e3e;background:rgba(229,62,62,.08);border:1px solid rgba(229,62,62,.2);border-radius:8px;padding:9px 12px;margin-bottom:12px;font-family:'Geist Mono',monospace;line-height:1.5">${errorMsg}</div>`:''}
    <div class="fg"><label class="fl">Apple ID</label><input class="inp" id="ical-appleId" type="email" placeholder="you@icloud.com" autocomplete="email"></div>
    <div class="fg">
      <label class="fl" style="display:flex;align-items:center;justify-content:space-between">
        App-Specific Password
        <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener" style="font-size:10px;color:#2563eb;font-family:'Geist Mono',monospace;text-decoration:none;font-weight:400">appleid.apple.com ↗</a>
      </label>
      <input class="inp" id="ical-pass" type="password" placeholder="xxxx-xxxx-xxxx-xxxx" autocomplete="off" onkeydown="if(event.key==='Enter')icalConnect(document.getElementById('ical-appleId').value,document.getElementById('ical-pass').value)">
    </div>
    <div class="ical-warn">Generate an app-specific password at appleid.apple.com → Security → App-Specific Passwords. Your credentials are stored only on this device.</div>
    <button class="ical-connect-btn" onclick="icalConnect(document.getElementById('ical-appleId').value,document.getElementById('ical-pass').value)">
      <svg fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2" width="14" height="14"><path stroke-linecap="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/><path stroke-linecap="round" d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 01-5.656-5.656l-1.102 1.101"/></svg>
      Connect to Apple Calendar
    </button>`;
  }
}

/* ════ STUDY ════════════════════════════════════════════ */
function renderStudy(){
  const ppd=document.getElementById('pp-date');if(ppd)ppd.value=new Date().toISOString().split('T')[0];
  const mbd=document.getElementById('mb-date');if(mbd)mbd.value=new Date().toISOString().split('T')[0];
  renderLogList();renderPapers();renderMarkbook();
}
const STABS=['log','markbook','papers'];
function switchStudyTab(tab,el){
  if(curStudyTab===tab)return;
  playWhoosh();
  const fromIdx=STABS.indexOf(curStudyTab);
  const toIdx=STABS.indexOf(tab);
  const goRight=toIdx>fromIdx;

  const outEl=document.getElementById('stab-'+curStudyTab);
  const inEl=document.getElementById('stab-'+tab);

  // Render content into the incoming panel while it's still invisible
  if(tab==='papers')renderPapers();
  if(tab==='markbook')renderMarkbook();

  // Outgoing: slide out (stays in DOM as absolute overlay)
  if(outEl){
    outEl.classList.remove('visible','pre-enter-right','pre-enter-left');
    outEl.classList.add(goRight?'exit-right':'exit-left');
    setTimeout(()=>{
      outEl.classList.remove('exit-right','exit-left');
      outEl.classList.add(goRight?'pre-enter-left':'pre-enter-right');
    },360);
  }

  // Incoming: snap to start position (absolutely placed, invisible), then transition to visible
  if(inEl){
    // Ensure we're starting from the correct off-screen position
    inEl.classList.remove('visible','exit-right','exit-left','pre-enter-right','pre-enter-left');
    inEl.classList.add(goRight?'pre-enter-right':'pre-enter-left');
    // Double rAF: ensures the pre-enter class paints before we add .visible
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      inEl.classList.remove('pre-enter-right','pre-enter-left');
      inEl.classList.add('visible');
    }));
  }

  document.querySelectorAll('.stab').forEach(t=>t.classList.remove('act'));
  if(el)el.classList.add('act');
  curStudyTab=tab;
}

/* Stopwatch */
let swRunning=false,swStart=0,swElapsed=0,swTimer=null;

function swFmt(ms){
  const s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);
  const pad=n=>String(n).padStart(2,'0');
  return`${pad(h)}:${pad(m%60)}:${pad(s%60)}`;
}
function swTick(){
  const ms=swElapsed+(Date.now()-swStart);
  document.getElementById('sw-display').textContent=swFmt(ms);
  swUpdateArc(ms);
  updateTabTitle();
}
function swUpdateArc(ms){
  const arc=document.getElementById('sw-arc-path');if(!arc)return;
  const circ=666; // 2π×106
  const maxMs=7200000; // 2h = full circle
  const fill=Math.min(1,(ms||0)/maxMs);
  arc.setAttribute('stroke-dashoffset',circ*(1-fill));
}
function swResetArc(){swUpdateArc(0);}
function swToggle(){
  if(!swRunning){
    // Start
    swStart=Date.now();
    swRunning=true;
    swTimer=setInterval(swTick,500);
    document.getElementById('sw-btn-lbl').textContent='Pause';
    document.getElementById('sw-btn-icon').innerHTML='<rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/>';
    document.getElementById('sw-status').textContent='running';
    document.getElementById('sw-stop-btn').style.display='';
    const cb=document.getElementById('sw-cancel-btn');if(cb)cb.style.display='flex';
    document.getElementById('sw-panel')?.classList.add('sw-running');
  }else{
    // Pause
    swElapsed+=Date.now()-swStart;
    clearInterval(swTimer);swRunning=false;
    document.getElementById('sw-btn-lbl').textContent='Resume';
    document.getElementById('sw-btn-icon').innerHTML='<polygon points="5,3 19,12 5,21"/>';
    document.getElementById('sw-status').textContent='paused';
  }
}
function swStop(){
  if(swRunning){swElapsed+=Date.now()-swStart;clearInterval(swTimer);swRunning=false;}
  const mins=Math.round(swElapsed/60000);
  const subj=document.getElementById('lg-subj').value;
  const what=document.getElementById('lg-what').value.trim()||'study session';
  const date=new Date().toISOString().split('T')[0];
  if(mins>0){
    logs.unshift({id:Date.now(),subj,what,mins,date});
    sv('st_l5',logs);renderLogList();
    lbUpdateStreak();
    lbUpdateWeekly(mins);
    confetti();
    showToast(`Logged ${mins}m of ${subj}`);
  }
  swElapsed=0;swResetArc();
  document.getElementById('sw-display').textContent='00:00:00';
  document.getElementById('sw-btn-lbl').textContent='Start';
  document.getElementById('sw-btn-icon').innerHTML='<polygon points="5,3 19,12 5,21"/>';
  document.getElementById('sw-status').textContent='ready';
  document.getElementById('sw-stop-btn').style.display='none';
  document.getElementById('lg-what').value='';
  const cb=document.getElementById('sw-cancel-btn');if(cb)cb.style.display='none';
  document.getElementById('sw-panel')?.classList.remove('sw-running');
  swFloatHide();
  updateTabTitle();
}

function swCancel(){
  if(swRunning){clearInterval(swTimer);swRunning=false;}
  swElapsed=0;swResetArc();
  document.getElementById('sw-display').textContent='00:00:00';
  document.getElementById('sw-btn-lbl').textContent='Start';
  document.getElementById('sw-btn-icon').innerHTML='<polygon points="5,3 19,12 5,21"/>';
  document.getElementById('sw-status').textContent='ready';
  document.getElementById('sw-stop-btn').style.display='none';
  const cb=document.getElementById('sw-cancel-btn');if(cb)cb.style.display='none';
  document.getElementById('sw-panel')?.classList.remove('sw-running');
  swFloatHide();
  updateTabTitle();
}

/* ════ FLOATING STOPWATCH WIDGET ════════════════════════ */
let swFloatTimer=null;
// (GAP removed — sw-float now centers independently of clock)

function swFloatShow(){
  const el=document.getElementById('sw-float');
  if(!el)return;
  el.style.display='flex';
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('visible')));
  swFloatSync();
  if(swFloatTimer)clearInterval(swFloatTimer);
  swFloatTimer=setInterval(swFloatSync,500);
}

function swFloatHide(){
  const el=document.getElementById('sw-float');
  if(!el)return;
  el.classList.remove('visible');
  setTimeout(()=>{el.style.display='none';},340);
  if(swFloatTimer){clearInterval(swFloatTimer);swFloatTimer=null;}
}

function swFloatSync(){
  const el=document.getElementById('sw-float');
  if(!el||el.style.display==='none')return;
  const ms=swElapsed+(swRunning?Date.now()-swStart:0);
  // Show mm:ss if under an hour, hh:mm:ss if longer
  const s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);
  const pad=n=>String(n).padStart(2,'0');
  const fmt=h>0?`${pad(h)}:${pad(m%60)}:${pad(s%60)}`:`${pad(m)}:${pad(s%60)}`;
  document.getElementById('sw-float-time').textContent=fmt;
  // Subject label
  const subj=document.getElementById('lg-subj')?document.getElementById('lg-subj').value:'';
  const subjEl=document.getElementById('sw-float-subj');
  if(subjEl)subjEl.textContent=subj||'';
  // Dot state
  const dot=document.getElementById('sw-float-dot');
  if(dot)dot.className=swRunning?'':'paused';
  // Pause icon
  const icon=document.getElementById('sw-float-pause-icon');
  if(icon){
    if(swRunning){
      icon.innerHTML='<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
    }else{
      icon.innerHTML='<polygon points="5,3 19,12 5,21"/>';
    }
  }
}

function swFloatToggle(){
  swToggle();
  swFloatSync();
}

function swFloatReturn(){
  // Navigate back to study page, stopwatch tab
  const ni=document.querySelector('.ni[data-page="study"]');
  if(ni)goTo('study',ni);
  setTimeout(()=>{
    const tabEl=document.querySelector('.stab[onclick*="\'log\'"]');
    switchStudyTab('log',tabEl);
  },100);
  swFloatHide();
}

/* ════ STUDY MODE TOGGLE ════════════════════════════════ */
let curSwMode='stopwatch';
function swSetMode(mode,el){
  // Both widgets are always visible as separate cards — no-op
  curSwMode=mode;
}

/* The stopwatch widget's "fullscreen" icon now launches Zen mode directly —
   the legacy sw-fs overlay was retired in favour of the unified Zen view, which
   already shows live stopwatch state via zenSyncTimer + the in-zen control row. */
function swOpenFs(){
  if(curSwMode==='focus'){ftBegin();return;}
  // Skip the confirm dialog here — the user is already actively studying, so
  // friction from another modal isn't useful. zenEnter handles fullscreen + UI.
  zenEnter();
}

/* ════ FOCUS TIMER ══════════════════════════════════════ */
let ftDurMins=25,ftAtm='sakura',ftRunning=false,ftPaused=false;
let ftTotalSecs=0,ftRemSecs=0,ftEndTime=0,ftTimer=null,ftAnimFrame=null;
let ftBreakEnabled=true,ftSoundEnabled=true,ftAutoLog=true;
let ftBreakShown=false,ftBreakAt=20*60; // show break nudge after 20 min
let ftCanvas=null,ftCtx=null,ftParticles=[];

function ftSliderUpdate(v){
  ftDurMins=+v;
  document.getElementById('ft-dur-val').textContent=v;
}
function ftDurStep(delta){
  const slider=document.getElementById('ft-slider');
  const cur=+slider.value;
  const next=Math.max(5,Math.min(120,cur+delta));
  slider.value=next;
  ftSliderUpdate(next);
}
function ftSelAtm(atm,el){
  ftAtm=atm;
  document.querySelectorAll('.atm-chip,.atm-card').forEach(c=>c.classList.remove('act'));
  if(el)el.classList.add('act');
}
function ftToggleOpt(opt,el){
  if(opt==='log')return; // auto-log is always on
  el.classList.toggle('on');
  if(opt==='break')ftBreakEnabled=el.classList.contains('on');
  else if(opt==='sound')ftSoundEnabled=el.classList.contains('on');
}

function ftBegin(){
  const slider=document.getElementById('ft-slider');
  if(slider)ftDurMins=+slider.value;
  ftTotalSecs=ftDurMins*60;
  ftRemSecs=ftTotalSecs;
  ftEndTime=Date.now()+ftTotalSecs*1000;
  ftRunning=true;ftPaused=false;ftBreakShown=false;

  // open fullscreen
  const fs=document.getElementById('focus-fs');
  fs.classList.add('open');
  document.body.style.overflow='hidden';
  // set labels
  const goal=document.getElementById('ft-goal')?.value||'';
  document.getElementById('ffs-goal').textContent=goal?goal.toUpperCase():'';
  document.getElementById('ffs-atm-label').textContent=ftAtmName(ftAtm);
  document.getElementById('ffs-status').textContent='focusing';
  document.getElementById('ffs-pause-icon').innerHTML='<rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/>';
  document.getElementById('ffs-pause-lbl').textContent='Pause';
  document.getElementById('ffs-break').classList.remove('show');
  document.getElementById('ffs-done-msg').classList.remove('show');
  // ring
  const circ=2*Math.PI*120;
  const fill=document.getElementById('ffs-ring-fill');
  fill.style.strokeDasharray=circ;
  fill.style.strokeDashoffset=0;
  ftUpdateDisplay();
  ftSetAtmColour(ftAtm);
  // init canvas
  ftCanvas=document.getElementById('focus-fs-canvas');
  ftCtx=ftCanvas.getContext('2d');
  ftResizeCanvas();
  ftInitParticles();
  ftStartTimer();
  ftAnimLoop();
}

function ftAtmName(a){
  return{sakura:'Sakura',space:'Space',ocean:'Ocean',autumn:'Autumn',rain:'Rain',aurora:'Aurora'}[a]||a;
}
function ftSetAtmColour(a){
  const map={
    sakura:'#1a0a12',space:'#030612',ocean:'#020d1a',
    autumn:'#150a03',rain:'#070c12',aurora:'#040d0a'
  };
  document.getElementById('focus-fs').style.background=map[a]||'#0a0a12';
  const ringFill=document.getElementById('ffs-ring-fill');
  const cols={sakura:'rgba(255,180,200,.6)',space:'rgba(150,180,255,.5)',ocean:'rgba(80,200,220,.5)',autumn:'rgba(240,150,60,.55)',rain:'rgba(160,200,240,.5)',aurora:'rgba(80,220,160,.5)'};
  if(ringFill)ringFill.style.stroke=cols[a]||'rgba(255,255,255,.45)';
}

function ftResizeCanvas(){
  if(!ftCanvas)return;
  ftCanvas.width=window.innerWidth;ftCanvas.height=window.innerHeight;
}

function ftStartTimer(){
  if(ftTimer)clearInterval(ftTimer);
  ftTimer=setInterval(()=>{
    if(ftPaused||!ftRunning)return;
    ftRemSecs=Math.max(0,Math.round((ftEndTime-Date.now())/1000));
    // break nudge
    if(ftBreakEnabled&&!ftBreakShown&&ftRemSecs<=ftTotalSecs-ftBreakAt&&ftTotalSecs>ftBreakAt){
      ftBreakShown=true;
      document.getElementById('ffs-break').classList.add('show');
    }
    if(ftRemSecs<=0){ftRemSecs=0;ftDone();return;}
    ftUpdateDisplay();
    updateTabTitle();
  },1000);
}

function ftUpdateDisplay(){
  const m=Math.floor(ftRemSecs/60),s=ftRemSecs%60;
  const pad=n=>String(n).padStart(2,'0');
  document.getElementById('ffs-time').textContent=`${pad(m)}:${pad(s)}`;
  // ring progress
  const circ=2*Math.PI*120;
  const pct=ftRemSecs/ftTotalSecs;
  const offset=circ*(1-pct);
  const fill=document.getElementById('ffs-ring-fill');
  if(fill)fill.style.strokeDashoffset=offset;
}

function ftTogglePause(){
  ftPaused=!ftPaused;
  const icon=document.getElementById('ffs-pause-icon');
  const lbl=document.getElementById('ffs-pause-lbl');
  const status=document.getElementById('ffs-status');
  if(ftPaused){
    icon.innerHTML='<polygon points="5,3 19,12 5,21"/>';
    lbl.textContent='Resume';status.textContent='paused';
  }else{
    ftEndTime=Date.now()+ftRemSecs*1000; // re-anchor end time on resume
    icon.innerHTML='<rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/>';
    lbl.textContent='Pause';status.textContent='focusing';
  }
}
function ftSkip5(){
  ftRemSecs=Math.min(ftTotalSecs,ftRemSecs+300);
  ftEndTime=Date.now()+ftRemSecs*1000;
  ftUpdateDisplay();
}
function ftEnd(){
  ftRunning=false;ftPaused=false;
  if(ftTimer){clearInterval(ftTimer);ftTimer=null;}
  const minsDone=Math.round((ftTotalSecs-ftRemSecs)/60);
  if(ftAutoLog&&minsDone>0){
    const subj=document.getElementById('ft-subj')?.value||document.getElementById('lg-subj')?.value||'study';
    const what=document.getElementById('ft-goal')?.value||'focus session';
    logs.unshift({id:Date.now(),subj,what,mins:minsDone,date:new Date().toISOString().split('T')[0]});
    sv('st_l5',logs);renderLogList();
    showToast(`Logged ${minsDone}m of ${subj}`);
  }
  ftExit();
}
function ftExit(){
  ftRunning=false;ftPaused=false;
  if(ftTimer){clearInterval(ftTimer);ftTimer=null;}
  if(ftAnimFrame){cancelAnimationFrame(ftAnimFrame);ftAnimFrame=null;}
  document.getElementById('focus-fs').classList.remove('open');
  document.body.style.overflow='';
  ftParticles=[];
  updateTabTitle();
}
function ftDone(){
  ftRunning=false;
  if(ftTimer){clearInterval(ftTimer);ftTimer=null;}
  // chime
  if(ftSoundEnabled)ftChime();
  // show done message
  const minsDone=ftDurMins;
  document.getElementById('ffs-done-sub').textContent=`${minsDone} minutes · well done`;
  document.getElementById('ffs-done-msg').classList.add('show');
  if(ftAutoLog){
    const subj=document.getElementById('ft-subj')?.value||document.getElementById('lg-subj')?.value||'study';
    const what=document.getElementById('ft-goal')?.value||'focus session';
    logs.unshift({id:Date.now(),subj,what,mins:minsDone,date:new Date().toISOString().split('T')[0]});
    sv('st_l5',logs);renderLogList();
  }
  confetti();
}
function ftTakeBreak(){
  ftTogglePause();
  document.getElementById('ffs-break').classList.remove('show');
}
function ftDismissBreak(){
  document.getElementById('ffs-break').classList.remove('show');
}
function ftChime(){
  try{
    const ac=new AudioContext();
    const freqs=[523,659,784,1047];
    freqs.forEach((f,i)=>{
      const osc=ac.createOscillator();
      const gain=ac.createGain();
      osc.connect(gain);gain.connect(ac.destination);
      osc.frequency.value=f;osc.type='sine';
      const t=ac.currentTime+i*.18;
      gain.gain.setValueAtTime(0,t);
      gain.gain.linearRampToValueAtTime(.18,t+.05);
      gain.gain.exponentialRampToValueAtTime(.0001,t+.7);
      osc.start(t);osc.stop(t+.7);
    });
  }catch(e){}
}

/* ── Canvas atmosphere animations ── */
function ftInitParticles(){
  ftParticles=[];
  const n=ftAtm==='rain'?180:ftAtm==='space'?200:80;
  for(let i=0;i<n;i++)ftParticles.push(ftMakeParticle(true));
}
function ftMakeParticle(init){
  const W=ftCanvas?ftCanvas.width:window.innerWidth;
  const H=ftCanvas?ftCanvas.height:window.innerHeight;
  const a=ftAtm;
  if(a==='sakura'){
    return{x:Math.random()*W*1.2-W*.1,y:init?Math.random()*H:-20,
      size:Math.random()*10+5,speed:Math.random()*.8+.4,
      drift:Math.random()*1.2-.6,rot:Math.random()*360,
      rotSpeed:Math.random()*2-1,sway:Math.random()*2+1,swayOff:Math.random()*Math.PI*2,
      opacity:Math.random()*.5+.4,hue:Math.random()*30};
  }
  if(a==='autumn'){
    return{x:Math.random()*W*1.2-W*.1,y:init?Math.random()*H:-20,
      size:Math.random()*14+6,speed:Math.random()*.7+.3,
      drift:Math.random()*1.5-.75,rot:Math.random()*360,
      rotSpeed:Math.random()*3-1.5,sway:Math.random()*2+.5,swayOff:Math.random()*Math.PI*2,
      opacity:Math.random()*.5+.35,hue:Math.random()*40};// hue 0-40 → red/orange
  }
  if(a==='space'){
    const big=Math.random()<.03;
    return{x:Math.random()*W,y:init?Math.random()*H:Math.random()*H,
      size:big?Math.random()*2+1.5:Math.random()*.8+.2,
      speed:big?.05:.02+Math.random()*.08,
      drift:Math.random()*.3-.15,
      opacity:Math.random()*.6+.2,twinkleOff:Math.random()*Math.PI*2,twinkleSpeed:Math.random()*.03+.01};
  }
  if(a==='ocean'){
    return{x:Math.random()*W,y:init?Math.random()*H:H+20,
      size:Math.random()*3+1,speed:-(Math.random()*.5+.15),
      drift:Math.random()*.8-.4,opacity:Math.random()*.35+.08,
      life:0,maxLife:Math.random()*200+100};
  }
  if(a==='rain'){
    return{x:Math.random()*W,y:init?Math.random()*H:-10,
      len:Math.random()*12+8,speed:Math.random()*8+10,
      opacity:Math.random()*.28+.06};
  }
  if(a==='aurora'){
    return{x:Math.random()*W,y:Math.random()*H*.6,
      w:Math.random()*300+200,h:Math.random()*80+40,
      speed:Math.random()*.2-.1,dy:Math.random()*.1-.05,
      opacity:0,targetOp:Math.random()*.12+.04,
      hue:Math.random()*60+140,phase:Math.random()*Math.PI*2};
  }
  return{x:0,y:0,size:2,speed:.5,opacity:.5};
}

function ftAnimLoop(){
  if(!ftRunning&&!ftPaused){return;}
  ftAnimFrame=requestAnimationFrame(ftAnimLoop);
  if(!ftCtx||!ftCanvas)return;
  const W=ftCanvas.width,H=ftCanvas.height;
  const t=Date.now()*.001;
  ftCtx.clearRect(0,0,W,H);

  if(ftAtm==='aurora')ftDrawAurora(W,H,t);

  for(let i=0;i<ftParticles.length;i++){
    const p=ftParticles[i];
    if(ftAtm==='sakura'||ftAtm==='autumn'){
      p.y+=p.speed;
      p.x+=p.drift+Math.sin(t*p.sway+p.swayOff)*.5;
      p.rot+=p.rotSpeed;
      if(p.y>H+30){Object.assign(p,ftMakeParticle(false));p.y=-20;}
      ftCtx.save();
      ftCtx.translate(p.x,p.y);
      ftCtx.rotate(p.rot*Math.PI/180);
      ftCtx.globalAlpha=p.opacity;
      if(ftAtm==='sakura'){
        // pink petal
        ftCtx.fillStyle=`hsl(${340+p.hue},80%,82%)`;
        ftCtx.beginPath();
        ftCtx.ellipse(0,0,p.size*.6,p.size,0,0,Math.PI*2);
        ftCtx.fill();
        ftCtx.fillStyle=`hsla(${340+p.hue},60%,90%,.5)`;
        ftCtx.beginPath();
        ftCtx.ellipse(0,-p.size*.3,p.size*.3,p.size*.5,0,0,Math.PI*2);
        ftCtx.fill();
      }else{
        // autumn leaf (simple shape)
        const h=20+p.hue*1.5; // 20-80 = red-orange-yellow
        ftCtx.fillStyle=`hsl(${h},90%,52%)`;
        ftCtx.beginPath();
        ftCtx.moveTo(0,-p.size);
        ftCtx.bezierCurveTo(p.size*.7,-p.size*.5,p.size*.7,p.size*.5,0,p.size);
        ftCtx.bezierCurveTo(-p.size*.7,p.size*.5,-p.size*.7,-p.size*.5,0,-p.size);
        ftCtx.fill();
      }
      ftCtx.restore();
    } else if(ftAtm==='space'){
      p.y+=p.speed;p.x+=p.drift;
      if(p.y>H+5){Object.assign(p,ftMakeParticle(false));p.y=-5;}
      const twinkle=.5+.5*Math.sin(t*p.twinkleSpeed*60+p.twinkleOff);
      ftCtx.globalAlpha=p.opacity*(.6+.4*twinkle);
      ftCtx.fillStyle='#fff';
      ftCtx.beginPath();
      ftCtx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ftCtx.fill();
      ftCtx.globalAlpha=0;
    } else if(ftAtm==='ocean'){
      p.y+=p.speed;p.x+=p.drift;p.life++;
      const lifeRatio=p.life/p.maxLife;
      const op=p.opacity*(lifeRatio<.2?lifeRatio/.2:lifeRatio>.8?(1-lifeRatio)/.2:1);
      ftCtx.globalAlpha=op;
      ftCtx.fillStyle='rgba(140,220,255,1)';
      ftCtx.beginPath();
      ftCtx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ftCtx.fill();
      ftCtx.globalAlpha=0;
      if(p.life>=p.maxLife){Object.assign(p,ftMakeParticle(false));}
    } else if(ftAtm==='rain'){
      p.y+=p.speed;
      if(p.y>H+20){Object.assign(p,ftMakeParticle(false));p.y=-20;}
      ftCtx.globalAlpha=p.opacity;
      ftCtx.strokeStyle='rgba(160,210,255,1)';
      ftCtx.lineWidth=.8;
      ftCtx.beginPath();
      ftCtx.moveTo(p.x,p.y);
      ftCtx.lineTo(p.x-p.len*.15,p.y-p.len);
      ftCtx.stroke();
      ftCtx.globalAlpha=0;
    }
  }
  ftCtx.globalAlpha=1;
}

function ftDrawAurora(W,H,t){
  for(let i=0;i<ftParticles.length;i++){
    const p=ftParticles[i];
    p.x+=p.speed;p.y+=p.dy;
    p.phase+=.005;
    if(p.opacity<p.targetOp)p.opacity+=.0008;
    if(p.x>W+p.w)p.x=-p.w;
    if(p.x<-p.w)p.x=W;
    const yOff=Math.sin(p.phase)*30;
    const grad=ftCtx.createRadialGradient(p.x,p.y+yOff,0,p.x,p.y+yOff,p.w*.5);
    grad.addColorStop(0,`hsla(${p.hue},80%,55%,${p.opacity})`);
    grad.addColorStop(1,`hsla(${p.hue},80%,55%,0)`);
    ftCtx.fillStyle=grad;
    ftCtx.beginPath();
    ftCtx.ellipse(p.x,p.y+yOff,p.w,p.h,0,0,Math.PI*2);
    ftCtx.fill();
  }
}

/* resize canvas on window resize while focus is open */
window.addEventListener('resize',()=>{
  if(document.getElementById('focus-fs').classList.contains('open'))ftResizeCanvas();
});
/* ════ LOG STATS ═════════════════════════════════════════ */
function renderLogStats(){
  const el=document.getElementById('log-stats');if(!el)return;
  if(!logs.length){el.innerHTML='';return;}

  // Sparkline: last 8 weeks (index 0=oldest, 7=current)
  const now=new Date();
  const weekData=[];
  for(let w=7;w>=0;w--){
    const wStart=new Date(now);
    wStart.setDate(wStart.getDate()-((wStart.getDay()+6)%7)-w*7);
    wStart.setHours(0,0,0,0);
    const wEnd=new Date(wStart);wEnd.setDate(wEnd.getDate()+7);
    const mins=logs.filter(l=>{const d=new Date(l.date+'T00:00');return d>=wStart&&d<wEnd;}).reduce((s,l)=>s+l.mins,0);
    weekData.push(mins);
  }
  const maxMins=Math.max(...weekData,1);
  const H=52,bW=18,gap=8,n=weekData.length,totalW=n*(bW+gap)-gap;
  const bars=weekData.map((m,i)=>{
    const bH=Math.max(3,Math.round(m/maxMins*(H-8)));
    const isCur=i===7;
    const col=isCur?'var(--accent,#6366f1)':m>0?'var(--t3)':'var(--border)';
    const op=isCur?'.95':m>0?'.45':'.25';
    return`<rect x="${i*(bW+gap)}" y="${H-bH}" width="${bW}" height="${bH}" rx="4" fill="${col}" opacity="${op}"><title>${(m/60).toFixed(1)}h</title></rect>`;
  }).join('');

  // Donut: subject breakdown
  const subMins={};
  logs.forEach(l=>{const s=l.subj||'other';subMins[s]=(subMins[s]||0)+l.mins;});
  const sorted=Object.entries(subMins).sort((a,b)=>b[1]-a[1]);
  const totalMins=sorted.reduce((s,[,m])=>s+m,0);
  const totalH=(totalMins/60).toFixed(1);
  const R=26,CX=36,CY=36,CIRC=2*Math.PI*R;
  let off=0;
  const arcs=sorted.map(([subj,m])=>{
    const len=(m/totalMins)*CIRC;
    const col=subjColour(subj)||'#9898a4';
    const a=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${col}" stroke-width="8" stroke-dasharray="${len.toFixed(2)} ${(CIRC-len).toFixed(2)}" stroke-dashoffset="${(-off+CIRC/4).toFixed(2)}" stroke-linecap="butt"/>`;
    off+=len;return a;
  }).join('');
  const legend=sorted.slice(0,4).map(([subj,m])=>{
    const col=subjColour(subj)||'#9898a4';
    return`<div class="log-legend-row"><div class="log-legend-dot" style="background:${col}"></div><div class="log-legend-lbl">${esc(subj)}</div><div class="log-legend-val">${(m/60).toFixed(1)}h</div></div>`;
  }).join('');

  el.innerHTML=`<div class="log-stats-inner">
    <div>
      <div class="log-stat-lbl">weekly hours<span class="log-stat-cur">${(weekData[7]/60).toFixed(1)}h this week</span></div>
      <svg viewBox="0 0 ${totalW} ${H}" class="log-spark-svg" preserveAspectRatio="none">${bars}</svg>
      <div class="log-spark-labels"><span>8w ago</span><span>now</span></div>
    </div>
    <div>
      <div class="log-stat-lbl">by subject<span class="log-stat-cur">${totalH}h total</span></div>
      <div class="log-donut-wrap">
        <div style="position:relative;flex-shrink:0;width:72px;height:72px">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="8"/>
            ${arcs}
          </svg>
          <div class="log-donut-center">${totalH}h</div>
        </div>
        <div class="log-donut-legend">${legend}</div>
      </div>
    </div>
  </div>`;
}

/* ════ COMMAND PALETTE ═══════════════════════════════════ */
const CMD_DEFS=[
  {icon:'🏠',label:'Dashboard',sub:'go to dashboard',section:'Navigate',action:()=>{const n=document.querySelector('.ni[data-page="dash"]');if(n)goTo('dash',n);}},
  {icon:'📅',label:'Calendar',sub:'go to calendar',section:'Navigate',action:()=>{const n=document.querySelector('.ni[data-page="cal"]');if(n)goTo('cal',n);}},
  {icon:'📋',label:'Timetable',sub:'go to timetable',section:'Navigate',action:()=>{const n=document.querySelector('.ni[data-page="tt"]');if(n)goTo('tt',n);}},
  {icon:'📚',label:'Study',sub:'go to study log',section:'Navigate',action:()=>{const n=document.querySelector('.ni[data-page="study"]');if(n)goTo('study',n);}},
  {icon:'👥',label:'Friends',sub:'leaderboard & friends',section:'Navigate',action:()=>{const n=document.querySelector('.ni[data-page="friends"]');if(n)goTo('friends',n);}},
  {icon:'🔔',label:'Add Reminder',sub:'create a new reminder',section:'Add',action:()=>openRM()},
  {icon:'📝',label:'Add Homework',sub:'log a homework task',section:'Add',action:()=>openHWModal()},
  {icon:'📆',label:'Add Event',sub:'add to calendar',section:'Add',action:()=>{const n=document.querySelector('.ni[data-page="cal"]');if(n)goTo('cal',n);setTimeout(()=>openQM(new Date().toISOString().split('T')[0]),380);}},
  {icon:'🔍',label:'Search',sub:'search everything',section:'Add',action:()=>openSearch()},
  {icon:'🌙',label:'Toggle Night Mode',sub:'switch light / dark',section:'Settings',action:()=>toggleNight()},
  {icon:'⚙️',label:'Settings',sub:'open settings panel',section:'Settings',action:()=>openSettings()},
];
let _cmdSel=0,_cmdFiltered=CMD_DEFS;

function openCmd(){
  const ov=document.getElementById('cmd-overlay');if(!ov)return;
  ov.style.display='flex';
  _cmdSel=0;_cmdFiltered=CMD_DEFS;
  renderCmdList();
  requestAnimationFrame(()=>{
    ov.classList.add('open');
    const inp=document.getElementById('cmd-input');
    if(inp){inp.value='';inp.focus();}
  });
}
function closeCmd(){
  const ov=document.getElementById('cmd-overlay');if(!ov)return;
  ov.classList.remove('open');
  setTimeout(()=>ov.style.display='none',200);
}
function renderCmdList(){
  const list=document.getElementById('cmd-list');if(!list)return;
  const q=(document.getElementById('cmd-input')?.value||'').trim().toLowerCase();
  _cmdFiltered=q?CMD_DEFS.filter(c=>c.label.toLowerCase().includes(q)||c.sub.toLowerCase().includes(q)):CMD_DEFS;
  if(_cmdSel>=_cmdFiltered.length)_cmdSel=0;
  if(!_cmdFiltered.length){list.innerHTML='<div style="padding:28px;text-align:center;font-size:13px;color:var(--t3)">No commands found</div>';return;}
  let html='',lastSec='';
  _cmdFiltered.forEach((c,i)=>{
    if(!q&&c.section!==lastSec){lastSec=c.section;html+=`<div class="cmd-section-lbl">${esc(c.section)}</div>`;}
    html+=`<div class="cmd-item${i===_cmdSel?' sel':''}" id="cmd-i-${i}" onclick="cmdRun(${i})" style="animation:cmdItemIn .18s ${i*0.03}s both">
      <div class="cmd-icon">${c.icon}</div>
      <div class="cmd-item-body"><div class="cmd-item-label">${esc(c.label)}</div><div class="cmd-item-sub">${esc(c.sub)}</div></div>
    </div>`;
  });
  list.innerHTML=html;
}
function cmdRun(i){const c=_cmdFiltered[i];if(!c)return;closeCmd();setTimeout(()=>c.action(),180);}
function cmdKeyNav(e){
  if(e.key==='j'&&!e.target.value){closeCmd();return;}
  if(e.key==='ArrowDown'){e.preventDefault();_cmdSel=Math.min(_cmdSel+1,_cmdFiltered.length-1);renderCmdList();document.getElementById(`cmd-i-${_cmdSel}`)?.scrollIntoView({block:'nearest'});}
  else if(e.key==='ArrowUp'){e.preventDefault();_cmdSel=Math.max(_cmdSel-1,0);renderCmdList();document.getElementById(`cmd-i-${_cmdSel}`)?.scrollIntoView({block:'nearest'});}
  else if(e.key==='Enter'){e.preventDefault();cmdRun(_cmdSel);}
  else if(e.key==='Escape'){closeCmd();}
}

function renderLogList(){
  renderLogStats();
  const el=document.getElementById('log-list');if(!el)return;
  const subs=[...new Set(logs.map(l=>l.subj))];
  el.innerHTML=logs.length?logs.map(l=>{
    const si=subs.indexOf(l.subj)%8;
    const dur=l.mins>0?(Math.floor(l.mins/60)?Math.floor(l.mins/60)+'h ':'')+(l.mins%60?l.mins%60+'m':''):'—';
    const sc=subjColour(l.subj);
    return`<div class="le" style="${sc?`border-left-color:${sc}`:''}"><div class="le-ic" style="background:${sc?sc+'22':COLS[si]+'18'};color:${sc||COLS[si]}">${ICOS[si]}</div><div style="flex:1"><div class="le-sj">${esc(l.subj)}</div><div class="le-mt">${l.date}${l.what?' · '+esc(l.what):''}</div></div><div class="le-dur">${dur}</div><div class="db" onclick="delLog(${l.id})">✕</div></div>`;
  }).join(''):'<div class="es"><div class="ei">—</div>No sessions yet.</div>';
}
function delLog(id){logs=logs.filter(l=>l.id!==id);sv('st_l5',logs);renderLogList();}

function selPaperSubj(subj,el){
  curPaperSubj=subj;
  document.querySelectorAll('.stj').forEach(t=>t.classList.remove('act'));
  el.classList.add('act');renderPapers();
}
function addPaper(){
  const name=document.getElementById('pp-name').value.trim();
  const mark=+document.getElementById('pp-mark').value;
  const total=+document.getElementById('pp-total').value||100;
  const date=document.getElementById('pp-date').value;
  if(!name||!mark||!date)return;
  if(mark>total){
    const inp=document.getElementById('pp-mark');
    inp.style.borderColor='#e53e3e';inp.title='Mark cannot exceed total';
    setTimeout(()=>{inp.style.borderColor='';inp.title='';},1800);
    showToast('Mark cannot exceed total score');return;
  }
  const pct=+(mark/total*100).toFixed(1);
  if(pct>100){showToast('Score cannot exceed 100%');return;}
  papers.push({id:Date.now(),subj:curPaperSubj,name,mark,total,date,notes:document.getElementById('pp-notes').value});
  papers.sort((a,b)=>b.date.localeCompare(a.date));sv('st_p5',papers);
  lbUpdateWeekly([{subj:curPaperSubj,pct}]);
  document.getElementById('pp-name').value='';document.getElementById('pp-mark').value='';document.getElementById('pp-notes').value='';
  confetti();
  renderPapers();
  lbPublishIfActive();
}
function renderPapers(){
  const el=document.getElementById('pp-list'),stats=document.getElementById('pp-stats');if(!el||!stats)return;
  const sp=papers.filter(p=>p.subj===curPaperSubj);
  if(!sp.length){stats.innerHTML='';el.innerHTML='<div class="es"><div class="ei">—</div>No papers for '+curPaperSubj+' yet.</div>';return;}
  const avg=sp.reduce((a,b)=>a+(b.mark/b.total*100),0)/sp.length;
  const best=Math.max(...sp.map(p=>p.mark/p.total*100));
  stats.innerHTML=`<div style="display:flex;gap:24px;margin-bottom:12px">
    <div><div style="font-size:11px;color:var(--t3);font-family:'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.08em">Average</div><div style="font-size:30px;font-weight:200;letter-spacing:-.04em">${avg.toFixed(1)}<span style="font-size:13px;color:var(--t3)">%</span></div></div>
    <div><div style="font-size:11px;color:var(--t3);font-family:'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.08em">Best</div><div style="font-size:30px;font-weight:200;letter-spacing:-.04em">${best.toFixed(1)}<span style="font-size:13px;color:var(--t3)">%</span></div></div>
    <div><div style="font-size:11px;color:var(--t3);font-family:'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.08em">Papers</div><div style="font-size:30px;font-weight:200;letter-spacing:-.04em">${sp.length}</div></div>
  </div><div class="avg-wrap"><div class="avg-bar" style="width:${avg}%"></div></div>`;
  el.innerHTML=sp.map(p=>{
    const pct=p.mark/p.total*100;
    const col=pct>=80?'#16a34a':pct>=60?'#d97706':'#e53e3e';
    return`<div class="pp-row">
      <div class="pp-date">${p.date}</div>
      <div><div style="font-size:13px">${esc(p.name)}</div>${p.notes?`<div style="font-size:11px;color:var(--t3)">${esc(p.notes)}</div>`:''}</div>
      <div class="pp-mark">${p.mark}/${p.total}</div>
      <div class="pp-pct" style="background:${col}18;color:${col}">${pct.toFixed(0)}%</div>
      <div class="db" onclick="delPaper(${p.id})">✕</div>
    </div>`;
  }).join('');
  setTimeout(renderTrend,0);
}
function delPaper(id){papers=papers.filter(p=>p.id!==id);sv('st_p5',papers);renderPapers();}

/* ════ MARKBOOK ══════════════════════════════════════════ */
// Pull subjects directly from the user's imported timetable only — no hard-coded fallbacks
function mbSubjects(){
  const found=new Set();
  const days=['monday','tuesday','wednesday','thursday','friday'];
  days.forEach(d=>{
    (TT[d]||[]).forEach(p=>{
      if(p.subj&&p.subj!=='roll call'&&p.subj!=='recess'&&p.subj!=='lunch')
        found.add(p.subj);
    });
  });
  return [...found].sort();
}
// For a given subject, return the icon SVG the user picked in the timetable
// (preferring their p.icon override, then the default subject icon).
function mbSubjIcon(subj){
  const days=['monday','tuesday','wednesday','thursday','friday'];
  for(const d of days){
    const p=(TT[d]||[]).find(x=>x.subj===subj&&x.icon&&TT_ICONS[x.icon]);
    if(p)return TT_ICONS[p.icon];
  }
  return SIC[subj]||SIC['roll call'];
}
function renderMarkbookTiles(){
  const wrap=document.getElementById('mb-tiles');if(!wrap)return;
  const subs=mbSubjects();
  if(!subs.length){
    wrap.innerHTML='<div class="es"><div class="ei">—</div>Import a timetable to see your subjects.</div>';
    curMarkSubj=null;renderMarkbookDetail();return;
  }
  // Keep or pick active subject
  if(!curMarkSubj||!subs.includes(curMarkSubj))curMarkSubj=subs[0];
  wrap.innerHTML=subs.map(s=>{
    const icon=mbSubjIcon(s);
    const col=subjColour(s);
    const bg=col?`style="background:${col}"`:'';
    const sm=marks.filter(m=>m.subj===s);
    const avg=sm.length?(sm.reduce((a,b)=>a+(b.mark/b.total*100),0)/sm.length):null;
    const pctTxt=avg===null?'—':avg.toFixed(0)+'%';
    const pctCls=avg===null?'empty':'';
    const meta=sm.length?`${sm.length} mark${sm.length===1?'':'s'}`:'no marks yet';
    const sArg=esc(s).replace(/'/g,"\\'");
    return `<div class="mb-tile${s===curMarkSubj?' act':''}" data-s="${esc(s)}" onclick="selMarkSubj('${sArg}',this)">
      <div class="tt-ic mb-tile-ic" ${bg}>${icon}</div>
      <div class="mb-tile-body">
        <div class="ttn mb-tile-name">${esc(s)}</div>
        <div class="ttr mb-tile-meta">${meta}</div>
      </div>
      <div class="mb-tile-pct ${pctCls}">${pctTxt}</div>
    </div>`;
  }).join('');
}
function selMarkSubj(subj,el){
  if(subj===curMarkSubj)return;
  curMarkSubj=subj;
  document.querySelectorAll('#mb-tiles .mb-tile').forEach(t=>t.classList.remove('act'));
  if(el)el.classList.add('act');
  renderMarkbookDetail();
  // Vertical swipe-in on the right column, same pattern as calendar cell entry
  const right=document.querySelector('.mb-right');
  if(right){
    right.classList.remove('mb-switching');
    void right.offsetWidth; // force reflow so the animation restarts
    right.classList.add('mb-switching');
  }
}
function renderMarkbook(){
  renderMarkbookTiles();
  renderMarkbookDetail();
}
function renderMarkbookDetail(){
  const headEl=document.getElementById('mb-add-head');
  if(headEl){
    headEl.innerHTML=curMarkSubj
      ? `add mark <span class="mb-add-subj">· ${esc(curMarkSubj)}</span>`
      : 'add mark';
  }
  const statsEl=document.getElementById('mb-stats');
  const listEl=document.getElementById('mb-list');
  const legEl=document.getElementById('mb-legend');
  if(!statsEl||!listEl||!legEl)return;
  if(!curMarkSubj){
    statsEl.innerHTML='';legEl.innerHTML='';
    listEl.innerHTML='<div class="es"><div class="ei">—</div>Pick a subject on the left.</div>';
    renderMarkChart();return;
  }
  const sm=marks.filter(m=>m.subj===curMarkSubj).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const night=document.body.classList.contains('night');
  const col=night?'#60a5fa':'#2563eb';
  if(!sm.length){
    statsEl.innerHTML='';legEl.innerHTML='';
    listEl.innerHTML=`<div class="es"><div class="ei">—</div>No marks for ${esc(curMarkSubj)} yet. Add one on the left.</div>`;
    renderMarkChart();return;
  }
  const pcts=sm.map(m=>m.mark/m.total*100);
  const avg=pcts.reduce((a,b)=>a+b,0)/pcts.length;
  const best=Math.max(...pcts);
  const benchPcts=sm.filter(m=>m.benchmark!=null).map(m=>m.benchmark/m.total*100);
  const benchAvg=benchPcts.length?benchPcts.reduce((a,b)=>a+b,0)/benchPcts.length:null;
  const delta=benchAvg!=null?avg-benchAvg:null;
  const deltaCls=delta==null?'':delta>=0?'delta-pos':'delta-neg';
  const deltaTxt=delta==null?'—':(delta>=0?'+':'')+delta.toFixed(1);
  statsEl.innerHTML=`
    <div><div class="mb-stat-lbl">Average</div><div class="mb-stat-val">${avg.toFixed(1)}<span class="unit">%</span></div></div>
    <div><div class="mb-stat-lbl">Best</div><div class="mb-stat-val">${best.toFixed(1)}<span class="unit">%</span></div></div>
    <div><div class="mb-stat-lbl">Marks</div><div class="mb-stat-val">${sm.length}</div></div>
    <div><div class="mb-stat-lbl">vs Benchmark</div><div class="mb-stat-val ${deltaCls}">${deltaTxt}${delta==null?'':'<span class="unit">pt</span>'}</div></div>`;
  legEl.innerHTML=`
    <div class="mb-legend-item"><span class="mb-legend-dot" style="background:${col}"></span>Your mark</div>
    <div class="mb-legend-item"><span class="mb-legend-dot" style="background:var(--t3)"></span>Benchmark</div>`;
  listEl.innerHTML=sm.slice().reverse().map(m=>{
    const pct=m.mark/m.total*100;
    const rowCol=pct>=80?'#16a34a':pct>=60?'#d97706':'#e53e3e';
    const bench=m.benchmark!=null?`${m.benchmark}/${m.total}`:'—';
    return `<div class="mb-row">
      <div class="mb-row-date">${m.date}</div>
      <div class="mb-row-name">${esc(m.name)}</div>
      <div class="mb-row-mark">${m.mark}/${m.total}</div>
      <div class="mb-row-bench" title="benchmark">${bench}</div>
      <div class="mb-row-pct" style="background:${rowCol}1f;color:${rowCol}">${pct.toFixed(0)}%</div>
      <div class="mb-row-del" onclick="delMark(${m.id})">✕</div>
    </div>`;
  }).join('');
  requestAnimationFrame(renderMarkChart);
}
function addMark(){
  if(!curMarkSubj){showToast('Pick a subject first');return;}
  const name=document.getElementById('mb-name').value.trim();
  const mark=+document.getElementById('mb-mark').value;
  const total=+document.getElementById('mb-total').value||100;
  const benchRaw=document.getElementById('mb-bench').value;
  const bench=benchRaw===''?null:+benchRaw;
  const date=document.getElementById('mb-date').value;
  if(!name||isNaN(mark)||!date){showToast('Fill name, mark and date');return;}
  if(mark>total){
    const inp=document.getElementById('mb-mark');
    inp.style.borderColor='#e53e3e';setTimeout(()=>{inp.style.borderColor='';},1800);
    showToast('Mark cannot exceed total');return;
  }
  if(bench!=null&&(isNaN(bench)||bench>total)){
    const inp=document.getElementById('mb-bench');
    inp.style.borderColor='#e53e3e';setTimeout(()=>{inp.style.borderColor='';},1800);
    showToast('Benchmark cannot exceed total');return;
  }
  marks.push({id:Date.now(),subj:curMarkSubj,name,mark,total,benchmark:bench,date});
  marks.sort((a,b)=>a.date.localeCompare(b.date));
  sv('st_mb1',marks);
  document.getElementById('mb-name').value='';
  document.getElementById('mb-mark').value='';
  document.getElementById('mb-bench').value='';
  confetti();
  renderMarkbook();
}
function delMark(id){marks=marks.filter(m=>m.id!==id);sv('st_mb1',marks);renderMarkbook();}

function renderMarkChart(){
  const canvas=document.getElementById('mb-chart');if(!canvas)return;
  const wrap=canvas.parentElement;
  // Remove any old empty overlay
  const oldEmpty=wrap.querySelector('.mb-chart-empty');if(oldEmpty)oldEmpty.remove();
  const sm=curMarkSubj?marks.filter(m=>m.subj===curMarkSubj).slice().sort((a,b)=>a.date.localeCompare(b.date)):[];
  const W=wrap.offsetWidth||canvas.offsetWidth||400;
  const H=wrap.offsetHeight||180;
  canvas.width=W*2;canvas.height=H*2;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.scale(2,2);
  ctx.clearRect(0,0,W,H);
  if(!sm.length){
    const msg=document.createElement('div');msg.className='mb-chart-empty';
    msg.textContent=curMarkSubj?'No marks yet — add one to see the trend':'Pick a subject';
    wrap.appendChild(msg);return;
  }
  const night=document.body.classList.contains('night');
  const col=night?'#60a5fa':'#2563eb'; // user-mark line/dots — distinct blue
  const gridCol=night?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';
  const axisCol=night?'rgba(200,210,230,.35)':'rgba(60,70,90,.45)';
  const benchCol=night?'rgba(200,210,230,.55)':'rgba(120,130,150,.85)';
  const benchFill=night?'rgba(200,210,230,.3)':'rgba(120,130,150,.65)';

  const padL=34,padR=14,padT=14,padB=22;
  const chartW=W-padL-padR,chartH=H-padT-padB;
  const pcts=sm.map(m=>m.mark/m.total*100);
  const benches=sm.map(m=>m.benchmark!=null?m.benchmark/m.total*100:null);
  const all=pcts.concat(benches.filter(v=>v!=null));
  let lo=Math.max(0,Math.min(...all)-10);
  let hi=Math.min(100,Math.max(...all)+10);
  if(hi-lo<20){const mid=(hi+lo)/2;lo=Math.max(0,mid-10);hi=Math.min(100,mid+10);}
  const toY=v=>padT+chartH-((v-lo)/(hi-lo))*chartH;
  const toX=i=>sm.length===1?padL+chartW/2:padL+(chartW)*(i/(sm.length-1));

  // Y gridlines at 0/25/50/75/100 where in range
  ctx.strokeStyle=gridCol;ctx.lineWidth=1;
  ctx.font='9px "Geist Mono",monospace';
  ctx.fillStyle=axisCol;ctx.textAlign='right';ctx.textBaseline='middle';
  [0,25,50,75,100].forEach(v=>{
    if(v<lo||v>hi)return;
    const y=toY(v);
    ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
    ctx.fillText(v+'%',padL-6,y);
  });

  // X labels (first and last date)
  ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillStyle=axisCol;
  if(sm.length>=1)ctx.fillText(sm[0].date.slice(5),toX(0),H-padB+6);
  if(sm.length>1)ctx.fillText(sm[sm.length-1].date.slice(5),toX(sm.length-1),H-padB+6);

  // User line fill
  ctx.beginPath();
  ctx.moveTo(toX(0),toY(pcts[0]));
  pcts.forEach((v,i)=>{if(i>0)ctx.lineTo(toX(i),toY(v));});
  ctx.lineTo(toX(sm.length-1),padT+chartH);
  ctx.lineTo(toX(0),padT+chartH);
  ctx.closePath();
  ctx.fillStyle=col+(night?'22':'18');
  ctx.fill();

  // User line
  if(sm.length>1){
    ctx.beginPath();ctx.moveTo(toX(0),toY(pcts[0]));
    pcts.forEach((v,i)=>{if(i>0)ctx.lineTo(toX(i),toY(v));});
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  }

  // Benchmark faint connecting line (dashed) through defined benches
  const bpts=benches.map((v,i)=>v==null?null:[toX(i),toY(v)]).filter(Boolean);
  if(bpts.length>1){
    ctx.save();ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(bpts[0][0],bpts[0][1]);
    for(let i=1;i<bpts.length;i++)ctx.lineTo(bpts[i][0],bpts[i][1]);
    ctx.strokeStyle=benchFill;ctx.lineWidth=1.2;ctx.stroke();
    ctx.restore();
  }

  // Benchmark dots (grey) — drawn under user dots
  benches.forEach((v,i)=>{
    if(v==null)return;
    const x=toX(i),y=toY(v);
    ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fillStyle=benchCol;ctx.fill();
    ctx.strokeStyle=night?'rgba(14,15,18,.9)':'rgba(255,255,255,.95)';
    ctx.lineWidth=1.5;ctx.stroke();
  });

  // User mark dots (coloured)
  pcts.forEach((v,i)=>{
    const x=toX(i),y=toY(v);
    ctx.beginPath();ctx.arc(x,y,4.5,0,Math.PI*2);
    ctx.fillStyle=col;ctx.fill();
    ctx.strokeStyle=night?'rgba(14,15,18,.9)':'rgba(255,255,255,.95)';
    ctx.lineWidth=1.8;ctx.stroke();
    // value label above
    ctx.fillStyle=night?'rgba(230,235,255,.85)':'rgba(30,40,70,.78)';
    ctx.font='600 9px "Geist Mono",monospace';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText(v.toFixed(0)+'%',x,y-7);
  });
}
// Redraw chart on resize & theme change
window.addEventListener('resize',()=>{if(curStudyTab==='markbook')renderMarkChart();});

function addExam(){
  const subj=document.getElementById('ex-subj').value;
  const name=document.getElementById('ex-name').value.trim();
  const date=document.getElementById('ex-date').value;
  if(!name||!date)return;
  const id=Date.now();
  exams.push({id,subj,name,date});
  exams.sort((a,b)=>a.date.localeCompare(b.date));sv('st_x5',exams);
  document.getElementById('ex-name').value='';document.getElementById('ex-date').value='';
  // Sync to calendar as an event
  syncExamToCalendar(id,subj,name,date);
  confetti();
  renderExamList();
  if(document.getElementById('cg').innerHTML)renderCal();
  if(calView==='week')renderWeekView();else if(calView==='day')renderDayView();
}
function syncExamToCalendar(examId,subj,name,date){
  // Add as a calendar event tagged with examId so we can remove it later
  evs=evs.filter(e=>e.examId!==examId); // remove old version if re-added
  evs.push({id:Date.now()+1,name:`📝 ${name}`,date,time:'',note:subj,subj,examId});
  evs.sort((a,b)=>a.date.localeCompare(b.date));sv('st_e5',evs);
}
function renderExamList(){
  const el=document.getElementById('exam-list');if(!el)return;
  if(!exams.length){el.innerHTML='<div class="es" style="padding:6px"><div class="ei">—</div>No exams yet.</div>';return;}
  const now=new Date();
  el.innerHTML=exams.map(ex=>{
    const ed=new Date(ex.date+'T09:00:00'),diff=ed-now;
    const days=Math.max(0,Math.floor(diff/86400000));
    const hrs=Math.max(0,Math.floor((diff%86400000)/3600000));
    const over=diff<0;
    return`<div class="exam-card">
      <div style="flex:1"><div class="ex-sj">${ex.subj}</div><div class="ex-nm">${esc(ex.name)} · ${ex.date}</div>
        <div class="ex-prog"><div class="ex-fill" style="width:${over?100:Math.max(2,100-days/90*100)}%"></div></div>
      </div>
      <div><div class="ex-big">${over?'✓':days}</div><div class="ex-unit">${over?'done':days===0?hrs+'h left':days===1?'day left':'days left'}</div></div>
      <div class="db" onclick="delExam(${ex.id})">✕</div>
    </div>`;
  }).join('');
}
function delExam(id){
  _addDeletedId(id);exams=exams.filter(e=>e.id!==id);sv('st_x5',exams);
  // Remove synced calendar event
  evs=evs.filter(e=>e.examId!==id);sv('st_e5',evs);
  renderExamList();
  if(document.getElementById('cg').innerHTML)renderCal();
  if(calView==='week')renderWeekView();
}

/* ════ CONFETTI ═════════════════════════════════════════ */
function confetti(){
  const COLOURS=['#111','#555','#999','#bbb','#2563eb','#16a34a','#9333ea','#e58c1a','#e53e3e','#0891b2'];
  const COUNT=72;
  const container=document.createElement('div');
  container.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden';
  document.body.appendChild(container);

  for(let i=0;i<COUNT;i++){
    const p=document.createElement('div');
    const col=COLOURS[Math.floor(Math.random()*COLOURS.length)];
    const size=5+Math.random()*6;
    const x=10+Math.random()*80; // start spread across top
    const delay=Math.random()*0.4;
    const dur=1.4+Math.random()*0.8;
    const drift=(Math.random()-.5)*340;
    const rot=Math.random()*720*(Math.random()<.5?1:-1);
    const shape=Math.random()<0.5?'50%':(Math.random()<0.5?'2px':'0');

    p.style.cssText=`
      position:absolute;
      left:${x}%;top:-10px;
      width:${size}px;height:${size*(0.5+Math.random()*1)}px;
      background:${col};
      border-radius:${shape};
      opacity:1;
      animation:cf-fall ${dur}s ${delay}s cubic-bezier(.25,.46,.45,.94) forwards;
      --dx:${drift}px;
      --rot:${rot}deg;
    `;
    container.appendChild(p);
  }

  // Inject keyframes once
  if(!document.getElementById('cf-style')){
    const s=document.createElement('style');
    s.id='cf-style';
    s.textContent=`
      @keyframes cf-fall{
        0%  {transform:translateX(0) translateY(0) rotate(0deg);opacity:1}
        80% {opacity:1}
        100%{transform:translateX(var(--dx)) translateY(110vh) rotate(var(--rot));opacity:0}
      }
    `;
    document.head.appendChild(s);
  }

  setTimeout(()=>container.remove(),2800);
}

/* ════ TOAST ════════════════════════════════════════════ */
let toastT=null;
function showToast(msg){const t=document.getElementById('kbd-toast');document.getElementById('kbd-msg').textContent=msg;t.classList.add('show');if(toastT)clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2000);}

/* ════ SHORTCUTS ════════════════════════════════════════ */
function closeSC(){document.getElementById('sco').classList.remove('show');}
const isMac=navigator.platform.toUpperCase().includes('MAC')||navigator.userAgent.includes('Mac');
const MOD_KEY=isMac?'ctrlKey':'altKey'; // Ctrl on Mac, Alt on Win/Linux

document.addEventListener('keydown',e=>{
  const typing=['input','textarea','select'].includes(document.activeElement.tagName.toLowerCase());
  const modalOpen=document.getElementById('qm').classList.contains('open')||document.getElementById('rm').classList.contains('open')||document.getElementById('hw-modal').classList.contains('open');
  if(e.key==='Escape'){
    if(document.getElementById('focus-fs').classList.contains('open')){ftEnd();return;}
    if(document.getElementById('settings-overlay')?.classList.contains('open')){closeSettings();return;}
    if(document.getElementById('fr-detail')?.classList.contains('open')){frCloseDetail();return;}
    if(document.getElementById('fr-add-modal')?.classList.contains('open')){frCloseAdd();return;}
    closeQM();closeRM();closeSC();closeResetModal();closeICSModal();closeHWModal();closeTTEdit();closeSearch();closeCmd();return;
  }
  // Space = toggle stopwatch (when on study page, stopwatch tab, not typing)
  if(e.key===' '&&!typing&&!modalOpen&&curPage==='study'&&curStudyTab==='log'){
    e.preventDefault();
    if(document.getElementById('focus-fs').classList.contains('open')){ftTogglePause();return;}
    swToggle();return;
  }
  if(!typing&&e.key==='?'){document.getElementById('sco').classList.toggle('show');return;}
  if(!typing&&!modalOpen&&e.key==='j'){e.preventDefault();openCmd();return;}

  // Bare arrow keys cycle through pages (when not typing or in a modal)
  if(!typing&&!modalOpen&&!e[MOD_KEY]&&!e.metaKey&&!e.altKey){
    const PGS=['dash','cal','tt','study','friends'];
    const PGNAMES=['Dashboard','Calendar','Timetable','Study','Friends'];
    const idx=PGS.indexOf(curPage);      if(e.key==='ArrowLeft'){e.preventDefault();mhGoTo(0);return;}
    }

    // Left/right on calendar page cycles through Month/Week/Day views
    if(curPage==='cal'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
      e.preventDefault();
      const ci=CAL_VIEWS.indexOf(calView);
      const next=e.key==='ArrowRight'
        ?CAL_VIEWS[(ci+1)%CAL_VIEWS.length]
        :CAL_VIEWS[(ci-1+CAL_VIEWS.length)%CAL_VIEWS.length];
      setCalView(next);
      showToast(next.charAt(0).toUpperCase()+next.slice(1)+' view');
      return;
    }

    // Left/right on study page cycles through study tabs
    if(curPage==='study'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
      e.preventDefault();
      const ti=STABS.indexOf(curStudyTab);
      const next=e.key==='ArrowRight'
        ?STABS[(ti+1)%STABS.length]
        :STABS[(ti-1+STABS.length)%STABS.length];
      const tabEl=document.querySelector(`.stab[onclick*="'${next}'"]`);
      switchStudyTab(next,tabEl);
      showToast(next.charAt(0).toUpperCase()+next.slice(1));
      return;
    }

    // Up/down navigates between the four main pages
    if(e.key==='ArrowDown'&&idx<PGS.length-1){
      e.preventDefault();
      const ni=document.querySelector(`.ni[data-page="${PGS[idx+1]}"]`);
      if(ni)goTo(PGS[idx+1],ni);showToast(PGNAMES[idx+1]);return;
    }
    if(e.key==='ArrowUp'&&idx>0){
      e.preventDefault();
      const ni=document.querySelector(`.ni[data-page="${PGS[idx-1]}"]`);
      if(ni)goTo(PGS[idx-1],ni);showToast(PGNAMES[idx-1]);return;
    }
    // Bare p = pin sidebar
    if((e.key==='p'||e.key==='P')&&!typing){e.preventDefault();togglePin();return;}
  }

  if(e[MOD_KEY]){
    const pages=[{key:'1',pg:'dash',lbl:'Dashboard'},{key:'2',pg:'cal',lbl:'Calendar'},{key:'3',pg:'tt',lbl:'Timetable'},{key:'4',pg:'study',lbl:'Study Log'},{key:'5',pg:'friends',lbl:'Friends'}];
    for(const p of pages){if(e.key===p.key){e.preventDefault();const ni=document.querySelector(`.ni[data-page="${p.pg}"]`);if(ni)goTo(p.pg,ni);showToast(p.lbl);return;}}
    if((e.key==='k'||e.key==='K')&&!typing){e.preventDefault();openSearch();return;}
    if((e.key==='r'||e.key==='R')&&!typing){e.preventDefault();openRM();return;}
    if((e.key==='e'||e.key==='E')&&!typing){e.preventDefault();const ni=document.querySelector('.ni[data-page="cal"]');if(ni)goTo('cal',ni);setTimeout(()=>{openQM(new Date().toISOString().split('T')[0]);},400);return;}
    if(e.key==='ArrowLeft'){e.preventDefault();calNav(-1);showToast('Previous month');return;}
    if(e.key==='ArrowRight'){e.preventDefault();calNav(1);showToast('Next month');return;}
  }
});

// Update shortcut overlay labels to match platform
(function(){
  const mod=isMac?'Ctrl':'Alt';
  document.querySelectorAll('#sco .sc-keys').forEach(row=>{
    const first=row.querySelector('kbd');
    if(first&&first.textContent==='Alt') first.textContent=mod;
  });
})();

/* ════ FRIENDS / LEADERBOARD ═════════════════════════════
   Supabase-backed: leaderboard table (public read, owner write)
   Friends list stored in st_friends, synced via sv()
════════════════════════════════════════════════════════ */
let lbFriends=[];

/* ── Streak helpers ── */
function lbGetWeekKey(){
  const d=new Date();
  // ISO week number
  const jan1=new Date(d.getFullYear(),0,1);
  const wk=Math.ceil(((d-jan1)/86400000+jan1.getDay()+1)/7);
  return`${d.getFullYear()}-W${wk}`;
}

function lbUpdateStreak(){
  const today=new Date().toISOString().split('T')[0];
  let s=JSON.parse(localStorage.getItem('st_lb_streak')||'{"count":0,"last":""}');
  if(s.last===today)return;
  const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
  s.count=s.last===yesterday?s.count+1:1;
  s.last=today;
  localStorage.setItem('st_lb_streak',JSON.stringify(s));
}

function lbGetStreak(){
  const s=JSON.parse(localStorage.getItem('st_lb_streak')||'{"count":0,"last":""}');
  // Streak expires if last date was before yesterday
  const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
  const today=new Date().toISOString().split('T')[0];
  if(s.last!==today&&s.last!==yesterday)return 0;
  return s.count||0;
}

/* ── Weekly stats helpers ── */
function lbUpdateWeekly(addedPapers=[]){
  const wk=lbGetWeekKey();
  let w=JSON.parse(localStorage.getItem('st_lb_weekly')||'{}');
  if(w.weekKey!==wk)w={weekKey:wk,studyMins:0,papers:[]};
  // Accumulate study (called from swStop with mins)
  if(typeof addedPapers==='number'){w.studyMins+=addedPapers;}
  else if(addedPapers.length){w.papers=w.papers.concat(addedPapers);}
  localStorage.setItem('st_lb_weekly',JSON.stringify(w));
}

function lbGetWeeklyStats(){
  const wk=lbGetWeekKey();
  const w=JSON.parse(localStorage.getItem('st_lb_weekly')||'{}');
  if(w.weekKey!==wk)return{weekKey:wk,studyMins:0,weeklyAvg:0,weeklyPapers:0};
  const wp=w.papers||[];
  const wAvg=wp.length?+(wp.reduce((a,b)=>a+b.pct,0)/wp.length).toFixed(1):0;
  return{weekKey:wk,studyMins:w.studyMins||0,weeklyAvg:wAvg,weeklyPapers:wp.length};
}

function lbGetMyStats(){
  const avg=papers.length?papers.reduce((a,b)=>a+b.mark/b.total*100,0)/papers.length:0;
  const totalMins=logs.reduce((a,b)=>a+(b.mins||0),0);
  const last3=papers.slice(0,3).map(p=>({subj:p.subj,name:p.name,pct:+(p.mark/p.total*100).toFixed(1)}));
  // Per-subject averages
  const bySubj={};
  papers.forEach(p=>{if(!bySubj[p.subj])bySubj[p.subj]=[];bySubj[p.subj].push(p.mark/p.total*100);});
  const subjAvgs=Object.entries(bySubj)
    .map(([s,vs])=>({subj:s,avg:+(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(1),count:vs.length}))
    .sort((a,b)=>b.avg-a.avg);
  const weekly=lbGetWeeklyStats();
  const streak=lbGetStreak();
  // Emoji travels inside the freeform stats JSON so friends see the latest pick
  // after the next lbPublish (called by frPickEmoji and on every paper/study
  // log). No schema change required.
  const emoji=localStorage.getItem('st_lb_emoji')||'';
  return{avg:+avg.toFixed(1),paperCount:papers.length,studyMins:totalMins,last3,subjAvgs,streak,emoji,
    weeklyStudyMins:weekly.studyMins,weeklyAvg:weekly.weeklyAvg,weeklyPapers:weekly.weeklyPapers,weekKey:weekly.weekKey};
}

async function lbPublish(){
  if(!sbUserId)return false;
  const username=localStorage.getItem('st_lb_username');
  if(!username)return false;
  const stats=lbGetMyStats();
  const r=await sbFetch('/rest/v1/leaderboard',{
    method:'POST',
    headers:{'Prefer':'resolution=merge-duplicates'},
    body:JSON.stringify({user_id:sbUserId,username,stats,updated_at:new Date().toISOString()})
  });
  return r.ok;
}

async function lbClaimUsername(){
  const inp=document.getElementById('lb-username-inp');if(!inp)return;
  const val=inp.value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  if(val.length<2){lbMsg('At least 2 characters.','#e53e3e');return;}
  if(!sbUserId){lbMsg('Sign in first via the sync panel.','#e53e3e');return;}
  // Check availability
  const r=await sbFetch(`/rest/v1/leaderboard?username=eq.${encodeURIComponent(val)}&select=user_id`);
  if(r.ok){
    const rows=await r.json();
    if(rows.length&&rows[0].user_id!==sbUserId){lbMsg('Username taken — try another.','#e53e3e');return;}
  }
  localStorage.setItem('st_lb_username',val);
  const ok=await lbPublish();
  if(ok){lbMsg(`@${val} claimed ✓`,'#16a34a');lbRenderProfile();lbRefresh();}
  else lbMsg('Save failed — check your connection.','#e53e3e');
}

// Role badges — keyed off Supabase user_id (UUID) so they can't be spoofed by
// claiming a particular handle. Add new roles by extending USER_ROLE_BADGES.
// Function name kept as ownerBadge for back-compat with all the call sites.
const USER_ROLE_BADGES={
  '5a5de371-81dd-4e3b-8ae7-ac83a4d78f2b':{cls:'owner-badge',label:'★ Owner',title:'Stream owner'},
  'fdeb0757-5ca9-4763-8be9-97e85589c0b7':{cls:'ambassador-badge',label:'★ Ambassador',title:'Stream ambassador'}
};
function ownerBadge(uid){
  if(!uid)return'';
  const r=USER_ROLE_BADGES[String(uid)];
  if(!r)return'';
  return`<span class="${r.cls}" title="${r.title}">${r.label}</span>`;
}

// Sequence guards: any stale response from a slower in-flight query is ignored
// once a newer query has fired. Prevents typing-flicker.
let _lbSearchSeq=0;
let _lbSearchT=null;
let _lbModalSearchSeq=0;
let _lbModalSearchT=null;

function lbSearchDebounced(){
  if(_lbSearchT)clearTimeout(_lbSearchT);
  _lbSearchT=setTimeout(lbSearch,160);
}
function lbSearchModalDebounced(){
  if(_lbModalSearchT)clearTimeout(_lbModalSearchT);
  _lbModalSearchT=setTimeout(lbSearchModal,160);
}

async function lbSearch(){
  const inp=document.getElementById('lb-search-inp');if(!inp)return;
  const resultEl=document.getElementById('lb-search-result');if(!resultEl)return;
  const q=inp.value.trim().toLowerCase().replace(/^@/,'');
  if(!q){resultEl.innerHTML='';return;}
  if(!sbUserId){resultEl.innerHTML='<span style="font-size:12px;color:var(--t3)">Sign in to search.</span>';return;}
  const seq=++_lbSearchSeq;
  resultEl.innerHTML='<span style="font-size:12px;color:var(--t3)">Searching…</span>';
  // PostgREST ilike with a trailing '*' wildcard = case-insensitive prefix match
  const r=await sbFetch(`/rest/v1/leaderboard?username=ilike.${encodeURIComponent(q+'*')}&select=user_id,username,stats&order=username.asc&limit=8`);
  if(seq!==_lbSearchSeq)return; // a newer query fired while we were waiting
  if(!r.ok){resultEl.innerHTML='<span style="font-size:12px;color:var(--t3)">Search failed.</span>';return;}
  const rows=(await r.json()).filter(u=>u.user_id!==sbUserId);
  if(seq!==_lbSearchSeq)return;
  if(!rows.length){resultEl.innerHTML='<span style="font-size:12px;color:var(--t3)">No matching users.</span>';return;}
  const sent=JSON.parse(localStorage.getItem('st_fr_sent')||'[]');
  resultEl.innerHTML=rows.map(u=>{
    const alreadyFriend=lbFriends.some(f=>f.user_id===u.user_id);
    const alreadySent=sent.some(s=>s.to_id===u.user_id);
    const avgStr=u.stats?.avg!=null?`${u.stats.avg}% avg`:'no data yet';
    let actionBtn;
    if(alreadyFriend)actionBtn='<span style="font-size:11px;font-family:\'Geist Mono\',monospace;color:var(--t3)">friends ✓</span>';
    else if(alreadySent)actionBtn='<span style="font-size:11px;font-family:\'Geist Mono\',monospace;color:var(--t3)">requested ✓</span>';
    else actionBtn=`<button class="btn bd fr-send-btn" data-uid="${u.user_id}" onclick="lbSendRequest('${u.user_id}','${esc(u.username)}')">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
      Request
    </button>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.5);border-radius:10px;border:1px solid var(--border);margin-top:6px">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">@${esc(u.username)}${ownerBadge(u.user_id)}</div>
        <div style="font-size:10px;font-family:'Geist Mono',monospace;color:var(--t3);margin-top:2px">${avgStr} · ${u.stats?.paperCount||0} papers</div>
      </div>
      ${actionBtn}
    </div>`;
  }).join('');
}

function lbAddFriend(user_id,username){
  // Direct add kept for internal use (e.g. accepting a request locally)
  if(lbFriends.some(f=>f.user_id===user_id))return;
  lbFriends.push({user_id,username});
  sv('st_friends',lbFriends);
}

async function lbRemoveFriend(user_id){
  lbFriends=lbFriends.filter(f=>f.user_id!==user_id);
  sv('st_friends',lbFriends);
  renderLB();
  // Delete the symmetric friend_request row so the removal propagates to the
  // other user — without this, they'd still see this user as a friend forever.
  if(sbUserId&&user_id){
    try{
      await sbFetch(`/rest/v1/friend_requests?or=(and(from_id.eq.${sbUserId},to_id.eq.${user_id}),and(from_id.eq.${user_id},to_id.eq.${sbUserId}))`,{method:'DELETE'});
    }catch{}
  }
}

async function lbFetchFriendStats(){
  if(!lbFriends.length)return[];
  const ids=lbFriends.map(f=>`"${f.user_id}"`).join(',');
  try{
    const r=await sbFetch(`/rest/v1/leaderboard?user_id=in.(${ids})&select=user_id,username,stats,updated_at`);
    if(r.ok)return await r.json();
  }catch{}
  return[];
}

async function lbRefresh(){
  const icon=document.getElementById('lb-refresh-icon');
  if(icon)icon.style.animation='spin .7s linear infinite';
  await renderLB();
  if(icon){icon.style.animation='';icon.style.transform='';}
}

let lbTimeModeStudy='all'; // 'all' | 'week'
let lbTimeModePapers='all';
let lbLastEntries=[]; // cache for detail overlay

// Fallback colour palette for subjects without a custom colour
const FR_SUBJ_PAL=['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#14b8a6','#f97316','#06b6d4','#a855f7'];
function frSubjColor(subj,idx){
  if(typeof subjColour==='function'){const c=subjColour(subj);if(c)return c;}
  return FR_SUBJ_PAL[idx%FR_SUBJ_PAL.length];
}

function frSetTimeStudy(mode,el){
  lbTimeModeStudy=mode;
  document.querySelectorAll('#fr-tt-all-study,#fr-tt-week-study').forEach(b=>b.classList.remove('act'));
  if(el)el.classList.add('act');
  renderLBSection('study',lbLastEntries);
}
function frSetTimePapers(mode,el){
  lbTimeModePapers=mode;
  document.querySelectorAll('#fr-tt-all-papers,#fr-tt-week-papers').forEach(b=>b.classList.remove('act'));
  if(el)el.classList.add('act');
  renderLBSection('papers',lbLastEntries);
}
// Keep old frSetTab/frSetTime as no-ops for safety
function frSetTab(){}
function frSetTime(){}

async function renderLB(){
  const myUsername=localStorage.getItem('st_lb_username');
  const entries=[];
  if(myUsername&&sbUserId){
    entries.push({user_id:sbUserId,username:myUsername,stats:lbGetMyStats(),me:true});
  }
  if(lbFriends.length){
    const fetched=await lbFetchFriendStats();
    lbFriends.forEach(fr=>{
      const data=fetched.find(f=>f.user_id===fr.user_id);
      if(!entries.find(e=>e.user_id===fr.user_id)){
        entries.push(data
          ?{...data,removable:true}
          :{user_id:fr.user_id,username:fr.username,stats:{avg:0,paperCount:0,studyMins:0,last3:[],subjAvgs:[],streak:0},removable:true,noData:true});
      }
    });
  }
  lbLastEntries=entries;
  renderActivityFeed(entries);
  renderLBSection('study',entries);
  renderLBSection('papers',entries);
}

function renderLBSection(mode, entries){
  const elId=mode==='study'?'fr-lb-study':'fr-lb-papers';
  const el=document.getElementById(elId);if(!el)return;
  const isWeek=mode==='study'?lbTimeModeStudy==='week':lbTimeModePapers==='week';
  const isPapers=mode==='papers';

  if(!entries.length){
    el.innerHTML=`<div class="fr-lb-empty"><div class="fr-lb-empty-icon">${isPapers?'📝':'⏱'}</div><div class="fr-lb-empty-h">No friends yet</div><div class="fr-lb-empty-p">Add friends by @username to compete</div></div>`;
    return;
  }

  // Sort
  const sorted=[...entries];
  const sortKey=isWeek?(isPapers?'weeklyAvg':'weeklyStudyMins'):(isPapers?'avg':'studyMins');
  sorted.sort((a,b)=>(b.stats?.[sortKey]||0)-(a.stats?.[sortKey]||0));

  function getVal(e){
    if(isWeek)return isPapers?(e.stats?.weeklyAvg??0):(e.stats?.weeklyStudyMins??0);
    return isPapers?(e.stats?.avg??0):(e.stats?.studyMins??0);
  }
  function fmtVal(e){
    const v=getVal(e);
    if(isPapers)return v?`${v}<span class="fr-pod-unit">%</span>`:'<span class="fr-pod-unit">—</span>';
    if(!v)return'<span class="fr-pod-unit">—</span>';
    return v>=60?`${Math.floor(v/60)}<span class="fr-pod-unit">h</span>`:`${v}<span class="fr-pod-unit">m</span>`;
  }
  function fmtSub(e){
    if(isPapers){const pc=isWeek?(e.stats?.weeklyPapers??0):(e.stats?.paperCount??0);return`${pc} paper${pc!==1?'s':''}`;}
    const avg=e.stats?.avg??0;return avg?`${avg}% avg`:'no papers';
  }
  function streakBadge(e){
    const s=e.stats?.streak||0;
    return s?`<span class="fr-streak"><span class="fr-streak-fire">🔥</span>${s}d</span>`:'';
  }
  function avContent(e){
    // Emoji now travels through the leaderboard row's stats JSON, so we read
    // the same field for self and friends — friends see each other's choice.
    const em=e.stats?.emoji||'';
    return em||((e.username||'?').slice(0,2).toUpperCase());
  }

  const crownSVG=`<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="color:#f59e0b"><path d="M2 19l2-10 4 4 4-8 4 8 4-4 2 10H2z"/></svg>`;
  const top=sorted.slice(0,3);
  const rest=sorted.slice(3);
  const podOrder=[top[1]??null, top[0]??null, top[2]??null];
  const podClasses=['fr-pod fr-pod-2','fr-pod fr-pod-1','fr-pod fr-pod-3'];
  const podRanks=[2,1,3];

  let podHTML='<div class="fr-podium">';
  podOrder.forEach((e,pi)=>{
    if(!e){podHTML+=`<div class="${podClasses[pi]} fr-pod-empty"></div>`;return;}
    const rank=podRanks[pi];
    const hue=e.username?(e.username.split('').reduce((a,c)=>a+c.charCodeAt(0),0)*47)%360:200;
    podHTML+=`<div class="${podClasses[pi]}${e.me?' fr-pod-me':''}" onclick="frShowDetail('${e.user_id}')" style="cursor:none;--pod-delay:${pi*0.07}s">
      ${rank===1?`<div class="fr-pod-crown">${crownSVG}</div>`:''}
      <div class="fr-pod-avatar" style="background:hsl(${hue},55%,50%);color:#fff">${avContent(e)}</div>
      <div class="fr-pod-username">@${esc(e.username)}${ownerBadge(e.user_id)}${e.me?'<span class="fr-pod-you"> you</span>':''}</div>
      ${streakBadge(e)?`<div style="margin:3px 0">${streakBadge(e)}</div>`:''}
      <div class="fr-pod-value">${fmtVal(e)}</div>
      <div class="fr-pod-sub">${fmtSub(e)}</div>
      <div class="fr-pod-step fr-pod-step-${rank}"><span class="fr-pod-rank">${rank}</span></div>
      ${e.removable?`<button class="fr-pod-rm" onclick="event.stopPropagation();lbRemoveFriend('${e.user_id}')" title="Remove">✕</button>`:''}
    </div>`;
  });
  podHTML+='</div>';

  let rowsHTML='';
  if(rest.length){
    rowsHTML='<div class="fr-rows">';
    rest.forEach((e,i)=>{
      const rank=i+4;const v=getVal(e);
      const maxV=isPapers?100:Math.max(...sorted.map(x=>getVal(x)),60);
      const barVal=Math.min(v,maxV)/Math.max(maxV,1)*100;
      rowsHTML+=`<div class="fr-row${e.me?' fr-row-me':''}" onclick="frShowDetail('${e.user_id}')" style="cursor:none;--row-delay:${i*0.05}s">
        <div class="fr-row-rank">${rank}</div>
        <div class="fr-row-info">
          <div class="fr-row-name">@${esc(e.username)}${ownerBadge(e.user_id)}${e.me?' <span class="fr-row-you">you</span>':''}${e.noData?' <span class="fr-row-nd">no data</span>':''}${streakBadge(e)?` ${streakBadge(e)}`:''}</div>
          <div class="fr-row-bar"><div class="fr-row-fill" style="width:${Math.max(2,barVal)}%"></div></div>
        </div>
        <div class="fr-row-val">${fmtVal(e)}<div class="fr-row-vsub">${fmtSub(e)}</div></div>
        ${e.removable?`<button class="fr-row-rm" onclick="event.stopPropagation();lbRemoveFriend('${e.user_id}')" title="Remove">✕</button>`:''}
      </div>`;
    });
    rowsHTML+='</div>';
  }
  el.innerHTML=podHTML+rowsHTML;
}

function renderActivityFeed(entries){
  const el=document.getElementById('fr-feed');if(!el)return;
  // Build activity items from friends' last3 papers + study
  const items=[];
  entries.forEach(e=>{
    if(!e.stats)return;
    const l3=e.stats.last3||[];
    if(l3.length){
      items.push({type:'paper',username:e.username,user_id:e.user_id,paper:l3[0],me:e.me});
    }
    const sm=e.stats.studyMins||0;
    if(sm>0){
      items.push({type:'study',username:e.username,user_id:e.user_id,mins:sm,me:e.me});
    }
  });
  if(!items.length){
    el.innerHTML='<div class="fr-feed-empty">No activity yet</div>';return;
  }
  // Show up to 5 items, interleaved
  const shown=items.slice(0,5);
  el.innerHTML=shown.map(it=>{
    if(it.type==='paper'){
      const pct=it.paper.pct;
      const grade=pct>=80?'🌟':pct>=60?'📝':'📉';
      return`<div class="fr-feed-item">
        <div class="fr-feed-dot">${grade}</div>
        <div class="fr-feed-body">
          <div class="fr-feed-who">${it.me?'You':('@'+esc(it.username)+ownerBadge(it.user_id))}</div>
          <div class="fr-feed-what">${pct}% on ${esc(it.paper.subj)} · ${esc(it.paper.name||'paper')}</div>
        </div>
      </div>`;
    }else{
      const smStr=it.mins>=60?Math.floor(it.mins/60)+'h '+((it.mins%60)||'')+'m total':it.mins+'m total';
      return`<div class="fr-feed-item">
        <div class="fr-feed-dot">⏱</div>
        <div class="fr-feed-body">
          <div class="fr-feed-who">${it.me?'You':('@'+esc(it.username)+ownerBadge(it.user_id))}</div>
          <div class="fr-feed-what">${smStr} studied</div>
        </div>
      </div>`;
    }
  }).join('');
}

/* ── Friend detail overlay ── */
function frShowDetail(uid){
  const e=lbLastEntries.find(x=>x.user_id===uid);if(!e)return;
  const rank=lbLastEntries.indexOf(e)+1;
  const s=e.stats||{};
  const username=e.username||'?';
  const initials=username.slice(0,2).toUpperCase();

  // Avatar — emoji is read from the entry's stats so friends see each other's
  // current pick. Falls back to initials when the user hasn't picked one yet.
  const hue=(username.split('').reduce((a,c)=>a+c.charCodeAt(0),0)*47)%360;
  const avEl=document.getElementById('fr-det-av');
  const theirEmoji=s.emoji||'';
  const avContent=theirEmoji||initials;
  const avFontSize=theirEmoji?'32px':'22px';
  avEl.style.cssText=`background:hsl(${hue},55%,50%);box-shadow:0 0 0 3px hsl(${hue},55%,72%),0 8px 24px rgba(0,0,0,.18);font-size:${avFontSize};position:relative`;
  if(e.me){
    avEl.innerHTML=`${avContent}<div style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-radius:50%;background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:11px;border:2px solid var(--bg);pointer-events:none">✏️</div>`;
    avEl.title='Change avatar';
    avEl.onclick=()=>frToggleEmojiPicker(avEl,hue);
    // Add "tap to change" label below
    let hint=document.getElementById('fr-det-av-hint');
    if(!hint){hint=document.createElement('div');hint.id='fr-det-av-hint';hint.style.cssText='font-size:10px;font-family:\'Geist Mono\',monospace;color:var(--t3);margin-bottom:4px;letter-spacing:.06em;text-transform:uppercase';avEl.parentNode.insertBefore(hint,avEl.nextSibling);}
    hint.textContent='tap to change';
  }else{
    avEl.textContent=avContent;
    avEl.title='';avEl.onclick=null;
    const hint=document.getElementById('fr-det-av-hint');if(hint)hint.remove();
  }

  // Rank badge
  const rb=document.getElementById('fr-det-rank');
  rb.textContent=rank===1?'👑 #1':`#${rank}`;
  rb.className='fr-det-rank-badge'+(rank<=3?` rank-${rank}`:'');

  // Name
  document.getElementById('fr-det-name').innerHTML='@'+esc(username)+ownerBadge(e.user_id);
  const youEl=document.getElementById('fr-det-you');
  youEl.style.display=e.me?'block':'none';

  // Streak row
  const stRow=document.getElementById('fr-det-streak-row');
  const streak=s.streak||0;
  stRow.innerHTML=streak?`<span class="fr-streak"><span class="fr-streak-fire">🔥</span>${streak} day streak</span>`:'';

  // Stat chips
  const avg=s.avg??0;
  const pc=s.paperCount??0;
  const sm=s.studyMins??0;
  const smFmt=sm>=60?`${Math.floor(sm/60)}<span>h</span>`:`${sm}<span>m</span>`;
  document.getElementById('fr-det-chips').innerHTML=`
    <div class="fr-det-chip">
      <div class="fr-det-chip-val">${avg||'—'}${avg?'<span>%</span>':''}</div>
      <div class="fr-det-chip-lbl">avg score</div>
    </div>
    <div class="fr-det-chip">
      <div class="fr-det-chip-val">${pc}</div>
      <div class="fr-det-chip-lbl">papers</div>
    </div>
    <div class="fr-det-chip">
      <div class="fr-det-chip-val">${smFmt}</div>
      <div class="fr-det-chip-lbl">studied</div>
    </div>`;

  // Subject breakdown
  const subjAvgs=s.subjAvgs||[];
  const subjSec=document.getElementById('fr-det-subj-section');
  const subjEl=document.getElementById('fr-det-subjects');
  if(subjAvgs.length){
    subjSec.style.display='';
    const maxAvg=Math.max(...subjAvgs.map(x=>x.avg));
    subjEl.innerHTML=subjAvgs.map((sa,i)=>{
      const col=frSubjColor(sa.subj,i);
      const barW=maxAvg?Math.round(sa.avg/maxAvg*100):0;
      // Gradient from transparent to color
      const grad=`linear-gradient(90deg,${col}28,${col})`;
      const cnt=sa.count||'';
      const pctClass=sa.avg>=80?'hi':sa.avg>=55?'mid':'lo';
      return`<div class="fr-subj-row" style="--delay:${i*0.06}s">
        <div class="fr-subj-accent" style="background:${col}"></div>
        <div class="fr-subj-info">
          <div class="fr-subj-name">${esc(sa.subj)}</div>
          <div class="fr-subj-bar-wrap"><div class="fr-subj-bar-fill" style="width:${barW}%;background:${grad}"></div></div>
        </div>
        <div class="fr-subj-val">
          <div class="fr-subj-pct" style="color:${col}">${sa.avg}%</div>
          ${cnt?`<div class="fr-subj-count">${cnt} paper${cnt!==1?'s':''}</div>`:''}
        </div>
      </div>`;
    }).join('');
  }else{
    subjSec.style.display='none';
  }

  // Recent papers
  const last3=s.last3||[];
  const pSec=document.getElementById('fr-det-papers-section');
  const pEl=document.getElementById('fr-det-papers');
  if(last3.length){
    pSec.style.display='';
    pEl.innerHTML=last3.map(p=>{
      const pctClass=p.pct>=80?'hi':p.pct>=55?'mid':'lo';
      return`<div class="fr-det-paper">
        <div class="fr-det-paper-subj">${esc(p.subj)}</div>
        <div class="fr-det-paper-name">${esc(p.name||'—')}</div>
        <div class="fr-det-paper-pct ${pctClass}">${p.pct}%</div>
      </div>`;
    }).join('');
  }else{
    pSec.style.display='none';
  }

  // Footer
  const foot=document.getElementById('fr-det-footer');
  foot.innerHTML=e.removable
    ?`<button class="fr-det-remove" onclick="lbRemoveFriend('${e.user_id}');frCloseDetail()">Remove friend</button>`
    :'';

  document.getElementById('fr-detail').classList.add('open');
}

function frCloseDetail(){
  document.getElementById('fr-detail').classList.remove('open');
  frCloseEmojiPicker();
}

/* ── Emoji picker for avatar ── */
const FR_EMOJIS=['😎','🎯','🔥','💡','🚀','⚡','🌟','🦁','🐯','🦊','🐺','🦅','🐉','🎭','💎','👑','🎓','📚','🧠','✨','🌙','☀️','🎪','🎨','🎵','🏆','⚔️','🛡️','🎲','🌈'];
let _emojiPickerEl=null;

function frToggleEmojiPicker(anchorEl,hue){
  if(_emojiPickerEl){frCloseEmojiPicker();return;}
  const cur=localStorage.getItem('st_lb_emoji')||'';
  const picker=document.createElement('div');
  picker.id='fr-emoji-picker';
  picker.innerHTML=FR_EMOJIS.map(em=>`<div class="fr-emoji-opt${em===cur?' selected':''}" onclick="frPickEmoji('${em}',${hue})" title="${em}">${em}</div>`).join('')
    +`<div class="fr-emoji-hint">tap to set avatar</div>`;
  // Position below/centered on anchor using fixed coords
  document.body.appendChild(picker);
  const rect=anchorEl.getBoundingClientRect();
  const pw=224;
  let left=rect.left+rect.width/2-pw/2;
  let top=rect.bottom+10;
  // Keep on screen
  left=Math.max(8,Math.min(left,window.innerWidth-pw-8));
  if(top+260>window.innerHeight)top=rect.top-270;
  picker.style.left=left+'px';
  picker.style.top=top+'px';
  _emojiPickerEl=picker;
  setTimeout(()=>document.addEventListener('click',_emojiOutside),50);
}

function _emojiOutside(e){
  if(_emojiPickerEl&&!_emojiPickerEl.contains(e.target)){frCloseEmojiPicker();}
}

function frCloseEmojiPicker(){
  if(_emojiPickerEl){_emojiPickerEl.remove();_emojiPickerEl=null;}
  document.removeEventListener('click',_emojiOutside);
}

function frPickEmoji(emoji,hue){
  localStorage.setItem('st_lb_emoji',emoji);
  frCloseEmojiPicker();
  // Update avatar display immediately
  const avEl=document.getElementById('fr-det-av');
  if(avEl){avEl.textContent=emoji;avEl.style.fontSize='32px';}
  // Update pill avatar
  frRenderPill();
  // Publish — emoji is part of stats now, so friends will see the new pick
  // the next time their leaderboard refreshes.
  lbPublish().then(()=>lbRefresh());
}

function lbRenderProfile(){
  const el=document.getElementById('lb-profile-content');if(!el)return;
  const username=localStorage.getItem('st_lb_username');
  if(!sbUserId){
    el.innerHTML=`<div style="font-size:12px;color:var(--t3);line-height:1.6">Sign in via the sync panel to join the leaderboard and add friends.</div>`;
    return;
  }
  if(!username){
    el.innerHTML=`<div class="fg"><label class="fl">Choose a username</label>
      <div style="display:flex;gap:8px">
        <input class="inp" id="lb-username-inp" placeholder="e.g. daniel_g" style="flex:1" maxlength="24"
          oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'')"
          onkeydown="if(event.key==='Enter')lbClaimUsername()">
        <button class="btn bd" onclick="lbClaimUsername()">Claim</button>
      </div>
    </div>
    <div style="font-size:11px;color:var(--t3)">Letters, numbers and underscores only. Visible to friends.</div>
    <div id="lb-msg" style="font-size:12px;color:var(--t3);margin-top:8px;min-height:16px"></div>`;
    return;
  }
  const s=lbGetMyStats();
  const smStr=s.studyMins>=60?Math.floor(s.studyMins/60)+'h':s.studyMins+'m';
  el.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="flex:1;min-width:0">
      <div style="font-size:16px;font-weight:500;letter-spacing:-.01em">@${esc(username)}${ownerBadge(sbUserId)}</div>
      <div style="font-size:11px;font-family:'Geist Mono',monospace;color:var(--t3);margin-top:1px">your leaderboard handle</div>
    </div>
    <button class="btn bo" onclick="lbChangeUsername()" style="font-size:11px;padding:5px 11px">Change</button>
  </div>
  <div style="display:flex;gap:18px;margin-bottom:10px">
    <div><div style="font-size:10px;font-family:'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--t3)">Avg</div>
      <div style="font-size:26px;font-weight:200;letter-spacing:-.04em">${s.avg||'—'}<span style="font-size:11px;color:var(--t3)">${s.avg?'%':''}</span></div></div>
    <div><div style="font-size:10px;font-family:'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--t3)">Papers</div>
      <div style="font-size:26px;font-weight:200;letter-spacing:-.04em">${s.paperCount}</div></div>
    <div><div style="font-size:10px;font-family:'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--t3)">Study</div>
      <div style="font-size:26px;font-weight:200;letter-spacing:-.04em">${smStr}</div></div>
  </div>
  ${s.last3.length?`<div style="font-size:11px;font-family:'Geist Mono',monospace;color:var(--t3);margin-bottom:8px">${s.last3.map(p=>`${p.subj} <b style="color:var(--text)">${p.pct}%</b>`).join(' · ')}</div>`:''}
  <div id="lb-msg" style="font-size:12px;color:var(--t3);min-height:16px"></div>`;
  // Push latest stats in background whenever profile is viewed
  lbPublish();
}

function lbChangeUsername(){
  localStorage.removeItem('st_lb_username');
  lbRenderProfile();
}

function lbMsg(msg,col){
  const el=document.getElementById('lb-msg');if(!el)return;
  el.style.color=col;el.textContent=msg;
  setTimeout(()=>{if(el.textContent===msg)el.textContent='';},3000);
}
function lbMsg2(msg,col){
  const el=document.getElementById('lb-add-msg');if(!el)return;
  el.style.color=col;el.textContent=msg;
  setTimeout(()=>{if(el.textContent===msg)el.textContent='';},3000);
}
function lbMsgModal(msg,col){
  const el=document.getElementById('fr-modal-msg');if(!el)return;
  el.style.color=col;el.textContent=msg;
  setTimeout(()=>{if(el.textContent===msg)el.textContent='';},3000);
}

function initFriendsTab(){
  lbFriends=JSON.parse(localStorage.getItem('st_friends')||'[]');
  frRenderPill();
  lbRenderProfile();
  lbRefresh();
  // Check for incoming/outgoing requests and process accepted ones
  if(sbUserId){
    renderRequestsPanel();
    // Fetch the server-authoritative friends list (recovers any friendships that
    // were lost from this device's st_friends but still exist as accepted
    // friend_requests). Re-render once it's done.
    lbFetchFriendsFromServer().then(changed=>{if(changed)lbRefresh();});
    frStartRequestPolling();
  }
}

function frRenderPill(){
  const username=localStorage.getItem('st_lb_username');
  const emoji=localStorage.getItem('st_lb_emoji');
  const pilName=document.getElementById('fr-pill-name');
  const pilSub=document.getElementById('fr-pill-sub');
  const pilAvatar=document.getElementById('fr-avatar-pill');
  if(!pilName)return;
  if(username){
    pilName.textContent='@'+username;
    pilSub.textContent='your profile';
    pilAvatar.textContent=emoji||username.slice(0,2).toUpperCase();
    pilAvatar.style.fontSize=emoji?'16px':'11px';
  }else if(sbUserId){
    pilName.textContent='Set username';
    pilSub.textContent='click to set up';
    pilAvatar.textContent='?';pilAvatar.style.fontSize='';
  }else{
    pilName.textContent='Not signed in';
    pilSub.textContent='sign in to compete';
    pilAvatar.textContent='?';pilAvatar.style.fontSize='';
  }
}

function frSetTab(mode, el){
  lbMode=mode;
  document.querySelectorAll('.fr-lb-tab').forEach(t=>t.classList.remove('act'));
  if(el)el.classList.add('act');
  renderLB();
}

function frOpenAdd(){
  const modal=document.getElementById('fr-add-modal');
  if(modal){modal.classList.add('open');document.getElementById('fr-modal-inp')?.focus();}
}

function frCloseAdd(){
  const modal=document.getElementById('fr-add-modal');
  if(modal){modal.classList.remove('open');}
  const inp=document.getElementById('fr-modal-inp');
  if(inp)inp.value='';
  const res=document.getElementById('fr-modal-result');
  if(res)res.innerHTML='';
  const msg=document.getElementById('fr-modal-msg');
  if(msg)msg.textContent='';
}

async function lbSearchModal(){
  const inp=document.getElementById('fr-modal-inp');
  const res=document.getElementById('fr-modal-result');
  const msg=document.getElementById('fr-modal-msg');
  if(!inp||!res)return;
  const q=inp.value.replace(/^@/,'').trim().toLowerCase();
  if(!q){res.innerHTML='';return;}
  if(!sbUserId){res.innerHTML='<div style="font-size:12px;color:var(--t3)">Sign in to search.</div>';return;}
  const seq=++_lbModalSearchSeq;
  res.innerHTML='<div style="font-size:12px;color:var(--t3)">Searching…</div>';
  if(msg)msg.textContent='';
  try{
    const r=await sbFetch(`/rest/v1/leaderboard?username=ilike.${encodeURIComponent(q+'*')}&select=user_id,username,stats&order=username.asc&limit=8`);
    if(seq!==_lbModalSearchSeq)return;
    if(!r.ok)throw new Error();
    const rows=(await r.json()).filter(u=>u.user_id!==sbUserId);
    if(seq!==_lbModalSearchSeq)return;
    if(!rows.length){res.innerHTML='<div style="font-size:12px;color:var(--t3)">No matching users.</div>';return;}
    const sentList=JSON.parse(localStorage.getItem('st_fr_sent')||'[]');
    res.innerHTML=rows.map(found=>{
      const already=lbFriends.some(f=>f.user_id===found.user_id);
      const alreadySentModal=sentList.some(s=>s.to_id===found.user_id);
      const avg=found.stats?.avg??0;
      const pc=found.stats?.paperCount??0;
      let modalAction;
      if(already)modalAction=`<span style="font-size:11px;color:var(--t3)">Friends ✓</span>`;
      else if(alreadySentModal)modalAction=`<span style="font-size:11px;font-family:'Geist Mono',monospace;color:var(--t3)">Requested ✓</span>`;
      else modalAction=`<button class="btn bd fr-send-btn" data-uid="${found.user_id}" onclick="lbSendRequest('${found.user_id}','${esc(found.username)}')" style="font-size:11px;padding:5px 12px;display:flex;align-items:center;gap:5px">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
        Request
      </button>`;
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--glass);border:1px solid var(--border);border-radius:10px;margin-top:10px">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0">${esc(found.username).slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500">@${esc(found.username)}${ownerBadge(found.user_id)}</div>
          <div style="font-size:11px;font-family:'Geist Mono',monospace;color:var(--t3)">${avg?avg+'% avg · ':''} ${pc} paper${pc!==1?'s':''}</div>
        </div>
        ${modalAction}
      </div>`;
    }).join('');
  }catch{
    if(seq===_lbModalSearchSeq)res.innerHTML='<div style="font-size:12px;color:var(--t3)">Search failed. Try again.</div>';
  }
}

async function lbAddFriendFromModal(uid,uname){
  // Legacy: now delegates to send request
  await lbSendRequest(uid,uname);
  setTimeout(frCloseAdd,1200);
}

/* ── Friend Request System ─────────────────────────────── */
// Send a request (writes to friend_requests table)
async function lbSendRequest(to_id,to_username){
  if(!sbUserId){lbMsg2('Sign in to send friend requests.','#e53e3e');return;}
  const myUsername=localStorage.getItem('st_lb_username')||'';
  if(!myUsername){lbMsg2('Set up your username first.','#e53e3e');return;}
  if(lbFriends.some(f=>f.user_id===to_id)){lbMsg2('Already friends!','#9898a4');return;}
  // Check if already sent
  const sent=JSON.parse(localStorage.getItem('st_fr_sent')||'[]');
  if(sent.some(s=>s.to_id===to_id)){lbMsg2('Request already sent!','#9898a4');return;}
  try{
    const r=await sbFetch('/rest/v1/friend_requests',{
      method:'POST',
      headers:{'Prefer':'return=minimal'},
      body:JSON.stringify({from_id:sbUserId,from_username:myUsername,to_id,to_username,status:'pending'})
    });
    if(r.ok||r.status===201||r.status===204){
      sent.push({to_id,to_username});
      localStorage.setItem('st_fr_sent',JSON.stringify(sent));
      lbMsg2(`Request sent to @${to_username} ✓`,'#16a34a');
      lbMsgModal(`Request sent to @${to_username} ✓`,'#16a34a');
      // Dim only the send button(s) for the user we just requested. Searching
      // both result containers covers the case where the same user appears in
      // both the sidebar and the modal at the same time.
      document.querySelectorAll(`button.fr-send-btn[data-uid="${to_id}"]`).forEach(b=>{
        b.textContent='Requested ✓';
        b.disabled=true;
        b.style.opacity='.55';
        b.style.pointerEvents='none';
        b.onclick=null;
      });
    }else{
      const body=await r.json().catch(()=>({}));
      if(r.status===409||(body?.message||'').includes('duplicate')){
        lbMsg2('Request already sent!','#9898a4');lbMsgModal('Request already sent!','#9898a4');
        sent.push({to_id,to_username});localStorage.setItem('st_fr_sent',JSON.stringify(sent));
      }else{
        lbMsg2('Could not send — try again.','#e53e3e');lbMsgModal('Could not send — try again.','#e53e3e');
      }
    }
  }catch{lbMsg2('Connection error.','#e53e3e');lbMsgModal('Connection error.','#e53e3e');}
}

// Accept an incoming request
async function lbAcceptRequest(reqId,from_id,from_username,rowEl){
  if(rowEl){rowEl.classList.add('removing');}
  if(!lbFriends.some(f=>f.user_id===from_id)){
    lbFriends.push({user_id:from_id,username:from_username});
    sv('st_friends',lbFriends);
  }
  try{
    await sbFetch(`/rest/v1/friend_requests?id=eq.${reqId}`,{
      method:'PATCH',
      body:JSON.stringify({status:'accepted'})
    });
  }catch{}
  setTimeout(()=>{renderRequestsPanel();lbRefresh();},280);
}

// Decline a request
async function lbDeclineRequest(reqId,rowEl){
  if(rowEl){rowEl.classList.add('removing');}
  try{
    await sbFetch(`/rest/v1/friend_requests?id=eq.${reqId}`,{method:'DELETE'});
  }catch{}
  setTimeout(renderRequestsPanel,280);
}

// Cancel an outgoing request
async function lbCancelRequest(reqId,to_id,rowEl){
  if(rowEl){rowEl.classList.add('removing');}
  try{
    await sbFetch(`/rest/v1/friend_requests?id=eq.${reqId}`,{method:'DELETE'});
  }catch{}
  let sent=JSON.parse(localStorage.getItem('st_fr_sent')||'[]');
  sent=sent.filter(s=>s.to_id!==to_id);
  localStorage.setItem('st_fr_sent',JSON.stringify(sent));
  setTimeout(renderRequestsPanel,280);
}

// Fetch incoming pending requests for current user
async function lbGetIncomingRequests(){
  if(!sbUserId)return[];
  try{
    const r=await sbFetch(`/rest/v1/friend_requests?to_id=eq.${sbUserId}&status=eq.pending&select=id,from_id,from_username,created_at&order=created_at.desc`);
    if(r.ok)return await r.json();
  }catch{}
  return[];
}

// Fetch outgoing pending requests sent by current user
async function lbGetOutgoingRequests(){
  if(!sbUserId)return[];
  try{
    const r=await sbFetch(`/rest/v1/friend_requests?from_id=eq.${sbUserId}&status=eq.pending&select=id,to_id,to_username,created_at&order=created_at.desc`);
    if(r.ok)return await r.json();
  }catch{}
  return[];
}

// Server-authoritative friend list. Queries friend_requests in both directions
// for accepted relationships and unions with whatever is already in lbFriends.
// This is the durable source of truth — keeping the friend_requests row (we no
// longer delete on accept) means both endpoints can rebuild the friendship from
// the server even if their local st_friends gets wiped or never received a push.
async function lbFetchFriendsFromServer(){
  if(!sbUserId)return false;
  // Load whatever is in localStorage first — initFriendsTab may not have run on
  // this device yet, so the in-memory lbFriends global could still be the
  // module-scope default of [], even though localStorage holds legacy friends.
  try{
    const stored=JSON.parse(localStorage.getItem('st_friends')||'[]');
    if(Array.isArray(stored)){
      for(const f of stored){
        if(f?.user_id&&!lbFriends.some(m=>m.user_id===f.user_id))lbFriends.push(f);
      }
    }
  }catch{}
  try{
    const [outR,inR]=await Promise.all([
      sbFetch(`/rest/v1/friend_requests?from_id=eq.${sbUserId}&status=eq.accepted&select=to_id,to_username`),
      sbFetch(`/rest/v1/friend_requests?to_id=eq.${sbUserId}&status=eq.accepted&select=from_id,from_username`)
    ]);
    const out=outR.ok?await outR.json():[];
    const inc=inR.ok?await inR.json():[];
    const fromServer=[
      ...out.filter(r=>r.to_id).map(r=>({user_id:r.to_id,username:r.to_username})),
      ...inc.filter(r=>r.from_id).map(r=>({user_id:r.from_id,username:r.from_username}))
    ];
    // Union with current lbFriends so legacy local-only friendships (from before
    // friend_requests became durable) are preserved.
    const merged=[...lbFriends];
    let changed=false;
    for(const f of fromServer){
      if(!merged.some(m=>m.user_id===f.user_id)){merged.push(f);changed=true;}
    }
    if(changed){
      lbFriends=merged;
      sv('st_friends',lbFriends);
      // Clear any matching outgoing-pending entries from the local "sent" list
      let sent=JSON.parse(localStorage.getItem('st_fr_sent')||'[]');
      sent=sent.filter(s=>!fromServer.some(f=>f.user_id===s.to_id));
      localStorage.setItem('st_fr_sent',JSON.stringify(sent));
    }
    return changed;
  }catch{return false;}
}

// Back-compat alias: existing call sites still invoke lbProcessAccepted on a
// 20-second poll. Route them through the new server-authoritative loader and
// re-render if anything changed.
async function lbProcessAccepted(){
  const changed=await lbFetchFriendsFromServer();
  if(changed)lbRefresh();
}

// Toggle the requests panel open/closed
let _frReqPanelOpen=false;
function frToggleRequests(){
  _frReqPanelOpen=!_frReqPanelOpen;
  const btn=document.getElementById('fr-req-toggle');
  const panel=document.getElementById('fr-req-panel');
  if(btn)btn.classList.toggle('open',_frReqPanelOpen);
  if(panel)panel.classList.toggle('open',_frReqPanelOpen);
  if(_frReqPanelOpen)renderRequestsPanel();
}

// Render both incoming and outgoing into the panel + update badge
let _lbPendingRequests=[];
let _frReqPolling=null;
async function renderRequestsPanel(){
  if(!sbUserId){
    // Not signed in — show empty states without hitting network
    _updateReqIncoming([]);_updateReqOutgoing([]);return;
  }
  const[incoming,outgoing]=await Promise.all([lbGetIncomingRequests(),lbGetOutgoingRequests()]);
  _lbPendingRequests=incoming;
  // Badge + glow on toggle button
  const badge=document.getElementById('fr-req-badge');
  const toggleBtn=document.getElementById('fr-req-toggle');
  if(badge){
    const total=incoming.length;
    badge.textContent=total;
    badge.style.display=total>0?'inline-flex':'none';
  }
  if(toggleBtn)toggleBtn.classList.toggle('has-incoming',incoming.length>0);
  _updateReqIncoming(incoming);
  _updateReqOutgoing(outgoing);
}

function _updateReqIncoming(incoming){
  const el=document.getElementById('fr-req-incoming-list');if(!el)return;
  if(!incoming.length){el.innerHTML='<div class="fr-req-empty">no incoming requests</div>';return;}
  const hues=[231,341,189,152,275,32];
  el.innerHTML=incoming.map((req,i)=>{
    const hue=hues[i%hues.length];
    const initials=req.from_username.slice(0,2).toUpperCase();
    const ago=frTimeAgo(req.created_at);
    return`<div class="fr-req-row" id="fr-req-row-${req.id}" style="animation-delay:${i*0.06}s">
      <div class="fr-req-av" style="background:hsl(${hue},62%,50%)">${initials}</div>
      <div class="fr-req-info">
        <div class="fr-req-name">@${esc(req.from_username)}${ownerBadge(req.from_id)}</div>
        <div class="fr-req-time">${ago}</div>
      </div>
      <div class="fr-req-btns">
        <button class="fr-req-accept" onclick="lbAcceptRequest('${req.id}','${req.from_id}','${esc(req.from_username)}',document.getElementById('fr-req-row-${req.id}'))">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          Accept
        </button>
        <button class="fr-req-decline" onclick="lbDeclineRequest('${req.id}',document.getElementById('fr-req-row-${req.id}'))">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" width="10" height="10"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

function _updateReqOutgoing(outgoing){
  const el=document.getElementById('fr-req-outgoing-list');if(!el)return;
  if(!outgoing.length){el.innerHTML='<div class="fr-req-empty">no outgoing requests</div>';return;}
  const hues=[189,152,275,32,231,341];
  el.innerHTML=outgoing.map((req,i)=>{
    const hue=hues[i%hues.length];
    const initials=req.to_username.slice(0,2).toUpperCase();
    const ago=frTimeAgo(req.created_at);
    return`<div class="fr-req-out-row" id="fr-req-out-${req.id}" style="animation-delay:${i*0.06}s">
      <div class="fr-req-av" style="background:hsl(${hue},55%,58%);opacity:.8">${initials}</div>
      <div class="fr-req-info">
        <div class="fr-req-name">@${esc(req.to_username)}${ownerBadge(req.to_id)}</div>
        <div class="fr-req-time">${ago} · pending</div>
      </div>
      <button class="fr-req-cancel" onclick="lbCancelRequest('${req.id}','${req.to_id}',document.getElementById('fr-req-out-${req.id}'))">Cancel</button>
    </div>`;
  }).join('');
}

// Start background polling for requests (runs every 20s while on friends page)
function frStartRequestPolling(){
  if(_frReqPolling)clearInterval(_frReqPolling);
  _frReqPolling=setInterval(()=>{
    if(sbUserId&&curPage==='friends'){renderRequestsPanel();lbProcessAccepted();}
  },20000);
}

function frTimeAgo(iso){
  if(!iso)return'';
  const diff=(Date.now()-new Date(iso))/1000;
  if(diff<60)return'just now';
  if(diff<3600)return`${Math.floor(diff/60)}m ago`;
  if(diff<86400)return`${Math.floor(diff/3600)}h ago`;
  return`${Math.floor(diff/86400)}d ago`;
}

function frOpenSetup(){
  // Pulse the profile card to draw attention
  const profileCard=document.getElementById('fr-profile-card');
  if(profileCard){
    profileCard.classList.add('fr-pulse');
    setTimeout(()=>profileCard.classList.remove('fr-pulse'),700);
  }
  // Focus username input if present
  const inp=document.getElementById('lb-username-inp');
  if(inp)setTimeout(()=>inp.focus(),80);
}

// Keep leaderboard in sync when papers are added — instant publish + refresh
async function lbPublishIfActive(){
  if(!localStorage.getItem('st_lb_username')||!sbUserId)return;
  await lbPublish();
  // If user is on the friends page, refresh it immediately with updated local stats
  if(curPage==='friends'){
    // Update our own entry in the cache without a network round-trip
    const myUsername=localStorage.getItem('st_lb_username');
    const fresh=lbGetMyStats();
    const idx=lbLastEntries.findIndex(e=>e.me);
    if(idx>=0)lbLastEntries[idx].stats=fresh;
    else if(myUsername)lbLastEntries.unshift({user_id:sbUserId,username:myUsername,stats:fresh,me:true});
    renderActivityFeed(lbLastEntries);
  }
}

/* ════ ONBOARDING ════════════════════════════════════════ */
const OB_KEY='st_setup_done';
let obICSData=null;
let obCurStep=0;

function obGoTo(step){
  // Validate step 1 before advancing
  if(step===2){
    const name=document.getElementById('ob-name').value.trim();
    if(!name){
      document.getElementById('ob-s1-msg').textContent='Enter your first name to continue.';
      document.getElementById('ob-s1-msg').style.color='#e53e3e';
      document.getElementById('ob-name').focus();
      return;
    }
    document.getElementById('ob-s1-msg').textContent='';
  }
  const cur=document.getElementById('ob-s'+obCurStep);
  if(cur){cur.classList.add('exit');setTimeout(()=>{cur.classList.remove('active','exit');},280);}
  obCurStep=step;
  const next=document.getElementById('ob-s'+obCurStep);
  if(next){setTimeout(()=>{next.classList.add('active');},50);}
  // Update dots
  for(let i=0;i<4;i++){
    const d=document.getElementById('ob-dot-'+i);
    if(d)d.classList.toggle('on',i===step);
  }
  // Auto-focus first input in new step
  setTimeout(()=>{
    const inp=next?.querySelector('input:not([type=file])');
    if(inp)inp.focus();
  },120);
}

function obValidateStep1(){
  const name=document.getElementById('ob-name').value.trim();
  document.getElementById('ob-s1-msg').textContent='';
}

// Drag & drop
const obDrop=document.getElementById('ob-drop');
obDrop.addEventListener('dragover',e=>{e.preventDefault();obDrop.classList.add('drag-over');});
obDrop.addEventListener('dragleave',()=>obDrop.classList.remove('drag-over'));
obDrop.addEventListener('drop',e=>{
  e.preventDefault();obDrop.classList.remove('drag-over');
  const f=e.dataTransfer.files[0];if(f)obHandleFile(f);
});
document.getElementById('ob-file').addEventListener('change',function(){
  if(this.files[0])obHandleFile(this.files[0]);
});

let _obAuthMode='create'; // 'create' | 'signin'
function obSetAuthMode(mode){
  _obAuthMode=mode;
  const isCreate=mode==='create';
  document.getElementById('ob-tab-create').classList.toggle('act',isCreate);
  document.getElementById('ob-tab-signin').classList.toggle('act',!isCreate);
  document.getElementById('ob-s3-h').textContent=isCreate?'Sync your data.':'Welcome back.';
  document.getElementById('ob-s3-p').textContent=isCreate?'Create an account to sync across devices, access the leaderboard, and never lose your data.':'Sign in to restore your data and get back on the leaderboard.';
  document.getElementById('ob-pw-hint').textContent=isCreate?'(min. 6 characters)':'';
  document.getElementById('ob-auth-btn-lbl').innerHTML=isCreate?'Create account &amp; launch':'Sign in &amp; launch';
  document.getElementById('ob-auth-msg').textContent='';
  document.getElementById('ob-password').autocomplete=isCreate?'new-password':'current-password';
}

async function obSubmitAuth(){
  const email=document.getElementById('ob-email').value.trim();
  const password=document.getElementById('ob-password').value;
  const msgEl=document.getElementById('ob-auth-msg');
  if(!email||!password){msgEl.textContent='Enter your email and password.';msgEl.style.color='#e53e3e';return;}
  if(_obAuthMode==='create'&&password.length<6){msgEl.textContent='Password must be at least 6 characters.';msgEl.style.color='#e53e3e';return;}
  msgEl.textContent=_obAuthMode==='create'?'Creating account…':'Signing in…';msgEl.style.color='#9898a4';
  const res=_obAuthMode==='create'?await sbSignUp(email,password):await sbSignIn(email,password);
  if(res.error){msgEl.textContent=res.error;msgEl.style.color='#e53e3e';return;}
  if(res.access_token){
    localStorage.setItem('sb_session',JSON.stringify(res));
    sbAuthToken=res.access_token;
    sbUserId=res.user?.id;
  }
  msgEl.textContent=_obAuthMode==='create'?'Account created ✓':'Signed in ✓';msgEl.style.color='#16a34a';
  if(_obAuthMode==='create'){
    const obUn=document.getElementById('ob-username')?.value.trim();
    if(obUn&&sbUserId){localStorage.setItem('st_lb_username',obUn);await lbPublish();}
  }else if(sbUserId){
    // Sign-in: pull remote data so existing data is restored before launch
    const remote=await sbLoadAll();
    if(remote)applyRemoteData(remote);
  }
  setTimeout(()=>obFinish(),600);
}

// Legacy alias kept for any inline onclicks that may still reference it
async function obCreateAccount(){return obSubmitAuth();}

function obHandleFile(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const parsed=parseICS(e.target.result);
    if(parsed){
      obICSData=parsed;
      obDrop.classList.add('ok');
      document.getElementById('ob-drop-icon').textContent='✅';
      document.getElementById('ob-drop-text').textContent=file.name;
      document.getElementById('ob-drop-hint').textContent='Timetable ready to import';
    }else{
      document.getElementById('ob-drop-icon').textContent='❌';
      document.getElementById('ob-drop-text').textContent='Could not parse this file';
      document.getElementById('ob-drop-hint').textContent='Make sure it\'s a valid .ics timetable';
    }
  };
  reader.readAsText(file);
}

// ICS parser — extracts weekly timetable into TT-compatible format
function parseICS(text){
  try{
    // RFC 5545 §3.1: unfold lines (CRLF/LF followed by a single whitespace = continuation)
    text=text.replace(/\r\n([ \t])/g,'').replace(/\n([ \t])/g,'');

    const BYDAY_MAP={MO:'monday',TU:'tuesday',WE:'wednesday',TH:'thursday',FR:'friday'};
    const events=[];
    const blocks=text.split('BEGIN:VEVENT').slice(1);
    for(const b of blocks){
      // Match both plain DTSTART: and parameterised DTSTART;TZID=...:
      const get=k=>{const m=b.match(new RegExp(k+'(?:;[^:]*)?:([^\\r\\n]+)'));return m?m[1].trim():''};
      const dtstart=get('DTSTART'),dtend=get('DTEND'),summary=get('SUMMARY'),location=get('LOCATION'),desc=get('DESCRIPTION');
      if(!dtstart||!summary)continue;
      // Support both UTC (ends with Z) and local-time formats (no Z suffix)
      // Also handle date-only format (VALUE=DATE:20260206 — no time component)
      const toDate=s=>{
        const c=s.replace('Z','');
        if(c.length===8){
          // Date-only: YYYYMMDD — treat as local midnight
          return new Date(`${c.slice(0,4)}-${c.slice(4,6)}-${c.slice(6,8)}T00:00:00`);
        }
        const str=`${c.slice(0,4)}-${c.slice(4,6)}-${c.slice(6,8)}T${c.slice(9,11)}:${c.slice(11,13)}:${c.slice(13,15)}`;
        return s.endsWith('Z')?new Date(str+'Z'):new Date(str);
      };
      const ps=dtstart,pe=dtend||dtstart;
      const ds=toDate(ps),de=toDate(pe);
      if(isNaN(ds))continue;
      const dtDow=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][ds.getDay()];

      // RRULE BYDAY — the most reliable source of which days this class runs on.
      // Sentral sometimes sets DTSTART to Monday even for Friday-only classes, so
      // we always prefer BYDAY when present over inferring from DTSTART alone.
      const rrule=get('RRULE');
      let targetDays;
      const bydayM=rrule.match(/BYDAY=([^;:\r\n]+)/i);
      if(bydayM){
        const parsed=bydayM[1].split(',')
          .map(d=>BYDAY_MAP[d.trim().replace(/[+\-\d]/g,'').slice(0,2).toUpperCase()])
          .filter(Boolean);
        targetDays=parsed.length?parsed:[dtDow];
      }else{
        targetDays=dtDow&&dtDow!=='sunday'&&dtDow!=='saturday'?[dtDow]:[];
      }
      if(!targetDays.length)continue;

      // Extract and normalise subject name
      // Step 1: strip leading class code (digits+word chars+colon) and "Yr N"
      let subj=summary.replace(/^\d[\w/]*:\s*/,'').replace(/^Yr\s*\d+\s*/i,'').trim().toLowerCase();
      // Also strip trailing class code fragments like " 1" " 2" etc.
      subj=subj.replace(/\s+\d+$/, '').trim();
      if(!subj)subj=summary.trim().toLowerCase();

      // Step 2: normalise to canonical subject names.
      // Order matters — more specific checks before general ones.
      // Tech subjects: must be checked BEFORE 'science', 'english', 'history' etc.
      // to prevent "computing science" matching "science", etc.
      if(/\bit[\s\-]*engineering\b/.test(subj)||/\binformation\s+technology\s+eng/.test(subj))subj='it engineering';
      else if(/\bcomputing\s+tech/.test(subj)||/\bcomp\s+tech\b/.test(subj))subj='computing technology';
      else if(/\belectronics?\b/.test(subj)&&!/\belectronic.*music\b/.test(subj))subj='electronics';
      else if(/\bcritical\s+thinking\b/.test(subj))subj='critical thinking';
      else if(subj.includes('mathematics')||subj.includes(' maths')||subj.startsWith('maths')||subj.includes(' math')||subj.startsWith('math'))subj='mathematics';
      else if(subj.includes('english'))subj='english';
      else if(subj.includes('science'))subj='science';
      else if(subj.includes('music'))subj='music';
      else if(subj.includes('commerce'))subj='commerce';
      else if(subj.includes('geography'))subj='geography';
      else if(subj.includes('history elective')||subj.includes('history el'))subj='history elective';
      else if(subj.includes('history'))subj='history';
      else if(subj.includes('pd/h/pe')||subj.includes('pdhpe')||subj.includes('pd h pe'))subj='pdhpe';
      else if((subj.includes('pe')&&subj.includes('extra'))||subj.includes('pe*')||subj.includes('pe (extra)'))subj='extra pe';
      else if(/\bpe\b/.test(subj)&&!/computing|speech/.test(subj))subj='pe';
      // PASS = Physical Activities and Sport Studies — before sport/volleyball
      else if(subj.includes('physical activities')||subj.includes('sport studies')||
              (subj.includes('pass')&&(subj.includes('sport')||subj.includes('physical'))))subj='pass';
      // Specific sports — preserve the actual sport name, never collapse to a generic label.
      // "grade sport" / "rec sport" / "sport" alone falls through to the else and keeps its name.
      else if(/\bvolleyball\b/.test(subj))subj='volleyball';
      else if(/\bsoccer\b/.test(subj))subj='soccer';
      else if(/\bbasketball\b/.test(subj))subj='basketball';
      else if(/\btennis\b/.test(subj))subj='tennis';
      else if(/\bswimming\b/.test(subj))subj='swimming';
      else if(/\bathletics\b/.test(subj))subj='athletics';
      else if(/\bcricket\b/.test(subj))subj='cricket';
      else if(/\bnetball\b/.test(subj))subj='netball';
      else if(/\brugby\b/.test(subj))subj='rugby';
      else if(/\bgymnastics?\b/.test(subj)||/\brec[\s\-]*gym\b/.test(subj))subj='gymnastics';
      // "grade sport", "sport" etc — keep as-is (falls through to the else below)
      else if(subj.includes('careers'))subj='careers';
      else if(subj.includes('roll'))subj='roll call';
      // else: keep the cleaned name as-is (unknown subjects are preserved verbatim)

      // Period label from description (unfolded, so full content is now available)
      const periodM=desc.match(/Period:\s*([^\\\n\r;,]+)/i);
      const periodLbl=periodM?periodM[1].trim().toLowerCase():'period';
      // Room from location or description
      const roomM=(location||desc).match(/Room[:\s]+([^\r\n,\\;]+)/i);
      const room=roomM?roomM[1].trim():'';
      // Local time hours/mins from DTSTART (same time applies to all BYDAY occurrences)
      const sh=ds.getHours(),sm=ds.getMinutes(),eh=de.getHours(),em=de.getMinutes();

      // Push one event entry per target day
      for(const dow of targetDays){
        events.push({dow,l:periodLbl,s:[sh,sm],e:[eh,em],subj,room});
      }
    }
    if(!events.length)return null;
    // Deduplicate — Sentral exports one VEVENT per week; same period appears many times.
    // Key includes subj so that rotating-cycle subjects on the same slot are both preserved.
    const seen=new Set();
    const unique=events.filter(ev=>{
      const key=`${ev.dow}|${ev.subj}|${ev.s[0]}:${ev.s[1]}`;
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
    // Group by day
    const tt={monday:[],tuesday:[],wednesday:[],thursday:[],friday:[]};
    for(const ev of unique){if(tt[ev.dow])tt[ev.dow].push(ev);}
    // Sort each day by start time and inject breaks
    for(const day of Object.keys(tt)){
      tt[day].sort((a,b)=>toM(...a.s)-toM(...b.s));
      // Detect recess/lunch gaps (gaps >10min between periods)
      const withBreaks=[];
      for(let i=0;i<tt[day].length;i++){
        withBreaks.push(tt[day][i]);
        if(i<tt[day].length-1){
          const gap=toM(...tt[day][i+1].s)-toM(...tt[day][i].e);
          if(gap>=20&&gap<50)withBreaks.push({l:'recess',s:tt[day][i].e,e:tt[day][i+1].s,subj:null,room:null});
          else if(gap>=50)withBreaks.push({l:'lunch',s:tt[day][i].e,e:tt[day][i+1].s,subj:null,room:null});
        }
      }
      tt[day]=withBreaks;
    }
    // Baulko fix: on Wednesday, lunch and period 6 are swapped in the ICS —
    // find them and swap their positions so the grid displays correctly
    const wed=tt.wednesday;
    const lunchIdx=wed.findIndex(p=>p.l==='lunch');
    const p6Idx=wed.findIndex(p=>p.l==='period 6');
    if(lunchIdx!==-1&&p6Idx!==-1&&Math.abs(lunchIdx-p6Idx)===1){
      [wed[lunchIdx],wed[p6Idx]]=[wed[p6Idx],wed[lunchIdx]];
    }
    return tt;
  }catch(err){console.error('ICS parse error',err);return null;}
}

function obFinish(){
  const name=document.getElementById('ob-name')?.value.trim()||'';
  if(name)localStorage.setItem('st_name',name);
  // Save username if provided and not already saved (account step may have saved it)
  const obUn=document.getElementById('ob-username')?.value.trim()||'';
  if(obUn&&!localStorage.getItem('st_lb_username'))localStorage.setItem('st_lb_username',obUn);
  if(obICSData)localStorage.setItem('st_ics',JSON.stringify(obICSData));
  localStorage.setItem(OB_KEY,'1');
  obLaunch(name||null,obICSData);
}

function obSkip(){
  localStorage.setItem(OB_KEY,'1');
  obLaunch(null,null);
}

function obLaunch(name,icsData){
  const ob=document.getElementById('onboard');
  ob.classList.add('fade-out');
  setTimeout(()=>{ob.style.display='none';},650);
  applyName(name||localStorage.getItem('st_name')||'');
  if(icsData)applyICS(icsData);
  // Start the app
  document.getElementById("pg-dash").classList.add("act");
  tick();renderDash();renderTT();setupScroll();
  cddInit();
  applyFancyCursor(fancyCursor);
  updateNotifBtn();
  // Set up sync if session is available
  sbGetSession().then(async sess=>{
    if(sess?.access_token){
      sbAuthToken=sess.access_token;
      sbUserId=sess.user?.id;
      setSyncStatus(true,sess.user?.email);
      await _sbReplayDirty();
      await sbPushMissing();
      await sbSilentPull();
      if(typeof lbFetchFriendsFromServer==='function')await lbFetchFriendsFromServer();
      sbStartAutoSync();
    }
  });
}

function applyName(name){
  if(!name)return;
  const el=document.getElementById('h-name');
  if(el)el.textContent=name.charAt(0).toUpperCase()+name.slice(1)+'.';
  const td=document.getElementById('tt-desc');
  if(td)td.textContent=name.charAt(0).toUpperCase()+name.slice(1)+' · loaded from ICS';
}

function applyICS(data){
  for(const day of Object.keys(data)){
    if(TT[day]!==undefined)TT[day]=data[day];
  }
  populateSubjectDropdowns();
  // Refresh mobile countdown and schedule if on mobile
  if(window.innerWidth<=640){
    mhRenderSched();
    mhUpdateCountdown();
    mhRenderHeroPanel();
  }
}

/* Build subject lists from whatever is actually in the timetable.
   Falls back to a hardcoded base set if TT is empty. */
const BASE_SUBJECTS=['mathematics','english','science','music','commerce','geography','history','history elective','pdhpe','pe','extra pe','careers'];

/* Subject → pastel colour map */
const SUBJ_COLOURS_DEFAULT={
  'mathematics':   '#f28b82',
  'english':       '#7bafd4',
  'science':       '#81c995',
  'history':       '#f5c26b',
  'history elective':'#f5c26b',
  'geography':     '#81c995',
  'music':         '#c084fc',
  'commerce':      '#fdba74',
  'pdhpe':         '#67c1b5',
  'pe':            '#67c1b5',
  'extra pe':      '#67c1b5',
  'careers':       '#94a3b8',
  'volleyball':    '#7bafd4',
  'roll call':     '#94a3b8',
};
// Mutable — persisted to localStorage so user customisations survive refresh
let SUBJ_COLOURS={...SUBJ_COLOURS_DEFAULT,...JSON.parse(localStorage.getItem('st_subj_colours')||'{}')};
function saveSubjColours(){localStorage.setItem('st_subj_colours',JSON.stringify(SUBJ_COLOURS));}
function subjColour(subj){
  if(!subj)return null;
  return SUBJ_COLOURS[subj.toLowerCase()]||null;
}
function subjTint(subj){
  const c=subjColour(subj);return c?c+'1f':null;
}

function getTTSubjects(){
  const found=new Set();
  const days=['monday','tuesday','wednesday','thursday','friday'];
  days.forEach(d=>{
    (TT[d]||[]).forEach(p=>{
      if(p.subj&&p.subj!=='roll call'&&p.subj!=='recess'&&p.subj!=='lunch')
        found.add(p.subj);
    });
  });
  // Merge with base so users who haven't imported still get sensible options
  BASE_SUBJECTS.forEach(s=>found.add(s));
  return [...found].sort();
}

function populateSubjectDropdowns(){
  const subjects=getTTSubjects();
  // Each dropdown has a different "empty" label
  const configs=[
    {id:'qes',    empty:'— none —'},
    {id:'rem-subj',empty:'— general —'},
    {id:'hw-subj', empty:'— general —'},
    {id:'lg-subj', empty:null},   // no empty option
    {id:'ex-subj', empty:null},
  ];
  configs.forEach(({id,empty})=>{
    const el=document.getElementById(id);
    if(!el)return;
    const cur=el.value; // preserve current selection
    el.innerHTML=(empty?`<option value="">${empty}</option>`:'')+
      subjects.map(s=>`<option value="${s}">${s}</option>`).join('');
    // Restore selection if still valid
    if(cur&&subjects.includes(cur))el.value=cur;
  });
  // Also update the pp-subj-tabs in past papers
  const tabsEl=document.getElementById('pp-subj-tabs');
  if(tabsEl){
    const curAct=tabsEl.querySelector('.stj.act');
    const curSubj=curAct?curAct.dataset.s:subjects[0];
    tabsEl.innerHTML=subjects.map((s,i)=>
      `<div class="stj${s===curSubj?' act':''}" data-s="${s}" onclick="selPaperSubj('${s}',this)">${s}</div>`
    ).join('');
  }
  // Refresh markbook (subjects come straight from the imported timetable)
  if(typeof renderMarkbook==='function')renderMarkbook();
  // Sync custom dropdown triggers after options change
  setTimeout(cddSyncAll,0);
}

/* ════ CONTEXT MENU ══════════════════════════════════════ */
const ctxMenu=document.getElementById('ctx');
let ctxOpen=false;

function openCtx(x,y){
  // Update pin label to reflect current state
  document.getElementById('ctx-pin-lbl').textContent=pinned?'Unpin Sidebar':'Pin Sidebar';
  // Position — flip if too close to edge
  const W=window.innerWidth,H=window.innerHeight;
  const mw=220,mh=320;
  const px=x+mw>W?x-mw:x;
  const py=y+mh>H?y-mh:y;
  ctxMenu.style.left=Math.max(8,px)+'px';
  ctxMenu.style.top=Math.max(8,py)+'px';
  ctxMenu.classList.add('open');
  ctxOpen=true;
}
function closeCtx(){
  ctxMenu.classList.remove('open');
  ctxOpen=false;
}

document.addEventListener('contextmenu',e=>{
  e.preventDefault();
  openCtx(e.clientX,e.clientY);
});

document.addEventListener('click',e=>{
  if(ctxOpen&&!ctxMenu.contains(e.target))closeCtx();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&ctxOpen)closeCtx();
});
// Scroll closes it too
document.addEventListener('scroll',()=>closeCtx(),true);

// Context menu actions
function ctxGoTo(pg){
  closeCtx();
  const ni=document.querySelector(`.ni[data-page="${pg}"]`);
  if(ni)goTo(pg,ni);
}
function ctxAddReminder(){closeCtx();openRM();}
function ctxAddEvent(){
  closeCtx();
  ctxGoTo('cal');
  setTimeout(()=>openQM(new Date().toISOString().split('T')[0]),400);
}
function ctxTogglePin(){closeCtx();togglePin();}
function ctxShortcuts(){closeCtx();document.getElementById('sco').classList.add('show');}
function ctxRefresh(){closeCtx();location.reload();}

/* Night mode */
let nightMode=localStorage.getItem('st_night')==='1';
function applyNight(on,animate){
  document.body.classList.toggle('night',on);
  const lbl=document.getElementById('ctx-night-lbl');
  const icon=document.getElementById('ctx-night-icon');
  const item=document.getElementById('ctx-night-item');
  if(item)item.classList.toggle('active-night',on);
  if(lbl)lbl.textContent=on?'Light Mode':'Night Mode';
  if(icon){
    icon.innerHTML=on
      ?`<circle cx="12" cy="12" r="5"/><path stroke-linecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>`
      :`<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`;
  }
  // Cursor colour is handled per-frame in drawCursor() — no filter needed
  // Redraw markbook chart so its colours match the new theme
  if(curStudyTab==='markbook'&&typeof renderMarkChart==='function')requestAnimationFrame(renderMarkChart);
}
function toggleNight(){
  nightMode=!nightMode;
  localStorage.setItem('st_night',nightMode?'1':'0');
  applyNight(nightMode,true);
}
function ctxToggleNight(){closeCtx();toggleNight();}

/* Cursor toggle */
let fancyCursor=localStorage.getItem('st_fancy_cursor')!=='0';
function applyFancyCursor(on){
  fancyCursor=on;
  localStorage.setItem('st_fancy_cursor',on?'1':'0');
  // When off: restore system cursor everywhere; when on: hide it
  document.body.style.cursor=on?'none':'auto';
  // Also override the global cursor:none rule for all elements
  let cursorStyle=document.getElementById('cursor-override-style');
  if(!cursorStyle){cursorStyle=document.createElement('style');cursorStyle.id='cursor-override-style';document.head.appendChild(cursorStyle);}
  cursorStyle.textContent=on?'':' *{cursor:auto!important} a,button,[onclick]{cursor:pointer!important} input,textarea{cursor:text!important}';
  const cdot=document.getElementById('cdot');
  const trail=document.getElementById('ctrail');
  if(cdot)cdot.style.display=on?'':'none';
  if(trail)trail.style.display=on?'':'none';
  const lbl=document.getElementById('ctx-cursor-lbl');
  const item=document.getElementById('ctx-cursor-item');
  if(lbl)lbl.textContent=on?'Default Cursor':'Fancy Cursor';
  if(item)item.classList.toggle('active-cursor',on);
}
function ctxToggleCursor(){closeCtx();applyFancyCursor(!fancyCursor);}

/* ════ SETTINGS ════════════════════════════════════════════ */

// Performance mode
let perfMode=localStorage.getItem('st_perf')==='1';
let particlesEnabled=localStorage.getItem('st_particles')!=='0';
let blurEnabled=localStorage.getItem('st_blur')!=='0';
let transitionsEnabled=localStorage.getItem('st_transitions')!=='0';

// Accent colour map
const ACCENT_MAP={
  default:'#6366f1',rose:'#f43f5e',sky:'#0ea5e9',
  emerald:'#10b981',amber:'#f59e0b',mono:'#374151'
};
let currentAccent=localStorage.getItem('st_accent')||'default';

function applyPerfMode(on,silent){
  perfMode=on;
  if(!silent)localStorage.setItem('st_perf',on?'1':'0');
  let s=document.getElementById('perf-style');
  if(!s){s=document.createElement('style');s.id='perf-style';document.head.appendChild(s);}
  if(on){
    s.textContent=`
      *{transition:none!important;animation:none!important}
      #particles{display:none!important}
      body::before{display:none!important}
      .fr-pod,#fr-det-card{animation:none!important}
      .fr-row{animation:none!important}
      .fr-feed-item{animation:none!important}
      .fr-subj-row{animation:none!important}
      @keyframes podIn{from{}to{}}
      @keyframes rowIn{from{}to{}}
    `;
    applyParticles(false,true);
    // Force plain cursor in perf mode — hide canvas cursor and trail
    const cdotEl=document.getElementById('cdot');
    const trailEl=document.getElementById('ctrail');
    if(cdotEl)cdotEl.style.display='none';
    if(trailEl)trailEl.style.display='none';
    document.body.style.cursor='auto';
    let cs=document.getElementById('cursor-override-style');
    if(!cs){cs=document.createElement('style');cs.id='cursor-override-style';document.head.appendChild(cs);}
    cs.textContent='*{cursor:auto!important}a,button,[onclick]{cursor:pointer!important}input,textarea{cursor:text!important}';
  }else{
    s.textContent='';
    applyParticles(particlesEnabled,true);
    // Restore cursor state
    applyFancyCursor(fancyCursor);
  }
}

function applyParticles(on,silent){
  particlesEnabled=on;
  if(!silent)localStorage.setItem('st_particles',on?'1':'0');
  const c=document.getElementById('particles');
  if(c)c.style.display=on&&!perfMode?'':'none';
}

function applyBlur(on,silent){
  blurEnabled=on;
  if(!silent)localStorage.setItem('st_blur',on?'1':'0');
  let s=document.getElementById('blur-style');
  if(!s){s=document.createElement('style');s.id='blur-style';document.head.appendChild(s);}
  s.textContent=on?'':`.glass,.fr-lb-card,#pill,#settings-panel,#fr-det-card,#fr-add-box,.fr-profile-pill,.st-card{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}`;
}

function applyTransitions(on,silent){
  transitionsEnabled=on;
  if(!silent)localStorage.setItem('st_transitions',on?'1':'0');
  let s=document.getElementById('trans-style');
  if(!s){s=document.createElement('style');s.id='trans-style';document.head.appendChild(s);}
  s.textContent=on?'':`.pg{animation:none!important}.pg.leaving{animation:none!important;display:none!important}`;
}

function applyAccent(key,silent){
  currentAccent=key;
  if(!silent)localStorage.setItem('st_accent',key);
  const col=ACCENT_MAP[key]||ACCENT_MAP.default;
  document.documentElement.style.setProperty('--accent',col);
  // Update the .st-toggle.on colour
  let s=document.getElementById('accent-style');
  if(!s){s=document.createElement('style');s.id='accent-style';document.head.appendChild(s);}
  s.textContent=`.st-toggle.on{background:${col}!important}`;
}

function openSettings(){
  const ov=document.getElementById('settings-overlay');
  if(!ov)return;
  ov.classList.add('open');
  // Populate name input
  const ni=document.getElementById('st-name-inp');
  if(ni)ni.value=localStorage.getItem('st_name')||'';
  // Sync toggles
  stSyncToggles();
  // Update iCal card state
  const lbl=document.getElementById('st-ical-btn-lbl');
  const desc=document.getElementById('st-ical-desc');
  if(lbl&&desc){
    if(icalState==='connected'){
      lbl.textContent='Manage Connection';
      desc.textContent='Connected as '+icalCreds?.appleId+' · '+evs.filter(e=>e.icalUid).length+' events synced';
    }else{
      lbl.textContent='Connect Apple Calendar';
      desc.textContent='Connect iCloud to sync events two-ways in real time';
    }
  }
}

function closeSettings(){
  document.getElementById('settings-overlay')?.classList.remove('open');
}

function stSyncToggles(){
  stSetToggle('st-night-toggle',nightMode);
  stSetToggle('st-cursor-toggle',fancyCursor);
  stSetToggle('st-perf-toggle',perfMode);
  stSetToggle('st-particles-toggle',particlesEnabled&&!perfMode);
  stSetToggle('st-blur-toggle',blurEnabled&&!perfMode);
  stSetToggle('st-transitions-toggle',transitionsEnabled&&!perfMode);
  stSetToggle('st-notif-toggle',notifEnabled);
  // Active swatch
  document.querySelectorAll('.st-col-swatch').forEach(s=>s.classList.toggle('act',s.dataset.col===currentAccent));
}

function stSetToggle(id,on){
  const el=document.getElementById(id);
  if(el)el.classList.toggle('on',on);
}

function stToggleNight(){toggleNight();stSyncToggles();}
function stToggleCursor(){applyFancyCursor(!fancyCursor);stSyncToggles();}

function stTogglePerf(){
  applyPerfMode(!perfMode);
  // Cascade: disable sub-toggles when perf on
  if(perfMode){
    applyParticles(false,true);applyBlur(false,true);applyTransitions(false,true);
  }else{
    applyParticles(true);applyBlur(true);applyTransitions(true);
  }
  stSyncToggles();
  showToast(perfMode?'Performance mode on ⚡':'Performance mode off');
}

function stToggleParticles(){
  if(perfMode)return;
  applyParticles(!particlesEnabled);
  stSyncToggles();
}

function stToggleBlur(){
  if(perfMode)return;
  applyBlur(!blurEnabled);
  stSyncToggles();
}

function stToggleTransitions(){
  if(perfMode)return;
  applyTransitions(!transitionsEnabled);
  stSyncToggles();
}

function stToggleNotif(){toggleNotifications();stSyncToggles();}

function stSaveName(){
  const inp=document.getElementById('st-name-inp');
  if(!inp)return;
  const name=inp.value.trim();
  if(!name){showToast('Enter a name first');return;}
  localStorage.setItem('st_name',name);
  sbSet('st_name',name);
  applyName(name);
  showToast('Name saved ✓');
}

function stSetAccent(key,el){
  applyAccent(key);
  document.querySelectorAll('.st-col-swatch').forEach(s=>s.classList.remove('act'));
  if(el)el.classList.add('act');
}

function stResetData(){
  if(!confirm('This will permanently delete ALL your stream. data (homework, papers, logs, exams, reminders). This cannot be undone.\n\nAre you sure?'))return;
  const keys=['st_r5','st_e5','st_l5','st_p5','st_x5','st_hw','st_mb1','st_name','st_ics','st_friends','st_lb_username','st_lb_emoji','st_lb_streak','st_lb_weekly','st_setup_done','st_night','st_fancy_cursor','st_perf','st_particles','st_blur','st_transitions','st_accent','st_notif'];
  keys.forEach(k=>localStorage.removeItem(k));
  showToast('Data reset. Reloading…');
  setTimeout(()=>location.reload(),1200);
}

// Apply stored settings on page load
(function initSettings(){
  applyAccent(currentAccent,true);
  if(perfMode)applyPerfMode(true,true);
  else{
    if(!particlesEnabled)applyParticles(false,true);
    if(!blurEnabled)applyBlur(false,true);
    if(!transitionsEnabled)applyTransitions(false,true);
  }
})();

/* ICS import modal (accessible from timetable empty state) */
let _pendingICS=null;
function showTTImport(){
  _pendingICS=null;
  document.getElementById('ics-drop').classList.remove('ok');
  document.getElementById('ics-drop-icon').textContent='📅';
  document.getElementById('ics-drop-text').textContent='Drop .ics file here';
  document.getElementById('ics-drop-hint').textContent='or click to browse';
  document.getElementById('ics-msg').textContent='';
  document.getElementById('ics-save-btn').disabled=true;
  document.getElementById('ics-modal').classList.add('open');
}
function closeICSModal(){document.getElementById('ics-modal').classList.remove('open');}
document.getElementById('ics-modal').addEventListener('click',function(e){if(e.target===this)closeICSModal();});
document.getElementById('ical-modal').addEventListener('click',function(e){if(e.target===this)closeICalModal();});

const icsDrop=document.getElementById('ics-drop');
icsDrop.addEventListener('dragover',e=>{e.preventDefault();icsDrop.classList.add('drag-over');});
icsDrop.addEventListener('dragleave',()=>icsDrop.classList.remove('drag-over'));
icsDrop.addEventListener('drop',e=>{e.preventDefault();icsDrop.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)icsHandleFile(f);});
document.getElementById('ics-file').addEventListener('change',function(){if(this.files[0])icsHandleFile(this.files[0]);});

function icsHandleFile(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const parsed=parseICS(e.target.result);
    if(parsed){
      _pendingICS=parsed;
      icsDrop.classList.add('ok');
      document.getElementById('ics-drop-icon').textContent='✅';
      document.getElementById('ics-drop-text').textContent=file.name;
      document.getElementById('ics-drop-hint').textContent='Ready to import';
      document.getElementById('ics-save-btn').disabled=false;
      document.getElementById('ics-msg').textContent='';
    }else{
      document.getElementById('ics-drop-icon').textContent='❌';
      document.getElementById('ics-drop-text').textContent='Could not parse file';
      document.getElementById('ics-msg').textContent='Make sure it\'s a valid .ics timetable';
      document.getElementById('ics-save-btn').disabled=true;
    }
  };
  reader.readAsText(file);
}
function saveICSImport(){
  if(!_pendingICS)return;
  localStorage.setItem('st_ics',JSON.stringify(_pendingICS));
  applyICS(_pendingICS);
  closeICSModal();
  renderTT();
  showToast('Timetable imported ✓');
}
function ctxReset(){closeCtx();document.getElementById('reset-modal').classList.add('open');}
function closeResetModal(){document.getElementById('reset-modal').classList.remove('open');}
function confirmReset(){
  localStorage.clear();
  location.reload();
}
// Close reset modal on backdrop click
document.getElementById('reset-modal').addEventListener('click',function(e){
  if(e.target===this)closeResetModal();
});

/* ════ QUOTE ═════════════════════════════════════════════ */
const QUOTES=[
  {q:"The secret of getting ahead is getting started.",a:"Mark Twain"},
  {q:"It always seems impossible until it's done.",a:"Nelson Mandela"},
  {q:"You don't have to be great to start, but you have to start to be great.",a:"Zig Ziglar"},
  {q:"Small steps every day.",a:"Unknown"},
  {q:"Discipline is choosing between what you want now and what you want most.",a:"Abraham Lincoln"},
  {q:"An investment in knowledge pays the best interest.",a:"Benjamin Franklin"},
  {q:"The expert in anything was once a beginner.",a:"Helen Hayes"},
  {q:"Don't watch the clock; do what it does. Keep going.",a:"Sam Levenson"},
  {q:"Push yourself, because no one else is going to do it for you.",a:"Unknown"},
  {q:"The harder you work for something, the greater you'll feel when you achieve it.",a:"Unknown"},
  {q:"Dream big. Work hard. Stay focused.",a:"Unknown"},
  {q:"Success is the sum of small efforts repeated day in and day out.",a:"Robert Collier"},
  {q:"You are capable of more than you know.",a:"Glinda, The Wizard of Oz"},
  {q:"Strive for progress, not perfection.",a:"Unknown"},
  {q:"The future depends on what you do today.",a:"Mahatma Gandhi"},
  {q:"Education is the most powerful weapon which you can use to change the world.",a:"Nelson Mandela"},
  {q:"A little progress each day adds up to big results.",a:"Satya Nani"},
  {q:"Work hard in silence, let success make the noise.",a:"Frank Ocean"},
  {q:"Believe you can and you're halfway there.",a:"Theodore Roosevelt"},
  {q:"The only way to do great work is to love what you do.",a:"Steve Jobs"},
  {q:"Do something today that your future self will thank you for.",a:"Sean Patrick Flanery"},
  {q:"Learning is not attained by chance; it must be sought with ardour.",a:"Abigail Adams"},
  {q:"Start where you are. Use what you have. Do what you can.",a:"Arthur Ashe"},
  {q:"Great things are done by a series of small things brought together.",a:"Vincent Van Gogh"},
];
(function(){
  const q=QUOTES[Math.floor(Math.random()*QUOTES.length)];
  const el=document.getElementById('h-quote');
  if(el)el.innerHTML=`<div class="h-quote-text">"${q.q}"</div><div class="h-quote-author">— ${q.a}</div>`;
})();

/* ════ SYNC UI ═══════════════════════════════════════════ */
let _sbMode='in'; // 'in' or 'up'

function toggleSyncBadge(){
  const b=document.getElementById('sync-badge');
  if(sbUserId){b.classList.toggle('show');}
  else{sbOpenModal();}
}
function closeSyncBadge(){document.getElementById('sync-badge').classList.remove('show');}

function sbOpenModal(){
  const m=document.getElementById('sb-modal');
  if(m){m.style.display='flex';setTimeout(()=>document.getElementById('sb-email')?.focus(),200);}
}
function sbCloseModal(){
  const m=document.getElementById('sb-modal');
  if(m)m.style.display='none';
  document.getElementById('sb-error').textContent='';
}
function sbSetMode(mode){
  _sbMode=mode;
  document.getElementById('sb-tab-in').classList.toggle('on',mode==='in');
  document.getElementById('sb-tab-up').classList.toggle('on',mode==='up');
  document.getElementById('sb-pass2-field').style.display=mode==='up'?'':'none';
  document.getElementById('sb-submit').textContent=mode==='in'?'Sign in':'Create account';
  document.getElementById('sb-pass-label').textContent=mode==='in'?'Password':'Choose a password';
  document.getElementById('sb-error').textContent='';
  const passEl=document.getElementById('sb-pass');
  if(passEl)passEl.setAttribute('autocomplete',mode==='in'?'current-password':'new-password');
}
function sbTogglePass(){
  const p=document.getElementById('sb-pass');
  p.type=p.type==='password'?'text':'password';
}

async function sbSubmit(){
  const email=document.getElementById('sb-email').value.trim();
  const pass=document.getElementById('sb-pass').value;
  const errEl=document.getElementById('sb-error');
  const btn=document.getElementById('sb-submit');
  if(!email||!pass){errEl.textContent='Please fill in all fields.';return;}
  if(_sbMode==='up'){
    const pass2=document.getElementById('sb-pass2').value;
    if(pass!==pass2){errEl.textContent='Passwords do not match.';return;}
    if(pass.length<6){errEl.textContent='Password must be at least 6 characters.';return;}
  }
  btn.disabled=true;
  btn.textContent=_sbMode==='in'?'Signing in…':'Creating account…';
  errEl.textContent='';
  const result=_sbMode==='in'?await sbSignIn(email,pass):await sbSignUp(email,pass);
  btn.disabled=false;
  btn.textContent=_sbMode==='in'?'Sign in':'Create account';
  if(result.error){errEl.textContent=result.error;return;}
  if(result.access_token){
    sbCloseModal();
    await sbActivateSession(result);
  }else{
    errEl.textContent='Something went wrong. Try again.';
  }
}

function setSyncStatus(connected,email){
  const dot=document.getElementById('sync-dot');
  const title=document.getElementById('sync-title');
  const sub=document.getElementById('sync-sub');
  const manualBtn=document.getElementById('manual-sync-btn');
  const syncBadgeSignBtn=document.getElementById('sync-badge')?.querySelector('.btn:not(#manual-sync-btn)');
  const sb=document.getElementById('syncbtn');
  const mobileSyncDot=document.getElementById('mobile-sync-dot');
  const mobileSyncBtn=document.getElementById('mobile-syncbtn');
  const mhDot=document.getElementById('mh-sync-dot');
  const mhLbl=document.getElementById('mh-sync-lbl');
  if(connected){
    if(dot)dot.className='sync-dot green';
    if(title)title.textContent='Synced';
    if(sub)sub.textContent=email||'Data syncs across your devices';
    if(manualBtn)manualBtn.style.display='';
    if(syncBadgeSignBtn){syncBadgeSignBtn.textContent='Sign out';syncBadgeSignBtn.onclick=sbSignOut;}
    if(sb){sb.style.color='#16a34a';}
    if(mobileSyncDot){mobileSyncDot.style.opacity='1';mobileSyncDot.style.background='#16a34a';}
    if(mobileSyncBtn)mobileSyncBtn.style.color='#16a34a';
    if(mhDot)mhDot.classList.add('on');
    if(mhLbl)mhLbl.textContent=email?email.split('@')[0]:'synced';
  }else{
    if(dot)dot.className='sync-dot grey';
    if(title)title.textContent='Sync across devices';
    if(sub)sub.textContent='Sign in to sync your data';
    if(manualBtn)manualBtn.style.display='none';
    if(syncBadgeSignBtn){syncBadgeSignBtn.textContent='Sign in';syncBadgeSignBtn.onclick=sbOpenModal;}
    if(sb){sb.style.color='';}
    if(mobileSyncDot){mobileSyncDot.style.opacity='0';mobileSyncDot.style.background='';}
    if(mobileSyncBtn)mobileSyncBtn.style.color='';
    if(mhDot)mhDot.classList.remove('on');
    if(mhLbl)mhLbl.textContent='sync';
  }
}


async function sbActivateSession(sess){
  sbAuthToken=sess.access_token;
  sbUserId=sess.user?.id;
  localStorage.setItem('sb_session',JSON.stringify(sess));
  // 1. Retry any queued pushes from a previous session.
  await _sbReplayDirty();
  // 2. Push any local data that was never confirmed pushed (e.g. added while logged out).
  await sbPushMissing();
  const remote=await sbLoadAll();
  const hasRemote=remote&&Object.keys(remote).length>0;
  if(hasRemote){
    applyRemoteData(remote);
    renderDash();renderTT();renderRems();renderHW();
    showToast('Synced ✓');
  }else{
    await sbPushAll();
    showToast('Account created ✓');
  }
  setSyncStatus(true,sess.user?.email);
  closeSyncBadge();
  sbStartAutoSync();
}

let _sbSyncInterval=null;
function sbStartAutoSync(){
  // Pull from Supabase when tab becomes visible (user switches back to tab)
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&sbUserId)sbSilentPull();
  },{once:false});
  // Also poll every 30 seconds while logged in
  if(_sbSyncInterval)clearInterval(_sbSyncInterval);
  _sbSyncInterval=setInterval(()=>{if(sbUserId)sbSilentPull();},30000);
}

async function sbSilentPull(){
  if(!sbUserId)return;
  try{
    const remote=await sbLoadAll();
    if(!remote||!Object.keys(remote).length)return;
    // Only apply keys where Supabase updated_at is newer than our last push timestamp
    const localTs=JSON.parse(localStorage.getItem('sb_push_ts')||'{}');
    const DATA_KEYS=['st_r5','st_e5','st_l5','st_p5','st_x5','st_hw','st_mb1','st_name','st_ics','st_friends'];
    let changed=false;
    const filtered={};
    DATA_KEYS.forEach(k=>{
      if(!remote[k])return;
      const remoteTs=remote[k].updated_at;
      const localT=localTs[k]||'';
      // Apply only if remote is strictly newer than when we last pushed this key
      if(remoteTs>localT){
        filtered[k]=remote[k];
        changed=true;
      }
    });
    if(!changed)return;
    applyRemoteData(filtered);
    renderDash();renderTT();renderRems();renderHW();
  }catch{}
}

async function sbSignOut(){
  try{await sbFetch('/auth/v1/logout',{method:'POST'});}catch{}
  sbAuthToken=null;sbUserId=null;
  localStorage.removeItem('sb_session');
  setSyncStatus(false,null);
  closeSyncBadge();
  showToast('Signed out');
}


/* ════ TIMETABLE CELL EDIT ═══════════════════════════════ */
// All available icons for the picker (key = icon id, value = svg inner)
const TT_ICONS={
  'math':     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M12 4v16M4 12h16M6 6l12 12M18 6L6 18"/></svg>`,
  'text':     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>`,
  'beaker':   `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v8L5.5 18.5a1 1 0 00.9 1.5h11.2a1 1 0 00.9-1.5L15 11V3M9 3h6"/></svg>`,
  'music':    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  'building': `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h18v4H3zM5 7v14M19 7v14M9 11h6M9 15h6"/></svg>`,
  'globe':    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M3 12h18M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18"/></svg>`,
  'clock':    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  'run':      `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 20l3-7 4 3 4-3 3 7M8 13l4-8 4 8"/></svg>`,
  'brief':    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path stroke-linecap="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`,
  'ball':     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 6 6 0 18M12 3c-3 3-6 6 0 18M3 12h18"/></svg>`,
  'clip':     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
  'paint':    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
  'cpu':      `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>`,
  'chat':     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`,
  'heart':    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`,
  'chart':    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
  'book':     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>`,
  'lang':     `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>`,
};

// Map subject names to default icon keys
const SUBJ_ICON_MAP={
  mathematics:'math',english:'text',science:'beaker',music:'music',
  commerce:'building',geography:'globe',history:'clock','history elective':'clock',
  pdhpe:'run',pe:'run',careers:'brief',volleyball:'ball','roll call':'clip',
};

let ttEditCtx=null;
let ttSelectedIcon=null;

function buildIconGrid(selectedKey){
  const grid=document.getElementById('tt-icon-grid');
  grid.innerHTML='';
  Object.entries(TT_ICONS).forEach(([key,svg])=>{
    const btn=document.createElement('div');
    btn.className='tt-icon-opt'+(key===selectedKey?' sel':'');
    btn.innerHTML=svg;
    btn.title=key;
    btn.onclick=()=>{
      ttSelectedIcon=key;
      grid.querySelectorAll('.tt-icon-opt').forEach(b=>b.classList.remove('sel'));
      btn.classList.add('sel');
    };
    grid.appendChild(btn);
  });
}

// When typing subject, auto-suggest the matching icon
function onTTSubjInput(){
  const val=document.getElementById('tt-edit-subj').value.toLowerCase().trim();
  const match=SUBJ_ICON_MAP[val];
  if(match&&match!==ttSelectedIcon){
    ttSelectedIcon=match;
    document.querySelectorAll('.tt-icon-opt').forEach(b=>{
      b.classList.toggle('sel',b.title===match);
    });
  }
}

const TT_PALETTE=[
  '#f28b82','#e8a87c','#f5c26b','#81c995','#67c1b5',
  '#7bafd4','#c084fc','#fdba74','#94a3b8','#f9a8d4',
  '#86efac','#a5f3fc','#fde68a','#d4a5f5','#fca5a5',
  '#6ee7b7','#93c5fd','#cbd5e1','#f0abfc','#bef264',
  null, // no colour (remove)
];

let ttSelectedColour=null;

function buildColourGrid(currentSubj){
  const grid=document.getElementById('tt-colour-grid');
  grid.innerHTML='';
  const cur=subjColour(currentSubj)||null;
  TT_PALETTE.forEach(col=>{
    const btn=document.createElement('div');
    const isSel=col===cur||(col===null&&!cur);
    if(col===null){
      // "no colour" option
      btn.style.cssText=`width:100%;aspect-ratio:1;border-radius:7px;border:1.5px dashed var(--border);cursor:none;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--t3);transition:all .14s${isSel?';outline:2px solid var(--text);outline-offset:2px':''}`;
      btn.title='No colour';
      btn.textContent='✕';
    }else{
      btn.style.cssText=`width:100%;aspect-ratio:1;border-radius:7px;background:${col};cursor:none;transition:all .14s;border:1.5px solid rgba(0,0,0,.08)${isSel?';outline:2.5px solid var(--text);outline-offset:2px;transform:scale(1.15)':''}`;
      btn.title=col;
    }
    btn.onclick=()=>{
      ttSelectedColour=col;
      buildColourGrid_active(grid,col);
    };
    grid.appendChild(btn);
  });
  ttSelectedColour=cur;
}

function buildColourGrid_active(grid,sel){
  const btns=grid.children;
  TT_PALETTE.forEach((col,i)=>{
    const btn=btns[i];if(!btn)return;
    const isSel=col===sel||(col===null&&sel===null);
    if(col===null){
      btn.style.outline=isSel?'2px solid var(--text)':'none';
      btn.style.outlineOffset=isSel?'2px':'0';
    }else{
      btn.style.outline=isSel?'2.5px solid var(--text)':'none';
      btn.style.outlineOffset=isSel?'2px':'0';
      btn.style.transform=isSel?'scale(1.15)':'scale(1)';
    }
  });
  ttSelectedColour=sel;
}

let ttEditScope='all'; // 'all' | 'one'
function ttSetScope(scope,el){
  ttEditScope=scope;
  document.getElementById('tt-scope-all').classList.toggle('on',scope==='all');
  document.getElementById('tt-scope-one').classList.toggle('on',scope==='one');
}

function openTTEdit(day,periodLabel,p){
  ttEditCtx={day,periodLabel,p};
  // Default to 'all' when multiple periods share this subject, 'one' otherwise
  const subj=p.subj;
  const count=subj?['monday','tuesday','wednesday','thursday','friday']
    .flatMap(d=>TT[d]||[]).filter(e=>e.subj===subj).length:1;
  ttSetScope(count>1?'all':'one');
  document.getElementById('tt-edit-title').textContent='Edit '+(p.subj||'period');
  document.getElementById('tt-edit-sub').textContent=day.charAt(0).toUpperCase()+day.slice(1)+' · '+periodLabel;
  document.getElementById('tt-edit-subj').value=p.subj||'';
  document.getElementById('tt-edit-room').value=p.room||'';
  ttSelectedIcon=p.icon||(p.subj&&SUBJ_ICON_MAP[p.subj])||Object.keys(TT_ICONS)[0];
  buildIconGrid(ttSelectedIcon);
  buildColourGrid(p.subj||'');
  const inp=document.getElementById('tt-edit-subj');
  inp.oninput=onTTSubjInput;
  document.getElementById('tt-edit-modal').classList.add('open');
  setTimeout(()=>inp.focus(),200);
}

function closeTTEdit(){
  document.getElementById('tt-edit-modal').classList.remove('open');
  ttEditCtx=null;
}

function saveTTEdit(){
  if(!ttEditCtx)return;
  const {day,periodLabel,p}=ttEditCtx;
  const oldSubj=p.subj;
  const newSubj=document.getElementById('tt-edit-subj').value.trim().toLowerCase()||null;
  const newRoom=document.getElementById('tt-edit-room').value.trim()||null;
  const newIcon=ttSelectedIcon||null;
  const DAYS=['monday','tuesday','wednesday','thursday','friday'];

  if(ttEditScope==='all'){
    // Apply subject rename + icon to every period of this subject across all days
    DAYS.forEach(d=>{
      (TT[d]||[]).forEach(entry=>{
        if(entry.subj===oldSubj){
          if(newSubj)entry.subj=newSubj;
          if(newIcon)entry.icon=newIcon;
        }
      });
    });
    // Migrate colour key if subject was renamed
    if(newSubj&&oldSubj&&newSubj!==oldSubj&&SUBJ_COLOURS[oldSubj]){
      SUBJ_COLOURS[newSubj]=SUBJ_COLOURS[oldSubj];
      delete SUBJ_COLOURS[oldSubj];
    }
    // Room only updates on this specific period (rooms differ per period)
    const dayArr=TT[day];
    if(dayArr){const entry=dayArr.find(e=>e.l===periodLabel);if(entry)entry.room=newRoom;}
  }else{
    // 'one' — only touch this single period
    const dayArr=TT[day];
    if(dayArr){
      const entry=dayArr.find(e=>e.l===periodLabel);
      if(entry){entry.subj=newSubj;entry.room=newRoom;entry.icon=newIcon;}
    }
  }

  // Update icon registry
  if(newSubj&&newIcon&&TT_ICONS[newIcon])SIC[newSubj]=TT_ICONS[newIcon];

  // Apply colour choice to whichever subject name is now canonical
  const finalSubj=newSubj||oldSubj;
  if(finalSubj){
    if(ttSelectedColour===null){delete SUBJ_COLOURS[finalSubj];}
    else if(ttSelectedColour){SUBJ_COLOURS[finalSubj]=ttSelectedColour;}
    saveSubjColours();
  }

  localStorage.setItem('st_ics',JSON.stringify(TT));
  sbSet('st_ics',TT);
  closeTTEdit();
  renderTT();
  renderDash();
  renderRems();
  renderHW();
  if(curPage==='study')renderStudy();
  showToast(ttEditScope==='all'?'All periods updated':'This period updated');
}

document.getElementById('tt-edit-modal').addEventListener('click',function(e){if(e.target===this)closeTTEdit();});

/* ════ CUSTOM DROPDOWNS ══════════════════════════════════
   Replaces all native <select class="inp"> with a glass
   floating panel. The hidden <select> stays in the DOM so
   all existing .value reads / assignments still work.
════════════════════════════════════════════════════════ */
const _cddPanels=new Map(); // selectId → panel element
let _cddOpen=null; // currently open select id

function cddBuild(sel){
  if(!sel||_cddPanels.has(sel.id))return;

  // Wrap the select in a .cdd container
  const wrap=document.createElement('div');
  wrap.className='cdd';
  // Copy width style if inline
  if(sel.style.width)wrap.style.width=sel.style.width;
  sel.parentNode.insertBefore(wrap,sel);
  wrap.appendChild(sel);

  // Trigger button
  const trigger=document.createElement('div');
  trigger.className='cdd-trigger';
  trigger.innerHTML=`<span class="cdd-val"></span><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
  wrap.appendChild(trigger);

  // Floating panel (appended to body so it escapes modals)
  const panel=document.createElement('div');
  panel.className='cdd-panel';
  document.body.appendChild(panel);
  _cddPanels.set(sel.id,{trigger,panel,sel});

  function syncTrigger(){
    const opt=sel.options[sel.selectedIndex];
    const lbl=opt?opt.text:'';
    const val=opt?opt.value:'';
    const span=trigger.querySelector('.cdd-val');
    span.textContent=lbl||'';
    span.className='cdd-val'+((!val||val==='')?' cdd-placeholder':'');
  }
  syncTrigger();

  function buildPanel(){
    panel.innerHTML='';
    [...sel.options].forEach((o,i)=>{
      const div=document.createElement('div');
      div.className='cdd-opt'+(o.value===sel.value?' sel':'');
      div.textContent=o.text;
      div.onclick=()=>{
        sel.value=o.value;
        // Dispatch change event so any onchange listeners fire
        sel.dispatchEvent(new Event('change',{bubbles:true}));
        syncTrigger();
        cddClose();
      };
      panel.appendChild(div);
    });
  }

  function positionPanel(){
    const r=trigger.getBoundingClientRect();
    const ph=Math.min(240,panel.scrollHeight+10);
    const spaceBelow=window.innerHeight-r.bottom-8;
    const openUp=spaceBelow<ph&&r.top>ph;
    panel.style.left=r.left+'px';
    panel.style.width=Math.max(r.width,160)+'px';
    if(openUp){
      panel.style.top='';
      panel.style.bottom=(window.innerHeight-r.top+4)+'px';
      panel.style.transformOrigin='bottom center';
    }else{
      panel.style.bottom='';
      panel.style.top=(r.bottom+4)+'px';
      panel.style.transformOrigin='top center';
    }
  }

  trigger.onclick=(e)=>{
    e.stopPropagation();
    if(_cddOpen&&_cddOpen!==sel.id)cddClose();
    if(panel.classList.contains('open')){cddClose();return;}
    buildPanel();
    positionPanel();
    panel.classList.add('open');
    trigger.classList.add('open');
    _cddOpen=sel.id;
  };

  // Keep in sync when value is set programmatically
  const origDesc=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
  // Use MutationObserver to detect option changes (e.g. from populateSubjectDropdowns)
  const mo=new MutationObserver(()=>{syncTrigger();});
  mo.observe(sel,{childList:true,subtree:true,attributes:true});
  sel._cddSync=syncTrigger;
}

function cddClose(){
  if(!_cddOpen)return;
  const entry=_cddPanels.get(_cddOpen);
  if(entry){
    entry.panel.classList.remove('open');
    entry.trigger.classList.remove('open');
  }
  _cddOpen=null;
}

// Close on outside click
document.addEventListener('click',()=>cddClose());
document.addEventListener('keydown',e=>{if(e.key==='Escape')cddClose();});

// Intercept programmatic .value sets on selects so trigger stays in sync
function cddSyncAll(){
  _cddPanels.forEach(({sel,trigger})=>{
    if(sel._cddSync)sel._cddSync();
  });
}

// Init all selects now and after DOM changes
function cddInit(){
  document.querySelectorAll('select.inp').forEach(sel=>{
    if(sel.id)cddBuild(sel);
  });
}

/* ════ SEARCH ════════════════════════════════════════════ */
function openSearch(){
  const ov=document.getElementById('search-overlay');
  const box=document.getElementById('search-box');
  ov.style.display='flex';
  requestAnimationFrame(()=>{
    ov.style.opacity='1';
    box.style.transform='translateY(0) scale(1)';
  });
  setTimeout(()=>document.getElementById('search-input').focus(),80);
  document.getElementById('search-input').value='';
  document.getElementById('search-results').innerHTML='<div class="sr-empty">Start typing to search…</div>';
}
function closeSearch(){
  const ov=document.getElementById('search-overlay');
  const box=document.getElementById('search-box');
  ov.style.opacity='0';
  box.style.transform='translateY(-10px) scale(.97)';
  setTimeout(()=>ov.style.display='none',220);
}
document.getElementById('search-overlay').addEventListener('click',function(e){if(e.target===this)closeSearch();});
document.getElementById('search-input').addEventListener('input',function(){
  const q=this.value.trim().toLowerCase();
  const res=document.getElementById('search-results');
  if(!q){res.innerHTML='<div class="sr-empty">Start typing to search…</div>';return;}
  const hits=[];
  rems.forEach(r=>{if(!r.done&&r.text.toLowerCase().includes(q))hits.push({tag:'rem',title:r.text,meta:r.subj||'reminder',action:()=>{closeSearch();const ni=document.querySelector('.ni[data-page="dash"]');if(ni)goTo('dash',ni);}});});
  hw.filter(h=>!h.done).forEach(h=>{if(h.task.toLowerCase().includes(q))hits.push({tag:'hw',title:h.task,meta:(h.subj||'')+(h.due?` · due ${formatHWDate(h.due)}`:''),action:()=>{closeSearch();const ni=document.querySelector('.ni[data-page="dash"]');if(ni)goTo('dash',ni);}});});
  evs.forEach(e=>{if(e.name.toLowerCase().includes(q))hits.push({tag:'ev',title:e.name,meta:e.date+(e.subj?` · ${e.subj}`:''),action:()=>{closeSearch();const ni=document.querySelector('.ni[data-page="cal"]');if(ni)goTo('cal',ni);}});});
  exams.forEach(e=>{if(e.name.toLowerCase().includes(q)||e.subj.toLowerCase().includes(q))hits.push({tag:'ex',title:e.name,meta:`${e.subj} · ${e.date}`,action:()=>{closeSearch();const ni=document.querySelector('.ni[data-page="study"]');if(ni)goTo('study',ni);}});});
  if(!hits.length){res.innerHTML='<div class="sr-empty">No results for "'+esc(q)+'"</div>';return;}
  res.innerHTML=hits.slice(0,12).map((h,i)=>`<div class="sr-item" onclick="window.__srHit${i}&&window.__srHit${i}()">
    <span class="sr-tag ${h.tag}">${h.tag==='rem'?'reminder':h.tag==='hw'?'homework':h.tag==='ev'?'event':'exam'}</span>
    <div class="sr-body"><div class="sr-title">${esc(h.title)}</div>${h.meta?`<div class="sr-meta">${esc(h.meta)}</div>`:''}</div>
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="12" height="12" style="opacity:.3;flex-shrink:0"><path stroke-linecap="round" d="M9 5l7 7-7 7"/></svg>
  </div>`).join('');
  hits.slice(0,12).forEach((h,i)=>{window[`__srHit${i}`]=h.action;});
});

/* ════ NOTIFICATIONS ════════════════════════════════════ */
let notifEnabled=localStorage.getItem('st_notif')==='1';
function toggleNotifications(){
  if(Notification.permission==='denied'){showToast('Notifications blocked in browser settings');return;}
  if(!notifEnabled||Notification.permission!=='granted'){
    Notification.requestPermission().then(p=>{
      if(p==='granted'){
        notifEnabled=true;localStorage.setItem('st_notif','1');
        updateNotifBtn();
        showToast('Notifications enabled ✓');
        scheduleNotifications();
      }else{showToast('Notifications not granted');}
    });
  }else{
    notifEnabled=false;localStorage.setItem('st_notif','0');
    updateNotifBtn();showToast('Notifications off');
  }
}
function updateNotifBtn(){
  const btn=document.getElementById('notif-btn');
  if(!btn)return;
  btn.classList.toggle('on',notifEnabled);
}
function scheduleNotifications(){
  if(!notifEnabled||Notification.permission!=='granted')return;
  const today=new Date().toISOString().split('T')[0];
  const tomorrow=new Date(Date.now()+86400000).toISOString().split('T')[0];
  const urgent=[];
  hw.filter(h=>!h.done&&h.due).forEach(h=>{
    if(h.due===today)urgent.push(`📚 ${h.task} is due today`);
    else if(h.due===tomorrow)urgent.push(`📚 ${h.task} is due tomorrow`);
  });
  exams.forEach(e=>{
    if(e.date===today)urgent.push(`📝 ${e.name} (${e.subj}) exam is today`);
    else if(e.date===tomorrow)urgent.push(`📝 ${e.name} (${e.subj}) exam is tomorrow`);
  });
  if(urgent.length){
    new Notification('stream. reminder',{body:urgent.join('\n'),icon:''});
    const btn=document.getElementById('notif-btn');if(btn)btn.classList.add('pending');
  }
}
// Check notifications once a day via a simple interval
setInterval(scheduleNotifications,3600000);

/* ════ DRAG TO REORDER ══════════════════════════════════ */
let dragSrc=null,dragList=null,dragType=null;

function makeDraggable(el,type){
  el.setAttribute('draggable','true');
  el.addEventListener('dragstart',e=>{
    dragSrc=el;dragType=type;
    e.dataTransfer.effectAllowed='move';
    setTimeout(()=>el.classList.add('dragging'),0);
  });
  el.addEventListener('dragend',()=>{
    el.classList.remove('dragging');
    document.querySelectorAll('.ri,.hw-item').forEach(e=>e.classList.remove('drag-over'));
    dragSrc=null;
  });
  el.addEventListener('dragover',e=>{
    e.preventDefault();e.dataTransfer.dropEffect='move';
    if(el!==dragSrc)el.classList.add('drag-over');
  });
  el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
  el.addEventListener('drop',e=>{
    e.preventDefault();el.classList.remove('drag-over');
    if(!dragSrc||el===dragSrc||dragType!==type)return;
    if(type==='rem'){
      const fromId=+dragSrc.dataset.id,toId=+el.dataset.id;
      const fi=rems.findIndex(r=>r.id===fromId),ti=rems.findIndex(r=>r.id===toId);
      if(fi<0||ti<0)return;
      rems.splice(ti,0,rems.splice(fi,1)[0]);
      sv('st_r5',rems);renderRems();
    }else if(type==='hw'){
      const fromId=+dragSrc.dataset.id,toId=+el.dataset.id;
      const fi=hw.findIndex(h=>h.id===fromId),ti=hw.findIndex(h=>h.id===toId);
      if(fi<0||ti<0)return;
      hw.splice(ti,0,hw.splice(fi,1)[0]);
      sv('st_hw',hw);renderHW();
    }
  });
}

/* ════ TREND CHART ══════════════════════════════════════ */
function renderTrend(){
  const canvas=document.getElementById('pp-trend');if(!canvas)return;
  const sp=papers.filter(p=>p.subj===curPaperSubj).slice().reverse(); // oldest first
  if(sp.length<2){canvas.style.display='none';return;}
  canvas.style.display='block';
  const W=canvas.offsetWidth||canvas.parentElement.offsetWidth||400;
  const H=120;canvas.width=W*2;canvas.height=H*2;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(2,2);
  ctx.clearRect(0,0,W,H);
  const pcts=sp.map(p=>p.mark/p.total*100);
  const min=Math.max(0,Math.min(...pcts)-10),max=Math.min(100,Math.max(...pcts)+10);
  const toY=v=>H-8-((v-min)/(max-min))*(H-16);
  const toX=(i)=>16+(W-32)*(i/(sp.length-1));
  const night=document.body.classList.contains('night');
  const lineCol=night?'rgba(160,180,255,.8)':'rgba(37,99,235,.7)';
  const dotCol=night?'rgba(180,200,255,1)':'rgba(37,99,235,1)';
  const fillCol=night?'rgba(100,130,255,.08)':'rgba(37,99,235,.07)';

  // Fill area under line
  ctx.beginPath();ctx.moveTo(toX(0),toY(pcts[0]));
  pcts.forEach((v,i)=>{if(i>0)ctx.lineTo(toX(i),toY(v));});
  ctx.lineTo(toX(sp.length-1),H);ctx.lineTo(toX(0),H);ctx.closePath();
  ctx.fillStyle=fillCol;ctx.fill();

  // Line
  ctx.beginPath();ctx.moveTo(toX(0),toY(pcts[0]));
  pcts.forEach((v,i)=>{if(i>0)ctx.lineTo(toX(i),toY(v));});
  ctx.strokeStyle=lineCol;ctx.lineWidth=1.8;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

  // Dots + labels
  pcts.forEach((v,i)=>{
    const x=toX(i),y=toY(v);
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);
    ctx.fillStyle=dotCol;ctx.fill();
    ctx.fillStyle=night?'rgba(200,210,255,.7)':'rgba(60,80,140,.6)';
    ctx.font='8px "Geist Mono"';ctx.textAlign='center';
    ctx.fillText(v.toFixed(0)+'%',x,y-6);
  });
}

/* ════ EXPORT ════════════════════════════════════════════ */
function exportData(){
  const rows=[['Type','Subject','Title/Task','Date','Mark','Total','Notes']];
  hw.forEach(h=>rows.push(['Homework',h.subj||'',h.task,h.due||'','','',h.done?'done':'pending']));
  rems.forEach(r=>rows.push(['Reminder',r.subj||'',r.text,'','','',r.pri||'']));
  exams.forEach(e=>rows.push(['Exam',e.subj,e.name,e.date,'','','']));
  papers.forEach(p=>rows.push(['Past Paper',p.subj,p.name,p.date,p.mark,p.total,p.notes||'']));
  marks.forEach(m=>rows.push(['Markbook',m.subj,m.name,m.date,m.mark,m.total,m.benchmark!=null?'benchmark '+m.benchmark:'']));
  logs.forEach(l=>rows.push(['Study Session',l.subj,l.what||'session',l.date,l.mins+'min','','']));
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download=`stream-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('Exported ✓');
}

/* ════ QUICK ADD FAB ═════════════════════════════════════ */
let qaOpen=false;

function toggleQA(){
  qaOpen?closeQA():openQA();
}

function openQA(){
  qaOpen=true;
  document.getElementById('qa-btn').classList.add('open');
  document.getElementById('qa-backdrop').classList.add('show');
  // Stagger items in with delay
  const items=['qa-ev','qa-rem','qa-hw'];
  items.forEach((id,i)=>{
    setTimeout(()=>{
      const el=document.getElementById(id);
      if(el)el.classList.add('show');
    },i*55);
  });
}

function closeQA(){
  qaOpen=false;
  document.getElementById('qa-btn').classList.remove('open');
  document.getElementById('qa-backdrop').classList.remove('show');
  ['qa-hw','qa-rem','qa-ev'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.classList.remove('show');
  });
}

function qaOpenHW(){
  closeQA();
  openHWModal();
}
function qaOpenRem(){
  closeQA();
  openRM();
}
function qaOpenEv(){
  closeQA();
  openQM(new Date().toISOString().split('T')[0]);
}

// Close on Esc
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&qaOpen)closeQA();});

/* ════ MOBILE TOUCH + SWIPE ══════════════════════════════ */
const isMobile=()=>window.innerWidth<=640;

})();

/* ════ MAGIC LINK HANDLER ════════════════════════════════
   When Supabase redirects back after clicking the magic link,
   the access_token is in the URL hash. We grab it, store the
   session, then strip the hash so the URL looks clean.
════════════════════════════════════════════════════════ */
(function(){
  const hash=window.location.hash;
  if(hash&&hash.includes('access_token')){
    const params=new URLSearchParams(hash.replace(/^#/,''));
    const access_token=params.get('access_token');
    const refresh_token=params.get('refresh_token');
    const expires_at=params.get('expires_at');
    if(access_token){
      // Fetch user info then store session
      fetch('https://wbbiqcdmkmydwshzvize.supabase.co/auth/v1/user',{
        headers:{'apikey':SB_KEY,'Authorization':'Bearer '+access_token}
      }).then(r=>r.json()).then(user=>{
        const sess={access_token,refresh_token,expires_at,user};
        localStorage.setItem('sb_session',JSON.stringify(sess));
        // Clean the URL
        history.replaceState(null,'',window.location.pathname);
      }).catch(()=>{
        history.replaceState(null,'',window.location.pathname);
      });
    }
  }
})();

/* ════ INIT ═════════════════════════════════════════════ */
(function(){
  const done=localStorage.getItem(OB_KEY);
  if(done){
    document.getElementById('onboard').style.display='none';
    const savedName=localStorage.getItem('st_name');
    const savedICS=localStorage.getItem('st_ics');
    applyName(savedName||'');
    if(nightMode)applyNight(true,false);
    if(savedICS){try{applyICS(JSON.parse(savedICS));}catch{}}
    else{populateSubjectDropdowns();}
    document.getElementById("pg-dash").classList.add("act");
    tick();renderDash();renderTT();setupScroll();
    // Init custom dropdowns after all selects are in DOM
    cddInit();
    updateNotifBtn();
    applyFancyCursor(fancyCursor);
    if(notifEnabled&&Notification.permission==='granted')scheduleNotifications();    sbGetSession().then(async sess=>{
      if(sess?.access_token){
        sbAuthToken=sess.access_token;
        sbUserId=sess.user?.id;
        setSyncStatus(true,sess.user?.email);
        // 1. Push queued dirty edits from the previous session.
        await _sbReplayDirty();
        // 2. Push any local data that was never confirmed pushed (added while logged out).
        await sbPushMissing();
        // 3. Pull only keys whose remote updated_at is strictly newer than our
        //    last confirmed push. sbSilentPull also re-renders on apply.
        await sbSilentPull();
        // 3. Reconcile friends from the server-authoritative friend_requests
        //    table. This rebuilds the friendship list even if local st_friends
        //    is empty/stale on this device.
        if(typeof lbFetchFriendsFromServer==='function')await lbFetchFriendsFromServer();
        cddSyncAll();
        sbStartAutoSync();
      }
    });
  }else{
    if(nightMode)applyNight(true,false);
    applyFancyCursor(fancyCursor);
    setTimeout(()=>{document.getElementById('ob-name').focus();cddInit();},100);
  }
})();

/* ════ ZEN MODE ══════════════════════════════════════════
   Fullscreen overlay: big timer left, auto-scrolling tiles
   right. The timer routes between focus timer / stopwatch /
   period countdown — whichever is currently active. The
   tile column is duplicated so the CSS marquee loops
   seamlessly; the per-second tick keeps the timer fresh.
═════════════════════════════════════════════════════════ */
// var (not let) so these bindings are hoisted + pre-initialized to undefined.
// tick() is called synchronously during boot — before the script reaches this
// line — and tick reads _zenActive via zenSyncTimer; with let it'd hit a TDZ
// ReferenceError on every early tick.
var _zenActive=false;
var _zenLastTilesHash='';
var _zenTilesT=null;

function zenEnter(){
  try{
    if(_zenActive)return;
    _zenActive=true;
    const fs=document.getElementById('zen-fs');if(!fs)return;
    // Sidebar defaults to hidden — only expand if the user previously chose to.
    try{
      const stored=localStorage.getItem('st_zen_collapsed');
      const wasCollapsed=(stored==null)?true:(stored==='1');
      fs.classList.toggle('collapsed',wasCollapsed);
    }catch{fs.classList.add('collapsed');}
    try{_zenSetQuote();}catch{}
    try{zenSyncTimer();}catch{}
    try{zenRenderTiles(true);}catch{}
    // Add .open on the next frame so the transition runs from the initial
    // (closed) styles → open styles instead of snapping.
    requestAnimationFrame(()=>fs.classList.add('open'));
    // Request browser fullscreen. Must be invoked from the synchronous click
    // gesture stack; wrapped in try/catch since iframes / locked-down contexts
    // may reject it.
    try{
      const el=document.documentElement;
      const req=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen;
      const already=document.fullscreenElement||document.webkitFullscreenElement;
      if(req&&!already){const r=req.call(el);if(r&&r.catch)r.catch(()=>{});}
    }catch{}
    // Periodic re-render — picks up new homework / reminders / events without
    // wiring sv() into a bus. 12s is rare enough that the animation reset isn't
    // distracting and frequent enough that the column stays current.
    if(_zenTilesT)clearInterval(_zenTilesT);
    _zenTilesT=setInterval(()=>{try{zenRenderTiles(false);}catch{}},12000);
  }catch(err){
    console.error('zenEnter failed:',err);
  }
}

// Confirm modal helpers — open/close use the existing .modal-bg/.open pattern
// so the same blur+scale-in animation as every other modal in Stream applies.
function zenOpenConfirm(){
  // If user previously ticked "Don't show this again", bypass the modal and
  // launch zen directly. The flag is set on the same click that confirms.
  try{
    if(localStorage.getItem('st_zen_skip_confirm')==='1'){zenEnter();return;}
  }catch{}
  const m=document.getElementById('zen-confirm');if(!m)return;
  // Reset the checkbox each time so a stray previous tick doesn't carry over
  const cb=document.getElementById('zen-confirm-skip-cb');if(cb)cb.checked=false;
  m.classList.add('open');
  // Focus the primary button so Enter/Space immediately confirms
  setTimeout(()=>{const b=document.getElementById('zen-confirm-go');if(b)b.focus();},80);
}
function zenCloseConfirm(){
  const m=document.getElementById('zen-confirm');if(!m)return;
  m.classList.remove('open');
}

// Wire all zen-related controls via addEventListener (more robust than inline
// onclick when other global click handlers fire first, e.g. fancy-cursor).
(function _zenWireBtn(){
  const wire=()=>{
    const btn=document.getElementById('zen-btn');
    if(btn&&!btn._zenWired){
      btn._zenWired=true;
      btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();zenOpenConfirm();});
    }
    const close=document.getElementById('zen-close');
    if(close&&!close._zenWired){
      close._zenWired=true;
      close.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();zenExit();});
    }
    const go=document.getElementById('zen-confirm-go');
    if(go&&!go._zenWired){
      go._zenWired=true;
      go.addEventListener('click',ev=>{
        ev.preventDefault();ev.stopPropagation();
        // Persist "don't show again" preference if the user ticked it
        const cb=document.getElementById('zen-confirm-skip-cb');
        if(cb&&cb.checked){try{localStorage.setItem('st_zen_skip_confirm','1');}catch{}}
        zenCloseConfirm();
        zenEnter();
      });
    }
    const cancel=document.getElementById('zen-confirm-cancel');
    if(cancel&&!cancel._zenWired){
      cancel._zenWired=true;
      cancel.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();zenCloseConfirm();});
    }
    // Click on backdrop (outside the .modal-box) dismisses too
    const m=document.getElementById('zen-confirm');
    if(m&&!m._zenWired){
      m._zenWired=true;
      m.addEventListener('click',ev=>{if(ev.target===m)zenCloseConfirm();});
    }
    const collapseBtn=document.getElementById('zen-collapse-btn');
    if(collapseBtn&&!collapseBtn._zenWired){
      collapseBtn._zenWired=true;
      collapseBtn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();zenToggleCollapse();});
    }
    const expandBtn=document.getElementById('zen-expand-btn');
    if(expandBtn&&!expandBtn._zenWired){
      expandBtn._zenWired=true;
      expandBtn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();zenToggleCollapse();});
    }
    const swToggleBtn=document.getElementById('zen-sw-toggle');
    if(swToggleBtn&&!swToggleBtn._zenWired){
      swToggleBtn._zenWired=true;
      swToggleBtn.addEventListener('click',ev=>{
        ev.preventDefault();ev.stopPropagation();
        if(typeof swToggle==='function')swToggle();
        _zenSyncSwControls();
      });
    }
    const swStopBtn=document.getElementById('zen-sw-stop');
    if(swStopBtn&&!swStopBtn._zenWired){
      swStopBtn._zenWired=true;
      swStopBtn.addEventListener('click',ev=>{
        ev.preventDefault();ev.stopPropagation();
        if(typeof swStop==='function')swStop();
        _zenSyncSwControls();
      });
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);
  else wire();
})();

function zenExit(){
  if(!_zenActive)return;
  _zenActive=false;
  const fs=document.getElementById('zen-fs');if(fs)fs.classList.remove('open');
  if(_zenTilesT){clearInterval(_zenTilesT);_zenTilesT=null;}
  _zenStopSwTick();
  // Leave browser fullscreen if we entered it. Wrapped in try/catch since it
  // throws when nothing is fullscreen, and ignore the promise rejection that
  // some browsers fire if user already exited via ESC.
  try{
    const exit=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen||document.msExitFullscreen;
    const inFs=document.fullscreenElement||document.webkitFullscreenElement;
    if(exit&&inFs){const r=exit.call(document);if(r&&r.catch)r.catch(()=>{});}
  }catch{}
}

document.addEventListener('keydown',ev=>{
  if(ev.key!=='Escape')return;
  if(_zenActive){zenExit();return;}
  const m=document.getElementById('zen-confirm');
  if(m&&m.classList.contains('open')){zenCloseConfirm();}
});

// If the user leaves browser fullscreen (ESC or other) while zen is open,
// close zen too so the overlay doesn't linger on a non-fullscreen window.
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>{
  document.addEventListener(ev,()=>{
    const inFs=!!(document.fullscreenElement||document.webkitFullscreenElement);
    if(!inFs&&_zenActive)zenExit();
  });
});

function _zenPad(n){return String(n).padStart(2,'0');}
function _zenFmtMs(ms){
  const s=Math.max(0,Math.floor(ms/1000));
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return h>0?`${h}:${_zenPad(m)}:${_zenPad(sec)}`:`${_zenPad(m)}:${_zenPad(sec)}`;
}

// Pick the right "big timer" source: focus timer if running, else stopwatch
// if running, else countdown to next period — same priority as updateTabTitle.
// Updates the timer (main + ms spans), the meta row, and the progress bar to
// mirror the home screen exactly. Also toggles the in-zen stopwatch controls
// + the centisecond raf tick based on whether the stopwatch is active.
function zenSyncTimer(){
  if(!_zenActive)return;
  const mainEl=document.getElementById('zen-time-main');
  const msEl=document.getElementById('zen-time-ms');
  const lblEl=document.getElementById('zen-lbl');
  const perEl=document.getElementById('zen-per');
  const roomEl=document.getElementById('zen-room');
  const progEl=document.getElementById('zen-prog-fill');
  if(!mainEl||!msEl||!lblEl||!perEl||!roomEl||!progEl)return;
  // Show stopwatch controls only when the stopwatch is running OR has paused
  // time on the clock. When it's freshly reset / hasn't started, hide them.
  _zenSyncSwControls();
  // 1. Focus timer
  if(typeof ftRunning!=='undefined'&&ftRunning){
    const remSecs=(typeof ftRemSecs!=='undefined'?ftRemSecs:0);
    const m=Math.floor(remSecs/60),s=remSecs%60;
    mainEl.textContent=`${_zenPad(m)}:${_zenPad(s)}`;
    msEl.textContent='';
    lblEl.textContent=ftPaused?'focus · paused':'focus remaining';
    perEl.textContent='';roomEl.textContent='';
    const total=(typeof ftTotalSecs!=='undefined'?ftTotalSecs:1)||1;
    progEl.style.width=Math.min(100,((total-remSecs)/total)*100)+'%';
    _zenStopSwTick();
    return;
  }
  // 2. Stopwatch — needs centisecond updates, so kick off the raf loop.
  //    The raf loop also writes the spans for sub-second precision; we just
  //    seed an immediate update here so the display isn't stale.
  if(typeof swRunning!=='undefined'&&(swRunning||(typeof swElapsed!=='undefined'&&swElapsed>0))){
    _zenWriteSwTime();
    lblEl.textContent=swRunning?'studying':'studying · paused';
    perEl.textContent='';roomEl.textContent='';
    progEl.style.width='0%';
    if(swRunning)_zenStartSwTick();else _zenStopSwTick();
    return;
  }
  _zenStopSwTick();
  msEl.textContent='';
  // 3. Period countdown — mirrors the dashboard tick logic precisely
  try{
    const{cur,nxt,weekend}=getCurNxt();
    const now=new Date(),nm=toM(now.getHours(),now.getMinutes())+now.getSeconds()/60;
    // Outside school: defer to calendar event countdown (mirrors tick).
    if(!cur&&!nxt){
      const calCd=(typeof getActiveCalCountdown==='function')?getActiveCalCountdown(now):null;
      if(calCd){
        const remSec=Math.max(0,calCd.remSec);
        mainEl.textContent=fmtCountdown(remSec);
        if(calCd.type==='active'){
          lblEl.textContent='in progress';
          perEl.textContent=calCd.ev.name||'event';
          roomEl.textContent=calCd.ev.endTime?`until ${calCd.ev.endTime}`:'';
          const pct=calCd.totalSec>0?Math.max(0,remSec/calCd.totalSec):0;
          progEl.style.width=Math.min(100,(1-pct)*100)+'%';
        }else{
          lblEl.textContent='until '+(calCd.ev.name||'event');
          perEl.textContent=calCd.ev.name||'event';
          roomEl.textContent=calCd.ev.time||'';
          progEl.style.width='0%';
        }
        return;
      }
    }
    if(weekend){
      mainEl.textContent='—';lblEl.textContent='no school';perEl.textContent='Weekend';
      roomEl.textContent='';progEl.style.width='0%';return;
    }
    const ib=p=>!p||!p.subj;
    if(cur){
      const pe=toM(...cur.e),rem=pe-nm;
      const tot=pe-toM(...cur.s),el=nm-toM(...cur.s);
      mainEl.textContent=fmtCountdown(rem*60);
      lblEl.textContent=ib(cur)?cur.l:'in session';
      perEl.textContent=ib(cur)?cur.l:cur.subj;
      roomEl.textContent=ib(cur)?'':(cur.room||'');
      progEl.style.width=Math.min(el/tot*100,100)+'%';
      return;
    }
    if(nxt){
      const ps=toM(...nxt.s),rem=ps-nm;
      mainEl.textContent=fmtCountdown(rem*60);
      lblEl.textContent=ib(nxt)?'next up':'next period';
      perEl.textContent=ib(nxt)?nxt.l:nxt.subj;
      roomEl.textContent=ib(nxt)?'':(nxt.room||'');
      progEl.style.width='0%';
      return;
    }
    mainEl.textContent='done';lblEl.textContent='school ended';perEl.textContent='See you tomorrow';
    roomEl.textContent='';progEl.style.width='100%';
  }catch{
    mainEl.textContent='--:--';lblEl.textContent='—';perEl.textContent='';roomEl.textContent='';
    progEl.style.width='0%';
  }
}

// Centisecond raf loop — runs only while the stopwatch is running. Writes the
// main + ms spans every animation frame for buttery sub-second precision.
var _zenSwRaf=null;
function _zenWriteSwTime(){
  const main=document.getElementById('zen-time-main');
  const ms=document.getElementById('zen-time-ms');
  if(!main||!ms)return;
  if(typeof swRunning==='undefined')return;
  const elapsed=(typeof swElapsed!=='undefined'?swElapsed:0);
  const total=elapsed+(swRunning?(Date.now()-(typeof swStart!=='undefined'?swStart:0)):0);
  const totalMs=Math.max(0,Math.floor(total));
  const cs=Math.floor(totalMs/10)%100;
  const totalS=Math.floor(totalMs/1000);
  const s=totalS%60,m=Math.floor(totalS/60)%60,h=Math.floor(totalS/3600);
  const pad=n=>String(n).padStart(2,'0');
  main.textContent=h>0?`${h}:${pad(m)}:${pad(s)}`:`${pad(m)}:${pad(s)}`;
  ms.textContent=`.${pad(cs)}`;
}
function _zenStartSwTick(){
  if(_zenSwRaf)return;
  const loop=()=>{
    if(!_zenActive||typeof swRunning==='undefined'||!swRunning){_zenSwRaf=null;return;}
    _zenWriteSwTime();
    _zenSwRaf=requestAnimationFrame(loop);
  };
  _zenSwRaf=requestAnimationFrame(loop);
}
function _zenStopSwTick(){
  if(_zenSwRaf){cancelAnimationFrame(_zenSwRaf);_zenSwRaf=null;}
}

// Sync the in-zen stopwatch control row: visible only when stopwatch has
// non-zero state. Updates the play/pause button label + icon to match the
// running/paused state.
function _zenSyncSwControls(){
  const ctrl=document.getElementById('zen-sw-controls');
  if(!ctrl)return;
  const running=(typeof swRunning!=='undefined')&&swRunning;
  const elapsed=(typeof swElapsed!=='undefined')?swElapsed:0;
  const ms=elapsed+(running?Date.now()-(typeof swStart!=='undefined'?swStart:0):0);
  const active=running||ms>0;
  ctrl.classList.toggle('show',!!active);
  if(!active)return;
  const icon=document.getElementById('zen-sw-toggle-icon');
  const lbl=document.getElementById('zen-sw-toggle-lbl');
  if(running){
    if(icon)icon.innerHTML='<rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/>';
    if(lbl)lbl.textContent='Pause';
  }else{
    if(icon)icon.innerHTML='<polygon points="5,3 19,12 5,21"/>';
    if(lbl)lbl.textContent='Resume';
  }
}

// Toggle whether the right-column widgets are visible. Persists to localStorage
// so the preference survives across sessions.
function zenToggleCollapse(){
  const fs=document.getElementById('zen-fs');if(!fs)return;
  const collapsed=!fs.classList.contains('collapsed');
  fs.classList.toggle('collapsed',collapsed);
  try{localStorage.setItem('st_zen_collapsed',collapsed?'1':'0');}catch{}
  // After collapsing/expanding, the right track measures differently — recompute
  // the marquee duration so it stays smooth.
  if(!collapsed){requestAnimationFrame(()=>{try{zenRenderTiles(true);}catch{}});}
}

// Pick a random quote for the zen overlay. Same QUOTES array used by the home
// screen — we just sample independently each entry so it's a fresh moment.
function _zenSetQuote(){
  if(typeof QUOTES==='undefined')return;
  const q=QUOTES[Math.floor(Math.random()*QUOTES.length)];
  const t=document.getElementById('zen-quote-text');
  const a=document.getElementById('zen-quote-author');
  if(t)t.textContent=`"${q.q}"`;
  if(a)a.textContent=`— ${q.a}`;
}

// Build the right-column track. Render once into a string, hash it, and only
// swap if it actually changed — keeps the marquee continuous when the data
// hasn't moved.
function zenRenderTiles(forceReplace){
  const track=document.getElementById('zen-track');if(!track)return;
  const html=_zenBuildTilesHTML();
  if(html===_zenLastTilesHash&&!forceReplace)return;
  _zenLastTilesHash=html;
  // Duplicate content so translateY(-50%) lands at the start of the second copy
  track.innerHTML=html+html;
  // Restart animation (style recalc forces CSS to pick up new keyframe range)
  requestAnimationFrame(()=>{
    const half=track.scrollHeight/2;
    const px_per_sec=32;
    const dur=Math.max(25,Math.round(half/px_per_sec));
    track.style.setProperty('--zen-dur',dur+'s');
    track.style.animation='none';
    void track.offsetHeight;
    track.style.animation='';
  });
}

function _zenBuildTilesHTML(){
  const out=[];
  const today=new Date(),td=today.toISOString().split('T')[0];
  // Today's schedule
  const dow=today.getDay();
  if(dow>=1&&dow<=5&&typeof TT!=='undefined'){
    const day=TT[DKEYS[dow]]||[];
    const nm=toM(today.getHours(),today.getMinutes());
    const upcoming=day.filter(p=>p.subj&&p.subj!=='roll call'&&toM(...p.e)>=nm);
    const rows=upcoming.map(p=>{
      const isNow=nm>=toM(...p.s)&&nm<toM(...p.e);
      return`<div class="zen-tile-row${isNow?'':''}">
        <div class="zen-tile-bullet" style="background:${isNow?'#60a5fa':'rgba(255,255,255,.4)'}"></div>
        <div style="flex:1;min-width:0">
          <div>${esc(p.subj)}</div>
          <div class="zen-tile-meta">${p.s[0]}:${_zenPad(p.s[1])} – ${p.e[0]}:${_zenPad(p.e[1])}${p.room?' · '+esc(p.room):''}${isNow?' · now':''}</div>
        </div>
      </div>`;
    }).join('');
    out.push(`<div class="zen-tile">
      <div class="zen-tile-head"><span class="zen-tile-icon"></span>today's schedule</div>
      ${rows||'<div class="zen-tile-empty">No more periods today.</div>'}
    </div>`);
  }
  // Reminders
  const remsList=(typeof rems!=='undefined'?rems:[]).filter(r=>!r.done).slice(0,8);
  out.push(`<div class="zen-tile">
    <div class="zen-tile-head"><span class="zen-tile-icon" style="background:#f59e0b"></span>reminders</div>
    ${remsList.length?remsList.map(r=>`<div class="zen-tile-row">
      <div class="zen-tile-bullet" style="background:#f59e0b"></div>
      <div style="flex:1;min-width:0">${esc(r.text||r.task||'')}</div>
    </div>`).join(''):'<div class="zen-tile-empty">All clear.</div>'}
  </div>`);
  // Homework
  const hwList=(typeof hw!=='undefined'?hw:[]).filter(h=>!h.done).slice(0,8);
  out.push(`<div class="zen-tile">
    <div class="zen-tile-head"><span class="zen-tile-icon" style="background:#16a34a"></span>homework</div>
    ${hwList.length?hwList.map(h=>{
      const overdue=h.due&&h.due<td;
      return`<div class="zen-tile-row">
        <div class="zen-tile-bullet" style="background:#16a34a"></div>
        <div style="flex:1;min-width:0">
          <div>${esc(h.task||'')}</div>
          ${h.due?`<div class="zen-tile-meta${overdue?' zen-tile-overdue':''}">${overdue?'overdue · ':'due '}${esc(h.due)}${h.subj?' · '+esc(h.subj):''}</div>`:h.subj?`<div class="zen-tile-meta">${esc(h.subj)}</div>`:''}
        </div>
      </div>`;
    }).join(''):'<div class="zen-tile-empty">Nothing pending.</div>'}
  </div>`);
  // Today's events
  if(typeof getEventsForDate==='function'){
    const todayEvs=getEventsForDate(td).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    out.push(`<div class="zen-tile">
      <div class="zen-tile-head"><span class="zen-tile-icon" style="background:#9333ea"></span>today's events</div>
      ${todayEvs.length?todayEvs.map(e=>`<div class="zen-tile-row">
        <div class="zen-tile-bullet" style="background:${e.color||'#9333ea'}"></div>
        <div style="flex:1;min-width:0">
          <div>${esc(e.name||'')}</div>
          <div class="zen-tile-meta">${e.time||'all day'}${e.subj?' · '+esc(e.subj):''}</div>
        </div>
      </div>`).join(''):'<div class="zen-tile-empty">Nothing on today.</div>'}
    </div>`);
  }
  // Upcoming exams
  const upcomingExams=(typeof exams!=='undefined'?exams:[])
    .filter(ex=>new Date(ex.date+'T09:00:00')>=today)
    .sort((a,b)=>a.date.localeCompare(b.date))
    .slice(0,5);
  out.push(`<div class="zen-tile">
    <div class="zen-tile-head"><span class="zen-tile-icon" style="background:#dc2626"></span>upcoming exams</div>
    ${upcomingExams.length?upcomingExams.map(ex=>{
      const dt=new Date(ex.date+'T09:00:00');
      const days=Math.ceil((dt-today)/86400000);
      return`<div class="zen-tile-row">
        <div class="zen-tile-bullet" style="background:#dc2626"></div>
        <div style="flex:1;min-width:0">
          <div>${esc(ex.subj||ex.name||'exam')}</div>
          <div class="zen-tile-meta">${days<=0?'today':days===1?'tomorrow':days+' days'} · ${esc(ex.date)}</div>
        </div>
      </div>`;
    }).join(''):'<div class="zen-tile-empty">No exams coming up.</div>'}
  </div>`);
  return out.join('');
}

