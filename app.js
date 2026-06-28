/*
Drawescape｜绘梦境 V1
生成日期：2026-06-29
功能：面向 ND 群体的可视化绘画建模小游戏静态网页。
输入：鼠标/触摸、可选本地图片、localStorage。
输出：互动学习、绘画标注、PNG 导出、本地进度与笔记。
*/
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const TAU = Math.PI*2;
const STORAGE_KEY = 'drawescape-v1-state';
const DRAW_KEY = 'drawescape-v1-drawpad';
const NOTES_KEY = 'drawescape-v1-notes';

const palette = {
  graphite:'#33424c', perspective:'#58bfd6', depth:'#8e84df', normal:'#74c69d', light:'#ffd166', material:'#f29ba7', fluid:'#5bbad5', wind:'#b7d6ee', star:'#ffe08a', paper:'#fff8ed'
};

const zones = [
  {id:'line', icon:'〰️', name:'线之海', en:'Line Sea', color:'#33424c', tool:'拓扑线笔', core:'线不是装饰，而是空间结构留下的边界。', pain:'不知道线应该画在哪里。', game:'找出轮廓线、结构线、遮挡线和运动线。', exercise:'拿一个杯子，只画 7 条最能说明体积的线。', next:['proportion','camera']},
  {id:'proportion', icon:'🧭', name:'比例森林', en:'Proportion Forest', color:'#8db596', tool:'比例罗盘', core:'比例不是死背，是用一个单位锁定一组关系。', pain:'画什么都歪，局部越修越乱。', game:'看 4 秒锚点，隐藏后复原位置，得到误差热力图。', exercise:'用“一眼宽”复原一张脸的主要锚点。', next:['camera','depth']},
  {id:'camera', icon:'📐', name:'相机塔', en:'Camera Tower', color:'#58bfd6', tool:'透视眼镜', core:'透视就是相机把三维点投影到平面。', pain:'盒子、房间、街道总是透视不一致。', game:'拖动消失点，修复歪掉的盒子。', exercise:'在房间照片里找到视平线和两个消失点。', next:['depth','light']},
  {id:'depth', icon:'🌊', name:'深度湖', en:'Depth Lake', color:'#8e84df', tool:'深度灯笼', core:'深度图只记录距离，不等于阴影。', pain:'总把黑白、阴影、远近混在一起。', game:'把场景分成前景、中景、远景，再折叠成深度热力图。', exercise:'不画光影，只画一个石膏体的远近。', next:['light','fluid']},
  {id:'light', icon:'🌙', name:'光之月台', en:'Light Station', color:'#ffd166', tool:'法线罗盘', core:'明暗由表面朝向、光线方向和遮挡共同决定。', pain:'明暗交界线和高光总是凭感觉。', game:'拖动光源，看球体明暗和投影变化。', exercise:'给一个盒子标出朝光面、背光面、投影和 AO。', next:['material','fluid']},
  {id:'material', icon:'💎', name:'材质星市', en:'Material Bazaar', color:'#f29ba7', tool:'材质晶球', core:'材质是光和表面互动的规律，不是花纹。', pain:'皮肤、布料、金属、玻璃看起来都像塑料。', game:'调粗糙度、金属度、透光，观察高光和边缘反射。', exercise:'同一个苹果画成陶瓷、玻璃和皮肤三种质感。', next:['wind','fold']},
  {id:'wind', icon:'🍃', name:'风的剧场', en:'Wind Theater', color:'#b7d6ee', tool:'风向羽毛', core:'风不可见，只能通过物体的变形证据被看见。', pain:'头发、衣摆、飘带、树叶没有方向感。', game:'拖动风向，让头发、布、烟、叶子一起反应。', exercise:'画 5 条线表达一阵从左向右的风。', next:['fluid','fold']},
  {id:'fluid', icon:'💧', name:'流体之谷', en:'Fluid Valley', color:'#5bbad5', tool:'流线贝壳', core:'水、烟、云、火没有固定轮廓，只有力场、密度、边缘和节奏。', pain:'水、烟、云、雨总是像乱线。', game:'点击水滴生成波纹，观察水流绕石头形成涡线。', exercise:'只保留 6 条线，表达水从石头旁流过。', next:['fold']},
  {id:'fold', icon:'🌈', name:'折叠云城', en:'Folding Cloud City', color:'#c89af7', tool:'世界折叠器', core:'风格是选择保留哪些信息、舍弃哪些信息。', pain:'复杂画面不知道该简化什么。', game:'调压缩率，把照片变成线稿、明暗块、色块和符号。', exercise:'把一个复杂场景压缩成 5 条线、3 个明暗块、4 个色块。', next:[]}
];
const zoneMap = Object.fromEntries(zones.map(z=>[z.id,z]));

const routes = [
  {name:'今日 10 分钟路线', path:['line','proportion','camera'], desc:'只练：线、比例、透视，不打开过多内容。'},
  {name:'光影推理路线', path:['depth','light','material'], desc:'先分远近，再判断法线和材质。'},
  {name:'风水流体路线', path:['wind','fluid','fold'], desc:'用力场、密度、边缘和节奏画不可见的运动。'},
  {name:'完整世界折叠路线', path:['line','proportion','camera','depth','light','material','wind','fluid','fold'], desc:'从结构到风格输出，组装脑内渲染器。'}
];

const lessons = [
  {id:'world', title:'绘画 = 建模 + 投影 + 渲染 + 折叠', zone:'line', lead:'Drawescape 不是让你背技巧，而是让你获得一套看见世界结构的方法。', body:['现实是连续、复杂、充满噪声的三维世界。绘画把它折叠成平面时，必须选择：哪些点要保留，哪些线能说明结构，哪些光影能说明体积，哪些颜色能说明情绪。','所以绘画不是复制现实，而是可控的信息压缩。你越懂结构，就越能自由地简化。'], exercise:'今天只画一个物体，不追求好看，只标出 5 个锚点、3 条结构线、1 个光源方向。'},
  {id:'anchors', title:'比例记忆：把对象变成锚点网络', zone:'proportion', lead:'画不准通常不是手的问题，而是锚点关系没有稳定。', body:['锚点是结构中的关键点：头顶、下巴、眼线、鼻底、肩峰、骨盆角、杯口左右端。','比例记忆不是记住绝对长度，而是记住“谁和谁对齐”“谁是单位”“谁比谁长一点”。'], exercise:'看一个杯子 5 秒，遮住参考后只复原杯口、杯底、杯把 6 个点。'},
  {id:'camera', title:'透视：你其实是在移动相机', zone:'camera', lead:'一点、两点、三点透视都可以从相机和空间平行线理解。', body:['视平线接近你的眼睛高度；消失点是空间中平行方向在画面上的汇聚。','广角会夸张近大远小，长焦会压缩空间。画面不稳定时，先不要修细节，先修相机。'], exercise:'在纸上画一个盒子，延长边线，看它们是否能回到同一组消失点。'},
  {id:'depth', title:'深度图：先画远近，不画阴影', zone:'depth', lead:'深度图只回答一个问题：这个点离观察者有多远？', body:['初学者很容易把暗处当远处、亮处当近处。但阴影来自光，深度来自距离，它们是两张不同的图。','把一切颜色和光影暂时拿掉，只标前景、中景、远景，空间会突然清楚。'], exercise:'用三种颜色标记一张照片的前景、中景、远景。'},
  {id:'normal', title:'法线罗盘：明暗是表面朝向的证据', zone:'light', lead:'同一个颜色的物体，因为表面朝向不同，会呈现不同明暗。', body:['法线可以理解为表面伸出来的一根小箭头。它越朝向光源，越亮；越背离光源，越暗。','明暗交界线不是固定位置，而是法线和光线关系变化的结果。'], exercise:'画一个球，先画出光源箭头，再标出最亮点、交界线、投影和反光。'},
  {id:'material', title:'材质：高光形状就是线索', zone:'material', lead:'材质不是“贴图”，而是表面如何处理光。', body:['光滑表面高光小而亮，粗糙表面高光大而散。金属更像环境镜子，皮肤会有柔和透光。','画材质时先问：它反射强吗？粗糙吗？透明吗？会不会吸收和散射光？'], exercise:'画三个同样的球：陶瓷球、金属球、皮肤球，只改变高光和边缘反射。'},
  {id:'wind', title:'风：看不见的力，用可见的变形表达', zone:'wind', lead:'风不是物体，而是物体变形后的证据链。', body:['头发、衣摆、树叶、烟、雨都能显示风向。固定点越稳定，自由端越明显地顺风飘动。','画风时先画力的方向，再画材料反应，最后只保留最有节奏的线。'], exercise:'画一条飘带，只用 3 条 S 曲线表达风向。'},
  {id:'fluid', title:'水与流体：没有轮廓，只有流线和密度', zone:'fluid', lead:'水、烟、云、火最难，因为它们一直在变。', body:['流体需要用节奏、边缘、透明度、反射和密度表达。水绕过石头会出现堆积、加速、涡流和泡沫。','不要追每个波纹，只要保留能说明运动方向和空间层次的线。'], exercise:'画水流绕石头：只画前方堆积、两侧加速、后方涡流。'},
  {id:'fold', title:'信息折叠：风格就是压缩规则', zone:'fold', lead:'写实、动漫、图解不是高低之分，而是不同压缩率。', body:['写实保留更多光影和材质；动漫保留轮廓、表情和色块；图解保留结构关系；符号化保留最小识别特征。','真正的绘画能力，是知道什么时候保留，什么时候省略。'], exercise:'把一个复杂物体分别压缩成：5 条线、3 个明暗块、4 个色块。'}
];


const sourceCards = [
  {tag:'CG', title:'渲染管线 / 深度 / 法线 / 材质通道', use:'帮助把绘画拆成可检查的图层：几何、相机、光照、材质。'},
  {tag:'CV', title:'针孔相机 / 单目深度 / 多视角几何', use:'解释透视、视平线、消失点和从多个视角推断形体。'},
  {tag:'3D', title:'Blender / Rhino / SketchUp 建模思维', use:'把线稿理解为轮廓、截面、路径、体块和可编辑对象。'},
  {tag:'ART', title:'素描 / 色彩 / 构成 / 动态速写', use:'把传统经验变成可视化练习：锚点、边界、明暗块和节奏。'},
  {tag:'ND', title:'低负荷学习 / 游戏化反馈 / 本地笔记', use:'降低过载，用短关卡、明确反馈和可保存进度替代“多练练”。'}
];

let state = loadState();
let currentPage = state.page || 'home';
let activeZone = state.activeZone || 'line';
let activeLesson = state.activeLesson || 'world';
let activeLab = state.activeLab || 'proportion';
let notes = loadJSON(NOTES_KEY, {});

function loadJSON(key, fallback){
  try{return JSON.parse(localStorage.getItem(key)) || fallback}catch(e){return fallback}
}
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function loadState(){ return loadJSON(STORAGE_KEY, {xp:0, done:{}, page:'home', activeZone:'line'}); }
function saveState(){ state.page=currentPage; state.activeZone=activeZone; state.activeLab=activeLab; state.activeLesson=activeLesson; saveJSON(STORAGE_KEY,state); }
function addXP(n, label='获得星尘'){
  state.xp = (state.xp||0) + n;
  saveState();
  toast(`${label} +${n} ✨｜总星尘 ${state.xp}`);
  renderSideActive();
}
function toast(msg){
  const old=$('.toast'); if(old) old.remove();
  const div=document.createElement('div'); div.className='toast'; div.textContent=msg; document.body.appendChild(div);
  setTimeout(()=>div.remove(),2200);
}
function go(page){ currentPage=page; saveState(); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function setTheme(name){ document.body.classList.remove('theme-paper','theme-night','theme-geo'); document.body.classList.add(name); state.theme=name; saveState(); }
function toggleLowLang(){ document.body.classList.toggle('lowLang'); state.lowLang=document.body.classList.contains('lowLang'); saveState(); }
function toggleMotion(){ document.body.classList.toggle('lowMotion'); state.lowMotion=document.body.classList.contains('lowMotion'); saveState(); }
function toggleFocus(){ document.body.classList.toggle('focus'); }

function render(){
  document.body.classList.remove('theme-paper','theme-night','theme-geo'); document.body.classList.add(state.theme||'theme-paper');
  document.body.classList.toggle('lowLang', !!state.lowLang);
  document.body.classList.toggle('lowMotion', !!state.lowMotion);
  $('#app').innerHTML = `
    <div class="shell">
      <aside class="side">${sideHTML()}</aside>
      <main class="main">
        <div class="topbar">
          <div class="crumbs"><span class="crumb">Drawescape</span><span class="crumb">${pageName(currentPage)}</span><span class="crumb">星尘 ${state.xp||0}</span></div>
          <div class="ctaRow" style="margin:0"><button class="miniBtn" onclick="toggleFocus()">🟨 聚焦</button><button class="miniBtn" onclick="go('quest')">今日一小关</button></div>
        </div>
        ${pageHTML(currentPage)}
      </main>
    </div>
    <nav class="bottomNav">
      <button onclick="go('home')"><span>🌌</span>首页</button>
      <button onclick="go('map')"><span>🗺️</span>地图</button>
      <button onclick="go('scan')"><span>🔎</span>扫描</button>
      <button onclick="go('labs')"><span>🧪</span>互动</button>
      <button onclick="go('model')"><span>🧊</span>建模</button>
      <button onclick="go('draw')"><span>✏️</span>绘画</button>
    </nav>
    <div class="focusBand"></div>`;
  renderSideActive();
  requestAnimationFrame(()=>initPage(currentPage));
}
function pageName(p){ return {home:'入口',map:'绘境地图',quest:'今日一小关',scan:'扫描模式',labs:'互动实验室',model:'线稿建模桥',draw:'自由绘画台',reader:'章节阅读',progress:'进度笔记'}[p]||p; }
function navItem(id,icon,label){ return `<button data-nav="${id}" onclick="go('${id}')"><span>${icon}</span><b>${label}</b></button>`; }
function sideHTML(){
  return `<div class="brand"><div class="brandMark">✦</div><div><h1>Drawescape</h1><small>绘梦境｜Starcove Drawing Lab</small></div></div>
  <nav class="nav">
    ${navItem('home','🌌','世界入口')}
    ${navItem('map','🗺️','绘境地图')}
    ${navItem('quest','⭐','今日一小关')}
    ${navItem('scan','🔎','扫描模式')}
    ${navItem('labs','🧪','互动实验室')}
    ${navItem('model','🧊','线稿建模桥')}
    ${navItem('draw','✏️','自由绘画台')}
    ${navItem('reader','📖','章节阅读')}
    ${navItem('progress','📝','进度笔记')}
  </nav>
  <div class="sideTools">
    <div class="tiny">绘画不是复制现实，而是把现实拆层、推理、折叠、重组成平面。</div>
    <div class="toolGrid">
      <button class="ghostBtn" onclick="setTheme('theme-paper')">📄 纸白</button>
      <button class="ghostBtn" onclick="setTheme('theme-night')">🌙 睡前</button>
      <button class="ghostBtn" onclick="setTheme('theme-geo')">📐 几何</button>
      <button class="ghostBtn" onclick="toggleLowLang()">🫧 极简</button>
      <button class="ghostBtn" onclick="toggleMotion()">🪶 低动</button>
      <button class="ghostBtn" onclick="toggleFocus()">🟨 聚焦</button>
    </div>
  </div>`;
}
function renderSideActive(){ $$('[data-nav]').forEach(b=>b.classList.toggle('active', b.dataset.nav===currentPage)); }
function pageHTML(p){
  if(p==='home') return homeHTML();
  if(p==='map') return mapHTML();
  if(p==='quest') return questHTML();
  if(p==='scan') return scanHTML();
  if(p==='labs') return labsHTML();
  if(p==='model') return modelHTML();
  if(p==='draw') return drawHTML();
  if(p==='reader') return readerHTML();
  if(p==='progress') return progressHTML();
  return homeHTML();
}
function initPage(p){
  if(p==='home') initHero();
  if(p==='map') initMap();
  if(p==='quest') initQuest();
  if(p==='scan') initScan();
  if(p==='labs') initLabs();
  if(p==='model') initModelBridge();
  if(p==='draw') initDrawPad();
  if(p==='reader') initReader();
  if(p==='progress') renderSavedSketches();
}

function homeHTML(){
  return `<section class="hero cinematicHero"><div class="portal"><div class="heroStage megaStage"><canvas id="heroCanvas"></canvas><div class="scanHud"><span>SCAN</span><b>结构层 · 透视层 · 深度层 · 材质层</b></div><div class="portalBadge">World Folding Engine · V2</div></div><div class="heroCopy">
    <h1 class="title"><span>Drawescape</span><br/>绘梦境</h1>
    <p class="subtitle">一个把现实折叠成画的推理探索小游戏。</p>
    <p class="poem">你不是来“学会某种风格”的。你是来收集观察工具：拓扑线笔、比例罗盘、透视眼镜、深度灯笼、法线罗盘、材质晶球、风向羽毛、流线贝壳和世界折叠器。</p>
    <p class="poem deepText">每一关都在训练同一个能力：看见结构，抓住关系，推理光与力，然后把复杂现实压缩成清晰、美丽、可控制的平面。</p>
    <div class="coverStats"><span>09 星区</span><span>12 互动关卡</span><span>04 扫描图层组</span><span>线稿 → 模型桥</span></div>
    <div class="ctaRow"><button class="primary" onclick="go('quest')">开始今日一小关 ✨</button><button class="secondary" onclick="go('map')">进入绘境地图</button><button class="secondary" onclick="go('scan')">打开扫描模式</button><button class="secondary" onclick="go('model')">线稿变模型</button><button class="secondary" onclick="go('draw')">自由绘画台</button></div>
  </div></div></section>
  <section class="panel"><div class="pageTitle"><div><h2>这不是课程表，是一座绘画世界</h2><p>每个星区都对应一个绘画难点，也对应一个可操作小游戏。V2 加入了关卡选择、场景切换、原理讲解和线稿→模型桥。</p></div></div><div class="grid">${zones.map(z=>zoneCardHTML(z)).join('')}</div></section>`;
}
function zoneCardHTML(z){
  return `<article class="card" style="--accent:${z.color}"><h3>${z.icon} ${z.name}</h3><p>${z.core}</p><span class="tag">道具：${z.tool}</span><span class="tag">小游戏：${z.game.split('，')[0]}</span></article>`;
}

function mapHTML(){
  return `<section class="panel"><div class="pageTitle"><div><h2>绘境地图</h2><p>把绘画难点变成 9 个星区。点击节点，看它解决什么问题、获得什么工具、对应什么小游戏。</p></div><button class="primary" onclick="go('labs')">进入互动实验室</button></div>
  <div class="mapWrap"><div class="mapCanvasBox"><svg id="mapSvg" class="mapSvg" viewBox="0 0 920 620" role="img" aria-label="Drawescape 绘境地图"></svg></div><div class="detailBox" id="zoneDetail"></div></div></section>
  <section class="panel"><div class="pageTitle"><div><h2>路线胶囊</h2><p>一次只选一条路线，避免在地图里迷路。</p></div></div><div class="grid">${routes.map(r=>`<article class="card" style="--accent:#58bfd6"><h3>🧭 ${r.name}</h3><p>${r.desc}</p><p>${r.path.map(id=>zoneMap[id].name).join(' → ')}</p><button class="miniBtn" onclick="startRoute('${r.path[0]}')">从这里开始</button></article>`).join('')}</div></section>`;
}
function startRoute(id){ activeZone=id; currentPage='map'; saveState(); render(); }
function initMap(){ renderMap(); renderZoneDetail(activeZone); }
function renderMap(){
  const svg=$('#mapSvg'); if(!svg) return;
  const pts = {
    line:[95,140], proportion:[245,95], camera:[405,138], depth:[555,105], light:[740,150],
    material:[735,360], wind:[555,505], fluid:[370,475], fold:[170,390]
  };
  const edges = [['line','proportion'],['proportion','camera'],['camera','depth'],['depth','light'],['light','material'],['material','wind'],['wind','fluid'],['fluid','fold'],['fold','line'],['depth','fluid'],['camera','light'],['proportion','depth']];
  const defs = `<defs><filter id="softGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const bg = `<path d="M80 520 C210 160, 650 30, 830 270 C1010 520, 430 650, 120 420" fill="none" stroke="rgba(88,191,214,.16)" stroke-width="34" stroke-linecap="round"/>
  <path d="M90 150 C250 80, 420 140, 560 100 S760 80, 790 160" fill="none" stroke="rgba(255,209,102,.22)" stroke-width="2" stroke-dasharray="8 9"/>
  <path d="M160 390 C300 480, 450 530, 560 505 S720 420, 735 360" fill="none" stroke="rgba(242,155,167,.20)" stroke-width="2" stroke-dasharray="8 9"/>`;
  const edgeHTML = edges.map(([a,b])=>{
    const [x1,y1]=pts[a], [x2,y2]=pts[b];
    const active = a===activeZone || b===activeZone;
    return `<path class="mapEdge ${active?'active':''}" d="M${x1} ${y1} C${(x1+x2)/2} ${y1-50}, ${(x1+x2)/2} ${y2+50}, ${x2} ${y2}"/>`;
  }).join('');
  const nodesHTML = zones.map(z=>{
    const [x,y]=pts[z.id]; const active = z.id===activeZone;
    return `<g class="mapNode" onclick="selectZone('${z.id}')" transform="translate(${x},${y})">
      <circle r="${active?43:36}" fill="${z.color}" opacity="${active?'.98':'.84'}" filter="url(#softGlow)"/>
      <text text-anchor="middle" y="-6" style="font-size:24px;stroke-width:0">${z.icon}</text>
      <text text-anchor="middle" y="48">${z.name}</text>
    </g>`;
  }).join('');
  svg.innerHTML = defs+bg+edgeHTML+nodesHTML;
}
function selectZone(id){ activeZone=id; saveState(); renderMap(); renderZoneDetail(id); }
function renderZoneDetail(id){
  const z=zoneMap[id]; if(!z||!$('#zoneDetail')) return;
  $('#zoneDetail').innerHTML=`<div class="detailIcon">${z.icon}</div><h3>${z.name}<br/><small>${z.en}</small></h3>
    <p><b>核心：</b>${z.core}</p><p><b>解决痛点：</b>${z.pain}</p><p><b>小游戏：</b>${z.game}</p><p><b>纸上练习：</b>${z.exercise}</p>
    <div class="hint"><b>获得道具：</b>${z.tool}<br/><span class="deepText">道具不是装饰，而是一种新的观察方式。</span></div>
    <div class="ctaRow"><button class="primary" onclick="activeLab='${labForZone(id)}';go('labs')">玩对应小游戏</button><button class="secondary" onclick="openLessonByZone('${id}')">读相关章节</button><button class="secondary" onclick="markZone('${id}')">完成这个星区 +20</button></div>`;
}
function labForZone(id){ return ({line:'folding',proportion:'proportion',camera:'perspective',depth:'depth',light:'light',material:'material',wind:'wind',fluid:'fluid',fold:'folding'})[id]||'proportion'; }
function openLessonByZone(id){ const l=lessons.find(x=>x.zone===id)||lessons[0]; activeLesson=l.id; go('reader'); }
function markZone(id){ state.done[id]=true; addXP(20, `${zoneMap[id].name} 已点亮`); renderZoneDetail(id); }

function questHTML(){
  return `<section class="panel"><div class="pageTitle"><div><h2>今日只做一小关</h2><p>短、明确、可完成。目标不是“画好”，而是校准一个观察能力。</p></div><button class="primary" onclick="newQuest()">换一个任务</button></div><div id="questBox"></div></section>
  <section class="panel"><div class="pageTitle"><div><h2>游戏循环</h2><p>看见 → 扫描 → 推理 → 折叠 → 绘制 → 校准。</p></div></div><div class="grid">
  ${['观察一个对象，不急着下笔','拆出锚点、线、面、深度、光','用几何/力/材质推理原因','只保留最有用的信息','画一笔或一个小结构','对比偏差，温柔修正'].map((t,i)=>`<article class="card" style="--accent:${Object.values(palette)[i%8]}"><h3>${i+1}. ${t}</h3><p>${['Observe','Scan','Infer','Fold','Draw','Calibrate'][i]}</p></article>`).join('')}
  </div></section>`;
}
function initQuest(){ renderQuest(); }
const questPool = [
  {title:'比例森林：5 秒锚点', zone:'proportion', steps:['看一个杯子或脸 5 秒。','遮住参考，只放 6 个锚点。','检查最高点、最低点、最宽点是否稳定。'], lab:'proportion'},
  {title:'相机塔：找视平线', zone:'camera', steps:['找一张房间/街道照片。','延长平行边线。','找到它们汇聚的位置。'], lab:'perspective'},
  {title:'深度湖：三层空间', zone:'depth', steps:['只标前景、中景、远景。','不要画阴影。','用三种颜色确认空间层次。'], lab:'depth'},
  {title:'光之月台：猜光源', zone:'light', steps:['选一个圆形物体。','标出最亮点、交界线、投影。','反推光源方向。'], lab:'light'},
  {title:'风的剧场：只画 5 条风线', zone:'wind', steps:['想象风从左向右。','画头发/飘带/树叶的变形。','只保留最有节奏的 5 条线。'], lab:'wind'},
  {title:'流体之谷：水绕过石头', zone:'fluid', steps:['画一个石头。','画水流被分开、加速、汇合。','只保留 6 条流线。'], lab:'fluid'},
  {title:'折叠云城：压缩到 5 条线', zone:'fold', steps:['选择一个复杂物体。','找出 5 条最重要的结构线。','删掉所有不服务结构的信息。'], lab:'folding'}
];
function renderQuest(){
  if(!state.quest) state.quest = questPool[Math.floor(Math.random()*questPool.length)];
  const q=state.quest, z=zoneMap[q.zone];
  $('#questBox').innerHTML=`<div class="quest"><div><span class="tag" style="border-color:${z.color}">${z.icon} ${z.name}</span><h3 style="font-size:30px;margin:.4rem 0">${q.title}</h3><ol>${q.steps.map(s=>`<li>${s}</li>`).join('')}</ol><div class="hint">完成标准：只要你能说清楚“我校准了哪个关系”，就算完成。</div></div><div class="ctaRow"><button class="primary" onclick="completeQuest()">完成 +15 ✨</button><button class="secondary" onclick="activeLab='${q.lab}';go('labs')">打开对应小游戏</button><button class="secondary" onclick="go('draw')">去绘画台</button></div></div>`;
}
function newQuest(){ state.quest = questPool[Math.floor(Math.random()*questPool.length)]; saveState(); renderQuest(); }
function completeQuest(){ addXP(15,'今日一小关完成'); newQuest(); }

const scanLayers = [
  {id:'base', name:'普通图像', color:palette.graphite, on:true},
  {id:'topology', name:'拓扑结构线', color:palette.graphite, on:true},
  {id:'perspective', name:'透视/相机线', color:palette.perspective, on:false},
  {id:'depth', name:'深度层', color:palette.depth, on:false},
  {id:'normal', name:'法线方向', color:palette.normal, on:false},
  {id:'light', name:'光照方向', color:palette.light, on:true},
  {id:'material', name:'材质标签', color:palette.material, on:false},
  {id:'wind', name:'风/运动线', color:palette.wind, on:false}
];
function scanHTML(){
  return `<section class="panel"><div class="pageTitle"><div><h2>扫描模式</h2><p>像“结构侦探”一样看图：同一个对象可以拆成结构、透视、深度、法线、光、材质和运动层。</p></div><button class="primary" onclick="awardScan()">完成一次扫描 +10</button></div>
  <div class="scanGrid"><div class="scanBox"><canvas id="scanCanvas" class="scanCanvas"></canvas></div><div class="controlPanel"><h3>扫描层</h3><div id="scanLayers" class="layers"></div><div class="hint" id="scanHint"></div></div></div></section>`;
}
function initScan(){ renderScanLayers(); resizeCanvas($('#scanCanvas')); drawScan(); }
function renderScanLayers(){
  const box=$('#scanLayers'); if(!box) return;
  box.innerHTML=scanLayers.map(l=>`<button class="layerBtn ${l.on?'on':''}" onclick="toggleScanLayer('${l.id}')"><span><b style="color:${l.color}">●</b> ${l.name}</span><span>${l.on?'开':'关'}</span></button>`).join('');
  $('#scanHint').innerHTML='建议先只开“普通图像 + 拓扑结构线”，再逐步叠加深度、法线、光照。这样不会过载。';
}
function toggleScanLayer(id){ const l=scanLayers.find(x=>x.id===id); l.on=!l.on; renderScanLayers(); drawScan(); }
function awardScan(){ addXP(10,'扫描完成'); }
function drawScan(){
  const c=$('#scanCanvas'); if(!c) return; const ctx=c.getContext('2d'); resizeCanvas(c); const w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h); ctx.save();
  ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--paper2')||'#fff'; ctx.fillRect(0,0,w,h);
  // soft background grid
  ctx.strokeStyle='rgba(88,191,214,.12)'; ctx.lineWidth=1; for(let x=0;x<w;x+=40){line(ctx,x,0,x,h)} for(let y=0;y<h;y+=40){line(ctx,0,y,w,y)}
  const on=id=>scanLayers.find(l=>l.id===id)?.on;
  const cx=w*.5, cy=h*.56, s=Math.min(w,h)/520;
  if(on('depth')){ const grad=ctx.createRadialGradient(cx-60*s,cy-20*s,20*s,cx,cy,250*s); grad.addColorStop(0,'rgba(255,255,255,.15)'); grad.addColorStop(.4,'rgba(142,132,223,.24)'); grad.addColorStop(1,'rgba(91,186,213,.18)'); ctx.fillStyle=grad; ellipse(ctx,cx,cy,220*s,170*s,0,true); }
  if(on('base')){
    ctx.fillStyle='rgba(255,246,230,.95)'; ellipse(ctx,cx,cy,160*s,120*s,0,true);
    ctx.fillStyle='rgba(255,221,170,.95)'; ellipse(ctx,cx-45*s,cy-55*s,74*s,58*s,-.4,true);
    ctx.fillStyle='rgba(247,190,170,.75)'; ellipse(ctx,cx+90*s,cy+10*s,54*s,85*s,.3,true);
    ctx.fillStyle='rgba(96,119,132,.16)'; ellipse(ctx,cx+10*s,cy+112*s,185*s,28*s,0,true);
  }
  if(on('topology')){
    ctx.strokeStyle=palette.graphite; ctx.lineWidth=3*s; ctx.lineCap='round'; ctx.lineJoin='round';
    ellipse(ctx,cx,cy,160*s,120*s,0,false); ellipse(ctx,cx-45*s,cy-55*s,74*s,58*s,-.4,false); ellipse(ctx,cx+90*s,cy+10*s,54*s,85*s,.3,false);
    ctx.strokeStyle='rgba(51,66,76,.62)'; ctx.lineWidth=2*s; ellipse(ctx,cx,cy,160*s,38*s,0,false); ellipse(ctx,cx,cy,70*s,118*s,0,false);
    bez(ctx,cx-150*s,cy-20*s,cx-70*s,cy-80*s,cx+65*s,cy-85*s,cx+155*s,cy-20*s);
    dot(ctx,cx-160*s,cy,5*s,palette.graphite); dot(ctx,cx,cy-120*s,5*s,palette.graphite); dot(ctx,cx+160*s,cy,5*s,palette.graphite);
  }
  if(on('perspective')){
    const vpX=w*.88, vpY=h*.28; ctx.strokeStyle='rgba(88,191,214,.65)'; ctx.lineWidth=2*s; ctx.setLineDash([8*s,8*s]);
    [[cx-160*s,cy],[cx+160*s,cy],[cx,cy-120*s],[cx,cy+120*s]].forEach(p=>line(ctx,p[0],p[1],vpX,vpY)); ctx.setLineDash([]); dot(ctx,vpX,vpY,8*s,palette.perspective); label(ctx,'消失点',vpX+12*s,vpY-8*s,palette.perspective);
  }
  if(on('normal')){
    ctx.strokeStyle=palette.normal; ctx.lineWidth=2*s; const pts=[[cx-100,cy-40, -0.8,-0.35],[cx,cy-80,0,-.8],[cx+90,cy-20,.65,-.2],[cx-30,cy+50,-.2,.55]];
    pts.forEach(([x,y,dx,dy])=>arrow(ctx,x*s/s,y*s/s,x+dx*60*s,y+dy*60*s,palette.normal,2*s)); label(ctx,'法线 = 表面朝向',cx-170*s,cy-155*s,palette.normal);
  }
  if(on('light')){ arrow(ctx,w*.18,h*.18,cx-60*s,cy-85*s,palette.light,5*s); label(ctx,'光源',w*.18+12*s,h*.18-8*s,palette.light); ctx.fillStyle='rgba(255,209,102,.12)'; ellipse(ctx,cx-60*s,cy-70*s,70*s,50*s,-.3,true); }
  if(on('material')){ label(ctx,'暖纸/皮肤式漫反射',cx-210*s,cy+145*s,palette.material); label(ctx,'半透明高光',cx+80*s,cy-80*s,palette.material); label(ctx,'AO 接触暗部',cx+45*s,cy+115*s,palette.material); }
  if(on('wind')){ ctx.strokeStyle='rgba(183,214,238,.72)'; ctx.lineWidth=3*s; for(let i=0;i<5;i++){ const y=h*.22+i*58*s; bez(ctx,w*.06,y,w*.25,y-40*s,w*.42,y+35*s,w*.70,y-5*s); } label(ctx,'风/运动线',w*.08,h*.16,palette.wind); }
  ctx.restore();
}

const labs = [
  {id:'proportion', name:'比例记忆', icon:'🧭', zone:'proportion'},
  {id:'perspective', name:'透视修复', icon:'📐', zone:'camera'},
  {id:'depth', name:'深度湖', icon:'🌊', zone:'depth'},
  {id:'light', name:'法线光照', icon:'🌙', zone:'light'},
  {id:'material', name:'材质星球', icon:'💎', zone:'material'},
  {id:'wind', name:'风的剧场', icon:'🍃', zone:'wind'},
  {id:'fluid', name:'流体之谷', icon:'💧', zone:'fluid'},
  {id:'folding', name:'信息折叠', icon:'🌈', zone:'fold'}
];
const labState = {
  proportion:{show:true,target:null,user:null,score:null},
  perspective:{vpX:.74,vpY:.28,tilt:.12,score:62},
  depth:{brush:1,grid:null,score:0},
  light:{lx:.22,ly:.2,shadow:.65},
  material:{rough:.35,metal:.15,sss:.28},
  wind:{angle:0,strength:.55,turb:.25},
  fluid:{flow:.55,ripples:[]},
  folding:{level:3}
};
function labsHTML(){
  return `<section class="panel"><div class="pageTitle"><div><h2>互动实验室</h2><p>每个小游戏只训练一个绘画推理能力。先玩，再画一笔。</p></div><button class="primary" onclick="completeLab()">完成本实验 +12</button></div>
  <div class="labTabs">${labs.map(l=>`<button class="${activeLab===l.id?'active':''}" onclick="setLab('${l.id}')">${l.icon} ${l.name}</button>`).join('')}</div>
  <div class="twoCol"><div class="labStage"><canvas id="labCanvas" class="stageCanvas"></canvas></div><div class="controlPanel" id="labControls"></div></div></section>`;
}
function setLab(id){ activeLab=id; saveState(); render(); }
function initLabs(){ renderLabControls(); const c=$('#labCanvas'); resizeCanvas(c); attachLabEvents(c); drawLab(); }
function renderLabControls(){
  const box=$('#labControls'); if(!box) return; const lab=labs.find(l=>l.id===activeLab);
  const common=`<h3>${lab.icon} ${lab.name}</h3><p class="tiny">${zoneMap[lab.zone].core}</p>`;
  const controls={
    proportion: `${common}<div class="hint">看见目标锚点 → 隐藏 → 拖动自己的锚点复原比例。误差不是失败，是校准线索。</div><div class="ctaRow"><button class="primary" onclick="resetProportion()">新图形</button><button class="secondary" onclick="togglePropTarget()">显示/隐藏目标</button><button class="secondary" onclick="scoreProportion()">计算误差</button></div><div id="propScore" class="hint">准备开始。</div>`,
    perspective: `${common}${range('vpX','消失点X',labState.perspective.vpX,0.15,0.95)}${range('vpY','消失点Y',labState.perspective.vpY,0.08,0.75)}${range('tilt','倾斜误差',labState.perspective.tilt,-0.35,0.35)}<div class="hint">目标：让盒子的边线能回到同一个消失点。倾斜误差越小，空间越稳定。</div>`,
    depth: `${common}<div class="hint">点击格子切换深度：近 / 中 / 远。只判断距离，不判断阴影。</div><div class="ctaRow"><button class="secondary" onclick="labState.depth.brush=0;drawLab()">前景</button><button class="secondary" onclick="labState.depth.brush=1;drawLab()">中景</button><button class="secondary" onclick="labState.depth.brush=2;drawLab()">远景</button><button class="secondary" onclick="resetDepthGrid()">重置</button></div>`,
    light: `${common}${range('lx','光源X',labState.light.lx,0.02,0.98)}${range('ly','光源Y',labState.light.ly,0.02,0.8)}${range('shadow','投影强度',labState.light.shadow,0,1)}<div class="hint">拖动光源，看最亮点、明暗交界线、投影和反光一起移动。</div>`,
    material: `${common}${range('rough','粗糙度',labState.material.rough,0,1)}${range('metal','金属度',labState.material.metal,0,1)}${range('sss','透光/SSS',labState.material.sss,0,1)}<div class="hint">粗糙度控制高光宽度；金属度控制环境反射；SSS 让边缘和暗部更柔和发暖。</div>`,
    wind: `${common}${range('angle','风向角',labState.wind.angle,-1,1)}${range('strength','风强度',labState.wind.strength,0,1)}${range('turb','扰动',labState.wind.turb,0,1)}<div class="hint">风本身不可见。你画的是头发、衣摆、叶子、烟雾对风的反应。</div>`,
    fluid: `${common}${range('flow','水流速度',labState.fluid.flow,0,1)}<div class="ctaRow"><button class="secondary" onclick="addRipple()">落下一滴水</button><button class="secondary" onclick="labState.fluid.ripples=[];drawLab()">清空波纹</button></div><div class="hint">水绕过石头：前方堆积、两侧加速、后方涡流。不要画每条水，画流动证据。</div>`,
    folding: `${common}${range('level','压缩率',labState.folding.level,1,5,1)}<div class="hint">1 = 写实信息多；5 = 极简符号。风格就是压缩规则。</div>`
  };
  box.innerHTML=controls[activeLab]||common;
}
function range(key,label,value,min,max,step=.01){ return `<label class="control"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" oninput="labRange('${key}',this.value)"><b>${Number(value).toFixed(step===1?0:2)}</b></label>`; }
function labRange(key,val){ val=Number(val); const s=labState[activeLab]; s[key]=val; renderLabControls(); drawLab(); }
function completeLab(){ const lab=labs.find(l=>l.id===activeLab); state.done[`lab-${activeLab}`]=true; addXP(12, `${lab.name} 完成`); }
function drawLab(){
  const c=$('#labCanvas'); if(!c) return; resizeCanvas(c); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); drawStageBg(ctx,c.width,c.height);
  ({proportion:drawProportion,perspective:drawPerspective,depth:drawDepth,light:drawLight,material:drawMaterial,wind:drawWind,fluid:drawFluid,folding:drawFolding}[activeLab]||drawProportion)(ctx,c.width,c.height);
}
function attachLabEvents(c){
  c.onpointerdown = e => handleLabPointer(e,c);
  c.onpointermove = e => { if(e.buttons) handleLabPointer(e,c,true); };
}
function handleLabPointer(e,c,move=false){
  const p=canvasPoint(e,c), w=c.width,h=c.height;
  if(activeLab==='proportion'){
    ensureProp(); const pts=labState.proportion.user; let idx=0, best=1e9; pts.forEach((pt,i)=>{ const d=(pt.x*w-p.x)**2+(pt.y*h-p.y)**2; if(d<best){best=d;idx=i} }); pts[idx]={x:p.x/w,y:p.y/h}; labState.proportion.score=null; drawLab();
  } else if(activeLab==='depth'){
    ensureDepth(); const gx=Math.floor(p.x/(w/7)), gy=Math.floor(p.y/(h/5)); if(gx>=0&&gx<7&&gy>=0&&gy<5){ labState.depth.grid[gy][gx]=labState.depth.brush; drawLab(); }
  } else if(activeLab==='fluid' && !move){
    labState.fluid.ripples.push({x:p.x/w,y:p.y/h,r:0}); drawLab();
  }
}
function ensureProp(){
  const s=labState.proportion; if(!s.target){
    s.target=[{x:.33,y:.25},{x:.55,y:.22},{x:.68,y:.42},{x:.62,y:.68},{x:.38,y:.72},{x:.25,y:.48}];
    s.user=s.target.map(p=>({x:p.x+(Math.random()-.5)*.18,y:p.y+(Math.random()-.5)*.18}));
  }
}
function resetProportion(){ labState.proportion.target=null; labState.proportion.score=null; ensureProp(); drawLab(); renderLabControls(); }
function togglePropTarget(){ labState.proportion.show=!labState.proportion.show; drawLab(); }
function scoreProportion(){ ensureProp(); const s=labState.proportion; let err=0; s.target.forEach((p,i)=>err+=Math.hypot(p.x-s.user[i].x,p.y-s.user[i].y)); err/=s.target.length; s.score=Math.max(0,Math.round(100-err*360)); $('#propScore').textContent=`比例稳定度：${s.score}%｜越接近 100，锚点关系越稳定。`; drawLab(); if(s.score>82) addXP(8,'比例校准优秀'); }
function drawProportion(ctx,w,h){ ensureProp(); const s=labState.proportion; const drawPts=(pts,color,r)=>{ ctx.strokeStyle=color; ctx.lineWidth=3; ctx.beginPath(); pts.forEach((p,i)=>{ const x=p.x*w,y=p.y*h; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.closePath(); ctx.stroke(); pts.forEach((p,i)=>{dot(ctx,p.x*w,p.y*h,r,color); label(ctx,String(i+1),p.x*w+8,p.y*h-8,color);}); };
  label(ctx,'任务：复原锚点网络，不用画细节',28,38,palette.graphite); if(s.show) drawPts(s.target,'rgba(88,191,214,.58)',7); drawPts(s.user,palette.material,8); if(s.score!==null) label(ctx,`稳定度 ${s.score}%`,w-170,38,palette.material);
}
function drawPerspective(ctx,w,h){ const s=labState.perspective, vp={x:w*s.vpX,y:h*s.vpY}, baseY=h*.64, left=w*.22,right=w*.58, top=h*(.32+s.tilt), back=w*.78;
  ctx.strokeStyle='rgba(88,191,214,.22)'; ctx.lineWidth=1.5; ctx.setLineDash([8,8]); [left,right,back].forEach(x=>line(ctx,x,baseY,vp.x,vp.y)); line(ctx,left,top,vp.x,vp.y); line(ctx,right,top+40*s.tilt,vp.x,vp.y); ctx.setLineDash([]); dot(ctx,vp.x,vp.y,8,palette.perspective); label(ctx,'消失点',vp.x+12,vp.y-8,palette.perspective);
  ctx.strokeStyle=palette.graphite; ctx.lineWidth=4; const p1=[left,baseY],p2=[right,baseY+20*s.tilt],p3=[right,top+40*s.tilt],p4=[left,top]; const q1=[back,baseY-70],q2=[back,top-55]; poly(ctx,[p1,p2,p3,p4],false); line(ctx,p2[0],p2[1],q1[0],q1[1]); line(ctx,p3[0],p3[1],q2[0],q2[1]); line(ctx,q1[0],q1[1],q2[0],q2[1]); line(ctx,p4[0],p4[1],q2[0],q2[1]); line(ctx,p1[0],p1[1],q1[0],q1[1]);
  const score=Math.round(100-Math.abs(s.tilt)*160-Math.abs(s.vpY-.28)*50); label(ctx,`透视一致度 ${clamp(score,0,100)}%`,28,38,palette.graphite);
}
function ensureDepth(){ if(!labState.depth.grid){ resetDepthGrid(false); } }
function resetDepthGrid(draw=true){ labState.depth.grid=Array.from({length:5},(_,y)=>Array.from({length:7},(_,x)=> x<2?0:x<5?1:2)); if(draw) drawLab(); }
function drawDepth(ctx,w,h){ ensureDepth(); const colors=['rgba(255,209,102,.62)','rgba(91,186,213,.50)','rgba(142,132,223,.54)']; const names=['前景','中景','远景']; const gw=w/7, gh=h/5; for(let y=0;y<5;y++)for(let x=0;x<7;x++){ ctx.fillStyle=colors[labState.depth.grid[y][x]]; rounded(ctx,x*gw+6,y*gh+6,gw-12,gh-12,18,true); ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.stroke(); }
  names.forEach((n,i)=>{ dot(ctx,32+i*110,36,9,colors[i]); label(ctx,n,48+i*110,41,palette.graphite); }); label(ctx,'点击格子：近 → 中 → 远｜深度不是阴影',28,h-24,palette.graphite);
}
function drawLight(ctx,w,h){ const s=labState.light; const cx=w*.5, cy=h*.48, r=Math.min(w,h)*.25, lx=w*s.lx, ly=h*s.ly; ctx.fillStyle='rgba(0,0,0,.08)'; ellipse(ctx,cx+r*.25,cy+r*1.18,r*1.35,r*.22,0,true);
  const img=ctx.createImageData(w,h); const data=img.data; for(let y=0;y<h;y++){for(let x=0;x<w;x++){ const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy); let a=0; if(d<r){ const nx=dx/r, ny=dy/r, nz=Math.sqrt(Math.max(0,1-nx*nx-ny*ny)); const ldx=(lx-cx)/w, ldy=(ly-cy)/h, lz=.55; const len=Math.hypot(ldx,ldy,lz); const dotp=Math.max(0,(nx*ldx+ny*ldy+nz*lz)/len); const shade=.30+.70*dotp; const rim=Math.pow(Math.max(0,1-nz),2)*.18; const idx=(y*w+x)*4; data[idx]=Math.round(245*shade+255*rim); data[idx+1]=Math.round(205*shade+240*rim); data[idx+2]=Math.round(170*shade+255*rim); data[idx+3]=255; } }} ctx.putImageData(img,0,0); ctx.strokeStyle='rgba(51,66,76,.35)'; ctx.lineWidth=2; ellipse(ctx,cx,cy,r,r,0,false); arrow(ctx,lx,ly,cx-r*.35,cy-r*.45,palette.light,5); dot(ctx,lx,ly,10,palette.light); label(ctx,'光源',lx+12,ly-10,palette.light); label(ctx,'明暗 = 法线 · 光线方向',28,38,palette.graphite); }
function drawMaterial(ctx,w,h){ const s=labState.material; const cx=w*.5,cy=h*.52,r=Math.min(w,h)*.27; const rough=s.rough, metal=s.metal, sss=s.sss; const grad=ctx.createRadialGradient(cx-r*.35,cy-r*.45,r*.05,cx,cy,r*1.1); grad.addColorStop(0,`rgba(${Math.round(255-60*metal)},${Math.round(222+10*sss)},${Math.round(194+40*sss)},1)`); grad.addColorStop(.58,`rgba(${Math.round(198+40*sss)},${Math.round(140+50*sss)},${Math.round(124+55*sss)},1)`); grad.addColorStop(1,`rgba(${Math.round(90+70*metal)},${Math.round(92+50*metal)},${Math.round(112+60*metal)},1)`); ctx.fillStyle=grad; ellipse(ctx,cx,cy,r,r,0,true); ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=4; ellipse(ctx,cx,cy,r,r,0,false);
  const hw=r*(.08+rough*.46), ha=r*(.06+rough*.24); ctx.fillStyle=`rgba(255,255,255,${.95-rough*.35})`; ellipse(ctx,cx-r*.33,cy-r*.45,hw,ha,-.4,true); ctx.fillStyle=`rgba(255,120,130,${sss*.25})`; ellipse(ctx,cx,cy+r*.33,r*.65,r*.18,0,true); ctx.strokeStyle=`rgba(183,214,238,${.18+metal*.5})`; ctx.lineWidth=8; ellipse(ctx,cx,cy,r*1.02,r*1.02,0,false); label(ctx,`粗糙度 ${rough.toFixed(2)}：高光 ${rough>.55?'散':'集中'}`,28,38,palette.graphite); label(ctx,`金属度 ${metal.toFixed(2)}｜透光 ${sss.toFixed(2)}`,28,68,palette.material); }
function drawWind(ctx,w,h){ const s=labState.wind; const ang=s.angle*Math.PI, dx=Math.cos(ang), dy=Math.sin(ang)*.3, strength=s.strength; label(ctx,'风不可见：画的是物体变形后的证据',28,38,palette.graphite); arrow(ctx,w*.14,h*.18,w*.14+dx*160*strength,h*.18+dy*160*strength,palette.wind,5); label(ctx,'风向',w*.14+dx*160*strength+12,h*.18+dy*160*strength,palette.wind);
  // head + hair
  ctx.fillStyle='rgba(255,225,190,.9)'; ellipse(ctx,w*.32,h*.50,55,68,0,true); ctx.strokeStyle=palette.graphite; ctx.lineWidth=3; ellipse(ctx,w*.32,h*.50,55,68,0,false);
  ctx.strokeStyle=palette.graphite; ctx.lineWidth=2; for(let i=0;i<18;i++){ const a=-2.6+i*.18; const sx=w*.32+Math.cos(a)*45, sy=h*.45+Math.sin(a)*50; const ex=sx+dx*(90+80*strength)*(i/18)+Math.sin(i)*15*s.turb, ey=sy+dy*110*strength+Math.sin(i*.7)*35*s.turb; bez(ctx,sx,sy,lerp(sx,ex,.35),sy-30,lerp(sx,ex,.7),ey+20,ex,ey); }
  // cloth ribbons
  ['#f29ba7','#58bfd6','#ffd166'].forEach((col,i)=>{ ctx.strokeStyle=col; ctx.lineWidth=8-i; const y=h*.68+i*24; bez(ctx,w*.48,y,w*.56+dx*60,y-50*strength,w*.70+dx*110,y+40*strength,w*.86+dx*130,y-10*strength); });
  // leaves
  ctx.fillStyle='rgba(116,198,157,.65)'; for(let i=0;i<26;i++){ const x=w*.08+i*w*.035+Math.sin(i)*18, y=h*.76+Math.sin(i*.8)*55; ellipse(ctx,x+dx*strength*80,y+dy*strength*80,12,5,ang+.4,true); }
}
function addRipple(){ labState.fluid.ripples.push({x:.36+Math.random()*.3,y:.25+Math.random()*.18,r:0}); drawLab(); }
function drawFluid(ctx,w,h){ const s=labState.fluid; label(ctx,'流体没有固定轮廓：只有流线、密度、边缘和节奏',28,38,palette.graphite); ctx.fillStyle='rgba(91,186,213,.16)'; rounded(ctx,30,h*.23,w-60,h*.62,28,true); ctx.fillStyle='rgba(105,95,86,.9)'; ellipse(ctx,w*.5,h*.52,70,55,0,true); ctx.strokeStyle='rgba(51,66,76,.45)'; ctx.lineWidth=2; ellipse(ctx,w*.5,h*.52,70,55,0,false);
  ctx.strokeStyle=palette.fluid; ctx.lineWidth=3; for(let i=0;i<9;i++){ const y=h*.31+i*h*.055; bez(ctx,60,y,w*.32,y+Math.sin(i)*18,w*.42,y-35,w*.50-76,y+Math.sin(i)*12); bez(ctx,w*.50+76,y+Math.sin(i)*12,w*.60,y+35,w*.75,y-18,w-70,y); }
  ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=2; for(let i=0;i<8;i++){ const y=h*.37+i*24; bez(ctx,w*.42,y,w*.46,y-16,w*.54,y+16,w*.60,y-5); }
  s.ripples.forEach(r=>{ r.r+=.01+s.flow*.01; const x=r.x*w,y=r.y*h; ctx.strokeStyle='rgba(88,191,214,.55)'; ctx.lineWidth=2; for(let k=0;k<3;k++) ellipse(ctx,x,y,(r.r*180+k*28),(r.r*70+k*11),0,false); }); s.ripples=s.ripples.filter(r=>r.r<1.8);
  requestAnimationFrame(()=>{ if(currentPage==='labs'&&activeLab==='fluid') drawLab(); });
}
function drawFolding(ctx,w,h){ const level=labState.folding.level; label(ctx,`压缩率 ${level}：${['','写实','线稿','明暗块','色块','符号'][level]}`,28,38,palette.graphite); const cx=w*.5,cy=h*.52,s=Math.min(w,h)/460;
  if(level<=1){ ctx.fillStyle='rgba(255,226,190,.95)'; ellipse(ctx,cx,cy,130*s,150*s,0,true); ctx.fillStyle='rgba(242,155,167,.35)'; ellipse(ctx,cx-35*s,cy-45*s,45*s,25*s,0,true); ctx.fillStyle='rgba(91,186,213,.30)'; ellipse(ctx,cx+40*s,cy+40*s,55*s,28*s,0,true); }
  if(level<=2){ ctx.strokeStyle=palette.graphite; ctx.lineWidth=4*s; ellipse(ctx,cx,cy,130*s,150*s,0,false); bez(ctx,cx-95*s,cy-10*s,cx-60*s,cy-90*s,cx+60*s,cy-90*s,cx+95*s,cy-10*s); bez(ctx,cx-70*s,cy+55*s,cx-20*s,cy+95*s,cx+35*s,cy+90*s,cx+76*s,cy+35*s); }
  if(level>=3){ ctx.fillStyle='rgba(51,66,76,.18)'; ellipse(ctx,cx+24*s,cy+40*s,88*s,70*s,0,true); ctx.fillStyle='rgba(255,209,102,.38)'; ellipse(ctx,cx-45*s,cy-55*s,70*s,45*s,0,true); ctx.fillStyle='rgba(142,132,223,.28)'; ellipse(ctx,cx+10*s,cy-5*s,120*s,70*s,0,true); }
  if(level>=4){ ctx.strokeStyle=palette.graphite; ctx.lineWidth=5*s; line(ctx,cx-105*s,cy-15*s,cx+105*s,cy-15*s); line(ctx,cx-75*s,cy+70*s,cx+80*s,cy+55*s); line(ctx,cx-60*s,cy-70*s,cx+55*s,cy-78*s); }
  if(level>=5){ ctx.fillStyle=palette.light; star(ctx,cx,cy,70*s,5); ctx.fillStyle=palette.graphite; ctx.font=`${26*s}px ${getFont()}`; ctx.textAlign='center'; ctx.fillText('FORM',cx,cy+8*s); }
}

function readerHTML(){
  return `<section class="panel"><div class="pageTitle"><div><h2>章节阅读器</h2><p>像纸书一样连续阅读，一次只读一个知识块。</p></div><button class="primary" onclick="saveLessonNote()">保存本章笔记</button></div>
  <div class="readerLayout"><nav class="toc" id="toc"></nav><article class="article" id="article"></article><aside class="rightSide"><div class="noteBox"><h3>本章笔记</h3><textarea id="lessonNote" placeholder="只写一句也可以：这个知识像什么？它能帮我画什么？"></textarea></div><div class="noteBox" id="lessonTool"></div></aside></div></section>`;
}
function initReader(){ renderToc(); renderArticle(); }
function renderToc(){ $('#toc').innerHTML=lessons.map(l=>`<button class="${l.id===activeLesson?'active':''}" onclick="activeLesson='${l.id}';saveState();renderArticle();renderToc()">${zoneMap[l.zone].icon} ${l.title}</button>`).join(''); }
function renderArticle(){
  const l=lessons.find(x=>x.id===activeLesson)||lessons[0], z=zoneMap[l.zone];
  $('#article').innerHTML=`<h1>${l.title}</h1><p class="subtitle" style="font-size:20px">${l.lead}</p>${l.body.map(p=>`<p>${p}</p>`).join('')}<h2>纸上练习</h2><p>${l.exercise}</p><h2>连接的星区</h2><p>${z.icon} ${z.name}｜${z.tool}｜${z.core}</p><h2>原理来源 / 可查证方向</h2><div class="sourceGrid">${sourceCards.map(s=>`<div class="sourceCard"><b>${s.tag}</b><span>${s.title}</span><small>${s.use}</small></div>`).join('')}</div><div class="ctaRow"><button class="secondary" onclick="activeLab='${labForZone(z.id)}';go('labs')">玩对应小游戏</button><button class="secondary" onclick="markZone('${z.id}')">点亮星区</button></div>`;
  $('#lessonNote').value=notes[l.id]||'';
  $('#lessonTool').innerHTML=`<h3>${z.tool}</h3><p>${z.game}</p><p class="tiny">${z.exercise}</p>`;
}
function saveLessonNote(){ notes[activeLesson]=$('#lessonNote').value; saveJSON(NOTES_KEY,notes); addXP(4,'保存笔记'); }


let modelState = {mode:'room', depth:.42, bevel:.18, rotate:.28, primitive:'box', selected:null, shapes:[{type:'box',x:.34,y:.58,w:.22,h:.22,d:.35,color:palette.perspective},{type:'cylinder',x:.62,y:.56,w:.20,h:.30,d:.48,color:palette.material}]};
const modelPresets = [
  {id:'vase',name:'杯子/花瓶', hint:'轮廓线 → 旋转体 Lathe。适合 Procreate 画侧影，再到 Blender 用 Screw/Spin。'},
  {id:'room',name:'房间/盒子', hint:'透视线 → 盒体 Extrude。适合 Rhino/SU 的推拉建模。'},
  {id:'ribbon',name:'飘带/头发', hint:'中心线 → 曲线 Sweep。适合画风、头发、布带、水流。'},
  {id:'landscape',name:'水面/地形', hint:'等高线/深度层 → 曲面 Surface。适合深度湖和场景层次。'}
];
function modelHTML(){
  return `<section class="panel"><div class="pageTitle"><div><h2>线稿建模桥</h2><p>把 Procreate/PS 的线稿思维，连接到 Rhino / SketchUp / Blender 的建模思维：轮廓、截面、路径、推拉、旋转、扫掠。</p></div><button class="primary" onclick="addPrimitive()">添加一个形体</button></div>
  <div class="modelLayout"><div class="modelStage"><canvas id="modelCanvas" class="modelCanvas"></canvas></div><aside class="controlPanel"><h3>从画到模型</h3><p class="tiny">这不是完整 3D 软件，而是“关系匹配器”：帮助你理解线稿如何变成可编辑模型。</p>
  <div class="modelModeGrid">${modelPresets.map(p=>`<button class="modelMode ${modelState.mode===p.id?'active':''}" onclick="setModelMode('${p.id}')"><b>${p.name}</b><small>${p.hint}</small></button>`).join('')}</div>
  ${modelRange('depth','厚度/深度',modelState.depth,0.05,1)}${modelRange('bevel','圆润/倒角',modelState.bevel,0,1)}${modelRange('rotate','观察旋转',modelState.rotate,-1,1)}
  <div class="ctaRow"><button class="secondary" onclick="modelState.primitive='box';addPrimitive()">盒体</button><button class="secondary" onclick="modelState.primitive='cylinder';addPrimitive()">圆柱</button><button class="secondary" onclick="modelState.primitive='ribbon';addPrimitive()">飘带</button><button class="secondary" onclick="exportModelJSON()">导出 JSON</button><button class="secondary" onclick="exportOBJ()">导出简易 OBJ</button></div>
  <div class="hint"><b>原理：</b><br/>线稿里的闭合轮廓可以推拉成体块；侧影可以旋转成杯子/花瓶；中心线可以扫掠成飘带/头发；深度层可以组织成地形或场景。</div></aside></div></section>
  <section class="panel"><div class="pageTitle"><div><h2>转换关系表</h2><p>把绘画里的线，翻译成建模里的对象。</p></div></div><div class="grid">
  ${[
    ['轮廓线','Closed curve','Extrude / Push-Pull','平面形状变成立体厚度'],
    ['侧影线','Profile curve','Lathe / Revolve','花瓶、杯子、柱状器物'],
    ['中心线','Path curve','Sweep','头发、飘带、水流、管线'],
    ['结构线','Edge loop','Topology','脸、手、衣褶的体块转折'],
    ['深度层','Z / depth field','Surface','水面、地形、远近层次'],
    ['材质标注','Material slots','Shader','皮肤、金属、玻璃、布料']
  ].map(r=>`<article class="card" style="--accent:${palette.perspective}"><h3>${r[0]} → ${r[1]}</h3><p><b>${r[2]}</b></p><p>${r[3]}</p></article>`).join('')}</div></section>`;
}
function modelRange(key,label,value,min,max,step=.01){ return `<label class="control"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" oninput="modelRangeChange('${key}',this.value)"><b>${Number(value).toFixed(2)}</b></label>`; }
function initModelBridge(){ const c=$('#modelCanvas'); resizeCanvas(c); c.onpointerdown=e=>handleModelPointer(e,c); drawModelBridge(); }
function setModelMode(id){ modelState.mode=id; drawModelBridge(); render(); }
function modelRangeChange(key,val){ modelState[key]=Number(val); drawModelBridge(); }
function addPrimitive(){ const i=modelState.shapes.length; const colors=[palette.perspective,palette.material,palette.light,palette.fluid,palette.wind]; modelState.shapes.push({type:modelState.primitive||'box',x:.22+((i*0.17)%0.58),y:.42+((i*0.11)%0.28),w:.16,h:.18,d:modelState.depth,color:colors[i%colors.length]}); drawModelBridge(); addXP(3,'添加建模形体'); }
function handleModelPointer(e,c){ const p=canvasPoint(e,c), w=c.width,h=c.height; let hit=null; modelState.shapes.forEach((sh,i)=>{ if(Math.abs(p.x/w-sh.x)<sh.w && Math.abs(p.y/h-sh.y)<sh.h) hit=i; }); if(hit!==null){ modelState.shapes[hit].x=p.x/w; modelState.shapes[hit].y=p.y/h; modelState.selected=hit; drawModelBridge(); }}
function drawModelBridge(){ const c=$('#modelCanvas'); if(!c) return; resizeCanvas(c); const ctx=c.getContext('2d'), w=c.width,h=c.height; drawStageBg(ctx,w,h); label(ctx,'Sketch → Curve → Primitive → Model',28,36,palette.graphite); const rx=modelState.rotate*70;
  // left sketch plane
  ctx.fillStyle='rgba(255,255,255,.56)'; rounded(ctx,30,70,w*.36,h-115,24,true); ctx.strokeStyle='rgba(51,66,76,.25)'; rounded(ctx,30,70,w*.36,h-115,24,false); label(ctx,'2D 线稿层',52,98,palette.graphite);
  // right model plane
  ctx.fillStyle='rgba(88,191,214,.08)'; rounded(ctx,w*.45,70,w*.50,h-115,24,true); ctx.strokeStyle='rgba(88,191,214,.25)'; rounded(ctx,w*.45,70,w*.50,h-115,24,false); label(ctx,'2.5D 模型层',w*.47,98,palette.perspective);
  modelState.shapes.forEach((sh,i)=>{ drawSketchShape(ctx,sh,w,h,i===modelState.selected); drawModelShape(ctx,sh,w,h,rx,i===modelState.selected); });
  // conversion arrows
  for(let y=145;y<h-90;y+=90) arrow(ctx,w*.39,y,w*.45,y,palette.light,3);
  const preset=modelPresets.find(p=>p.id===modelState.mode)||modelPresets[0]; label(ctx,preset.name+'：'+preset.hint,48,h-34,palette.material);
}
function drawSketchShape(ctx,sh,w,h,sel){ const x=30+sh.x*w*.32, y=90+sh.y*(h-150), ww=sh.w*w*.35, hh=sh.h*h*.55; ctx.save(); ctx.strokeStyle=sh.color; ctx.lineWidth=sel?5:3; ctx.setLineDash(sel?[8,5]:[]); if(sh.type==='cylinder') ellipse(ctx,x,y,ww*.55,hh*.45,0,false); else if(sh.type==='ribbon') bez(ctx,x-ww*.5,y,x-ww*.1,y-hh*.7,x+ww*.25,y+hh*.55,x+ww*.7,y-hh*.1); else rounded(ctx,x-ww/2,y-hh/2,ww,hh,18,false); ctx.restore(); }
function drawModelShape(ctx,sh,w,h,rx,sel){ const cx=w*.45+sh.x*w*.43, cy=95+sh.y*(h-150), ww=sh.w*w*.38, hh=sh.h*h*.56, d=sh.d*90, col=sh.color; ctx.save(); ctx.globalAlpha=.96; if(sh.type==='cylinder'){ ctx.fillStyle=col+'55'; ellipse(ctx,cx,cy-hh*.45,ww*.48,hh*.16,0,true); ctx.fillStyle=col+'33'; rounded(ctx,cx-ww*.48,cy-hh*.45,ww*.96,hh*.9,Math.max(12,modelState.bevel*40),true); ctx.strokeStyle=col; ctx.lineWidth=3; ellipse(ctx,cx,cy-hh*.45,ww*.48,hh*.16,0,false); ellipse(ctx,cx,cy+hh*.45,ww*.48,hh*.16,0,false); line(ctx,cx-ww*.48,cy-hh*.45,cx-ww*.48,cy+hh*.45); line(ctx,cx+ww*.48,cy-hh*.45,cx+ww*.48,cy+hh*.45); }
  else if(sh.type==='ribbon'){ ctx.strokeStyle=col; ctx.lineWidth=16+modelState.depth*12; ctx.lineCap='round'; bez(ctx,cx-ww*.8,cy,cx-ww*.2+rx,cy-hh*.7,cx+ww*.35-rx,cy+hh*.55,cx+ww*.85,cy-hh*.1); ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=2; bez(ctx,cx-ww*.8,cy,cx-ww*.2+rx,cy-hh*.7,cx+ww*.35-rx,cy+hh*.55,cx+ww*.85,cy-hh*.1); }
  else { const off=d*.45; ctx.fillStyle=col+'33'; poly(ctx,[[cx-ww/2,cy-hh/2],[cx+ww/2,cy-hh/2],[cx+ww/2+off+rx,cy-hh/2-off],[cx-ww/2+off+rx,cy-hh/2-off]],true); ctx.fillStyle=col+'55'; poly(ctx,[[cx+ww/2,cy-hh/2],[cx+ww/2,cy+hh/2],[cx+ww/2+off+rx,cy+hh/2-off],[cx+ww/2+off+rx,cy-hh/2-off]],true); ctx.fillStyle=col+'44'; poly(ctx,[[cx-ww/2,cy-hh/2],[cx+ww/2,cy-hh/2],[cx+ww/2,cy+hh/2],[cx-ww/2,cy+hh/2]],true); ctx.strokeStyle=col; ctx.lineWidth=3; poly(ctx,[[cx-ww/2,cy-hh/2],[cx+ww/2,cy-hh/2],[cx+ww/2,cy+hh/2],[cx-ww/2,cy+hh/2]],false); line(ctx,cx+ww/2,cy-hh/2,cx+ww/2+off+rx,cy-hh/2-off); line(ctx,cx+ww/2,cy+hh/2,cx+ww/2+off+rx,cy+hh/2-off); line(ctx,cx-ww/2,cy-hh/2,cx-ww/2+off+rx,cy-hh/2-off); }
  if(sel){ ctx.strokeStyle=palette.light; ctx.lineWidth=3; ellipse(ctx,cx,cy,Math.max(ww,hh)*.7,Math.max(ww,hh)*.45,0,false); } ctx.restore(); }
function exportModelJSON(){ const blob=new Blob([JSON.stringify({name:'Drawescape model sketch',mode:modelState.mode,shapes:modelState.shapes},null,2)],{type:'application/json'}); downloadBlob(blob,`drawescape-model-${Date.now()}.json`); }
function exportOBJ(){ let obj='# Drawescape simple primitive placeholder\n'; modelState.shapes.forEach((s,i)=>{ const x=s.x*4,y=s.y*3,z=s.d; obj+=`o ${s.type}_${i}\n# x=${x.toFixed(2)} y=${y.toFixed(2)} depth=${z.toFixed(2)}\n`; }); downloadBlob(new Blob([obj],{type:'text/plain'}),`drawescape-model-${Date.now()}.obj`); }
function downloadBlob(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }

let drawState = {color:palette.graphite,size:4,strokes:[],bg:null,grid:true,perspective:false,depth:false,drawing:false,current:null,saved:[]};
function drawHTML(){
  return `<section class="panel"><div class="pageTitle"><div><h2>自由绘画台</h2><p>本地导入图片、叠加透视网格/深度层、标注结构。不上传云端。</p></div><button class="primary" onclick="saveSketch()">保存到本地</button></div>
  <div class="drawLayout"><div class="drawShell"><canvas id="drawCanvas" class="drawCanvas"></canvas></div><aside class="drawTools">
    <h3>绘画工具</h3><input type="file" id="imageInput" accept="image/*" />
    <div class="colorRow">${Object.entries({graphite:palette.graphite,perspective:palette.perspective,depth:palette.depth,normal:palette.normal,light:palette.light,material:palette.material,fluid:palette.fluid,wind:palette.wind}).map(([k,c])=>`<button class="swatch ${drawState.color===c?'active':''}" style="background:${c}" title="${k}" onclick="setBrush('${c}')"></button>`).join('')}</div>
    ${drawRange('size','画笔大小',drawState.size,1,24,1)}
    <button class="ghostBtn" onclick="toggleDrawOverlay('grid')">${drawState.grid?'✅':'⬜'} 纸面网格</button>
    <button class="ghostBtn" onclick="toggleDrawOverlay('perspective')">${drawState.perspective?'✅':'⬜'} 透视辅助线</button>
    <button class="ghostBtn" onclick="toggleDrawOverlay('depth')">${drawState.depth?'✅':'⬜'} 深度三层</button>
    <button class="ghostBtn" onclick="undoStroke()">↶ 撤销一笔</button>
    <button class="ghostBtn" onclick="clearDraw()">清空画布</button>
    <button class="ghostBtn" onclick="exportPNG()">导出 PNG</button>
    <div class="hint">建议流程：先用青色画透视线，再用石墨画结构线，用紫色标深度，用金色标光。</div>
  </aside></div></section>`;
}
function drawRange(key,label,value,min,max,step){ return `<label class="control"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" oninput="setDrawRange('${key}',this.value)"><b>${value}</b></label>`; }
function initDrawPad(){
  const saved=loadJSON(DRAW_KEY, null); if(saved) drawState={...drawState,...saved,drawing:false,current:null};
  const input=$('#imageInput'); if(input){ input.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{drawState.bg=r.result; saveDrawState(); renderDrawCanvas();}; r.readAsDataURL(f); }; }
  const c=$('#drawCanvas'); resizeCanvas(c); c.onpointerdown=startDraw; c.onpointermove=moveDraw; c.onpointerup=endDraw; c.onpointerleave=endDraw; renderDrawCanvas();
}
function setBrush(color){ drawState.color=color; saveDrawState(); render(); }
function setDrawRange(key,val){ drawState[key]=Number(val); saveDrawState(); render(); }
function toggleDrawOverlay(key){ drawState[key]=!drawState[key]; saveDrawState(); renderDrawCanvas(); }
function saveDrawState(){ saveJSON(DRAW_KEY,{color:drawState.color,size:drawState.size,strokes:drawState.strokes,bg:drawState.bg,grid:drawState.grid,perspective:drawState.perspective,depth:drawState.depth,saved:drawState.saved||[]}); }
function startDraw(e){ const c=e.currentTarget; drawState.drawing=true; drawState.current={color:drawState.color,size:drawState.size,points:[canvasPoint(e,c)]}; c.setPointerCapture?.(e.pointerId); }
function moveDraw(e){ if(!drawState.drawing||!drawState.current) return; const c=e.currentTarget; drawState.current.points.push(canvasPoint(e,c)); renderDrawCanvas(); }
function endDraw(){ if(!drawState.drawing||!drawState.current) return; drawState.strokes.push(drawState.current); drawState.current=null; drawState.drawing=false; saveDrawState(); renderDrawCanvas(); }
function undoStroke(){ drawState.strokes.pop(); saveDrawState(); renderDrawCanvas(); }
function clearDraw(){ if(confirm('清空画布上的笔迹吗？导入图片也会清除。')){ drawState.strokes=[]; drawState.bg=null; saveDrawState(); renderDrawCanvas(); } }
function renderDrawCanvas(){
  const c=$('#drawCanvas'); if(!c) return; resizeCanvas(c); const ctx=c.getContext('2d'),w=c.width,h=c.height; ctx.clearRect(0,0,w,h); ctx.fillStyle='#fffdf8'; ctx.fillRect(0,0,w,h);
  const drawOverlays=()=>{ if(drawState.depth){ ctx.fillStyle='rgba(255,209,102,.08)'; ctx.fillRect(0,0,w,h/3); ctx.fillStyle='rgba(91,186,213,.08)'; ctx.fillRect(0,h/3,w,h/3); ctx.fillStyle='rgba(142,132,223,.09)'; ctx.fillRect(0,2*h/3,w,h/3); }
    if(drawState.grid){ ctx.strokeStyle='rgba(88,191,214,.13)'; ctx.lineWidth=1; for(let x=0;x<w;x+=36)line(ctx,x,0,x,h); for(let y=0;y<h;y+=36)line(ctx,0,y,w,y); }
    if(drawState.perspective){ const vp1={x:w*.18,y:h*.36}, vp2={x:w*.82,y:h*.36}; ctx.strokeStyle='rgba(88,191,214,.28)'; ctx.lineWidth=1.5; ctx.setLineDash([8,8]); for(let y=h*.15;y<h*.9;y+=54){line(ctx,0,y,vp1.x,vp1.y);line(ctx,w,y,vp2.x,vp2.y)} ctx.setLineDash([]); dot(ctx,vp1.x,vp1.y,6,palette.perspective); dot(ctx,vp2.x,vp2.y,6,palette.perspective); } };
  if(drawState.bg){ const img=new Image(); img.onload=()=>{ ctx.globalAlpha=.88; fitImage(ctx,img,w,h); ctx.globalAlpha=1; drawOverlays(); drawStrokes(ctx,w,h); }; img.src=drawState.bg; } else { drawOverlays(); drawStrokes(ctx,w,h); }
}
function drawStrokes(ctx,w,h){ [...drawState.strokes, drawState.current].filter(Boolean).forEach(st=>{ ctx.strokeStyle=st.color; ctx.lineWidth=st.size; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); st.points.forEach((p,i)=>{ const x=p.x,y=p.y; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke(); }); }
function saveSketch(){ const c=$('#drawCanvas'); renderDrawCanvas(); setTimeout(()=>{ const url=c.toDataURL('image/png'); drawState.saved=drawState.saved||[]; drawState.saved.unshift({url,date:new Date().toLocaleString('zh-CN')}); drawState.saved=drawState.saved.slice(0,8); saveDrawState(); addXP(10,'绘画台保存'); },80); }
function exportPNG(){ const c=$('#drawCanvas'); const a=document.createElement('a'); a.download=`drawescape-sketch-${Date.now()}.png`; a.href=c.toDataURL('image/png'); a.click(); }

function progressHTML(){
  const doneCount=Object.values(state.done||{}).filter(Boolean).length;
  return `<section class="panel"><div class="pageTitle"><div><h2>进度与本地笔记</h2><p>所有记录保存在浏览器 localStorage，不上传云端。</p></div><button class="primary" onclick="resetAll()">重置进度</button></div>
  <div class="grid"><article class="card" style="--accent:${palette.light}"><h3>星尘</h3><p style="font-size:34px;margin:0"><b>${state.xp||0}</b></p><p>来自完成关卡、扫描、保存笔记和绘画台。</p></article><article class="card" style="--accent:${palette.normal}"><h3>点亮项目</h3><p style="font-size:34px;margin:0"><b>${doneCount}</b></p><p>星区/实验/任务完成数。</p></article><article class="card" style="--accent:${palette.material}"><h3>章节笔记</h3><p style="font-size:34px;margin:0"><b>${Object.keys(notes).length}</b></p><p>写一句也算保存知识索引。</p></article></div></section>
  <section class="panel"><div class="pageTitle"><div><h2>星区点亮</h2><p>不用追求全满；只点亮今天真正用过的工具。</p></div></div><div class="grid">${zones.map(z=>`<article class="card" style="--accent:${z.color}"><h3>${state.done[z.id]?'✅':'⬜'} ${z.icon} ${z.name}</h3><p>${z.tool}｜${z.core}</p><button class="miniBtn" onclick="markZone('${z.id}')">点亮/再练一次</button></article>`).join('')}</div></section>
  <section class="panel"><div class="pageTitle"><div><h2>本地保存的草图</h2><p>最近 8 张保存在浏览器里。换浏览器或清理缓存会丢失。</p></div></div><div id="savedSketches" class="savedGrid"></div></section>`;
}
function renderSavedSketches(){ const box=$('#savedSketches'); if(!box) return; const saved=drawState.saved||loadJSON(DRAW_KEY,{}).saved||[]; box.innerHTML=saved.length?saved.map((s,i)=>`<div class="savedItem"><img src="${s.url}" alt="saved sketch ${i+1}"><p class="tiny">${s.date}</p><a class="miniBtn" download="drawescape-saved-${i+1}.png" href="${s.url}">下载</a></div>`).join(''):'<p class="hint">还没有保存草图。去自由绘画台画一笔吧。</p>'; }
function resetAll(){ if(confirm('确定重置 Drawescape 的进度、笔记和绘画台记录吗？')){ localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(DRAW_KEY); localStorage.removeItem(NOTES_KEY); state=loadState(); notes={}; drawState={color:palette.graphite,size:4,strokes:[],bg:null,grid:true,perspective:false,depth:false,drawing:false,current:null,saved:[]}; render(); } }

// Canvas drawing helpers
function resizeCanvas(c){ if(!c) return; const r=c.getBoundingClientRect(), d=window.devicePixelRatio||1; const w=Math.max(1,Math.floor(r.width*d)), h=Math.max(1,Math.floor(r.height*d)); if(c.width!==w||c.height!==h){ c.width=w; c.height=h; } const ctx=c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); }
function canvasPoint(e,c){ const r=c.getBoundingClientRect(), d=window.devicePixelRatio||1; return {x:(e.clientX-r.left)*d,y:(e.clientY-r.top)*d}; }
function line(ctx,x1,y1,x2,y2){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
function bez(ctx,x1,y1,x2,y2,x3,y3,x4,y4){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.bezierCurveTo(x2,y2,x3,y3,x4,y4); ctx.stroke(); }
function ellipse(ctx,x,y,rx,ry,rot,fill=false){ ctx.beginPath(); ctx.ellipse(x,y,Math.abs(rx),Math.abs(ry),rot||0,0,TAU); fill?ctx.fill():ctx.stroke(); }
function dot(ctx,x,y,r,color){ ctx.save(); ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); ctx.restore(); }
function arrow(ctx,x1,y1,x2,y2,color,width=3){ ctx.save(); ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=width; ctx.lineCap='round'; line(ctx,x1,y1,x2,y2); const a=Math.atan2(y2-y1,x2-x1), s=12+width*1.5; ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-Math.cos(a-.5)*s,y2-Math.sin(a-.5)*s); ctx.lineTo(x2-Math.cos(a+.5)*s,y2-Math.sin(a+.5)*s); ctx.closePath(); ctx.fill(); ctx.restore(); }
function label(ctx,t,x,y,color){ ctx.save(); ctx.fillStyle=color||palette.graphite; ctx.font=`${Math.max(13,16*(window.devicePixelRatio||1))}px ${getFont()}`; ctx.textBaseline='middle'; ctx.fillText(t,x,y); ctx.restore(); }
function poly(ctx,pts,fill=false){ ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); fill?ctx.fill():ctx.stroke(); }
function rounded(ctx,x,y,w,h,r,fill=false){ ctx.beginPath(); if(ctx.roundRect){ ctx.roundRect(x,y,w,h,r); } else { const rr=Math.min(r,Math.abs(w)/2,Math.abs(h)/2); ctx.moveTo(x+rr,y); ctx.lineTo(x+w-rr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+rr); ctx.lineTo(x+w,y+h-rr); ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h); ctx.lineTo(x+rr,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rr); ctx.lineTo(x,y+rr); ctx.quadraticCurveTo(x,y,x+rr,y); } fill?ctx.fill():ctx.stroke(); }
function star(ctx,x,y,r,n=5){ ctx.beginPath(); for(let i=0;i<n*2;i++){ const rr=i%2?r:r*.44, a=-Math.PI/2+i*Math.PI/n; const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr; i?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.closePath(); ctx.fill(); }
function drawStageBg(ctx,w,h){ ctx.fillStyle='rgba(255,253,248,.85)'; ctx.fillRect(0,0,w,h); ctx.strokeStyle='rgba(88,191,214,.12)'; ctx.lineWidth=1; for(let x=0;x<w;x+=48)line(ctx,x,0,x,h); for(let y=0;y<h;y+=48)line(ctx,0,y,w,y); }
function fitImage(ctx,img,w,h){ const s=Math.min(w/img.width,h/img.height); const iw=img.width*s, ih=img.height*s; ctx.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih); }
function getFont(){ return 'ui-rounded, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'; }

function initHero(){ const c=$('#heroCanvas'); if(!c) return; resizeCanvas(c); const ctx=c.getContext('2d'); const w=c.width,h=c.height; ctx.clearRect(0,0,w,h); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(88,191,214,.26)'; ctx.lineWidth=1; for(let x=0;x<w;x+=50)line(ctx,x,0,x,h); for(let y=0;y<h;y+=50)line(ctx,0,y,w,y);
  const cx=w*.52, cy=h*.54, r=Math.min(w,h)*.25; ctx.fillStyle='rgba(255,209,102,.22)'; ellipse(ctx,cx,cy,r*1.4,r*.9,0,true); ctx.strokeStyle=palette.graphite; ctx.lineWidth=3; ellipse(ctx,cx,cy,r*1.4,r*.9,0,false); ctx.strokeStyle=palette.perspective; ctx.lineWidth=2; ctx.setLineDash([9,9]); line(ctx,w*.08,h*.82,cx,cy); line(ctx,w*.92,h*.22,cx,cy); ctx.setLineDash([]);
  ctx.strokeStyle=palette.graphite; ctx.lineWidth=4; for(let i=0;i<7;i++){ const a=i/7*TAU; const x=cx+Math.cos(a)*r*1.2, y=cy+Math.sin(a)*r*.7; dot(ctx,x,y,6,palette.material); line(ctx,cx,cy,x,y); }
  ctx.strokeStyle=palette.wind; ctx.lineWidth=3; for(let i=0;i<5;i++) bez(ctx,w*.08,h*(.18+i*.12),w*.25,h*(.05+i*.14),w*.52,h*(.3+i*.08),w*.88,h*(.18+i*.12));
  ctx.fillStyle=palette.light; for(let i=0;i<36;i++) star(ctx,Math.random()*w,Math.random()*h,3+Math.random()*5,5);
  label(ctx,'Observe → Scan → Infer → Fold → Draw',w*.06,h*.08,palette.graphite);
}

function initBackground(){
  const c=$('#dreamBg'), ctx=c.getContext('2d'); let particles=[]; function resize(){ c.width=innerWidth*(devicePixelRatio||1); c.height=innerHeight*(devicePixelRatio||1); particles=Array.from({length:90},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:1+Math.random()*2,v:.15+Math.random()*.35,a:Math.random()*TAU})); }
  function frame(){ ctx.clearRect(0,0,c.width,c.height); ctx.globalAlpha=.9; particles.forEach(p=>{ p.x+=Math.cos(p.a)*p.v; p.y+=Math.sin(p.a)*p.v; if(p.x<0)p.x=c.width;if(p.x>c.width)p.x=0;if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0; ctx.fillStyle='rgba(255,209,102,.45)'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(devicePixelRatio||1),0,TAU); ctx.fill(); }); requestAnimationFrame(frame); }
  resize(); addEventListener('resize',resize); frame();
}

window.go=go; window.setTheme=setTheme; window.toggleLowLang=toggleLowLang; window.toggleMotion=toggleMotion; window.toggleFocus=toggleFocus;
window.selectZone=selectZone; window.startRoute=startRoute; window.markZone=markZone; window.openLessonByZone=openLessonByZone; window.newQuest=newQuest; window.completeQuest=completeQuest;
window.toggleScanLayer=toggleScanLayer; window.awardScan=awardScan; window.setLab=setLab; window.labRange=labRange; window.completeLab=completeLab; window.resetProportion=resetProportion; window.togglePropTarget=togglePropTarget; window.scoreProportion=scoreProportion; window.resetDepthGrid=resetDepthGrid; window.addRipple=addRipple;
window.setModelMode=setModelMode; window.modelRangeChange=modelRangeChange; window.addPrimitive=addPrimitive; window.exportModelJSON=exportModelJSON; window.exportOBJ=exportOBJ;
window.saveLessonNote=saveLessonNote; window.setBrush=setBrush; window.setDrawRange=setDrawRange; window.toggleDrawOverlay=toggleDrawOverlay; window.undoStroke=undoStroke; window.clearDraw=clearDraw; window.saveSketch=saveSketch; window.exportPNG=exportPNG; window.resetAll=resetAll;

initBackground();
render();
