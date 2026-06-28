# Drawescape｜绘梦境 V2

一个面向 ND 群体的可视化绘画建模小游戏。  
核心理念：**绘画不是复制现实，而是把现实拆层、推理、折叠、重组成一张平面。**

## V2 新增重点

- 更酷的进入页：封面式游戏入口、扫描 HUD、星区状态、World Folding Engine 标识
- 线稿建模桥：把 Procreate/PS 的线稿关系连接到 Rhino / SketchUp / Blender 的建模思维
- 从画到模型：轮廓线 → 推拉，侧影线 → 旋转体，中心线 → 扫掠，深度层 → 曲面
- 模型桥交互：添加盒体、圆柱、飘带，拖动形体，调厚度/倒角/旋转，导出 JSON / 简易 OBJ 占位文件
- 章节原理来源：每章加入 CG / CV / 3D / ART / ND 的可查证方向卡片
- 更强游戏感：入口强调“观察 → 扫描 → 推理 → 折叠 → 绘制 → 校准”的推理探索循环

## 已有核心功能

- 绘境地图：9 个星区，点开看知识、小游戏和练习
- 今日一小关：随机抽取一个低负荷练习
- 扫描模式：同一对象切换结构线、透视、深度、法线、光照、材质、风向层
- 互动实验室：比例记忆、透视修复、深度湖、法线光照、材质星球、风的剧场、流体之谷、信息折叠
- 自由绘画台：本地导入图片、透视网格、深度层辅助、画笔、撤销、保存、导出 PNG
- 本地笔记/进度：使用 localStorage，不上传云端
- ND 友好模式：纸白、睡前、几何高对比、低语言、低动画、聚焦光带

## 文件结构

- `index.html`：网页入口
- `styles.css`：界面、主题、移动端、绘画几何风格
- `app.js`：全部交互、小游戏、画布、建模桥、进度和本地保存
- `README.md`：项目说明

## 本地打开

直接双击 `index.html`，或用 VS Code Live Server 打开。

## GitHub Pages 发布

1. 新建仓库，例如 `drawescape`。
2. 上传 `index.html`、`styles.css`、`app.js`、`README.md`。
3. 进入 `Settings` → `Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，Folder 选择 `/root`。
6. 保存后等待生成网址。

## 后续可扩展方向

- 加入 Three.js：真正的 3D 盒子、相机、光照、材质球
- 加入更多关卡：手、头发、衣褶、云、火、水面、建筑、人物姿态
- 加入 SVG 路径解析：把用户画的闭合线自动识别为轮廓
- 加入真正 OBJ/GLTF 导出：从 primitive / path / profile 生成可打开的模型
- 加入可选 AI：本地/自带 API Key 的图像分析辅助，不默认上传
- 加入课程数据文件：把星区、章节、小游戏拆成 JSON/JS 数据
- 打包 itch.io HTML5 版本，再考虑 Steam 桌面版

## 联系方式

Starcove Drawing Lab  
小红书：云心  
ID：starcove
