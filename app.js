(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const storeKey = 'drawescape.v10.memory';
  const state = {
    route:'hub', sub:null, mapTab:'world', currentQuestStep:0,
    selectedConcept:'fov', studioTool:'pen', studioDrawing:false,
    memory: JSON.parse(localStorage.getItem(storeKey)||'[]'),
    progress: JSON.parse(localStorage.getItem('drawescape.v10.progress')||'{}')
  };

  const pipeline = [
    {id:'sample', title:'观察采样', icon:'👁️', short:'先看见，不急着画。', computer:'Input image / visual sampling', drawing:'找对象、边界和视觉重点。'},
    {id:'structure', title:'结构识别', icon:'🧱', short:'它由哪些体块组成？', computer:'Mesh / primitive / topology', drawing:'球、盒、柱、楔体、曲面。'},
    {id:'coordinate', title:'坐标对齐', icon:'📍', short:'所有部件挂在哪个坐标系上？', computer:'Origin / local axes / transform', drawing:'锚点、比例、对齐、负形。'},
    {id:'camera', title:'相机投影', icon:'📷', short:'三维如何折到平面？', computer:'Camera / FOV / projection', drawing:'视平线、消失点、透视变形。'},
    {id:'depth', title:'深度排序', icon:'🌊', short:'谁在前，谁在后？', computer:'Depth map / Z-buffer', drawing:'前中后景、遮挡、空气透视。'},
    {id:'surface', title:'表面朝向', icon:'🧭', short:'这个面朝哪里？', computer:'Normal vector / normal map', drawing:'面转向、体积感、轮廓变化。'},
    {id:'light', title:'光照计算', icon:'💡', short:'光如何落在面上？', computer:'Diffuse / shadow / AO', drawing:'明暗交界线、投影、反光。'},
    {id:'material', title:'材质反应', icon:'🧪', short:'表面如何回应光？', computer:'Shader / roughness / Fresnel', drawing:'固有色、高光、纹理、透明。'},
    {id:'force', title:'力学变形', icon:'🌬️', short:'形体为什么弯曲流动？', computer:'Constraint / cloth / force field', drawing:'褶皱、头发、水、风、烟。'},
    {id:'compression', title:'二维压缩', icon:'✂️', short:'哪些信息被保留？', computer:'Feature extraction / abstraction', drawing:'线条、色块、阴影块、简化。'},
    {id:'style', title:'风格表达', icon:'🌈', short:'感受如何变成画面？', computer:'Parameter system / visual hierarchy', drawing:'比例夸张、构图、色彩情绪。'}
  ];

  const islands = [
    {id:'structure', title:'结构岛', icon:'🧱', core:'这个东西是什么形？', duty:'点、线、面、体块、拓扑、轮廓。', levels:['识别基本体','拆复杂对象','搭代理模型','迁移到人物/自然']},
    {id:'coordinate', title:'坐标岛', icon:'📍', core:'这个东西在哪里？', duty:'锚点、比例、局部坐标、对齐、负形。', levels:['找锚点','用单位复原','修正偏差','保持风格变形不崩']},
    {id:'camera', title:'相机岛', icon:'📷', core:'它为什么这样变形？', duty:'视平线、消失点、FOV、焦距、正交。', levels:['找视平线','调 FOV 预测','画透视盒子','用透视表达情绪']},
    {id:'depth', title:'深度岛', icon:'🌊', core:'谁在前，谁在后？', duty:'Depth Map、遮挡、前中后景、空气透视。', levels:['排序远近','涂深度层','拆复杂场景','用空间表达情绪']},
    {id:'surface', title:'表面岛', icon:'🧭', core:'这个面朝哪里？', duty:'Normal、曲率、面转折、法线图。', levels:['看面朝向','预测轮廓变化','画体积转面','迁移到脸/褶皱']},
    {id:'light', title:'光影岛', icon:'💡', core:'光为什么这样落下？', duty:'漫反射、明暗交界线、投影、AO。', levels:['识别明暗','预测交界线','画新形体阴影','压缩成漫画阴影']},
    {id:'material', title:'材质岛', icon:'🧪', core:'同样的光，为什么反应不同？', duty:'固有色、粗糙度、高光、菲涅尔、SSS。', levels:['区分材质','调高光','画材质球','动漫化材质']},
    {id:'force', title:'力学岛', icon:'🌬️', core:'形状为什么弯曲、流动？', duty:'重力、张力、压缩、风、水、烟、布料。', levels:['找固定点','预测张力','生成褶皱','风格化线条']},
    {id:'compression', title:'压缩岛', icon:'✂️', core:'三维现实如何变成二维绘画？', duty:'轮廓提取、线条选择、明暗简化、色块化。', levels:['找关键信息','删噪音','画压缩版本','建立个人元素库']},
    {id:'style', title:'风格岛', icon:'🌈', core:'感受如何变成画面？', duty:'线条、色彩、比例、构图、节奏、个人风格。', levels:['识别风格参数','调情绪变量','输出风格卡','形成个人风格库']}
  ];

  const quests = [
    {id:'quest-room', title:'画一个盒子房间', icon:'🏠', output:'透视房间知识卡', calls:['结构','坐标','相机','深度','光影','材质','风格'], desc:'第一个完整跨岛任务：用房间验证世界管线。'},
    {id:'quest-face', title:'画一个转头动漫人物', icon:'🙂', output:'头部坐标与风格卡', calls:['结构','坐标','相机','深度','表面','光影','材质','风格'], desc:'从头部体块到动漫化，重点是五官挂在同一坐标系。'},
    {id:'quest-cloth', title:'画一块可信布料', icon:'🧣', output:'褶皱力线卡', calls:['结构','力学','表面','光影','材质','压缩'], desc:'找固定点、张力、材料硬度，再决定保留哪些褶皱。'},
    {id:'quest-feeling', title:'把一种感受变成图像', icon:'💭', output:'视觉情绪参数卡', calls:['风格','相机','深度','光影','材质','压缩'], desc:'将感受翻译为线条、颜色、空间、构图和明暗。'}
  ];

  const concepts = [
    {id:'fov', term:'FOV / 视场角', island:'相机岛', plain:'相机一次能看见多宽。越大越广角，近大远小越强。', computer:'Camera Field of View / Focal Length', drawing:'决定透视夸张程度：广角紧张，长焦安静。', lab:'lab-camera'},
    {id:'vanish', term:'Vanishing Point / 消失点', island:'相机岛', plain:'空间中一组平行线在画面里汇聚的位置。', computer:'Projection of parallel directions', drawing:'检查盒子、房间、街道是否在同一透视系统。', lab:'lab-camera'},
    {id:'depth', term:'Depth Map / 深度图', island:'深度岛', plain:'每个点离相机多远的地图。', computer:'Z-buffer / depth estimation', drawing:'先分远近，不要把阴影当深度。', lab:'lab-depth'},
    {id:'normal', term:'Normal / 法线', island:'表面岛', plain:'表面朝向的小箭头。', computer:'Normal vector / normal map', drawing:'光影跟体块转向有关，明暗交界线沿法线变化。', lab:'lab-light'},
    {id:'diffuse', term:'Diffuse / 漫反射', island:'光影岛', plain:'光打到粗糙表面后向四周散开。', computer:'Lambert shading', drawing:'决定大面积明暗，不等于高光。', lab:'lab-light'},
    {id:'roughness', term:'Roughness / 粗糙度', island:'材质岛', plain:'表面微小凹凸的混乱程度。', computer:'Material roughness', drawing:'高光越粗糙越大、越软、越暗。', lab:'lab-material'},
    {id:'ao', term:'AO / 环境光遮蔽', island:'光影岛', plain:'缝隙、接触处接收不到散射光，所以更暗。', computer:'Ambient Occlusion', drawing:'眼角、嘴角、衣褶深处的暗部来源。', lab:'lab-light'},
    {id:'tension', term:'Tension / 张力线', island:'力学岛', plain:'布、头发、飘带被拉扯的方向。', computer:'Constraint + force direction', drawing:'褶皱线应该从固定点和受力方向生成。', lab:'lab-force'},
    {id:'compression', term:'Information Compression / 信息压缩', island:'压缩岛', plain:'从复杂现实里保留最重要的视觉信息。', computer:'Feature extraction / abstraction', drawing:'漫画、动漫、图解都是不同压缩策略。', lab:'lab-style'}
  ];

  const questRoomSteps = [
    {title:'1 结构：房间是盒体', island:'结构岛', task:'先把房间看成一个打开的盒子：地面、两面墙、天花板。', output:'房间结构卡'},
    {title:'2 坐标：家具落在同一地面', island:'坐标岛', task:'用地面网格检查桌子、窗户、地毯是否共享坐标。', output:'坐标对齐卡'},
    {title:'3 相机：选择一点或两点透视', island:'相机岛', task:'拖动 FOV 和视平线，看空间压缩如何改变情绪。', output:'透视选择卡'},
    {title:'4 深度：分前中后景', island:'深度岛', task:'把房间拆成前景家具、中景人物、远景窗户。', output:'深度层卡'},
    {title:'5 光影：窗光和 AO', island:'光影岛', task:'确定窗光方向，找墙角、桌脚、家具接触处的 AO。', output:'房间光影卡'},
    {title:'6 风格：温暖/孤独/梦幻', island:'风格岛', task:'选择感受，决定视角、颜色、留白和阴影强度。', output:'空间风格卡'}
  ];

  const inspectors = {
    hub:{title:'Hub 世界入口', reality:'你在选择今天探索哪一层世界。', computer:'像游戏主菜单：地图、进度、任务、数据库。', drawing:'先确定学习目标，不在知识里迷路。', action:'打开地图，进入一个岛或任务。'},
    pipeline:{title:'世界管线', reality:'现实不是直接变成画，而是逐层被拆解。', computer:'类似 CG 渲染管线和 CV 分析管线。', drawing:'每一笔都应该知道自己属于结构、深度、光影、材质还是风格。', action:'点击任一管线阶段，查看它连接的岛屿。'},
    islands:{title:'知识岛屿', reality:'每座岛只负责一种核心问题。', computer:'像软件模块，各司其职。', drawing:'避免透视、光影、材质、人脸混成一团。', action:'进入岛屿后按 L1-L4 递进。'},
    quests:{title:'跨岛任务', reality:'真实绘画问题需要多个知识共同工作。', computer:'像项目工作流：多个模块被调用。', drawing:'画房间、人脸、布料、情绪，都是跨岛任务。', action:'先做盒子房间，验证基础管线。'},
    labs:{title:'实验室', reality:'一个变量一次看清。', computer:'小型模拟器。', drawing:'把术语变成可预测的变化。', action:'选概念实验，再保存输出卡。'},
    glossary:{title:'术语星典', reality:'复杂词汇需要被翻译成绘画动作。', computer:'CV / CG / Blender / 绘画术语互译。', drawing:'知道一个词如何改变你的观察和下笔。', action:'搜索术语，进入对应实验。'},
    studio:{title:'信息整合绘画台', reality:'所有知识最终要回到画面。', computer:'参考图、图层、辅助线和输出。', drawing:'用透视、深度、光源、头部坐标辅助自己画。', action:'选择辅助层，画出一张练习。'},
    memory:{title:'个人压缩数据库', reality:'绘画经验是不断积累的可调取模式。', computer:'像个人知识库和素材库。', drawing:'保存结构、错误、风格、练习，形成自己的绘画记忆。', action:'复盘卡片，找最常见错误。'}
  };

  function setRoute(route, sub=null){
    state.route = route; state.sub = sub;
    render();
  }
  function saveProgress(){ localStorage.setItem('drawescape.v10.progress', JSON.stringify(state.progress)); }
  function saveMemory(card){
    state.memory.unshift({...card, time:new Date().toLocaleString()});
    state.memory = state.memory.slice(0,80);
    localStorage.setItem(storeKey, JSON.stringify(state.memory));
    toast('已保存到压缩数据库');
    renderMemoryIfNeeded();
  }
  function toast(msg){
    const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1700);
  }

  function getCrumbs(){
    if(state.route.startsWith('island-')){const id=state.route.replace('island-','');const i=islands.find(x=>x.id===id);return `Drawescape / 知识岛屿 / ${i?.title||id}`;}
    if(state.route.startsWith('quest-')){const q=quests.find(x=>x.id===state.route);return `Drawescape / 跨岛任务 / ${q?.title||state.route}`;}
    if(state.route.startsWith('lab-'))return `Drawescape / 实验室 / ${labTitle(state.route)}`;
    const names={hub:'Hub',pipeline:'世界管线',islands:'知识岛屿',quests:'跨岛任务',labs:'实验室',glossary:'术语星典',studio:'绘画台',memory:'压缩数据库'};
    return `Drawescape / ${names[state.route]||state.route}`;
  }

  function updateShell(){
    $$('#breadcrumb').forEach(x=>x.textContent=getCrumbs());
    $$('.topnav button').forEach(b=>b.classList.toggle('active', b.dataset.route===baseRoute(state.route)));
    renderLocalNav();
    renderInspector();
    $('#questStatus').textContent = statusText();
  }
  function baseRoute(r){ if(r.startsWith('island-'))return 'islands'; if(r.startsWith('quest-'))return 'quests'; if(r.startsWith('lab-'))return 'labs'; return r; }
  function statusText(){
    if(state.route==='hub') return '目标：从地图选择一个岛屿，或继续盒子房间任务。';
    if(state.route.startsWith('quest-')) return `任务进行中：${quests.find(q=>q.id===state.route)?.title||''} / Step ${state.currentQuestStep+1}`;
    if(state.route.startsWith('island-')) return '岛屿学习：按 L1 识别 → L2 预测 → L3 生成 → L4 迁移。';
    if(state.route.startsWith('lab-')) return '实验室：每次只调一个变量，观察它如何改变绘画判断。';
    return '提示：按 M 打开快速地图。';
  }
  function renderInspector(){
    let data = inspectors[baseRoute(state.route)] || inspectors.hub;
    if(state.route.startsWith('island-')){
      const i=islands.find(x=>x.id===state.route.replace('island-',''));
      data={title:i.title,reality:i.core,computer:`对应：${i.duty}`,drawing:'这一岛只负责一个主问题，跨岛任务会调用它。',action:'完成 L1-L4：识别、预测、生成、迁移。'};
    } else if(state.route.startsWith('quest-')){
      const q=quests.find(x=>x.id===state.route);
      data={title:q.title,reality:q.desc,computer:`调用模块：${q.calls.join(' / ')}`,drawing:`输出：${q.output}`,action:'按左侧步骤推进，每步保存一张卡。'};
    } else if(state.route.startsWith('lab-')){
      data=labInspector(state.route);
    }
    $('#inspector').innerHTML = ['reality','computer','drawing','action'].map((k,idx)=>{
      const label=['现实问题','计算机/建模','绘画转译','现在操作'][idx];
      return `<div class="inspect-block"><b>${label}</b><p>${data[k]}</p></div>`;
    }).join('');
  }
  function renderLocalNav(){
    const box=$('#localNav');
    if(state.route.startsWith('island-')){
      const id=state.route.replace('island-',''); const i=islands.find(x=>x.id===id);
      box.innerHTML = `<button class="active"><span>${i.icon} ${i.title} 总平面</span><small>${i.core}</small></button>` + i.levels.map((l,idx)=>`<button data-level="${idx}"><span>L${idx+1} ${['识别','预测','生成','迁移'][idx]}</span><small>${l}</small></button>`).join('') + `<button data-route="labs"><span>进入相关实验</span><small>用变量观察原理。</small></button>`;
    } else if(state.route.startsWith('quest-')){
      box.innerHTML = questRoomSteps.map((s,idx)=>`<button class="${idx===state.currentQuestStep?'active':''}" data-qstep="${idx}"><span>${s.title}</span><small>${s.island} · ${s.output}</small></button>`).join('');
    } else if(state.route==='pipeline'){
      box.innerHTML = pipeline.map(p=>`<button data-pipe="${p.id}"><span>${p.icon} ${p.title}</span><small>${p.short}</small></button>`).join('');
    } else if(state.route==='labs'){
      box.innerHTML = ['lab-camera','lab-depth','lab-light','lab-material','lab-force','lab-style'].map(id=>`<button data-route="${id}"><span>${labTitle(id)}</span><small>概念实验</small></button>`).join('');
    } else {
      box.innerHTML = [
        ['pipeline','世界管线','现实如何变成画'],['islands','知识岛屿','十个核心问题'],['quests','跨岛任务','把知识串起来'],['labs','实验室','变量与反馈'],['glossary','术语星典','名词互译'],['studio','绘画台','输出练习'],['memory','压缩数据库','保存经验']
      ].map(x=>`<button data-route="${x[0]}"><span>${x[1]}</span><small>${x[2]}</small></button>`).join('');
    }
  }

  function render(){
    updateShell();
    const view=$('#routeView');
    if(state.route==='hub') view.innerHTML = hubHTML();
    else if(state.route==='pipeline') view.innerHTML = pipelineHTML();
    else if(state.route==='islands') view.innerHTML = islandsHTML();
    else if(state.route.startsWith('island-')) view.innerHTML = islandHTML(state.route.replace('island-',''));
    else if(state.route==='quests') view.innerHTML = questsHTML();
    else if(state.route.startsWith('quest-')) view.innerHTML = questHTML(state.route);
    else if(state.route==='labs') view.innerHTML = labsHTML();
    else if(state.route.startsWith('lab-')) view.innerHTML = labHTML(state.route);
    else if(state.route==='glossary') view.innerHTML = glossaryHTML();
    else if(state.route==='studio') view.innerHTML = studioHTML();
    else if(state.route==='memory') view.innerHTML = memoryHTML();
    bindRouteEvents();
    afterRender();
  }

  function hubHTML(){
    return `<div class="route-page">
      <section class="hero">
        <div>
          <div class="progress-pill">Navigation Quest Edition · V10</div>
          <h1>Drawescape</h1>
          <p>一个把现实折叠成画的交互学习游戏。你会像探索地图一样学习：结构、坐标、相机、深度、表面、光影、材质、力学、压缩和风格。</p>
          <div class="hero-actions">
            <button class="primary" data-route="quest-room">开始今日一关：盒子房间</button>
            <button data-action="open-map">打开总平面图</button>
            <button data-route="pipeline">查看世界管线</button>
          </div>
        </div>
        <div class="hud-card">
          <div class="stage-label">今日导航台</div>
          <h2>先做一关，不在知识里迷路</h2>
          <p>目标：理解“房间 = 盒体 + 相机 + 深度 + 光”。输出一张可保存的透视房间知识卡。</p>
          <div class="star-grid">
            <div class="stat"><b>${state.memory.length}</b><span>已保存卡片</span></div>
            <div class="stat"><b>10</b><span>知识岛屿</span></div>
            <div class="stat"><b>4</b><span>跨岛任务</span></div>
            <div class="stat"><b>M</b><span>快速地图键</span></div>
          </div>
        </div>
      </section>
      <section class="section-title"><div><h2>三种入口</h2><p>按目标进入，而不是在页面里迷路。</p></div></section>
      <div class="grid">
        <article class="card"><h3>我想理解一个原理</h3><p>进入知识岛屿：例如 FOV、深度图、法线、明暗交界线、粗糙度。</p><button data-route="islands">进入岛屿地图</button></article>
        <article class="card"><h3>我想画一个东西</h3><p>进入跨岛任务：房间、人脸、布料、水边场景。任务会自动调用相关岛屿。</p><button data-route="quests">进入任务地图</button></article>
        <article class="card"><h3>我想表达一种感受</h3><p>进入风格岛：把安静、紧张、孤独、温暖、梦幻翻译成视觉参数。</p><button data-route="lab-style">进入风格实验</button></article>
      </div>
    </div>`;
  }
  function pipelineHTML(){
    return `<div class="route-page padded"><section class="section-title"><div><h2>世界管线</h2><p>固定主脊柱：现实如何一步步变成画。</p></div><button data-action="open-map">地图</button></section><div class="mapline">${pipeline.map((p,idx)=>`<div class="node-row" data-pipe="${p.id}"><div class="node-index">${idx+1}</div><div><b>${p.icon} ${p.title}</b><small>${p.short}｜${p.computer} → ${p.drawing}</small></div><button data-pipe-open="${p.id}">检查</button></div>`).join('')}</div></div>`;
  }
  function islandsHTML(){
    return `<div class="route-page padded"><section class="section-title"><div><h2>知识岛屿</h2><p>每座岛只负责一个主问题，避免混合。</p></div><button data-action="open-map">地图</button></section><div class="grid">${islands.map(i=>`<article class="card"><h3>${i.icon} ${i.title}</h3><p><b>${i.core}</b><br>${i.duty}</p><div class="tagrow">${i.levels.map((l,idx)=>`<span class="tag">L${idx+1} ${l}</span>`).join('')}</div><button data-route="island-${i.id}">进入岛屿</button></article>`).join('')}</div></div>`;
  }
  function islandHTML(id){
    const i=islands.find(x=>x.id===id) || islands[0];
    const related = concepts.filter(c=>c.island===i.title).concat(concepts.filter(c=>c.island.includes(i.title.replace('岛','')))).slice(0,4);
    return `<div class="route-page padded"><section class="section-title"><div><h2>${i.icon} ${i.title}</h2><p>${i.core}</p></div><button data-action="open-map">总平面</button></section><div class="split"><div class="card"><h3>岛屿主责边界</h3><p>${i.duty}</p><div class="mapline">${i.levels.map((l,idx)=>`<div class="node-row"><div class="node-index">L${idx+1}</div><div><b>${['识别','预测','生成','迁移'][idx]}</b><small>${l}</small></div><button data-complete-level="${idx}">标记完成</button></div>`).join('')}</div></div><div class="card"><h3>本岛可深化位置</h3><p>以后新增内容时，只要属于本岛主问题，就添加到这里；否则进入跨岛任务。</p><div class="tagrow">${(related.length?related:concepts.slice(0,3)).map(c=>`<button data-concept="${c.id}">${c.term}</button>`).join('')}</div><div class="output-preview">输出目标：完成本岛任意关卡后，保存“${i.title}理解卡”。</div></div></div></div>`;
  }
  function questsHTML(){
    return `<div class="route-page padded"><section class="section-title"><div><h2>跨岛任务</h2><p>真实绘画问题调用多个岛屿，任务负责串联。</p></div><button data-action="open-map">地图</button></section><div class="grid">${quests.map(q=>`<article class="card"><h3>${q.icon} ${q.title}</h3><p>${q.desc}</p><div class="tagrow">${q.calls.map(c=>`<span class="tag">${c}</span>`).join('')}</div><button data-route="${q.id}">进入任务</button><small class="hint">输出：${q.output}</small></article>`).join('')}</div></div>`;
  }
  function questHTML(id){
    const q=quests.find(x=>x.id===id) || quests[0];
    if(id!=='quest-room'){
      return `<div class="route-page padded"><section class="section-title"><div><h2>${q.icon} ${q.title}</h2><p>${q.desc}</p></div><button data-route="quests">返回任务地图</button></section><div class="card"><h3>任务骨架已预留</h3><p>V10 先完整实现“盒子房间”。这个任务后续会按同样结构加入详细关卡。</p><div class="tagrow">${q.calls.map(c=>`<span class="tag">${c}</span>`).join('')}</div><button data-route="quest-room">先做盒子房间</button></div></div>`;
    }
    const s=questRoomSteps[state.currentQuestStep];
    return `<div class="route-page padded"><section class="section-title"><div><h2>🏠 任务：画一个盒子房间</h2><p>第一个完整跨岛任务：用房间验证结构、坐标、相机、深度、光影、材质、风格。</p></div><button data-route="quests">任务地图</button></section><div class="lab-wrap"><div class="canvas-card"><canvas id="questCanvas" width="880" height="520"></canvas></div><div class="controls"><div class="card"><h3>${s.title}</h3><p>${s.task}</p><div class="tagrow"><span class="tag">${s.island}</span><span class="tag">输出：${s.output}</span></div><button class="primary" data-check-quest>检查这一步</button><button data-save-step>保存本步卡片</button></div><div class="card"><h3>步骤导航</h3><div class="quest-steps">${questRoomSteps.map((st,idx)=>`<button class="${idx===state.currentQuestStep?'active':''}" data-qstep="${idx}"><b>${st.title}</b><small>${st.island}</small></button>`).join('')}</div></div></div></div></div>`;
  }
  function labsHTML(){
    const labs=['lab-camera','lab-depth','lab-light','lab-material','lab-force','lab-style'];
    return `<div class="route-page padded"><section class="section-title"><div><h2>实验室</h2><p>概念实验：一次只调一个变量，理解它如何改变绘画判断。</p></div></section><div class="grid">${labs.map(id=>`<article class="card"><h3>${labTitle(id)}</h3><p>${labInspector(id).reality}</p><button data-route="${id}">进入实验</button></article>`).join('')}</div></div>`;
  }
  function labHTML(id){
    return `<div class="route-page padded"><section class="section-title"><div><h2>${labTitle(id)}</h2><p>${labInspector(id).action}</p></div><button data-route="labs">实验室地图</button></section><div class="lab-wrap"><div class="canvas-card"><canvas id="labCanvas" width="860" height="520"></canvas></div><div class="controls" id="labControls"></div></div></div>`;
  }
  function labTitle(id){return {'lab-camera':'📷 相机塔：FOV / 透视','lab-depth':'🌊 深度湖：前中后景','lab-light':'💡 光之月台：明暗交界线','lab-material':'🧪 材质星市：粗糙度与高光','lab-force':'🌬️ 褶皱山谷：固定点与张力','lab-style':'🌈 风格云城：感受转译'}[id]||id;}
  function labInspector(id){
    const map={
      'lab-camera':{reality:'同一个物体，在不同相机视角下会被压缩成不同图像。',computer:'FOV / Perspective Projection / Camera',drawing:'广角夸张，长焦压平；透视也是观看方式。',action:'调 FOV、Depth、Yaw，观察前后边如何变化。'},
      'lab-depth':{reality:'空间判断先于阴影判断。',computer:'Depth Map / Z-buffer / Occlusion',drawing:'先分前中后景，再上明暗和颜色。',action:'拖动层级强度，观察空间层如何影响画面。'},
      'lab-light':{reality:'明暗交界线来自表面转向与光源关系。',computer:'Normal · Light / Diffuse / AO',drawing:'暗部跟体块走，不是随便涂黑。',action:'拖动光源角度，预测交界线移动。'},
      'lab-material':{reality:'不同材质对同一束光反应不同。',computer:'Shader / Roughness / Metallic / Specular',drawing:'高光形状、边缘、强度告诉你材质。',action:'调粗糙度、金属度，看高光如何变。'},
      'lab-force':{reality:'褶皱是力的地图。',computer:'Constraint / Gravity / Tension / Stiffness',drawing:'先找固定点和受力方向，再画褶皱线。',action:'调重力、硬度和风向，观察主褶皱。'},
      'lab-style':{reality:'感受要翻译成视觉参数。',computer:'Parameter system / Visual hierarchy',drawing:'线条、色彩、空间、明暗一起表达情绪。',action:'选择感受，生成风格参数卡。'}
    }; return map[id]||inspectors.labs;
  }
  function glossaryHTML(){
    return `<div class="route-page padded"><section class="section-title"><div><h2>术语星典</h2><p>把 CV / CG / Blender / 绘画术语翻译成可操作的绘画判断。</p></div></section><div class="card"><input id="glossSearch" placeholder="搜索：FOV / 法线 / 深度 / 粗糙度..." /></div><div class="glossary-list" id="glossList">${concepts.map(glossItem).join('')}</div></div>`;
  }
  function glossItem(c){return `<article class="card glossary-item" data-concept="${c.id}"><h3>${c.term}</h3><p>${c.plain}</p><div class="tagrow"><span class="tag">${c.island}</span><span class="tag">${c.computer}</span></div></article>`;}
  function studioHTML(){
    return `<div class="route-page padded"><section class="section-title"><div><h2>信息整合绘画台</h2><p>把知识输出到画面：辅助线不是装饰，而是检查系统。</p></div></section><div class="card"><div class="studio-tools"><button data-tool="pen" class="active">画笔</button><button data-tool="eraser">橡皮</button><button data-overlay="perspective">透视辅助</button><button data-overlay="depth">深度三层</button><button data-overlay="head">头部坐标</button><button data-overlay="light">光源箭头</button><button data-action="clear-studio">清空</button><button data-action="export-studio">导出 PNG</button></div><canvas id="studioCanvas" width="980" height="620"></canvas><p class="small-note">建议：选择一个任务步骤，打开对应辅助层，然后只画一类信息。</p></div></div>`;
  }
  function memoryHTML(){
    return `<div class="route-page padded"><section class="section-title"><div><h2>我的压缩数据库</h2><p>绘画经验不是从零开始，而是逐步积累可调取的结构、错误、风格和练习。</p></div><button data-action="clear-memory">清空示例</button></section><div class="memory-list" id="memoryList">${memoryListHTML()}</div></div>`;
  }
  function memoryListHTML(){
    if(!state.memory.length) return `<div class="card"><h3>还没有卡片</h3><p>在任意岛屿、任务或实验里点击“保存当前位置理解”，就会生成一张知识卡。</p></div>`;
    return state.memory.map((m,idx)=>`<div class="memory-item"><b>${m.title}</b><small>${m.time} · ${m.type||'知识卡'}</small><p>${m.note||''}</p><button data-del-memory="${idx}">删除</button></div>`).join('');
  }

  function bindRouteEvents(){
    $$('[data-route]').forEach(btn=>btn.onclick=()=>setRoute(btn.dataset.route));
    $$('[data-action="open-map"]').forEach(b=>b.onclick=openMap);
    $$('[data-qstep]').forEach(b=>b.onclick=()=>{state.currentQuestStep=+b.dataset.qstep;render();});
    $$('[data-check-quest]').forEach(b=>b.onclick=()=>checkQuestStep());
    $$('[data-save-step]').forEach(b=>b.onclick=()=>{const s=questRoomSteps[state.currentQuestStep];saveMemory({title:s.output,type:'任务步骤卡',note:s.task});});
    $$('[data-complete-level]').forEach(b=>b.onclick=()=>{toast('已记录：完成本层。下一步请尝试迁移到任务。');});
    $$('[data-concept]').forEach(b=>b.onclick=()=>openConcept(b.dataset.concept));
    $$('[data-pipe-open]').forEach(b=>b.onclick=()=>inspectPipe(b.dataset.pipeOpen));
    $$('[data-pipe]').forEach(b=>b.onclick=()=>inspectPipe(b.dataset.pipe));
    const gs=$('#glossSearch'); if(gs){gs.oninput=()=>{const q=gs.value.trim().toLowerCase();$('#glossList').innerHTML=concepts.filter(c=>(c.term+c.plain+c.computer+c.drawing).toLowerCase().includes(q)).map(glossItem).join('')||'<div class="card">没有找到。</div>';bindRouteEvents();};}
    $$('[data-del-memory]').forEach(b=>b.onclick=()=>{state.memory.splice(+b.dataset.delMemory,1);localStorage.setItem(storeKey,JSON.stringify(state.memory));render();});
    $$('[data-action="clear-memory"]').forEach(b=>b.onclick=()=>{state.memory=[];localStorage.setItem(storeKey,'[]');render();});
  }
  function afterRender(){
    if(state.route==='quest-room') drawQuestCanvas();
    if(state.route.startsWith('lab-')) setupLab(state.route);
    if(state.route==='studio') setupStudio();
  }
  function inspectPipe(id){
    const p=pipeline.find(x=>x.id===id); if(!p)return;
    $('#feedback').innerHTML = `<b>${p.icon} ${p.title}</b><br>${p.short}<br><br><b>计算机对应：</b>${p.computer}<br><b>绘画转译：</b>${p.drawing}`;
  }
  function openConcept(id){
    const c=concepts.find(x=>x.id===id); if(!c)return;
    $('#feedback').innerHTML = `<b>${c.term}</b><br>${c.plain}<br><br><b>计算机：</b>${c.computer}<br><b>绘画：</b>${c.drawing}<br><br><button data-route="${c.lab}">进入相关实验</button>`;
    bindRouteEvents();
  }

  function drawQuestCanvas(){
    const c=$('#questCanvas'); if(!c)return; const ctx=c.getContext('2d'); const w=c.width,h=c.height; ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#fff8eb';ctx.fillRect(0,0,w,h);
    // room perspective
    const cx=w*.52, hy=h*.43; const vp={x:cx,y:hy};
    ctx.strokeStyle='#d7c4a8';ctx.lineWidth=1;ctx.setLineDash([6,8]);
    for(let x=60;x<w;x+=80){line(ctx,x,h-40,vp.x,vp.y)}; for(let y=80;y<h-20;y+=70){line(ctx,60,y,vp.x,vp.y);line(ctx,w-60,y,vp.x,vp.y)}
    ctx.setLineDash([]);ctx.strokeStyle='#263445';ctx.lineWidth=3;line(ctx,90,70,90,h-50);line(ctx,w-90,70,w-90,h-50);line(ctx,90,70,w-90,70);line(ctx,90,h-50,w-90,h-50);line(ctx,90,70,vp.x,vp.y);line(ctx,w-90,70,vp.x,vp.y);line(ctx,90,h-50,vp.x,vp.y);line(ctx,w-90,h-50,vp.x,vp.y);
    // furniture blocks
    ctx.strokeStyle='#4267c9';ctx.lineWidth=2;rect(ctx,170,330,150,86);line(ctx,170,330,vp.x,vp.y);line(ctx,320,330,vp.x,vp.y);line(ctx,170,416,vp.x,vp.y);line(ctx,320,416,vp.x,vp.y);
    ctx.strokeStyle='#d78742';rect(ctx,610,180,120,85);line(ctx,610,180,vp.x,vp.y);line(ctx,730,180,vp.x,vp.y);
    // light
    if(state.currentQuestStep>=4){ctx.fillStyle='rgba(255,209,102,.22)';ctx.beginPath();ctx.moveTo(610,180);ctx.lineTo(340,440);ctx.lineTo(500,445);ctx.lineTo(730,180);ctx.fill(); ctx.fillStyle='#7b4c00'; ctx.fillText('窗光方向 / shadows follow geometry',620,160);}
    if(state.currentQuestStep>=3){ctx.fillStyle='rgba(84,199,216,.18)';ctx.fillRect(0,h*.55,w,h*.45);ctx.fillStyle='#28616a';ctx.fillText('前景 / 中景 / 远景分层',40,h-32);}
    ctx.fillStyle='#24313b';ctx.font='bold 20px system-ui';ctx.fillText(questRoomSteps[state.currentQuestStep].title,30,38);ctx.font='14px system-ui';ctx.fillStyle='#65737d';ctx.fillText('输出：'+questRoomSteps[state.currentQuestStep].output,30,60);
  }
  function line(ctx,x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function rect(ctx,x,y,w,h){ctx.strokeRect(x,y,w,h)}
  function checkQuestStep(){
    const s=questRoomSteps[state.currentQuestStep];
    $('#feedback').innerHTML = `<b>检查：${s.title}</b><br>${s.task}<br><br>通关标准：你能说出这一步属于哪个岛、改变了哪种绘画判断，并保存一张“${s.output}”。`;
    if(state.currentQuestStep<questRoomSteps.length-1){state.currentQuestStep++;setTimeout(render,900);} else toast('盒子房间任务完成！可以保存总卡片。');
  }

  function setupLab(id){
    const c=$('#labCanvas'), controls=$('#labControls'); if(!c||!controls)return; const ctx=c.getContext('2d');
    const data={fov:55,depth:55,yaw:20,near:50,mid:50,far:50,light:40,rough:45,metal:15,gravity:55,stiff:45,wind:30,feeling:'安静'};
    const controlHTML={
      'lab-camera':`<div class="card"><h3>操作解释</h3><p>你正在调相机参数。观察近处边和远处边如何被投影压缩。</p></div>${slider('fov','FOV 视场角',20,100,55)}${slider('depth','Depth 深度',10,100,55)}${slider('yaw','Yaw 旋转',-45,45,20)}<button class="primary" data-save-lab>保存 FOV 对比卡</button>`,
      'lab-depth':`<div class="card"><h3>操作解释</h3><p>你正在调空间层权重。深度不是阴影；它回答谁离你更近。</p></div>${slider('near','前景强度',0,100,70)}${slider('mid','中景强度',0,100,50)}${slider('far','远景强度',0,100,30)}<button class="primary" data-save-lab>保存深度层卡</button>`,
      'lab-light':`<div class="card"><h3>操作解释</h3><p>你正在调光源方向。明暗交界线跟表面朝向有关。</p></div>${slider('light','光源方向',0,180,40)}<button class="primary" data-save-lab>保存明暗交界线卡</button>`,
      'lab-material':`<div class="card"><h3>操作解释</h3><p>你正在调材质参数。粗糙度改变高光大小；金属度改变环境反射。</p></div>${slider('rough','Roughness 粗糙度',0,100,45)}${slider('metal','Metalness 金属度',0,100,15)}<button class="primary" data-save-lab>保存材质反应卡</button>`,
      'lab-force':`<div class="card"><h3>操作解释</h3><p>你正在调力学参数。褶皱从固定点、重力、张力和材料硬度生成。</p></div>${slider('gravity','重力',0,100,55)}${slider('stiff','材料硬度',0,100,45)}${slider('wind','风向/风力',0,100,30)}<button class="primary" data-save-lab>保存褶皱力线卡</button>`,
      'lab-style':`<div class="card"><h3>操作解释</h3><p>选择感受，系统把它翻译为线条、空间、颜色、明暗和构图。</p></div><div class="control"><label>感受</label><select id="feeling"><option>安静</option><option>紧张</option><option>孤独</option><option>温暖</option><option>梦幻</option><option>勇气</option></select></div><button class="primary" data-save-lab>保存风格参数卡</button>`
    };
    controls.innerHTML=controlHTML[id];
    function read(){ $$('#labControls input').forEach(i=>data[i.id]=+i.value); const f=$('#feeling'); if(f)data.feeling=f.value; drawLab(ctx,c,id,data); }
    $$('#labControls input,#labControls select').forEach(i=>i.oninput=read);
    $('[data-save-lab]',controls).onclick=()=>saveMemory({title:labTitle(id),type:'实验输出卡',note:labInspector(id).drawing});
    read();
  }
  function slider(id,label,min,max,val){return `<div class="control"><label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" value="${val}"></div>`}
  function drawLab(ctx,c,id,d){const w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff8eb';ctx.fillRect(0,0,w,h);ctx.font='bold 20px system-ui';ctx.fillStyle='#24313b';ctx.fillText(labTitle(id),28,38);ctx.font='14px system-ui';
    if(id==='lab-camera'){const f=d.fov/100;const z=d.depth/100;const cx=w/2,cy=h/2;const scale=1+f*1.8;const front=120*scale,back=120*(1-f*.55)*z+40;ctx.strokeStyle='#d6c3aa';ctx.setLineDash([5,6]);line(ctx,cx-front,cy+140,cx,cy);line(ctx,cx+front,cy+140,cx,cy);ctx.setLineDash([]);ctx.strokeStyle='#22314a';ctx.lineWidth=3;ctx.strokeRect(cx-front/2,cy+60,front,front*.55);ctx.strokeRect(cx-back/2+d.yaw*1.5,cy-70,back,back*.55);line(ctx,cx-front/2,cy+60,cx-back/2+d.yaw*1.5,cy-70);line(ctx,cx+front/2,cy+60,cx+back/2+d.yaw*1.5,cy-70);ctx.fillText(`FOV=${d.fov}：越大越夸张；Depth=${d.depth}：深度越强前后差越大`,28,h-28);}
    if(id==='lab-depth'){const layers=[['前景',d.near,'#ffd166'],['中景',d.mid,'#54c7d8'],['远景',d.far,'#8e7cf4']];layers.forEach((l,i)=>{ctx.globalAlpha=.25+l[1]/150;ctx.fillStyle=l[2];ctx.fillRect(80+i*210,120+i*42,180,240-i*38);ctx.globalAlpha=1;ctx.fillStyle='#24313b';ctx.fillText(l[0],110+i*210,105+i*42);});ctx.fillText('练习：先分空间层，再画阴影。不要把黑当远。',28,h-28);}
    if(id==='lab-light'){const cx=w/2,cy=h/2,r=145;const a=d.light*Math.PI/180;ctx.fillStyle='#f5d5a8';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();const lx=cx+Math.cos(a)*230,ly=cy-Math.sin(a)*180;ctx.strokeStyle='#ffd166';ctx.lineWidth=4;line(ctx,lx,ly,cx,cy);ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(lx,ly,14,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#111827';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(cx,cy,r*.74,r*.97,Math.PI/2-a,Math.PI*.15,Math.PI*1.15);ctx.stroke();ctx.fillStyle='rgba(30,40,60,.28)';ctx.beginPath();ctx.arc(cx+r*.25*Math.cos(a+Math.PI),cy-r*.18*Math.sin(a+Math.PI),r*.78,0,Math.PI*2);ctx.fill();ctx.fillStyle='#24313b';ctx.fillText('黑线 = 明暗交界线示意。它跟体块转向和光源有关。',28,h-28);}
    if(id==='lab-material'){const cx=w/2,cy=h/2,r=140;ctx.fillStyle=d.metal>50?'#b7c2d2':'#eab092';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();const size=18+d.rough*1.1;ctx.fillStyle=`rgba(255,255,255,${.92-d.rough/160})`;ctx.beginPath();ctx.ellipse(cx-r*.35,cy-r*.42,size,size*.55,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=d.metal>50?'rgba(70,90,140,.8)':'rgba(140,90,60,.45)';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(cx,cy,r-18-i*16,Math.PI*.1,Math.PI*.9);ctx.stroke();}ctx.fillStyle='#24313b';ctx.fillText(`粗糙度 ${d.rough}：高光越大越散；金属度 ${d.metal}：环境反射更强。`,28,h-28);}
    if(id==='lab-force'){const topY=100;const left=260,right=600;ctx.fillStyle='#24313b';ctx.fillRect(left-5,topY-5,10,10);ctx.fillRect(right-5,topY-5,10,10);ctx.strokeStyle='#22314a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(left,topY);for(let i=0;i<=12;i++){const t=i/12;const x=left+(right-left)*t;const sag=(d.gravity*1.8)*(Math.sin(Math.PI*t));const wave=(100-d.stiff)/6*Math.sin(t*Math.PI*6+d.wind/15);ctx.lineTo(x,topY+sag+wave);}ctx.lineTo(right,topY);ctx.stroke();ctx.strokeStyle='#d78742';ctx.lineWidth=2;for(let i=1;i<9;i++){const t=i/9;const x=left+(right-left)*t;line(ctx,x,topY+12,x+(d.wind-50)*.7,topY+130+d.gravity*.8*Math.sin(Math.PI*t));}ctx.fillStyle='#24313b';ctx.fillText('固定点 → 张力线 → 重力下垂 → 材料硬度决定褶皱锐钝。',28,h-28);}
    if(id==='lab-style'){const params={安静:['长线','低饱和','大留白','柔光'],紧张:['尖线','高对比','倾斜构图','硬阴影'],孤独:['小人物','冷色','大空间','远景'],温暖:['圆线','暖色','包围感','柔边缘'],梦幻:['漂浮','渐变','边缘光','弱透视'],勇气:['上升线','金色','强中心','高亮']};const arr=params[d.feeling]||params.安静;ctx.fillStyle='#24313b';ctx.font='bold 48px system-ui';ctx.fillText(d.feeling,80,150);ctx.font='bold 28px system-ui';arr.forEach((p,i)=>{ctx.fillStyle=['#54c7d8','#ffd166','#8e7cf4','#f39ab5'][i];ctx.fillRect(100+i*170,230,130,90);ctx.fillStyle='#111827';ctx.fillText(p,118+i*170,285);});ctx.font='14px system-ui';ctx.fillStyle='#24313b';ctx.fillText('感受不是直接画出来，而是翻译成线条、颜色、空间、明暗。',28,h-28);}
  }

  let studioCtx, studioLast, studioOverlays={perspective:false,depth:false,head:false,light:false};
  function setupStudio(){const c=$('#studioCanvas'); if(!c)return; studioCtx=c.getContext('2d'); studioCtx.fillStyle='#fffaf2';studioCtx.fillRect(0,0,c.width,c.height); drawStudioOverlays(); $$('.studio-tools [data-tool]').forEach(b=>b.onclick=()=>{$$('.studio-tools [data-tool]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.studioTool=b.dataset.tool;});$$('[data-overlay]').forEach(b=>b.onclick=()=>{const k=b.dataset.overlay;studioOverlays[k]=!studioOverlays[k];b.classList.toggle('active',studioOverlays[k]); redrawStudioBase();});$('[data-action="clear-studio"]')?.addEventListener('click',()=>{studioCtx.clearRect(0,0,c.width,c.height);studioCtx.fillStyle='#fffaf2';studioCtx.fillRect(0,0,c.width,c.height);drawStudioOverlays();});$('[data-action="export-studio"]')?.addEventListener('click',()=>{const a=document.createElement('a');a.download='drawescape-studio.png';a.href=c.toDataURL('image/png');a.click();});c.onpointerdown=e=>{state.studioDrawing=true;studioLast=pos(e,c);};c.onpointermove=e=>{if(!state.studioDrawing)return;const p=pos(e,c);studioCtx.strokeStyle=state.studioTool==='eraser'?'#fffaf2':'#24313b';studioCtx.lineWidth=state.studioTool==='eraser'?18:3;studioCtx.lineCap='round';line(studioCtx,studioLast.x,studioLast.y,p.x,p.y);studioLast=p;};window.onpointerup=()=>state.studioDrawing=false;}
  function redrawStudioBase(){const c=$('#studioCanvas');studioCtx.fillStyle='rgba(255,250,242,.92)';studioCtx.fillRect(0,0,c.width,c.height);drawStudioOverlays();}
  function drawStudioOverlays(){const c=$('#studioCanvas'); if(!c||!studioCtx)return; const ctx=studioCtx,w=c.width,h=c.height;if(studioOverlays.perspective){ctx.strokeStyle='rgba(84,199,216,.55)';ctx.setLineDash([6,8]);const vp={x:w*.5,y:h*.38};for(let x=0;x<w;x+=80)line(ctx,x,h,vp.x,vp.y);ctx.setLineDash([]);} if(studioOverlays.depth){ctx.fillStyle='rgba(255,209,102,.13)';ctx.fillRect(0,h*.62,w,h*.38);ctx.fillStyle='rgba(84,199,216,.13)';ctx.fillRect(0,h*.35,w,h*.27);ctx.fillStyle='rgba(142,124,244,.13)';ctx.fillRect(0,0,w,h*.35);} if(studioOverlays.head){ctx.strokeStyle='rgba(238,140,117,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(w*.5,h*.46,90,120,0,0,Math.PI*2);ctx.stroke();line(ctx,w*.5,h*.28,w*.5,h*.66);line(ctx,w*.39,h*.44,w*.61,h*.44);line(ctx,w*.42,h*.54,w*.58,h*.54);} if(studioOverlays.light){ctx.strokeStyle='rgba(255,180,40,.9)';ctx.lineWidth=4;line(ctx,w*.15,h*.15,w*.45,h*.42);ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(w*.15,h*.15,18,0,Math.PI*2);ctx.fill();}}
  function pos(e,c){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}}

  function openMap(){renderMap();$('#mapOverlay').hidden=false;}
  function closeMap(){$('#mapOverlay').hidden=true;}
  function renderMap(){
    const tab=state.mapTab;
    let items=[];
    if(tab==='world') items=[['hub','Hub','游戏入口'],['pipeline','世界管线','现实到绘画'],['islands','知识岛屿','十个主问题'],['quests','跨岛任务','综合应用'],['labs','实验室','变量探索'],['glossary','术语星典','名词互译'],['studio','绘画台','输出练习'],['memory','压缩数据库','积累经验']];
    if(tab==='pipeline') items=pipeline.map(p=>[p.id,p.title,p.short,'pipeline']);
    if(tab==='islands') items=islands.map(i=>[`island-${i.id}`,i.title,i.core]);
    if(tab==='quests') items=quests.map(q=>[q.id,q.title,q.output]);
    $('#worldMap').innerHTML=items.map(it=>`<div class="map-node ${it[0]===state.route?'active':''}" data-map-route="${it[0]}" data-map-kind="${it[3]||''}"><b>${it[1]}</b><small>${it[2]}</small></div>`).join('');
    $$('[data-map-route]').forEach(n=>n.onclick=()=>{const r=n.dataset.mapRoute;if(n.dataset.mapKind==='pipeline'){state.mapTab='pipeline';inspectPipe(r);setRoute('pipeline');}else setRoute(r);closeMap();});
  }
  function renderMemoryIfNeeded(){ if(state.route==='memory') $('#memoryList').innerHTML=memoryListHTML(); }

  $('#openMapBtn').onclick=openMap; $('#openLocalMapBtn').onclick=openMap; $('#closeMapBtn').onclick=closeMap;
  $('#saveCardBtn').onclick=()=>saveMemory({title:getCrumbs().split('/').pop().trim(),type:'当前位置知识卡',note:$('#feedback').innerText.slice(0,220)});
  $('#focusBtn').onclick=()=>document.body.classList.toggle('low-load');
  $('#prevBtn').onclick=()=>{ if(state.route==='quest-room'&&state.currentQuestStep>0){state.currentQuestStep--;render();} else history.back(); };
  $('#nextBtn').onclick=()=>{ if(state.route==='quest-room'&&state.currentQuestStep<questRoomSteps.length-1){state.currentQuestStep++;render();} else openMap(); };
  $$('.topnav button,.brand').forEach(b=>b.onclick=()=>setRoute(b.dataset.route));
  $$('.map-tab').forEach(b=>b.onclick=()=>{$$('.map-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mapTab=b.dataset.map;renderMap();});
  document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m'){$('#mapOverlay').hidden?openMap():closeMap();} if(e.key==='Escape')closeMap();});
  document.body.addEventListener('click',e=>{const b=e.target.closest('[data-route]'); if(b)setRoute(b.dataset.route);});
  render();
})();
