# HANDOF

## 2026-07-27 首屏日历加载修复

- 目标：排查线上打开先转圈、再失败、最后突然载入的问题，并推送部署。
- 结论：`Schedule.jsx` 把日历请求状态作为整页渲染门槛；当 `/schedule-snapshot.json`、`/api/schedule` 或上游 iCloud 慢于 5 秒时，会显示全屏 loading/watchdog 失败态。
- 处理：已取消全屏 loading/error 对正文的阻塞，静态内容直接渲染，日历数据后台同步。
- 部署分支：统一使用 `origin/master`，匹配生产保护脚本 `yanghaoleng/Mikey-index@master`，避免旧仓库 remote 或旧分支触发部署。

## 后续建议

- 部署后重点检查生产首屏：标题、找我耍卡片和静态链接应立即出现，不再先显示全屏转圈或失败按钮。
- 如仍有短暂空日历，继续检查生产环境 `/schedule-snapshot.json` 的 CDN 命中和响应时间。

## 2026-07-27 顶部 SVG 撕贴效果

目标：把 CatsJuice/sticker-forge 的贴纸撕下感应用到首页顶部两个 SVG 元素。

已完成：

- 新增 `PeelableStickerSvg`，用于包裹顶部云朵 mark 和 `title.svg`。
- 拖拽超过 `20px` 后进入撕下状态，松手后停留 `1000ms` 并自动贴回。
- 保留原有短按交互：mark 换色，标题触发内容刷新。
- 使用双层结构：原位底胶残影留在页面上，可移动面层带透视、阴影、左右自适应卷边和回贴弹簧 CSS。
- 已执行 `npm run build`。
- 已启动本地预览：`http://127.0.0.1:5173/`。
- 已用本机 Chrome 自动化验证 title 拖拽中 root 不移动、surface 移动、origin 显示底胶残影；松手后回到 `idle`，最终 transform 归零。

注意：

- 当前工作区存在本任务之前的未提交/未跟踪文件，本次未清理也未回退。
- `Schedule.jsx` 的 git diff 中有若干日历加载相关旧改动，本次只新增了撕贴组件和替换顶部两个 SVG 包裹。

## 2026-07-27 顶部 SVG 静态化

- 目标：去掉顶部两个 SVG 元素的贴纸效果，悬停和拖放都不需要反馈。
- 已完成：删除 `PeelableStickerSvg` 组件、相关状态、自动换色/点击彩蛋，以及 `peelable-sticker-*` CSS。
- 已调整：顶部云朵 mark 和首页标题不再有贴纸、悬停或拖放反馈，但保留点击彩蛋。
- 已调整：参考 `2089a11` 旧版逻辑恢复云朵 mark 的 5 秒定时变色动画；点击 mark 会立即播放一轮变色动画并带 `spring-click`。
- 已调整：参考 `2089a11` 旧版逻辑恢复标题点击触发主内容区 `contentKey` 更新，重播整页内容入场动效。
- 已完成：泛泛而谈左下角“xxxx天的从业心得”透明度调整为 30%。
- 已验证：`npm run build` 已通过。

## 2026-07-27 泛泛而谈板块

- 目标：在“随便聊”联系入口上方新增灰色内容板块，展示 `Know-how-公开发布版.md` 中的小主题内容。
- 已完成：新增 `src/config/knowHow.md` 内容源，按 `## 数字. 小主题` 切分为 59 条；页面首屏随机展示一条，并支持随机换一篇。
- 已完成：新增 `public/assets/泛泛而谈.svg` 作为标题图，灰色板块浅色背景、暗色使用 mask 换色，正文统一普通排版，不显示小主题标题或加粗层级。
- 已调整：标题 SVG 替换为桌面导出的路径版；桌面端板块移动到日历栏下方，移动端仍在联系入口上方。
- 已调整：翻页正文使用 800ms 内完成的逐字翻入动画，内容框高度变化带过渡；翻页箭头去掉圆形背景和底线。
- 已调整：原文中的有序列表和无序列表统一渲染为圆点无序列表，圆点本身也参与逐字动画。
- 已调整：遇到 `# 一、...`、`# 结语` 这类分组标题会结束当前小主题，避免混入相邻正文；已验证第 44 条和第 59 条无串文。
- 已调整：中文正文启用严格断行，并把避头尾标点与相邻文字绑定为同一动画单元。
- 已调整：右侧按钮改为乱序播放图标，点击随机切到另一篇；不再提供上一条或下一条。
- 已调整：去掉底部页码，左下角以 30% 透明度显示“xxxx天的从业心得”，天数从 `2013-05-16` 起按自然日动态计算。
- 已验证：`npm run build` 已通过。

## 2026-07-27 联系入口微调

- 目标：去掉“一起 Vibe”里的“日程展示站”链接，并在“随便聊”里增加微信复制入口。
- 已完成：删除 GitHub 日程展示站按钮；新增“微信”按钮，确认后复制 `yanghaoleng`，toast 显示“已复制微信号”。
- 已验证：`npm run build` 已通过，本地预览仍在 `http://127.0.0.1:5173/`。

## 2026-07-27 项目清理与代码审计

- 目标：在不改变当前线上效果的前提下清理工作区，并审计依赖与重构空间。
- 已完成：删除工作区里的 `sync-conflict` 文件、`.DS_Store`、`._*` 等机器生成垃圾，并在 `.gitignore` 增加防护规则。
- 已完成：保留并纳入 `vefaas-worker` 的 Docker 部署资料；删除/忽略构建产物和本地 veFaaS 配置，作为日历备用链路维护。
- 已完成：移除未使用依赖 `date-fns`；将 `vite`、`@vitejs/plugin-react` 从生产依赖移动到 `devDependencies`；`npm audit fix` 更新 Babel/PostCSS 相关 transitive lock。
- 已验证：`npm audit --omit=dev` 为 0 漏洞，`npm run build` 通过。
- 仍需评估：普通 `npm audit` 仍提示 Vite/esbuild 开发服务器漏洞，修复需 `vite@8` 级别大版本升级，不在本次稳定清理中强推。
- 重构建议：`src/components/Schedule.jsx` 约 3100 行，是主要复杂度来源；后续优先拆分日历数据状态、顶部品牌反馈、泛泛而谈、预约半弹窗、智能推荐等模块。

## 2026-07-27 前三项重构优化

- 目标：优化代码审计中前三项，并测试一轮；最后单独解释 Vite/esbuild 开发服务器漏洞。
- 已完成：新增 `src/hooks/useScheduleData.js`，把日历缓存读取、云端刷新、慢请求提示、自动重试、后台轮询从 `Schedule.jsx` 拆出。
- 已完成：新增 `src/hooks/useTopBrandFeedback.js`，把顶部 mark 定时变色、点击变色、标题点击重播入场动效集中管理，并补齐定时器清理。
- 已完成：前端 `src/utils/ical.js`、`api/schedule.js`、veFaaS worker 统一复用 `vefaas-worker/ical-core.js` 的排班核心；共享核心补回 JSON 快照兼容解析。
- 保留说明：`api/calendar.js` 仍保留自己的事件接口解析逻辑，因为它输出 UID、ISO、本地时间、时区等更丰富的 JSON 元数据，不属于排班生成主链路。
- 后续建议：`Schedule.jsx` 仍可继续拆 `KnowHowSection`、`HalfModal`、智能推荐按钮状态机，进一步降低单文件体量。

## 2026-08-13 一起 Vibe 链接同步

- [x] 从首页“一起 Vibe”板块移除“我带你玩”短信入口。
- [x] “MP3下载器”改名为“NCM→MP3转换器”，链接仍指向 `https://ncm.mikeywa.icu`。
- [x] 新增“Rive预览台”入口，链接 `https://mikeywa.site/rive-viewer/`。
- [x] 新增“通用压缩机”入口，链接 `https://compreesor.mikeywa.icu/`。
- [x] `npm run build` 已通过。
- [ ] 提交并同步推送国内 `.site` 与国际 `.icu` 站点。
