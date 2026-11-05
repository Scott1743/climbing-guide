# Climbing Guide · 攀岩动作原理指南

面向抱石新手的中文互动教程。通过可拖动的力学示意、动作动画和分镜，把“怎么做”和“为什么可能更省力”连起来。

[在线阅读](https://scott1743.github.io/climbing-guide/) · [GitHub 仓库](https://github.com/Scott1743/climbing-guide)

## 摆点求解实验室

[打开 Beta Lab](https://scott1743.github.io/climbing-guide/route-lab.html)。支持拖放最多24个手点、脚点或通用点，指定四个起步接触和双手终点，设置墙面尺寸、身高与臂展。搜索返回最多3条候选顺序；可逐步播放、下载当前姿势或完整SVG分镜、导入导出点位JSON、撤销修改。点位仅保存在当前浏览器；搜索在本机Web Worker中运行。

**候选不代表真实最佳解法。** 当前是近垂直墙的二维接触/伸展模型，不计算岩点朝向、摩擦、抓握力、墙角、关节负荷或三维转髋。每次只换一个接触；搜索有状态和时间预算，无法证明无解。请将结果作为地面讨论动作的草案。

求解器验证：`node route-solver.test.cjs`。测试覆盖接触连续性、移动前后的公共可达姿势、用途约束、终点匹配、身体尺寸和无效输入。

## 内容

- **动作串联页**：13 个场景，包含正身、侧身、外旗、背旗、脚跟勾、脚尖勾、并手、换脚、双手 dyno，以及“换脚 → 外旗 → 并手 → 出手”的连续演示。12 个可点选关节、实时接触状态、俯视与挂脚补图、暂停、逐步、进度拖动和变速。`movement-lab.html` 的核心动画是自包含的，可以离线打开；联网分享使用独立的增强脚本。
- 动作串联采用固定肢体长度与固定接触点；准备和稳定阶段展示自然长臂，发力与转换阶段允许屈臂。页面显示图示肘角；回归检查运行 `node movement-lab.test.cjs`，覆盖直臂连续性、接触不滑动、镜像及 dyno 的接点顺序。
- **3 个力学互动图**：身体靠近支撑、转髋后的肩部位置、自由腿与平衡。支持拖动、播放和分步查看；每图注明简化条件。
- **10 种动作动画**：脚尖踩点、换脚、直臂、同侧手脚、Rock over、Layback、读线、落膝、外旗、背旗。
- **30 张 SVG 分镜**：把动作前、中、后的变化并排展开。
- **8 道理解题**：判断动作改变了什么，以及手因此少承担了什么工作。
- 八周学习顺序、新手常见错误、练习建议、进步观察指标和岩馆检查清单。
- B 站原视频嵌入与来源链接。

体重不会因为转身而消失。教程主要解释怎样减少维持姿势的额外负担、改善出手位置，并让腿更好地参与。示意图不是人体力量测量；八周表示学习顺序，不是进步承诺。

## 开始学习

先看“为什么省力”的三个互动图，每次只观察一个变化，例如重心到支撑的距离或出手侧肩的位置。再进入动作课，依次阅读原因、比较三张分镜、拖动动画，最后回答理解题。

实际练习从岩馆教练指导下的低位、容易线路开始；不要把示意动作或落膝角度直接当成个人训练处方。

## 本地运行

项目为原生 HTML、CSS 和 JavaScript，无需安装依赖或构建。

```sh
git clone https://github.com/Scott1743/climbing-guide.git
cd climbing-guide
python3 -m http.server 8765
```

打开 <http://localhost:8765/>。也可以直接用浏览器打开 `index.html`；B 站播放器和补充资料需要联网。嵌入播放受 B 站自身的地区、登录和浏览器策略影响，无法播放时可打开原视频链接。

复盘和检查清单使用当前浏览器的 `localStorage`。项目没有账号系统或自建数据服务，不会把这些记录上传；清理浏览器数据会清除记录。嵌入的 B 站播放器由第三方独立提供。

## 文件结构

```text
index.html       页面入口
movement-lab.html  动作串联：十三个场景与可交互关节动画（单文件）
movement-lab.test.cjs  肢体长度、直臂、接触与动作顺序回归检查
style.css        紫、白、黑配色与响应式布局
app.js           课程渲染、理解题与本地记录
content.js       八周课程与补充资料
reasons.js       动作因果解释与理解题内容
animations.js    动作动画和 SVG 分镜
mechanics.js     三个力学互动图
route-lab.html/css/js  摆点求解界面与点位编辑
route-solver.js  有预算的二维几何候选搜索
route-render.js  墙面、姿势与SVG分镜生成
solver-worker.js  后台搜索入口
LICENSE         原创部分的 MIT 许可
THIRD_PARTY_NOTICES.md  原视频和参考资料说明
```

GitHub Pages 以 `index.html` 为入口，资源使用相对路径，支持部署在 `/climbing-guide/` 子路径。.nojekyll 用于直接提供静态文件。

## 公开版本与素材范围

此仓库发布教程代码、自绘 SVG 和补充讲解，并通过 B 站播放器引用原视频。**不包含下载的原片、真人片段、视频截图、中文译配音视频或完整逐字稿。**

课程顺序参考 Sara Wade / Send Edition 的八周入门视频；动作原理说明结合原视频和文末列出的补充资料重新编写。第三方原视频及资料不因本项目开源而获得再发布许可。

## 许可与贡献

本项目原创代码、自绘图解和原创补充讲解以 [MIT License](LICENSE) 发布。外部嵌入内容、引用资料及其商标不属于 MIT 授权范围，详见 [第三方内容说明](THIRD_PARTY_NOTICES.md)。项目不是原作者、B 站或任何攀岩品牌的官方产品，也不表示获得其背书。

欢迎通过 Issue 或 Pull Request 提出动作解释、可访问性或显示问题。涉及动作原理的修订请提供可核验的参考资料；不要在贡献中加入未经授权的完整视频、字幕或截图。

## 搜索与分享

三个页面分别设置中文标题、描述、规范地址（canonical）、Open Graph / Twitter 分享预览和与实际内容一致的 JSON-LD。分享封面为原创 SVG 绘制的 1200 × 630 PNG。页脚支持系统分享或复制当前页面的规范链接。

首页八周课程、原理、章节和来源已写入初始 HTML；动作页提供 13 场景的静态说明。修改 `content.js`、`reasons.js`、`app.js` 或场景说明后，运行 `node scripts/prerender.cjs` 更新静态内容，再运行现有回归检查。脚本重复执行不会重复追加内容。

站点地图：[sitemap.xml](https://scott1743.github.io/climbing-guide/sitemap.xml)。可在 Google Search Console 或 Bing Webmaster Tools 验证 URL-prefix 属性 `https://scott1743.github.io/climbing-guide/` 后提交。已发布站点地图不等于已经收录，搜索排名与展现由搜索引擎决定。

本项目部署在 GitHub Pages 的子路径，项目目录中的 `robots.txt` 不能作为域根规则生效，因此这里不放一个无效的控制文件。若将来配置 robots，需要在 `https://scott1743.github.io/robots.txt` 管理，并避免影响该域名的其他项目。

实现参考：[Google SEO 基础](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)、[站点地图](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)、[JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)、[Open Graph](https://ogp.me/)。
