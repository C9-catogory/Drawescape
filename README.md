# Drawescape｜绘梦境 V3

**把现实折叠成画的绘画建模互动游戏。**

V3 从“概念网页”升级为更真实的互动实验室：

- **Three.js 3D 建模实验室**：可旋转、可拖动物体、可调 FOV/相机高度/光源/粗糙度/金属度。
- **3D → 2D 投影线稿**：在 3D 视图上叠加模型投影线，帮助理解绘画线稿和模型之间的关系。
- **Procreate / PS → Rhino / SU / Blender 思维桥**：轮廓→推拉、侧影→旋转体、路径→扫掠、深度层→曲面。
- **可拖动透视画布**：一点 / 两点 / 三点透视；拖动消失点和视平线；支持画笔、橡皮、导入参考图、导出 PNG。
- **调色画板**：基于固有色生成互补、邻近、高光、环境暗色；讲解颜色通道。
- **风水流体可视化**：风、水流、烟、雨的力场线；拖动方向点观察线条变化。
- **关卡任务系统**：把绘画经验拆成可玩的微任务。
- **ND 友好界面**：睡前模式、几何模式、低动画、聚焦辅助。

## 运行方式

直接打开 `index.html` 即可。

注意：3D 模块通过 CDN 加载 Three.js，所以需要联网。若要完全离线，可以下载 Three.js 文件后改 import map。

## GitHub Pages 部署

1. 创建仓库，例如 `drawescape`。
2. 上传：
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. 打开仓库 Settings → Pages。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main` / root。
6. 保存后等待生成网址。

## V3 文件结构

```text
Drawescape_V3/
├─ index.html
├─ styles.css
├─ app.js
└─ README.md
```

## 设计思想

绘画 = 建模 + 投影 + 渲染 + 信息折叠。

- 线稿不是装饰，而是几何投影和结构边界。
- 透视不是规则表，而是相机投影。
- 明暗不是涂黑，而是法线、光源和遮挡。
- 材质不是花纹，而是表面如何反射、散射和吸收光。
- 风和水不是固定形体，而是力场、密度、边缘和节奏。
- 风格不是玄学，而是选择保留哪些信息、舍弃哪些信息。

## 下一步建议

V4 可以继续升级：

1. 加入真正的 Three.js TransformControls，用箭头轴拖动/旋转/缩放物体。
2. 加入 GLTF/OBJ 导入，让用户上传简单模型。
3. 把透视画布的线稿路径转换成 3D 形体草图。
4. 做更多关卡：人头、手、布料、头发、室内、街道、树、水面、玻璃杯。
5. 加入更完整的知识来源库：CG/CV/Blender/绘画书籍/论文。
6. 手机端加入更大的按钮和更短的关卡。

## Credits

- Project concept: Starcove Drawing Lab / 云心 starcove
- Runtime: HTML, CSS, JavaScript, Three.js, Canvas API
- Style: dreamy geometry, drawing-world simulator, low-overload interaction
