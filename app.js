'use strict';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t)=>a+(b-a)*t;
const TAU = Math.PI * 2;

const pipeline = [
  {t:'观察采样', en:'Observe', d:'眼睛像相机一样采样，但大脑会主动补全。', c:'#54c6d3'},
  {t:'拆层分析', en:'Scan', d:'结构、深度、法线、光、材质、力、情绪分开看。', c:'#8f7be8'},
  {t:'坐标对齐', en:'Align', d:'建立画面坐标、物体坐标、相机坐标。', c:'#4a8fd6'},
  {t:'几何建模', en:'Model', d:'用球、盒、柱、曲面和拓扑理解对象。', c:'#77a987'},
  {t:'光学渲染', en:'Render', d:'法线、漫反射、高光、AO、材质生成明暗。', c:'#f5b94f'},
  {t:'二维折叠', en:'Fold', d:'把三维世界投影并压缩到平面。', c:'#ee8e8e'},
  {t:'风格表达', en:'Style', d:'决定保留、删除、夸张哪些信息。', c:'#d38df0'}
];

const islands = [
  {id:'line', icon:'〰️', name:'线之海', core:'线不是线，是信息边界。', color:'#54c6d3',
    real:['轮廓随视角改变','结构转折产生边界','力线记录运动或张力'],
    science:['拓扑 Edge / Face','曲率变化','特征提取与压缩'],
    drawing:['轮廓线','结构线','褶皱线','漫画强调线'],
    practice:['同一物体旋转后找轮廓','只用 5 条线压缩物体','区分结构线和装饰线']},
  {id:'ratio', icon:'📐', name:'比例森林', core:'画准不是背比例，是坐标系一致。', color:'#77a987',
    real:['对象有相对尺度','局部关系依附全局坐标','负形能校验比例'],
    science:['坐标系','向量长度比','关键点匹配'],
    drawing:['锚点','对齐线','参考单位','比例误差'],
    practice:['记住 5 个锚点再复原','用一个单位搭建人物','检查眼鼻口是否同坐标系']},
  {id:'camera', icon:'📷', name:'相机塔', core:'透视是一种观看世界的方式。', color:'#4a8fd6',
    real:['近大远小','平行线汇聚','视平线跟眼高相关'],
    science:['针孔相机','投影矩阵','FOV / 焦距','消失点'],
    drawing:['一点/两点/三点透视','广角/长焦','轴测/散点'],
    practice:['拖相机高度','调 FOV','修复错误盒子','比较正交和透视']},
  {id:'depth', icon:'🌊', name:'深度湖', core:'深度不是阴影。', color:'#8f7be8',
    real:['点到观察者有远近','遮挡提供空间顺序','空气让远处低对比'],
    science:['Depth Map','Z-buffer','单目深度线索'],
    drawing:['前中后景','深度热力图','大气透视'],
    practice:['只涂距离不涂阴影','给物体排序近远','把照片拆成三层']},
  {id:'light', icon:'💡', name:'光之月台', core:'明暗交界线是几何结果。', color:'#f5b94f',
    real:['表面朝向决定受光','结构会遮挡光','环境会反射回暗部'],
    science:['Normal · Light','Diffuse','Specular','AO'],
    drawing:['亮部/半调子/核心暗部/反光','投影','交界线'],
    practice:['拖光源找交界线','标法线箭头','把真实光影压成漫画阴影块']},
  {id:'material', icon:'🧪', name:'材质星市', core:'颜色是渲染结果，不是单纯色盘。', color:'#ee8e8e',
    real:['不同材质反光不同','皮肤半透明','布料高光散'],
    science:['Albedo','BRDF','Roughness','Fresnel','SSS'],
    drawing:['固有色','环境色','高光形状','质感边缘'],
    practice:['同一球切换材质','调粗糙度看高光','把写实材质压成动漫上色']},
  {id:'fold', icon:'🧵', name:'褶皱山谷', core:'褶皱不是装饰，是力的地图。', color:'#c9895e',
    real:['布料受固定点约束','重力下垂','拉伸和压缩生成褶皱'],
    science:['约束点','张力场','材料刚度','曲率'],
    drawing:['固定点密线','张力长线','压缩碎线','材质硬软'],
    practice:['单点悬挂','双点张力','肘部压缩','风中飘带']},
  {id:'human', icon:'👁️', name:'人形剧场', core:'人也是几何，只是关系更复杂。', color:'#d38df0',
    real:['五官嵌在头部体积里','眼睛围绕眼球','表情改变肌肉张力'],
    science:['头部代理模型','局部坐标系','参数化比例'],
    drawing:['中线','眼线','鼻底','嘴线','动漫/Q版参数'],
    practice:['转头后重放锚点','眼睛挂在曲面上','调风格但保持坐标一致']},
  {id:'nature', icon:'🌬️', name:'自然流域', core:'风、水、烟、云是力场留下的痕迹。', color:'#5fb6bd',
    real:['风不可见但能改变物体','水有反射/折射/流线','烟会扩散和破碎'],
    science:['流场','密度场','粒子轨迹','运动线索'],
    drawing:['风向线','水流线','烟的边缘破碎','云的体积块'],
    practice:['通过衣摆推风向','画水绕石头','烟上升扩散','树枝分形']},
  {id:'style', icon:'✨', name:'风格云城', core:'风格是信息选择与压缩策略。', color:'#f5b94f',
    real:['感受会改变注意力','观者根据线形色光重建情绪'],
    science:['视觉认知','形式心理学','参数化风格'],
    drawing:['线条粗细','色彩倾向','构图空间','明暗对比'],
    practice:['孤独/紧张/温暖生成视觉参数','写实→动漫→Q版','形成个人风格卡']}
];

const missions = [
  {name:'画一个转头动漫人物', steps:['比例森林：放头顶、下巴、眼线、鼻底、嘴线','相机塔：确定 3/4、俯视或仰视','人形剧场：头部球体旋转，中线随曲面弯','光之月台：判断额头、鼻梁、脸颊、下巴明暗','材质星市：皮肤固有色、亮部、暗部、腮红','风格云城：放大眼睛但保持坐标一致']},
  {name:'画一块可信的布料', steps:['线之海：区分轮廓线、结构线、褶皱线','褶皱山谷：找固定点和张力方向','光之月台：峰谷产生明暗变化','材质星市：选择丝绸/棉布/牛仔/皮革','风格云城：决定保留几条主褶皱线']},
  {name:'画一个有空间感的房间', steps:['相机塔：选择一点或两点透视','深度湖：分前景、中景、远景','线之海：用结构线组织家具边界','光之月台：找窗光和投影','材质星市：区分木头、布、玻璃','风格云城：决定温暖/孤独/梦幻的视觉参数']},
  {name:'把感受变成图像', steps:['选择感受：安静、紧张、孤独、温暖、梦','风格云城：生成线条/色彩/空间参数','相机塔：选择观看方式','光之月台：选择柔光或强阴影','材质星市：选择色彩压缩方式','绘画台：输出一张视觉情绪卡']}
];

const glossary = [
  {t:'Pinhole Camera 针孔相机', tag:['CV','透视'], plain:'把世界上的三维点，通过一个小孔投到平面上。', use:'解释近大远小、视平线和消失点。', try:'拖 FOV，看盒子透视如何变强。'},
  {t:'FOV 视场角', tag:['相机','透视'], plain:'相机能看到多宽。FOV 大像广角，FOV 小像长焦。', use:'决定画面夸张程度和空间压缩感。', try:'同一头部用广角和长焦各画一次。'},
  {t:'Vanishing Point 消失点', tag:['投影几何'], plain:'空间中一组平行线在画面里汇聚的方向终点。', use:'检查盒子、房间、街道是否透视一致。', try:'延长所有水平边，看它们是否汇到同一点。'},
  {t:'Depth Map 深度图', tag:['CV','空间'], plain:'每个像素到相机的距离图。', use:'把远近关系和阴影分开。', try:'只用三层颜色标出前景/中景/远景。'},
  {t:'Normal 法线', tag:['CG','光影'], plain:'表面朝向的箭头。', use:'决定这个面会不会被主光照亮。', try:'在球、鼻子、衣褶峰谷上画小箭头。'},
  {t:'Diffuse 漫反射', tag:['CG','明暗'], plain:'光打到粗糙表面后向四周散开。', use:'解释大多数素描明暗的基础。', try:'先忽略高光，只画表面朝光程度。'},
  {t:'Specular 高光', tag:['CG','材质'], plain:'镜面方向的反射。材质越光滑，高光越集中。', use:'区分金属、塑料、皮肤、玻璃。', try:'调粗糙度，看高光从尖变散。'},
  {t:'BRDF 双向反射分布函数', tag:['CG','材质'], plain:'描述光从某方向来、往某方向反射多少的规则。', use:'把材质从“背口诀”变成参数理解。', try:'比较石膏、金属、布料的高光和暗部。'},
  {t:'Fresnel 菲涅尔', tag:['光学'], plain:'视线越贴着表面看，反射越强。', use:'解释水面、玻璃、皮肤边缘反光。', try:'给球体边缘加弱反光，不要随便全亮。'},
  {t:'AO 环境光遮蔽', tag:['CG','暗部'], plain:'缝隙里来自环境的散射光更少，所以更暗。', use:'解释嘴角、眼角、衣褶深处的暗。', try:'只给接缝和褶皱谷加 AO，不要把整个暗面涂死。'},
  {t:'Triangulation 三角测量', tag:['CV','多视角'], plain:'用多个视角的对应点推断空间位置。', use:'解释为什么画人要看正面、侧面、3/4。', try:'用正面和侧面推断鼻尖在 45° 的位置。'},
  {t:'Topology 拓扑', tag:['建模','结构'], plain:'点、边、面如何连接。', use:'解释结构线和体块连续性。', try:'给头部画眼眶、嘴部、下颌的环线。'},
  {t:'Mesh 网格', tag:['建模'], plain:'由很多顶点、边、面组成的三维表面。', use:'把复杂对象拆成可理解的面。', try:'把苹果、杯子、脸想象成低模网格。'},
  {t:'NURBS 曲面', tag:['建模'], plain:'用控制点生成平滑曲面的数学方法。', use:'理解流畅轮廓、车身、花瓶、人体大曲线。', try:'用少数控制线概括长曲线。'},
  {t:'Shader 着色器', tag:['CG'], plain:'告诉计算机每个像素应该是什么颜色的程序。', use:'把颜色拆成固有色、光、材质、阴影。', try:'画一张图时分层标注 albedo/diffuse/specular。'},
  {t:'Parametric Modeling 参数化建模', tag:['建模','风格'], plain:'改变参数就改变模型。', use:'解释动漫/Q版比例和个人风格。', try:'调头身比、眼睛大小、线条粗细，看信息如何压缩。'}
];

const explanations = {
  projection:{title:'相机塔讲解：透视是成像，不是口诀', html:`<p>透视的本质是三维点投到二维平面。欧洲美术中的一点、两点、三点透视，是不同空间方向在画面上汇聚的结果。</p><div class="mini"><strong>现实：</strong>离相机越近，同样大小的物体占据画面越大。</div><div class="mini"><strong>计算机：</strong>三维坐标经过投影矩阵，得到屏幕坐标。</div><div class="mini"><strong>绘画：</strong>视平线、消失点、焦距、广角/长焦，都是观看世界的方式。</div><h4>练习方法</h4><p>先画一个盒子，不追求好看，只检查三组边是否分别指向正确方向。然后改变 FOV，观察同一个盒子怎样变得夸张或平稳。</p>`},
  light:{title:'光之月台讲解：明暗交界线如何生成', html:`<p>明暗交界线是体块转向的结果。它不是一条随意的暗边，而是表面逐渐转到主光照不到的位置。</p><div class="mini"><strong>现实：</strong>表面朝光更亮，背光更暗，缝隙更暗。</div><div class="mini"><strong>计算机：</strong>最基础的漫反射可理解为表面法线与光线方向的点积。</div><div class="mini"><strong>绘画：</strong>先判断大体块的朝向，再画半调子、核心暗部、反光、AO。</div><h4>练习方法</h4><p>每次画阴影前先画小法线箭头：额头朝哪里？鼻梁朝哪里？脸颊朝哪里？这样暗部才会跟体积一致。</p>`},
  fold:{title:'褶皱山谷讲解：褶皱是力的地图', html:`<p>褶皱不是随机线条。它由固定点、重力、拉力、压缩和材料硬度共同生成。</p><div class="mini"><strong>现实：</strong>布料挂在哪里，哪里就会聚集力；自由端会下垂或被风带走。</div><div class="mini"><strong>计算机：</strong>可以用约束点、弹簧、粒子和材质刚度模拟。</div><div class="mini"><strong>绘画：</strong>固定点附近线密，张力方向线长，压缩处线碎，硬布折线多，软布曲线多。</div>`},
  face:{title:'人形剧场讲解：五官必须挂在头部坐标系上', html:`<p>人脸画错常常不是眼睛本身画错，而是眼睛没有跟着头部体块转。眼睛、鼻子、嘴巴都必须依附在同一个头部坐标系。</p><div class="mini"><strong>现实：</strong>头部像一个带面部平面的体块，五官嵌在曲面上。</div><div class="mini"><strong>计算机：</strong>可理解为参数化头部代理模型：中心线、眼线、鼻底线、嘴线随旋转变化。</div><div class="mini"><strong>绘画：</strong>动漫化可以夸张比例，但不能让五官脱离结构。</div>`},
  material:{title:'材质星市讲解：颜色是渲染结果', html:`<p>颜色不是单独挑出来的漂亮色。它是固有色、光源色、环境色、表面朝向、高光和材质参数共同作用的结果。</p><div class="mini"><strong>现实：</strong>皮肤、金属、玻璃、布料对光的反应不同。</div><div class="mini"><strong>计算机：</strong>材质通常由 albedo、roughness、metalness、specular、fresnel 等参数描述。</div><div class="mini"><strong>绘画：</strong>先想材质，再决定高光大小、暗部颜色、边缘反光和色块压缩方式。</div>`},
  style:{title:'风格云城讲解：感受如何变成图像', html:`<p>感受不是直接画出来的，它要被翻译成视觉参数：线条、颜色、比例、空间、明暗、节奏。</p><div class="mini"><strong>现实：</strong>感受会改变我们注意哪些信息。</div><div class="mini"><strong>认知：</strong>观者通过形状、色彩、对比和构图重建情绪。</div><div class="mini"><strong>绘画：</strong>风格就是保留什么、删掉什么、夸张什么。</div>`}
};

const emotions = {
  calm:{name:'安静', line:'长线、少断裂、低速度', color:'#8fb7a1', space:'留白多，水平构图', light:'柔光、低对比'},
  tension:{name:'紧张', line:'尖线、碎线、斜向力', color:'#e96f63', space:'倾斜、压迫、近景', light:'强阴影、高对比'},
  lonely:{name:'孤独', line:'细线、小人物、大空白', color:'#708bb7', space:'远景、大尺度空间', light:'冷光、弱反光'},
  warm:{name:'温暖', line:'圆线、包围、柔边缘', color:'#f0b36b', space:'近中景、围合构图', light:'暖光、柔暗部'},
  dream:{name:'梦', line:'漂浮线、弱重力、渐变', color:'#b59cf2', space:'弱透视、非现实比例', light:'边缘光、雾化'}
};
let activeEmotion = 'calm';
let selectedIsland = 'camera';

function initUI(){
  document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.jump).scrollIntoView({behavior:'smooth'})));
  $('toggleCalm').addEventListener('click',()=>document.body.classList.toggle('calm'));
  $('expandAll').addEventListener('click',()=>{ document.querySelectorAll('.island').forEach(x=>x.classList.add('active')); renderKnowledge(selectedIsland); });
  $('collapseAll').addEventListener('click',()=>document.querySelectorAll('.island').forEach(x=>x.classList.remove('active')));
  $('closeDrawer').addEventListener('click',closeDrawer); $('drawerBack').addEventListener('click',closeDrawer);
  document.querySelectorAll('[data-read]').forEach(b=>b.addEventListener('click',()=>openDrawer(b.dataset.read)));
  $('glossarySearch').addEventListener('input',renderGlossary);
}

function renderStatic(){
  $('pipelineCards').innerHTML = pipeline.map(p=>`<article class="pipe-card" style="--accent:${p.c}"><b>${p.t}</b><small>${p.en}</small><span>${p.d}</span></article>`).join('');
  $('islandMap').innerHTML = islands.map(i=>`<article class="island ${i.id===selectedIsland?'active':''}" data-island="${i.id}" style="--accent:${i.color}"><div class="icon">${i.icon}</div><h3>${i.name}</h3><p>${i.core}</p><small>点击查看：现实 → 科学 → 绘画 → 练习</small></article>`).join('');
  document.querySelectorAll('.island').forEach(el=>el.addEventListener('click',()=>{selectedIsland=el.dataset.island;document.querySelectorAll('.island').forEach(x=>x.classList.remove('active'));el.classList.add('active');renderKnowledge(selectedIsland);}));
  $('missionGrid').innerHTML = missions.map(m=>`<article class="mission"><h3>${m.name}</h3><ol>${m.steps.map(s=>`<li>${s}</li>`).join('')}</ol></article>`).join('');
  renderKnowledge(selectedIsland); renderGlossary(); renderEmotionTabs();
}
function renderKnowledge(id){
  const i = islands.find(x=>x.id===id) || islands[0];
  $('knowledgePanel').innerHTML = `<article class="principle-card"><h3>${i.icon} ${i.name}：${i.core}</h3><div class="matrix"><div class="col"><b>现实中它是什么？</b><ul>${i.real.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="col"><b>知识如何解释？</b><ul>${i.science.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="col"><b>绘画如何压缩？</b><ul>${i.drawing.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="col"><b>如何练习校准？</b><ul>${i.practice.map(x=>`<li>${x}</li>`).join('')}</ul></div></div></article>`;
}
function renderGlossary(){
  const q = $('glossarySearch').value.trim().toLowerCase();
  const items = glossary.filter(g=>!q || [g.t,g.plain,g.use,g.try,...g.tag].join(' ').toLowerCase().includes(q));
  $('glossaryGrid').innerHTML = items.map(g=>`<article class="term"><h3>${g.t}</h3><div>${g.tag.map(t=>`<span class="tag">${t}</span>`).join('')}</div><p><strong>通俗解释：</strong>${g.plain}</p><p><strong>绘画用途：</strong>${g.use}</p><p><strong>试一试：</strong>${g.try}</p></article>`).join('');
}
function openDrawer(key){
  const e = explanations[key]; if(!e) return;
  $('drawerTitle').textContent = e.title; $('drawerBody').innerHTML = e.html;
  $('drawer').classList.add('show'); $('drawer').setAttribute('aria-hidden','false'); $('drawerBack').classList.add('show');
}
function closeDrawer(){ $('drawer').classList.remove('show'); $('drawer').setAttribute('aria-hidden','true'); $('drawerBack').classList.remove('show'); }
function renderEmotionTabs(){
  $('emotionTabs').innerHTML = Object.entries(emotions).map(([k,e])=>`<button class="${k===activeEmotion?'active':''}" data-emotion="${k}">${e.name}</button>`).join('');
  document.querySelectorAll('[data-emotion]').forEach(b=>b.addEventListener('click',()=>{activeEmotion=b.dataset.emotion;renderEmotionTabs();drawStyle();}));
}

function drawCover(){
  const c=$('coverCanvas'), ctx=c.getContext('2d'), w=c.width,h=c.height; let t=0;
  function frame(){
    t+=0.01; ctx.clearRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,'#08132f'); g.addColorStop(.45,'#174a93'); g.addColorStop(.75,'#8e70f2'); g.addColorStop(1,'#ffd166'); ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.save(); ctx.translate(w*.55,h*.52); ctx.rotate(Math.sin(t)*.05);
    for(let z=0;z<7;z++){ctx.strokeStyle=`rgba(255,255,255,${.08+z*.035})`; ctx.lineWidth=1; ctx.beginPath(); const s=70+z*35; ctx.moveTo(-s,-s*.7); ctx.lineTo(s,-s*.45); ctx.lineTo(s*.78,s*.7); ctx.lineTo(-s*.86,s*.5); ctx.closePath(); ctx.stroke();}
    ctx.restore();
    for(let i=0;i<60;i++){const x=(Math.sin(i*91+t*.9)*.5+.5)*w; const y=(Math.cos(i*37+t*.7)*.5+.5)*h; ctx.fillStyle=`rgba(255,255,255,${.2+(i%7)*.08})`; ctx.beginPath(); ctx.arc(x,y,(i%3)+1,0,TAU); ctx.fill();}
    ctx.strokeStyle='rgba(255,255,255,.72)'; ctx.lineWidth=2; ctx.beginPath();
    for(let i=0;i<140;i++){const x=80+i*4; const y=280+Math.sin(i*.13+t*2)*40+Math.sin(i*.05)*22; if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);} ctx.stroke();
    requestAnimationFrame(frame);
  } frame();
}

function projectPoint(p, yaw, pitch, fov, depth, w, h){
  let [x,y,z]=p; z+=depth;
  const cy=Math.cos(yaw), sy=Math.sin(yaw); let x1=x*cy-z*sy, z1=x*sy+z*cy;
  const cp=Math.cos(pitch), sp=Math.sin(pitch); let y1=y*cp-z1*sp, z2=y*sp+z1*cp;
  const f=(w*.55)/Math.tan(fov/2); const s=f/(z2+0.001);
  return {x:w/2+x1*s, y:h/2-y1*s, z:z2, s};
}
function drawProjection(){
  const c=$('projectionCanvas'), ctx=c.getContext('2d'), w=c.width,h=c.height;
  const yaw=+$('projYaw').value*Math.PI/180, pitch=+$('projPitch').value*Math.PI/180, fov=+$('projFov').value*Math.PI/180, depth=+$('projDepth').value;
  ctx.clearRect(0,0,w,h); drawPaper(ctx,w,h);
  const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const ps=pts.map(p=>projectPoint(p,yaw,pitch,fov,depth,w,h)); const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  ctx.strokeStyle='rgba(74,143,214,.18)'; ctx.lineWidth=1;
  for(const [a,b] of [[0,1],[3,2],[4,5],[7,6],[0,3],[1,2],[4,7],[5,6]]){extendLine(ctx,ps[a],ps[b],w,h)}
  ctx.strokeStyle='#24313a'; ctx.lineWidth=4; ctx.lineJoin='round'; edges.forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(ps[a].x,ps[a].y);ctx.lineTo(ps[b].x,ps[b].y);ctx.stroke();});
  ctx.fillStyle='#ee8e8e'; ps.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,5,0,TAU);ctx.fill(); ctx.fillText('P'+i,p.x+7,p.y-7);});
  ctx.fillStyle='rgba(16,24,39,.82)'; ctx.font='18px '+getComputedStyle(document.body).fontFamily; ctx.fillText(`3D 坐标 → 投影平面｜FOV ${$('projFov').value}°｜Depth ${depth}`,24,34);
}
function extendLine(ctx,a,b,w,h){ const dx=b.x-a.x, dy=b.y-a.y; ctx.beginPath(); ctx.moveTo(a.x-dx*20,a.y-dy*20); ctx.lineTo(a.x+dx*20,a.y+dy*20); ctx.stroke(); }
function drawPaper(ctx,w,h){ ctx.fillStyle='#fffaf0'; ctx.fillRect(0,0,w,h); ctx.strokeStyle='rgba(36,49,58,.06)'; ctx.lineWidth=1; for(let x=0;x<w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();} for(let y=0;y<h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();} }

function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function rgbStr(r,g,b,a=1){return `rgba(${Math.round(clamp(r,0,255))},${Math.round(clamp(g,0,255))},${Math.round(clamp(b,0,255))},${a})`;}
function drawShading(){
  const c=$('shadingCanvas'), ctx=c.getContext('2d'), w=c.width,h=c.height; ctx.clearRect(0,0,w,h); drawPaper(ctx,w,h);
  const mode=$('shadeMode').value, lx=+$('lightX').value/100, ly=+$('lightY').value/100, rough=+$('roughness').value/100, mat=$('materialType').value;
  const lz=Math.sqrt(Math.max(0.05,1-lx*lx-ly*ly)); const L=norm([lx,ly,lz]);
  const albedos={plaster:[230,226,214],skin:[234,168,150],metal:[190,198,205],cloth:[135,160,180]}; const alb=albedos[mat]; const metal=mat==='metal'?0.75:0; const cloth=mat==='cloth'?1:0; const skin=mat==='skin'?1:0;
  const cx=w/2, cy=h/2+12, r=170; const img=ctx.createImageData(w,h);
  for(let y=0;y<h;y++){for(let x=0;x<w;x++){const dx=(x-cx)/r, dy=(y-cy)/r, rr=dx*dx+dy*dy; const idx=(y*w+x)*4; if(rr>1){img.data[idx+3]=0; continue;} const z=Math.sqrt(1-rr); const N=norm([dx,-dy,z]); const ndl=Math.max(0,dot(N,L)); const depth=(z+1)/2; const V=[0,0,1]; const H=norm([L[0]+V[0],L[1]+V[1],L[2]+V[2]]); const spec=Math.pow(Math.max(0,dot(N,H)), lerp(8,120,1-rough))*(mat==='plaster'?0.15:mat==='cloth'?0.08:mat==='skin'?0.28:0.95); const fres=Math.pow(1-Math.max(0,dot(N,V)),3); const ao=0.22*Math.pow(1-z,2);
      let R,G,B;
      if(mode==='depth'){R=G=B=255*depth;} else if(mode==='normal'){R=(N[0]*.5+.5)*255;G=(N[1]*.5+.5)*255;B=(N[2]*.5+.5)*255;} else if(mode==='diffuse'){R=alb[0]*ndl;G=alb[1]*ndl;B=alb[2]*ndl;} else if(mode==='terminator'){const band=Math.abs(ndl-.08)<.025?1:0; R=alb[0]*(.35+ndl*.6)+band*80;G=alb[1]*(.35+ndl*.6)+band*35;B=alb[2]*(.35+ndl*.6);} else {R=alb[0]*(.18+ndl*.82-ao);G=alb[1]*(.18+ndl*.82-ao);B=alb[2]*(.18+ndl*.82-ao); R+=spec*255 + fres*(mat==='metal'?130:40); G+=spec*235 + fres*(mat==='metal'?150:45); B+=spec*210 + fres*(mat==='metal'?170:60); if(skin){R+=fres*35; G+=fres*8;} if(cloth){const weave=(Math.sin(x*.35)+Math.sin(y*.35))*6; R+=weave;G+=weave;B+=weave;}}
      img.data[idx]=clamp(R,0,255); img.data[idx+1]=clamp(G,0,255); img.data[idx+2]=clamp(B,0,255); img.data[idx+3]=255; }}
  ctx.putImageData(img,0,0); ctx.strokeStyle='#101827'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU); ctx.stroke();
  ctx.strokeStyle='#ffd166'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(90,85); ctx.lineTo(90+L[0]*80,85-L[1]*80); ctx.stroke(); ctx.fillStyle='#101827'; ctx.fillText('Light vector',105,92);
}
function norm(v){const m=Math.hypot(...v)||1;return v.map(x=>x/m)} function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}

function drawFold(){
  const c=$('foldCanvas'), ctx=c.getContext('2d'), w=c.width,h=c.height; ctx.clearRect(0,0,w,h); drawPaper(ctx,w,h);
  const stiff=+$('clothStiff').value/100, wind=+$('windForce').value/80;
  const a={x:150,y:82}, b={x:360,y:82}; ctx.fillStyle='#101827'; [a,b].forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,8,0,TAU);ctx.fill();});
  ctx.strokeStyle='#8f7be8'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.bezierCurveTo(190+wind*40,180,320+wind*40,180,b.x,b.y); ctx.stroke();
  for(let i=0;i<13;i++){const t=i/12; const x=lerp(a.x,b.x,t)+Math.sin(t*Math.PI*4)*wind*20; const topY=lerp(a.y,b.y,t); const amp=lerp(88,38,stiff)*(0.45+Math.sin(t*Math.PI)*.6); const endY=topY+150+amp*Math.abs(Math.sin(t*Math.PI*3)); const bend=wind*70+(t-.5)*50*(1-stiff); ctx.strokeStyle=i%2?'rgba(36,49,58,.45)':'rgba(201,137,94,.78)'; ctx.lineWidth=i%2?1.5:3; ctx.beginPath(); ctx.moveTo(x,topY); ctx.bezierCurveTo(x+bend*.2,topY+55,x+bend,endY-55,x+bend*.6,endY); ctx.stroke();}
  ctx.fillStyle='#4d5963'; ctx.fillText('固定点 → 张力线 → 重力下垂 → 材料硬度改变褶皱密度',28,38);
}

function drawFace(){
  const c=$('faceCanvas'),ctx=c.getContext('2d'),w=c.width,h=c.height; ctx.clearRect(0,0,w,h); drawPaper(ctx,w,h);
  const yaw=+$('faceYaw').value/65, pitch=+$('facePitch').value/35, style=+$('animeStyle').value/100; const cx=w/2,cy=h/2+5;
  const headW=130*(1-style*.12), headH=175*(1-style*.18); const faceShift=yaw*42;
  ctx.save(); ctx.translate(cx,cy); ctx.strokeStyle='#24313a'; ctx.lineWidth=3; ctx.fillStyle='#fff1df'; ellipse(ctx,0,0,headW*(1-Math.abs(yaw)*.12),headH,0,true,true);
  ctx.fillStyle='rgba(238,142,142,.13)'; ctx.beginPath(); ctx.ellipse(faceShift*.3,35,headW*.65,headH*.52,0,0,Math.PI); ctx.fill();
  // guide lines on head surface
  ctx.strokeStyle='rgba(74,143,214,.72)'; ctx.lineWidth=2; curveLine(ctx,faceShift,-headH*.85,faceShift*.6,headH*.78,yaw*30); // center
  const lines=[[-48,'brow'],[-22,'eye'],[36,'nose'],[78,'mouth']];
  lines.forEach(([yy])=>{ctx.beginPath();ctx.ellipse(faceShift*.18,yy+pitch*18,headW*.82*(1-Math.abs(yaw)*.25),9+Math.abs(yaw)*8,0,0,TAU);ctx.stroke();});
  // eyes on curved surface
  const eyeSize=lerp(15,34,style); const eyeY=-22+pitch*18; const sep=48*(1-Math.abs(yaw)*.28); const nearScale=1+yaw*.18, farScale=1-yaw*.18;
  drawEye(ctx,faceShift*.22-sep,eyeY,eyeSize*farScale,style); drawEye(ctx,faceShift*.22+sep,eyeY,eyeSize*nearScale,style);
  // nose wedge and mouth
  ctx.strokeStyle='#c9895e'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(faceShift*.28, -5+pitch*16); ctx.lineTo(faceShift*.45+10*yaw, 38+pitch*18); ctx.lineTo(faceShift*.18-10*yaw, 41+pitch*18); ctx.stroke();
  ctx.strokeStyle='#ee8e8e'; ctx.beginPath(); ctx.ellipse(faceShift*.22,78+pitch*15,30*(1-style*.35),5,0,0,Math.PI); ctx.stroke();
  ctx.restore(); ctx.fillStyle='#4d5963'; ctx.fillText('头部坐标系：中线、眼线、鼻底、嘴线先转，五官再挂上去',22,34);
}
function ellipse(ctx,x,y,rx,ry,rot,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,TAU); if(fill)ctx.fill(); if(stroke)ctx.stroke();}
function curveLine(ctx,x1,y1,x2,y2,b){ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+b,y1+70,x2+b,y2-70,x2,y2);ctx.stroke();}
function drawEye(ctx,x,y,s,style){ctx.save();ctx.translate(x,y);ctx.strokeStyle='#24313a';ctx.fillStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,s*1.1,s*.55,0,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#24313a';ctx.beginPath();ctx.arc(0,1,s*.28,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*.08,-s*.08,s*.08+style*3,0,TAU);ctx.fill();ctx.restore();}

function drawMaterial(){
  const c=$('materialCanvas'), ctx=c.getContext('2d'),w=c.width,h=c.height; ctx.clearRect(0,0,w,h); drawPaper(ctx,w,h);
  const alb=hexToRgb($('albedo').value), light=hexToRgb($('lightColor').value), env=hexToRgb($('envColor').value), toon=+$('toonLevel').value/100;
  const cx=165, cy=210, r=110;
  for(let y=0;y<h;y++){for(let x=0;x<w;x++){const dx=(x-cx)/r, dy=(y-cy)/r, rr=dx*dx+dy*dy; if(rr>1)continue; const z=Math.sqrt(1-rr); const ndl=clamp((-dx*.35 + -dy*.55 + z*.72),0,1); let band=toon>0.55?(ndl>.62?1:ndl>.24?.55:.22):ndl; const spec=Math.pow(Math.max(0,(-dx*.4+-dy*.5+z*.7)),45)*(1-toon*.4); ctx.fillStyle=rgbStr(alb[0]*(.2+band*.8)*light[0]/255+env[0]*(1-band)*.26+spec*255,alb[1]*(.2+band*.8)*light[1]/255+env[1]*(1-band)*.26+spec*245,alb[2]*(.2+band*.8)*light[2]/255+env[2]*(1-band)*.26+spec*220); ctx.fillRect(x,y,1,1);}}
  ctx.strokeStyle='#24313a'; ctx.lineWidth=2; ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.stroke();
  const swatches=[['固有色',alb],['光源色',light],['环境色',env],['亮部',mix(alb,light,.5)],['暗部',mix(alb,env,.45)]];
  swatches.forEach((s,i)=>{const y=80+i*52;ctx.fillStyle=rgbStr(...s[1]);ctx.fillRect(330,y,54,34);ctx.strokeStyle='#24313a';ctx.strokeRect(330,y,54,34);ctx.fillStyle='#24313a';ctx.fillText(s[0],395,y+23);});
  ctx.fillText('颜色 = 固有色 × 光照 + 环境 + 高光 + 风格压缩',28,34);
}
function mix(a,b,t){return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)]}

function drawStyle(){
  const c=$('styleCanvas'), ctx=c.getContext('2d'),w=c.width,h=c.height; ctx.clearRect(0,0,w,h); const e=emotions[activeEmotion]; const base=hexToRgb(e.color); ctx.fillStyle=rgbStr(base[0]+40,base[1]+40,base[2]+40); ctx.fillRect(0,0,w,h); ctx.globalAlpha=.26; ctx.strokeStyle='#fff'; for(let i=0;i<15;i++){ctx.lineWidth=activeEmotion==='tension'?2+i%3:1; ctx.beginPath(); const y=30+i*28; if(activeEmotion==='calm'||activeEmotion==='warm'){ctx.moveTo(40,y);ctx.bezierCurveTo(160,y+10,280,y-10,480,y+5);} else if(activeEmotion==='lonely'){ctx.moveTo(60,y);ctx.lineTo(120,y+Math.sin(i)*8);} else if(activeEmotion==='dream'){ctx.moveTo(40,y);ctx.bezierCurveTo(120,y-40,250,y+50,470,y-10);} else {ctx.moveTo(40,y);ctx.lineTo(180,y-40);ctx.lineTo(250,y+20);ctx.lineTo(480,y-25);} ctx.stroke();}
  ctx.globalAlpha=1; ctx.fillStyle='rgba(255,255,255,.82)'; ctx.fillRect(40,265,440,105); ctx.fillStyle='#24313a'; ctx.font='18px '+getComputedStyle(document.body).fontFamily; ctx.fillText(`${e.name}：视觉参数卡`,60,296); ctx.font='14px '+getComputedStyle(document.body).fontFamily; ctx.fillText(`线条：${e.line}`,60,322); ctx.fillText(`空间：${e.space}`,60,344); ctx.fillText(`明暗：${e.light}`,60,366);
  $('styleOutput').innerHTML=`<strong>${e.name}</strong> → 线条：${e.line}｜色彩：${e.color}｜空间：${e.space}｜明暗：${e.light}`;
}

const drawState={drawing:false,last:null,strokes:[]};
function initDrawing(){
  const c=$('drawCanvas'), ctx=c.getContext('2d'); drawGuides();
  function pos(ev){const r=c.getBoundingClientRect(); const e=ev.touches?ev.touches[0]:ev; return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
  function down(ev){ev.preventDefault();drawState.drawing=true;drawState.last=pos(ev);}
  function move(ev){if(!drawState.drawing)return;ev.preventDefault();const p=pos(ev); ctx.strokeStyle=$('penColor').value; ctx.lineWidth=+$('penSize').value; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath();ctx.moveTo(drawState.last.x,drawState.last.y);ctx.lineTo(p.x,p.y);ctx.stroke(); drawState.last=p;}
  function up(){drawState.drawing=false;}
  c.addEventListener('pointerdown',down); c.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  ['guidePerspective','guideDepth','guideFace','guideLight'].forEach(id=>$(id).addEventListener('change',drawGuides));
  $('clearDraw').addEventListener('click',()=>{ctx.clearRect(0,0,c.width,c.height);drawGuides();});
  $('exportDraw').addEventListener('click',()=>{const a=document.createElement('a');a.download='drawescape-studio.png';a.href=c.toDataURL('image/png');a.click();});
}
function drawGuides(){
  const c=$('drawCanvas'), ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle='#fffef9'; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle='rgba(36,49,58,.06)'; ctx.lineWidth=1; for(let x=0;x<c.width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();} for(let y=0;y<c.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}
  if($('guidePerspective').checked){const vp1={x:120,y:285},vp2={x:1080,y:285}; ctx.strokeStyle='rgba(74,143,214,.28)'; ctx.lineWidth=1.5; for(let y=120;y<690;y+=70){ctx.beginPath();ctx.moveTo(vp1.x,vp1.y);ctx.lineTo(600,y);ctx.stroke();ctx.beginPath();ctx.moveTo(vp2.x,vp2.y);ctx.lineTo(600,y);ctx.stroke();} ctx.strokeStyle='rgba(238,142,142,.4)';ctx.beginPath();ctx.moveTo(0,285);ctx.lineTo(c.width,285);ctx.stroke();}
  if($('guideDepth').checked){ctx.fillStyle='rgba(143,123,232,.08)';ctx.fillRect(0,0,c.width,250);ctx.fillStyle='rgba(84,198,211,.08)';ctx.fillRect(0,250,c.width,250);ctx.fillStyle='rgba(245,185,79,.08)';ctx.fillRect(0,500,c.width,260);}
  if($('guideFace').checked){ctx.strokeStyle='rgba(119,169,135,.45)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(600,370,135,185,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(600,190);ctx.bezierCurveTo(630,300,630,440,600,555);ctx.stroke();[305,360,435,485].forEach(y=>{ctx.beginPath();ctx.ellipse(600,y,120,10,0,0,TAU);ctx.stroke();});}
  if($('guideLight').checked){ctx.strokeStyle='rgba(245,185,79,.9)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(140,110);ctx.lineTo(250,190);ctx.stroke();ctx.fillStyle='rgba(245,185,79,.9)';ctx.beginPath();ctx.arc(135,106,16,0,TAU);ctx.fill();}
}

function bindLabControls(){
  ['projYaw','projPitch','projFov','projDepth'].forEach(id=>$(id).addEventListener('input',drawProjection));
  ['shadeMode','lightX','lightY','roughness','materialType'].forEach(id=>$(id).addEventListener('input',drawShading));
  ['clothStiff','windForce'].forEach(id=>$(id).addEventListener('input',drawFold));
  ['faceYaw','facePitch','animeStyle'].forEach(id=>$(id).addEventListener('input',drawFace));
  ['albedo','lightColor','envColor','toonLevel'].forEach(id=>$(id).addEventListener('input',drawMaterial));
}

function boot(){initUI();renderStatic();drawCover();bindLabControls();drawProjection();drawShading();drawFold();drawFace();drawMaterial();drawStyle();initDrawing();}
window.addEventListener('DOMContentLoaded',boot);
