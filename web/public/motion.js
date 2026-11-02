// Local, decorative motion only. Allocation data and forms do not depend on this module.
const canvas = document.querySelector('#ambient-canvas');
const root = document.documentElement;
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let stored = localStorage.getItem('planner-motion');
let enabled = stored ? stored === 'on' : !preference.matches;
let width = innerWidth, height = innerHeight, frame = 0, previous = 0, pointerX = 0, pointerY = 0;
const ctx = canvas?.getContext('2d');
const points = Array.from({length: 95}, (_,i) => ({
  x: Math.sin(i*127.1+21)*.5+.5, y: Math.sin(i*311.7+7)*.5+.5,
  phase: i*1.618, size: i%7 === 0 ? 1.4 : .65, depth: .2+(i%5)/5
}));
const sculpture = document.querySelector('#sculpture-grid');
if(sculpture) for(let i=0;i<20;i++) { const bench=document.createElement('span');bench.className='sculpture-bench';bench.innerHTML='<i></i><i></i>';sculpture.append(bench); }
function scrollDepth() {
  const depth=enabled?Math.min(scrollY*.1,90):0;
  root.style.setProperty('--scroll-depth',depth+'px');
  root.style.setProperty('--scene-pitch',enabled?(pointerY*4+depth*.065)+'deg':'0deg');
  root.style.setProperty('--scene-yaw',enabled?(pointerX*5+depth*.095)+'deg':'0deg');
}
function resize() {
  width=innerWidth;height=innerHeight;
  if(ctx){const dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  draw(0);scrollDepth();
}
function draw(time) {
  if(!ctx)return;
  ctx.clearRect(0,0,width,height);
  for(const p of points){
    const drift=enabled?time*.000045:0;
    const x=p.x*width+Math.sin(drift+p.phase)*22*p.depth;
    const y=(p.y*height+Math.cos(drift+p.phase)*19-(enabled?scrollY:0)*.025*p.depth+height)%height;
    ctx.beginPath();ctx.arc(x,y,p.size,0,Math.PI*2);ctx.fillStyle=`rgba(165,190,240,${.12+p.depth*.13})`;ctx.fill();
  }
  // A low-contrast orbital ribbon changes perspective as the page scrolls.
  const cx=width*.75,cy=height*.43-(enabled?Math.min(scrollY*.11,100):0),t=enabled?time*.000035:0;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-.3+Math.sin(t)*.08);ctx.scale(1,.36);
  for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,width*.25+i*24,width*.25+i*24,0,0,Math.PI*2);ctx.strokeStyle=`rgba(145,171,240,${.035-i*.007})`;ctx.lineWidth=1;ctx.stroke();}
  ctx.restore();
}
function tick(time) {frame=0;if(!enabled||document.hidden)return;if(time-previous>32){draw(time);previous=time;}frame=requestAnimationFrame(tick);}
function update() {
  root.dataset.motion=enabled?'on':'off';
  document.querySelectorAll('[data-motion-toggle]').forEach(b=>{b.textContent=enabled?'Motion on':'Motion off';b.setAttribute('aria-pressed',String(enabled));});
  cancelAnimationFrame(frame);frame=0;scrollDepth();draw(0);if(enabled&&!document.hidden)frame=requestAnimationFrame(tick);
}
document.addEventListener('click',event=>{if(event.target.closest('[data-motion-toggle]')){enabled=!enabled;localStorage.setItem('planner-motion',enabled?'on':'off');update();}});
document.addEventListener('visibilitychange',update);
preference.addEventListener('change',()=>{if(!localStorage.getItem('planner-motion')){enabled=!preference.matches;update();}});
addEventListener('scroll',()=>{scrollDepth();if(!enabled)draw(0);},{passive:true});
addEventListener('pointermove',event=>{if(!enabled||event.pointerType==='touch')return;pointerX=(event.clientX/width-.5);pointerY=(event.clientY/height-.5);scrollDepth();},{passive:true});
addEventListener('resize',resize,{passive:true});
resize();update();
