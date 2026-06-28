/*
Drawescape｜绘梦境 V3
生成日期：2026-06-29
功能：真实 Three.js 3D 形体实验室 + 可拖动透视画布 + 调色教学 + 风水流体可视化。
输入：鼠标 / 触摸 / 本地图片 / 浏览器 localStorage。
输出：互动学习、透视线稿、3D 场景、PNG 导出、本地进度。
*/
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const TAU = Math.PI * 2;
const store = {
  get(k, fallback){ try{return JSON.parse(localStorage.getItem(k)) ?? fallback}catch(e){return fallback} },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
const state = store.get('drawescape-v3', { page:'home', theme:'theme-paper', xp:0, completed:{} });

const zones = [
  {id:'line', name:'线之海', en:'Line Sea', icon:'〰️', color:'#33424c', tool:'拓扑线笔', core:'线不是装饰，而是空间结构留下的边界。', lab:'在 3D 模型上打开 2D 投影线稿。', page:'studio3d'},
  {id:'proportion', name:'比例森林', en:'Proportion Forest', icon:'🧭', color:'#8db596', tool:'比例罗盘', core:'比例不是死背，是锚点之间的可校准关系。', lab:'用关卡复原锚点和单位长度。', page:'quest'},
  {id:'camera', name:'相机塔', en:'Camera Tower', icon:'📐', color:'#56c2d7', tool:'透视眼镜', core:'透视是相机把三维点投影到二维画面。', lab:'拖动消失点，修复一点/两点/三点透视。', page:'perspective'},
  {id:'depth', name:'深度湖', en:'Depth Lake', icon:'🌊', color:'#8e84df', tool:'深度灯笼', core:'深度图记录远近，不等于阴影。', lab:'把场景分成前景、中景、远景。', page:'perspective'},
  {id:'light', name:'光之月台', en:'Light Station', icon:'🌙', color:'#ffd166', tool:'法线罗盘', core:'明暗由表面朝向、光线方向和遮挡共同决定。', lab:'在 3D 中拖动光源，看高光和投影变化。', page:'studio3d'},
  {id:'material', name:'材质星市', en:'Material Bazaar', icon:'💎', color:'#f29ba7', tool:'材质晶球', core:'材质是表面处理光的规律。', lab:'调整粗糙度、金属度和颜色。', page:'studio3d'},
  {id:'wind', name:'风的剧场', en:'Wind Theater', icon:'🍃', color:'#b7d6ee', tool:'风向羽毛', core:'风不可见，只能通过头发、布料、树叶和烟的变形被看见。', lab:'拖动力场方向，观察风线。', page:'flow'},
  {id:'fluid', name:'流体之谷', en:'Fluid Valley', icon:'💧', color:'#4cb4d7', tool:'流线贝壳', core:'水、烟、云、火没有固定轮廓，只有力场、密度、边缘和节奏。', lab:'观察水流绕石头、烟被风拉伸。', page:'flow'},
  {id:'fold', name:'折叠云城', en:'Folding Cloud City', icon:'🌈', color:'#b692f6', tool:'世界折叠器', core:'风格是选择保留哪些信息、舍弃哪些信息。', lab:'把颜色、线条、光影压缩成风格。', page:'color'}
];
const zoneMap = Object.fromEntries(zones.map(z=>[z.id,z]));
const quests = [
  {id:'q3d', title:'拖动一个盒子', icon:'🧊', page:'studio3d', task:'在 3D 实验室添加一个盒子，拖动它，观察 2D 投影线稿如何改变。', reward:12},
  {id:'qvp', title:'修复两点透视', icon:'📐', page:'perspective', task:'打开透视画布，拖动左右两个消失点，让网格适合一个房间或街道。', reward:10},
  {id:'qcolor', title:'生成一组画面配色', icon:'🎨', page:'color', task:'选择一个固有色，观察互补色、邻近色和高光色如何形成画面层次。', reward:8},
  {id:'qwind', title:'画一阵风', icon:'🍃', page:'flow', task:'在流体之谷拖动方向点，只用风线想象头发和衣摆的运动。', reward:8},
  {id:'qmodel', title:'线稿变模型', icon:'✏️', page:'studio3d', task:'点击“侧影→旋转体”或“路径→扫掠”，理解二维线条如何变成三维形体。', reward:14},
  {id:'qdraw', title:'在透视上画线', icon:'🖊️', page:'perspective', task:'打开画笔，在透视网格上画一个盒子或房间轮廓，再导出 PNG。', reward:12}
];
const sources = [
  {tag:'THREE', title:'Three.js / WebGL 3D', text:'用于真实三维场景、相机、光源、材质和 OrbitControls。让“绘画中的透视”变成可旋转、可投影的场景。'},
  {tag:'CG', title:'渲染管线：几何 → 相机 → 光照 → 材质 → 图像', text:'Drawescape 把最终画面拆成深度、法线、漫反射、高光、AO、材质和风格通道。'},
  {tag:'CV', title:'针孔相机、多视角、投影、深度', text:'透视、消失点、单目深度和 3D 重建，都可以帮助学习者把画面从二维规律还原成三维关系。'},
  {tag:'3D', title:'Rhino / SketchUp / Blender 思维桥', text:'轮廓线可以推拉，侧影线可以旋转，路径线可以扫掠，深度层可以形成曲面。'},
  {tag:'ART', title:'传统绘画：素描、色彩、速写、构成', text:'传统经验不是被替代，而是被显性化：锚点、比例、明暗块、边界、节奏和取舍。'},
  {tag:'ND', title:'低负荷、短关卡、可见反馈', text:'把“多练练”的模糊压力拆成小任务和可见误差，减少挫败，保护想象力。'}
];

function persist(){ store.set('drawescape-v3', state); }
function toast(msg){ const old=$('.toast'); if(old) old.remove(); const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }
function completeQuest(id){ if(!state.completed[id]){ const q=quests.find(x=>x.id===id); state.completed[id]=true; state.xp += q?.reward || 5; persist(); toast(`完成关卡：${q?.title || id} +${q?.reward || 5} 星尘 ✨`); renderQuests(); } }
function showPage(id){ state.page = id; persist(); $$('.page').forEach(p=>p.classList.toggle('active', p.id===id)); $$('[data-page]').forEach(b=>b.classList.toggle('active', b.dataset.page===id)); if(id==='studio3d') threeLab.ensure(); if(id==='perspective') perspectivePad.ensure(); if(id==='color') colorLab.ensure(); if(id==='flow') flowLab.ensure(); }

function initUI(){
  $$('[data-page]').forEach(btn=>btn.addEventListener('click', ()=>showPage(btn.dataset.page)));
  $('#themeBtn').addEventListener('click', ()=>{ document.body.classList.toggle('theme-night'); document.body.classList.remove('theme-geo'); state.theme = document.body.classList.contains('theme-night')?'theme-night':'theme-paper'; persist(); });
  $('#geoBtn').addEventListener('click', ()=>{ document.body.classList.toggle('theme-geo'); document.body.classList.remove('theme-night'); state.theme = document.body.classList.contains('theme-geo')?'theme-geo':'theme-paper'; persist(); });
  $('#focusBtn').addEventListener('click', ()=>document.body.classList.toggle('focus'));
  $('#motionBtn').addEventListener('click', ()=>{ document.body.classList.toggle('low-motion'); state.lowMotion=document.body.classList.contains('low-motion'); persist(); });
  document.body.classList.toggle('theme-night', state.theme==='theme-night');
  document.body.classList.toggle('theme-geo', state.theme==='theme-geo');
  document.body.classList.toggle('low-motion', !!state.lowMotion);
  renderWorldMap(); renderQuests(); renderSources();
  bgStars.start(); heroArt.start();
  showPage(state.page || 'home');
}

const bgStars = {
  start(){ const c=$('#starCanvas'), ctx=c.getContext('2d'); let pts=[]; const resize=()=>{ const d=devicePixelRatio||1; c.width=innerWidth*d; c.height=innerHeight*d; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; ctx.setTransform(d,0,0,d,0,0); pts=Array.from({length:70},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.8+.4,a:Math.random()*TAU,s:Math.random()*0.4+.1}));}; addEventListener('resize',resize); resize(); const loop=()=>{ if(!document.body.classList.contains('low-motion')){ ctx.clearRect(0,0,innerWidth,innerHeight); pts.forEach(p=>{ p.a+=0.01*p.s; ctx.globalAlpha=.25+.25*Math.sin(p.a); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,TAU); ctx.fillStyle='#58bfd6'; ctx.fill();}); } requestAnimationFrame(loop);}; loop(); }
};

const heroArt = {
  start(){ const c=$('#heroCanvas'), ctx=c.getContext('2d'); let w=0,h=0,t=0; const resize=()=>{ const d=devicePixelRatio||1; const r=c.getBoundingClientRect(); w=r.width; h=r.height; c.width=w*d; c.height=h*d; ctx.setTransform(d,0,0,d,0,0);}; addEventListener('resize',resize); resize(); const loop=()=>{ t+=0.012; ctx.clearRect(0,0,w,h); const cx=w/2, cy=h/2+14; drawGrid(ctx,w,h,t); drawFloatingGeometry(ctx,cx,cy,t); drawScanLines(ctx,w,h,t); requestAnimationFrame(loop);}; loop(); }
};
function drawGrid(ctx,w,h,t){ ctx.save(); ctx.globalAlpha=.35; ctx.strokeStyle='#56c2d7'; ctx.lineWidth=1; const vp={x:w*.5+Math.sin(t)*60,y:h*.42}; for(let x=-80;x<w+80;x+=40){ ctx.beginPath(); ctx.moveTo(x,h); ctx.lineTo(vp.x,vp.y); ctx.stroke(); } for(let i=0;i<12;i++){ const y=h*.48 + i*i*3.3; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); } ctx.restore(); }
function drawFloatingGeometry(ctx,cx,cy,t){ const shapes=[[-150,-18,52,'#ffd166'],[-45,20,66,'#f29ba7'],[80,-18,58,'#8e84df'],[172,34,44,'#56c2d7']]; shapes.forEach((s,i)=>{ const x=cx+s[0]+Math.sin(t+i)*12, y=cy+s[1]+Math.cos(t*.9+i)*12, r=s[2]; ctx.save(); ctx.translate(x,y); ctx.rotate(t*(i%2?-.4:.35)); ctx.fillStyle=s[3]; ctx.globalAlpha=.64; ctx.strokeStyle='rgba(255,255,255,.88)'; ctx.lineWidth=2; if(i===0){ roundedRect(ctx,-r/2,-r/2,r,r,16); ctx.fill(); ctx.stroke(); } if(i===1){ ctx.beginPath(); ctx.arc(0,0,r/2,0,TAU); ctx.fill(); ctx.stroke(); } if(i===2){ ctx.beginPath(); ctx.moveTo(0,-r/2); ctx.lineTo(r/2,r/2); ctx.lineTo(-r/2,r/2); ctx.closePath(); ctx.fill(); ctx.stroke(); } if(i===3){ ctx.beginPath(); ctx.ellipse(0,0,r*.62,r*.34,0,0,TAU); ctx.fill(); ctx.stroke(); } ctx.restore(); }); }
function drawScanLines(ctx,w,h,t){ ctx.save(); ctx.globalAlpha=.7; ctx.strokeStyle='rgba(255,255,255,.8)'; for(let i=0;i<3;i++){ const y=(h*((t*.08+i*.36)%1)); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); } ctx.restore(); }
function roundedRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

function renderWorldMap(){
  const svg=$('#worldSvg'); const coords={line:[120,140],proportion:[275,270],camera:[425,150],depth:[565,285],light:[710,155],material:[845,285],wind:[430,470],fluid:[610,500],fold:[875,460]};
  const links=[['line','proportion'],['line','camera'],['proportion','depth'],['camera','depth'],['depth','light'],['light','material'],['material','wind'],['wind','fluid'],['fluid','fold'],['material','fold']];
  svg.innerHTML = `<defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` + links.map(([a,b])=>{const A=coords[a],B=coords[b]; return `<path class="map-edge" d="M${A[0]},${A[1]} C${(A[0]+B[0])/2},${A[1]} ${(A[0]+B[0])/2},${B[1]} ${B[0]},${B[1]}"/>`;}).join('') + zones.map(z=>{const [x,y]=coords[z.id]; return `<g class="map-node" data-zone="${z.id}" transform="translate(${x},${y})"><circle r="54" fill="${z.color}" filter="url(#glow)"></circle><text text-anchor="middle" y="-4">${z.icon}</text><text text-anchor="middle" y="24">${z.name}</text></g>`;}).join('');
  $$('.map-node',svg).forEach(n=>n.addEventListener('click',()=>showZone(n.dataset.zone)));
  showZone('camera');
}
function showZone(id){ const z=zoneMap[id]; $('#zoneInspector').innerHTML=`<h3>${z.icon} ${z.name}<br><small>${z.en}</small></h3><p><b>核心：</b>${z.core}</p><p><b>道具：</b>${z.tool}</p><p><b>互动：</b>${z.lab}</p><button class="primary" data-page="${z.page}">进入对应实验</button><div style="margin-top:12px"><span class="tool-chip">几何</span><span class="tool-chip">透视</span><span class="tool-chip">绘画推理</span></div>`; $('#zoneInspector [data-page]').addEventListener('click', e=>showPage(e.currentTarget.dataset.page)); }
function renderQuests(){ const grid=$('#questGrid'); grid.innerHTML=quests.map(q=>`<article class="quest-card"><h3>${q.icon} ${q.title}</h3><p>${q.task}</p><p class="tiny">奖励：${q.reward} 星尘 · 状态：${state.completed[q.id]?'完成':'未完成'}</p><button data-quest-go="${q.page}" data-q="${q.id}">${state.completed[q.id]?'再玩一次':'开始关卡'}</button></article>`).join(''); $$('[data-quest-go]',grid).forEach(b=>b.addEventListener('click',()=>{ showPage(b.dataset.questGo); setTimeout(()=>completeQuest(b.dataset.q),1200); })); }
function renderSources(){ $('#sourceGrid').innerHTML=sources.map(s=>`<article class="source-card"><span class="source-tag">${s.tag}</span><h3>${s.title}</h3><p>${s.text}</p></article>`).join(''); }

class ThreeLab{
  constructor(){ this.inited=false; this.objects=[]; this.selected=null; this.dragging=false; this.raycaster=new THREE.Raycaster(); this.pointer=new THREE.Vector2(); }
  ensure(){ if(this.inited){ this.resize(); return; } this.init(); }
  init(){
    this.inited=true; this.mount=$('#threeMount'); this.overlay=$('#projectionOverlay');
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color(0xf5fbff); this.scene.fog=new THREE.Fog(0xf5fbff,18,55);
    this.camera=new THREE.PerspectiveCamera(46,1,0.1,100); this.camera.position.set(6,3.2,7);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); this.renderer.shadowMap.enabled=true; this.mount.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement); this.controls.enableDamping=true; this.controls.target.set(0,0.8,0);
    const hemi=new THREE.HemisphereLight(0xffffff,0xb7d6ee,1.5); this.scene.add(hemi);
    this.keyLight=new THREE.DirectionalLight(0xffffff,2.6); this.keyLight.position.set(2,5,3); this.keyLight.castShadow=true; this.scene.add(this.keyLight);
    const grid=new THREE.GridHelper(24,24,0x58bfd6,0xdbe6e5); grid.material.transparent=true; grid.material.opacity=.45; this.scene.add(grid);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30), new THREE.ShadowMaterial({opacity:.12})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; ground.name='drag-ground'; this.scene.add(ground); this.ground=ground;
    this.addShape('box'); this.addShape('sphere'); this.addShape('cylinder'); this.scene.children.filter(o=>o.userData.selectable).forEach((o,i)=>o.position.x=(i-1)*1.8);
    this.bind(); this.resize(); this.loop(); $('#threeStatus').textContent='Three.js 已加载：拖动形体，旋转相机，观察 3D→2D 投影。';
  }
  bind(){
    addEventListener('resize',()=>this.resize());
    this.renderer.domElement.addEventListener('pointerdown',e=>this.pointerDown(e));
    this.renderer.domElement.addEventListener('pointermove',e=>this.pointerMove(e));
    addEventListener('pointerup',()=>this.pointerUp());
    $$('[data-add-shape]').forEach(b=>b.addEventListener('click',()=>this.addShape(b.dataset.addShape,true)));
    $$('[data-bridge]').forEach(b=>b.addEventListener('click',()=>this.addBridge(b.dataset.bridge)));
    $('#fovRange').addEventListener('input',e=>{this.camera.fov=+e.target.value; this.camera.updateProjectionMatrix();});
    $('#camHeightRange').addEventListener('input',e=>{this.camera.position.y=+e.target.value;});
    $('#wireToggle').addEventListener('change',e=>this.objects.forEach(o=>o.material && (o.material.wireframe=e.target.checked)));
    $('#roughRange').addEventListener('input',()=>this.applyMaterial()); $('#metalRange').addEventListener('input',()=>this.applyMaterial());
    $('#lightXRange').addEventListener('input',()=>this.updateLight()); $('#lightYRange').addEventListener('input',()=>this.updateLight());
    $('#sceneStillBtn').addEventListener('click',()=>this.presetStill()); $('#sceneRoomBtn').addEventListener('click',()=>this.presetRoom()); $('#sceneStreetBtn').addEventListener('click',()=>this.presetStreet()); $('#clear3dBtn').addEventListener('click',()=>this.clear());
  }
  resize(){ if(!this.inited)return; const r=this.mount.getBoundingClientRect(); this.camera.aspect=r.width/r.height; this.camera.updateProjectionMatrix(); this.renderer.setSize(r.width,r.height,false); const d=devicePixelRatio||1; this.overlay.width=r.width*d; this.overlay.height=r.height*d; this.overlay.style.width=r.width+'px'; this.overlay.style.height=r.height+'px'; this.overlay.getContext('2d').setTransform(d,0,0,d,0,0); }
  mat(color){ return new THREE.MeshStandardMaterial({color,roughness:+$('#roughRange')?.value || .45,metalness:+$('#metalRange')?.value || .08}); }
  addShape(type, scatter=false){ let geo, color; if(type==='box'){geo=new THREE.BoxGeometry(1.2,1.2,1.2); color=0x56c2d7;} if(type==='sphere'){geo=new THREE.SphereGeometry(.72,48,32); color=0xf29ba7;} if(type==='cylinder'){geo=new THREE.CylinderGeometry(.55,.55,1.5,40); color=0xffd166;} if(type==='cone'){geo=new THREE.ConeGeometry(.65,1.5,40); color=0x8db596;} if(type==='torus'){geo=new THREE.TorusGeometry(.56,.18,18,64); color=0x8e84df;} if(type==='ribbon'){ geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.8,0,0),new THREE.Vector3(-.25,.45,.1),new THREE.Vector3(.35,-.1,-.1),new THREE.Vector3(.9,.35,0)]),64,.055,8,false); color=0xb7d6ee; }
    const mesh=new THREE.Mesh(geo,this.mat(color)); mesh.castShadow=true; mesh.receiveShadow=true; mesh.userData.selectable=true; mesh.name=type; mesh.position.set(scatter? (Math.random()*4-2):0, type==='sphere'?.75:.65, scatter? (Math.random()*4-2):0); this.scene.add(mesh); this.objects.push(mesh); this.select(mesh); if(scatter) completeQuest('q3d'); return mesh; }
  addBridge(mode){ if(mode==='extrude'){ const shape=new THREE.Shape(); shape.moveTo(-.5,-.5); shape.lineTo(.55,-.42); shape.lineTo(.75,.3); shape.lineTo(-.2,.75); shape.lineTo(-.6,.1); shape.lineTo(-.5,-.5); const geo=new THREE.ExtrudeGeometry(shape,{depth:.65,bevelEnabled:true,bevelSize:.06,bevelThickness:.06}); const mesh=new THREE.Mesh(geo,this.mat(0x56c2d7)); mesh.rotation.x=-.25; mesh.position.set(-1,1.1,0); mesh.userData.selectable=true; mesh.castShadow=true; this.scene.add(mesh); this.objects.push(mesh); this.select(mesh); }
    if(mode==='lathe'){ const pts=[]; for(let i=0;i<10;i++){ const y=(i/9)*2-1; const r=.28+.26*Math.sin((i/9)*Math.PI); pts.push(new THREE.Vector2(r,y)); } const mesh=new THREE.Mesh(new THREE.LatheGeometry(pts,64),this.mat(0xf29ba7)); mesh.position.set(0,1.1,0); mesh.userData.selectable=true; mesh.castShadow=true; this.scene.add(mesh); this.objects.push(mesh); this.select(mesh); }
    if(mode==='sweep'){ this.addShape('ribbon',true); }
    if(mode==='surface'){ const geo=new THREE.PlaneGeometry(2.4,2.4,40,40); const pos=geo.attributes.position; for(let i=0;i<pos.count;i++){ const x=pos.getX(i), y=pos.getY(i); pos.setZ(i,.34*Math.sin(x*2.4)*Math.cos(y*2.2)); } geo.computeVertexNormals(); const mesh=new THREE.Mesh(geo,this.mat(0x8e84df)); mesh.rotation.x=-Math.PI/2; mesh.position.y=.45; mesh.userData.selectable=true; mesh.castShadow=true; this.scene.add(mesh); this.objects.push(mesh); this.select(mesh); }
    completeQuest('qmodel');
  }
  updateLight(){ this.keyLight.position.set(+$('#lightXRange').value,+$('#lightYRange').value,3); }
  applyMaterial(){ const m=this.selected?.material; if(m){m.roughness=+$('#roughRange').value; m.metalness=+$('#metalRange').value; m.needsUpdate=true;} }
  select(obj){ if(this.selected) this.selected.scale.setScalar(1); this.selected=obj; if(obj) obj.scale.setScalar(1.08); }
  setPointer(e){ const r=this.renderer.domElement.getBoundingClientRect(); this.pointer.x=((e.clientX-r.left)/r.width)*2-1; this.pointer.y=-((e.clientY-r.top)/r.height)*2+1; }
  pointerDown(e){ this.setPointer(e); this.raycaster.setFromCamera(this.pointer,this.camera); const hit=this.raycaster.intersectObjects(this.objects,false)[0]; if(hit){ this.select(hit.object); this.dragging=true; this.controls.enabled=false; this.dragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0); this.dragOffset=new THREE.Vector3(); const p=new THREE.Vector3(); this.raycaster.ray.intersectPlane(this.dragPlane,p); this.dragOffset.copy(hit.object.position).sub(p); } }
  pointerMove(e){ if(!this.dragging || !this.selected) return; this.setPointer(e); this.raycaster.setFromCamera(this.pointer,this.camera); const p=new THREE.Vector3(); this.raycaster.ray.intersectPlane(this.dragPlane,p); this.selected.position.x=p.x+this.dragOffset.x; this.selected.position.z=p.z+this.dragOffset.z; }
  pointerUp(){ if(this.dragging){this.dragging=false; this.controls.enabled=true;} }
  presetStill(){ this.clear(); ['box','sphere','cylinder','torus'].forEach((t,i)=>{ const m=this.addShape(t); m.position.set((i-1.5)*1.35,i===1?.72:.65,0); }); }
  presetRoom(){ this.clear(); const wallMat=new THREE.MeshStandardMaterial({color:0xfff3df,roughness:.8}); const floor=new THREE.Mesh(new THREE.BoxGeometry(6,.08,5),wallMat); floor.position.y=.04; const back=new THREE.Mesh(new THREE.BoxGeometry(6,3,.08),wallMat); back.position.set(0,1.5,-2.5); const left=new THREE.Mesh(new THREE.BoxGeometry(.08,3,5),wallMat); left.position.set(-3,1.5,0); [floor,back,left].forEach(o=>{o.receiveShadow=true; this.scene.add(o);}); this.addShape('box').position.set(-1,.65,-.7); this.addShape('sphere').position.set(1,.72,-.2); }
  presetStreet(){ this.clear(); for(let i=0;i<10;i++){ const b=this.addShape('box'); b.scale.set(.8+Math.random()*.8,1+Math.random()*2.2,.8); b.position.set(i%2?-2.2:2.2,b.scale.y*.6,-i*1.8); } this.camera.position.set(4,2.5,7); this.controls.target.set(0,.8,-5); }
  clear(){ this.objects.forEach(o=>this.scene.remove(o)); this.objects=[]; this.selected=null; }
  drawOverlay(){ const show=$('#overlayToggle')?.checked; const ctx=this.overlay.getContext('2d'); const r=this.mount.getBoundingClientRect(); ctx.clearRect(0,0,r.width,r.height); if(!show)return; ctx.save(); ctx.strokeStyle='rgba(36,49,58,.72)'; ctx.lineWidth=1.4; ctx.setLineDash([6,5]); this.objects.forEach(o=>{ const box=new THREE.Box3().setFromObject(o); const pts=[new THREE.Vector3(box.min.x,box.min.y,box.min.z),new THREE.Vector3(box.max.x,box.min.y,box.min.z),new THREE.Vector3(box.max.x,box.max.y,box.min.z),new THREE.Vector3(box.min.x,box.max.y,box.min.z),new THREE.Vector3(box.min.x,box.min.y,box.max.z),new THREE.Vector3(box.max.x,box.min.y,box.max.z),new THREE.Vector3(box.max.x,box.max.y,box.max.z),new THREE.Vector3(box.min.x,box.max.y,box.max.z)].map(v=>this.project(v,r)); const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]; edges.forEach(([a,b])=>{ ctx.beginPath(); ctx.moveTo(pts[a].x,pts[a].y); ctx.lineTo(pts[b].x,pts[b].y); ctx.stroke();}); }); ctx.restore(); }
  project(v,r){ const p=v.clone().project(this.camera); return {x:(p.x*.5+.5)*r.width,y:(-p.y*.5+.5)*r.height}; }
  loop(){ requestAnimationFrame(()=>this.loop()); if(!this.inited)return; this.controls.update(); this.objects.forEach((o,i)=>{ if(!this.dragging && !document.body.classList.contains('low-motion')) o.rotation.y += 0.002*(i%2?1:-1); }); this.renderer.render(this.scene,this.camera); this.drawOverlay(); }
}
const threeLab = new ThreeLab();

class PerspectivePad{
  constructor(){ this.inited=false; this.mode='2p'; this.tool='draw'; this.strokes=[]; this.dragHandle=null; this.img=null; }
  ensure(){ if(this.inited){this.resize(); return;} this.init(); }
  init(){ this.inited=true; this.canvas=$('#perspectiveCanvas'); this.ctx=this.canvas.getContext('2d'); this.resize(); this.bind(); this.draw(); }
  bind(){ addEventListener('resize',()=>this.resize()); this.canvas.addEventListener('pointerdown',e=>this.down(e)); this.canvas.addEventListener('pointermove',e=>this.move(e)); addEventListener('pointerup',()=>this.up()); $$('[data-persp-mode]').forEach(b=>b.addEventListener('click',()=>{this.mode=b.dataset.perspMode; $$('[data-persp-mode]').forEach(x=>x.classList.toggle('active',x===b)); this.draw();})); $$('[data-draw-tool]').forEach(b=>b.addEventListener('click',()=>{this.tool=b.dataset.drawTool; $$('[data-draw-tool]').forEach(x=>x.classList.toggle('active',x===b));})); ['brushSize','brushColor','gridDensity','gridAlpha'].forEach(id=>$('#'+id).addEventListener('input',()=>this.draw())); $('#undoStrokeBtn').addEventListener('click',()=>{this.strokes.pop(); this.draw();}); $('#clearDrawingBtn').addEventListener('click',()=>{this.strokes=[]; this.draw();}); $('#downloadDrawingBtn').addEventListener('click',()=>this.download()); $('#imageUpload').addEventListener('change',e=>this.loadImage(e)); }
  resize(){ const r=this.canvas.parentElement.getBoundingClientRect(); const d=devicePixelRatio||1; const oldW=this.w||r.width, oldH=this.h||r.height; this.w=r.width; this.h=r.height; this.canvas.width=this.w*d; this.canvas.height=this.h*d; this.ctx.setTransform(d,0,0,d,0,0); if(!this.vps){ this.vps={vp1:{x:this.w*.16,y:this.h*.42},vp2:{x:this.w*.84,y:this.h*.42},vp3:{x:this.w*.5,y:-this.h*.28}}; } else { const sx=this.w/oldW, sy=this.h/oldH; Object.values(this.vps).forEach(p=>{p.x*=sx;p.y*=sy;}); } this.draw(); }
  pos(e){ const r=this.canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  nearestHandle(p){ let best=null, bd=22; Object.entries(this.vps).forEach(([k,v])=>{ const d=Math.hypot(p.x-v.x,p.y-v.y); if(d<bd){bd=d; best=k;} }); return best; }
  down(e){ const p=this.pos(e); const h=this.nearestHandle(p); if(h){this.dragHandle=h; return;} if(this.tool==='vp') return; this.drawing=true; this.current={tool:this.tool,color:$('#brushColor').value,size:+$('#brushSize').value,points:[p]}; this.strokes.push(this.current); }
  move(e){ const p=this.pos(e); if(this.dragHandle){ this.vps[this.dragHandle]=p; if(this.dragHandle==='vp1'||this.dragHandle==='vp2'){ const dy=p.y-(this.dragHandle==='vp1'?this.vps.vp2.y:this.vps.vp1.y); if(Math.abs(dy)<60){ this.vps.vp1.y=p.y; this.vps.vp2.y=p.y; } } this.draw(); return; } if(this.drawing){ this.current.points.push(p); this.draw(); } }
  up(){ this.drawing=false; this.dragHandle=null; }
  draw(){ const ctx=this.ctx; if(!ctx)return; ctx.clearRect(0,0,this.w,this.h); ctx.fillStyle='#fffdf8'; ctx.fillRect(0,0,this.w,this.h); if(this.img){ const scale=Math.max(this.w/this.img.width,this.h/this.img.height); const iw=this.img.width*scale, ih=this.img.height*scale; ctx.globalAlpha=.55; ctx.drawImage(this.img,(this.w-iw)/2,(this.h-ih)/2,iw,ih); ctx.globalAlpha=1; } this.drawGrid(); this.strokes.forEach(s=>this.drawStroke(s)); this.drawHandles(); }
  drawGrid(){ const ctx=this.ctx, n=+$('#gridDensity')?.value||10, a=+$('#gridAlpha')?.value||.55; ctx.save(); ctx.globalAlpha=a; ctx.strokeStyle='#56c2d7'; ctx.lineWidth=1; ctx.setLineDash([7,6]); const horizon=(this.vps.vp1.y+this.vps.vp2.y)/2; ctx.beginPath(); ctx.moveTo(0,horizon); ctx.lineTo(this.w,horizon); ctx.stroke(); const bottomY=this.h; if(this.mode==='1p'){ const vp={x:this.w*.5,y:horizon}; for(let i=0;i<=n;i++){ const x=i*this.w/n; line(ctx,x,bottomY,vp.x,vp.y);} for(let i=0;i<n;i++){ const y=horizon+(this.h-horizon)*Math.pow(i/n,1.65); line(ctx,0,y,this.w,y);} }
    if(this.mode==='2p' || this.mode==='3p'){ for(let i=0;i<=n;i++){ const x=i*this.w/n; line(ctx,x,bottomY,this.vps.vp1.x,this.vps.vp1.y); line(ctx,x,bottomY,this.vps.vp2.x,this.vps.vp2.y);} for(let x=0;x<=this.w;x+=this.w/n){ line(ctx,x,this.h*.18,x,this.h); } }
    if(this.mode==='3p'){ ctx.strokeStyle='#8e84df'; for(let x=0;x<=this.w;x+=this.w/n){ line(ctx,x,this.h,this.vps.vp3.x,this.vps.vp3.y);} }
    ctx.restore(); }
  drawHandles(){ const ctx=this.ctx; const show=this.mode==='1p'?['vp1']:this.mode==='2p'?['vp1','vp2']:['vp1','vp2','vp3']; show.forEach(k=>{ const p=k==='vp1'&&this.mode==='1p'?{x:this.w*.5,y:this.vps.vp1.y}:this.vps[k]; ctx.save(); ctx.fillStyle=k==='vp3'?'#8e84df':'#56c2d7'; ctx.strokeStyle='white'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(p.x,p.y,12,0,TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle='#24313a'; ctx.font='12px '+getComputedStyle(document.body).fontFamily; ctx.fillText(k.toUpperCase(),p.x+15,p.y+4); ctx.restore(); }); }
  drawStroke(s){ const ctx=this.ctx; ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=s.size; ctx.strokeStyle=s.tool==='erase'?'#fffdf8':s.color; ctx.globalCompositeOperation=s.tool==='erase'?'destination-out':'source-over'; ctx.beginPath(); s.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.stroke(); ctx.restore(); }
  loadImage(e){ const file=e.target.files[0]; if(!file)return; const img=new Image(); img.onload=()=>{this.img=img; this.draw();}; img.src=URL.createObjectURL(file); }
  download(){ const a=document.createElement('a'); a.download='drawescape-perspective.png'; a.href=this.canvas.toDataURL('image/png'); a.click(); completeQuest('qdraw'); }
}
const perspectivePad = new PerspectivePad();
function line(ctx,x1,y1,x2,y2){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }

const colorLab = {
  inited:false, ensure(){ if(this.inited) return; this.inited=true; ['baseColor','valueRange','satRange'].forEach(id=>$('#'+id).addEventListener('input',()=>this.render())); this.render(); },
  render(){ const base=$('#baseColor').value; const hsv=hexToHsl(base); const s=+$('#satRange').value, l=+$('#valueRange').value; const h=hsv.h; const colors=[{n:'固有色',c:hsl(h,s,l)},{n:'互补色',c:hsl(h+180,s,Math.max(35,l-8))},{n:'邻近冷',c:hsl(h-32,Math.max(25,s-8),l+4)},{n:'邻近暖',c:hsl(h+32,Math.max(25,s-8),l+4)},{n:'高光色',c:hsl(h+18,Math.max(20,s-22),92)},{n:'环境暗色',c:hsl(h+210,Math.max(20,s-35),28)}]; $('#paletteGrid').innerHTML=colors.map(o=>`<button class="swatch" style="background:${o.c}" data-color="${o.c}"><b>${o.n}</b><span>${o.c}</span></button>`).join(''); $$('.swatch').forEach(b=>b.addEventListener('click',()=>{ $('#brushColor').value = rgbToHex(b.dataset.color); toast('已同步到透视画布画笔颜色'); })); $('#sphereDemo').style.background=`radial-gradient(circle at 34% 26%, ${colors[4].c}, transparent 9%), radial-gradient(circle at 44% 38%, ${colors[0].c}, ${colors[5].c} 74%)`; $('#colorExplain').textContent='绘画配色可以理解成通道合成：固有色负责身份，光照色负责方向，环境色负责空间，高光负责材质，暗色负责体积。'; $('#channelStack').innerHTML=[['固有色','物体在白光下的基本颜色'],['光照色','光源给亮部添加的偏色'],['环境色','天空、墙面、水面反弹到暗部的颜色'],['高光色','材质和视角共同决定的亮斑'],['大气/深度','远处降低饱和、明度和对比']].map((c,i)=>`<div class="channel" style="border-left:8px solid ${colors[i%colors.length].c}"><b>${c[0]}</b><small>${c[1]}</small></div>`).join(''); completeQuest('qcolor'); }
};
function hexToHsl(hex){ hex=hex.replace('#',''); const r=parseInt(hex.slice(0,2),16)/255,g=parseInt(hex.slice(2,4),16)/255,b=parseInt(hex.slice(4,6),16)/255; const max=Math.max(r,g,b),min=Math.min(r,g,b); let h=0,s,l=(max+min)/2; if(max!==min){ const d=max-min; s=l>.5?d/(2-max-min):d/(max+min); switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;} h*=60;} return {h,s:s*100,l:l*100}; }
function hsl(h,s,l){ h=((h%360)+360)%360; return `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`; }
function rgbToHex(css){ const tmp=document.createElement('div'); tmp.style.color=css; document.body.appendChild(tmp); const m=getComputedStyle(tmp).color.match(/\d+/g); tmp.remove(); if(!m)return '#33424c'; return '#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''); }

class FlowLab{
  constructor(){ this.inited=false; this.mode='wind'; this.dir={x:1,y:0}; this.particles=[]; }
  ensure(){ if(this.inited){this.resize(); return;} this.init(); }
  init(){ this.inited=true; this.canvas=$('#flowCanvas'); this.ctx=this.canvas.getContext('2d'); this.resize(); addEventListener('resize',()=>this.resize()); $$('[data-flow-mode]').forEach(b=>b.addEventListener('click',()=>{this.mode=b.dataset.flowMode; $$('[data-flow-mode]').forEach(x=>x.classList.toggle('active',x===b)); this.reset();})); ['flowSpeed','flowTurb','flowDensity'].forEach(id=>$('#'+id).addEventListener('input',()=>this.reset())); this.canvas.addEventListener('pointermove',e=>{ if(e.buttons){ const p=this.pos(e); this.dir={x:(p.x-this.w/2)/(this.w/2),y:(p.y-this.h/2)/(this.h/2)}; } }); this.reset(); this.loop(); }
  resize(){ const r=this.canvas.parentElement.getBoundingClientRect(), d=devicePixelRatio||1; this.w=r.width; this.h=r.height; this.canvas.width=this.w*d; this.canvas.height=this.h*d; this.ctx.setTransform(d,0,0,d,0,0); this.reset(); }
  pos(e){ const r=this.canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  reset(){ const n=+$('#flowDensity')?.value||110; this.particles=Array.from({length:n},()=>({x:Math.random()*this.w,y:Math.random()*this.h,a:Math.random()*TAU,life:Math.random()})); }
  loop(){ requestAnimationFrame(()=>this.loop()); if(!this.inited)return; const ctx=this.ctx, speed=+$('#flowSpeed').value, turb=+$('#flowTurb').value; ctx.fillStyle=this.mode==='water'?'rgba(239,251,255,.18)':'rgba(255,248,237,.18)'; ctx.fillRect(0,0,this.w,this.h); this.drawField(ctx,speed,turb); }
  drawField(ctx,speed,turb){ const cx=this.w/2, cy=this.h/2; ctx.save(); ctx.lineWidth=1.4; const rock={x:this.w*.53,y:this.h*.55,r:52}; if(this.mode==='water'){ ctx.fillStyle='rgba(51,66,76,.72)'; ctx.beginPath(); ctx.ellipse(rock.x,rock.y,rock.r*1.05,rock.r*.75,0,0,TAU); ctx.fill(); }
    this.particles.forEach(p=>{ let dx=this.dir.x, dy=this.dir.y; const dxr=p.x-rock.x, dyr=p.y-rock.y, dist=Math.hypot(dxr,dyr); if(this.mode==='water' && dist<160){ const tang=Math.atan2(dyr,dxr)+Math.PI/2; dx += Math.cos(tang)*(1-dist/170)*1.3; dy += Math.sin(tang)*(1-dist/170)*1.3; }
      if(this.mode==='smoke'){ dy-=.8; dx+=Math.sin(p.y*.02+p.a)*.35; }
      if(this.mode==='rain'){ dx=this.dir.x*.35; dy=1.4; }
      dx += Math.sin(p.y*.017+p.a)*turb*.25; dy += Math.cos(p.x*.015+p.a)*turb*.25; const len=this.mode==='rain'?28:38; const mag=Math.hypot(dx,dy)||1; dx/=mag; dy/=mag; ctx.strokeStyle=this.mode==='water'?'rgba(76,180,215,.55)':this.mode==='smoke'?'rgba(98,115,130,.35)':this.mode==='rain'?'rgba(86,194,215,.42)':'rgba(86,194,215,.55)'; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.quadraticCurveTo(p.x-dy*12,p.y+dx*12,p.x+dx*len,p.y+dy*len); ctx.stroke(); p.x += dx*speed*(this.mode==='rain'?3.2:2.2); p.y += dy*speed*(this.mode==='rain'?3.2:2.2); if(p.x<-80||p.x>this.w+80||p.y<-80||p.y>this.h+80){p.x=Math.random()*this.w; p.y=Math.random()*this.h;} });
    ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(cx+this.dir.x*90,cy+this.dir.y*90,10,0,TAU); ctx.fill(); ctx.strokeStyle='#ffd166'; ctx.lineWidth=3; line(ctx,cx,cy,cx+this.dir.x*90,cy+this.dir.y*90); ctx.restore(); if(this.mode==='wind') completeQuest('qwind'); }
}
const flowLab = new FlowLab();

initUI();
