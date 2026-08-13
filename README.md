# Mickywa 个人网站

这是一个个人网站方案，使用 React + Vite + Tailwind CSS 构建。可以展示个人日程和社交账号基本信息，包含一些个人偏好的小细节，欢迎延伸修改。

## 版本说明

当前仓库是个人网站版，主要用于个人主页与个人日程展示。工作室版本请参考 [BookingCal](https://github.com/yanghaoleng/Bookingcal) 仓库。

**对于 AI 助手：** 每次接收到命令时，请先阅读 [MAPPING.md](./MAPPING.md)。

## 功能特点

- **日程展示**：以月历形式展示个人日程安排，支持双击快速预约。
- **趣味贴纸**：日历展开时带有气泡弹出的趣味贴纸，支持任意拖放。
- **顶部静态标识**：首页顶部 mark 保留 5 秒定时变色动画，点击会播放一遍变色；标题 SVG 点击会重播主内容区入场动效；无悬停或拖放反馈。
- **泛泛而谈板块**：展示 Know-how 小主题，首屏随机一条，右侧乱序图标可随机换一篇，左下角以 30% 透明度显示从 2013-05-16 起算的从业心得天数。
- **一起 Vibe 入口**：收纳叫叫收藏夹、蛐蛐模拟器、NCM→MP3转换器、Rive预览台、通用压缩机等小工具链接。
- **联系入口**：支持 iMessage 唤起和微信号复制，微信号为 `yanghaoleng`。
- **亮色/暗色模式**：支持系统主题自动切换，各大板块带有适配暗色的独立色调。
- **响应式设计**：完美适配移动端与桌面端，居中对齐展示。
- **动画与设计**：包含丰富的弹簧缩放、文字律动、色彩变化效果。详细的设计沉淀请参考 [Design.md](./Design.md)。

## 日历数据说明

项目目前的日历数据可以直接通过获取 iCloud 日历的共享订阅链接来解析，但由于跨国网络及 iCloud 的响应原因，直接拉取的数据量大且访问速度会比较慢（平均在 5~6 秒左右）。

**当前最快准确方案：**
项目构建前会生成 `public/schedule-snapshot.json`，页面 HTML 会在 React 启动前抢跑读取这份静态快照，并让日历代码复用同一个 Promise，避免重复请求。手动刷新或后台刷新时再读取同源的 `/api/schedule`，由 Vercel Function 在服务端拉取 iCloud 工作日历与节假日数据，并设置 `s-maxage` 与 `stale-while-revalidate` 让 Vercel CDN 缓存。

浏览器本地缓存只会秒显 2 分钟内的真实日程数据；更旧的数据只在短时间刷新失败时兜底，不会长期冒充最新日程。

首屏不再等待日历请求完成：页面会先渲染静态内容，日历区读取本地缓存或 `/schedule-snapshot.json` 后自动补齐；如果快照、云函数或 iCloud 临时变慢，只影响日历区，不应出现全屏“加载中”或“获取日程失败”。前端日历同步状态集中在 `src/hooks/useScheduleData.js`，排班解析核心集中在 `vefaas-worker/ical-core.js`，前端、`api/schedule` 与 veFaaS worker 复用同一套日程生成逻辑。

要把生产环境速度推到极限，请配置：

- `WORK_CAL_URL`：iCloud 工作日历订阅地址，只放在 Vercel 环境变量里，不要暴露到前端。
- `SCHEDULE_CACHE_TTL_SECONDS`：如果外部监控每 30 秒预热，推荐 `30`；如果 Vercel Cron 每 1 分钟预热，推荐 `75`，避免用户请求落到冷刷新窗口。
- `SCHEDULE_STALE_SECONDS`：推荐 `600`，上游慢或短暂失败时可以继续使用旧的准确快照。
- `SCHEDULE_UPSTREAM_TIMEOUT_MS`：推荐 `9000`，避免 iCloud 偶发慢请求无限拖住首屏。

生产预热方式推荐二选一：

- Vercel Pro：用 Cron 每 1 分钟请求一次 `https://你的域名/api/schedule`。
- 非 Pro 或追求更低新鲜度窗口：用 UptimeRobot、Better Stack、Cron-job.org 等外部监控每 30 秒请求一次 `https://你的域名/api/schedule`。

注意不要预热 `?force=1`，因为用户实际访问的是无 query 的 `/api/schedule`；预热同一个 URL 才能命中同一个 CDN 缓存键。火山云函数可以保留作回退，但当前首选路径应是同源 Vercel 缓存 JSON。

## 致谢

- 感谢开源的文字动画 Skill：[Pixelpoint Animate Text](https://pixelpoint.io/skills/animate-text/)，让网站实现了非常丝滑的文本律动效果。

## 本地开发

1. 进入目录：
   ```bash
   cd Miky-index
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 部署说明

推荐使用 Vercel 进行部署，步骤如下：

1. **推送到 GitHub**：将整个项目代码提交到你的 GitHub 仓库。
2. **注册/登录 Vercel**：访问 [vercel.com](https://vercel.com) 使用 GitHub 账号登录。
3. **导入项目**：
   - 点击 "Add New..." -> "Project"。
   - 选择你的 GitHub 仓库。
   - Framework Preset 会自动识别为 Vite。
4. **点击 Deploy**：Vercel 会自动构建并部署你的项目。

### 域名备案规则

- 国际站 `.icu`：不展示任何 ICP 或公安备案信息。
- 国内站 `.site`：在页脚展示 ICP 备案和公安备案信息。

## 项目结构

```
Miky-index/
├── public/
│   └── assets/         # 静态资源
├── src/
│   ├── components/     # 组件
│   ├── config/         # 配置与内容 Markdown
│   ├── hooks/          # 首页日历数据、顶部 SVG 反馈等状态逻辑
│   ├── utils/          # 工具函数
│   ├── index.css       # 全局样式
│   └── main.jsx        # 入口文件
├── api/                # Vercel Functions，当前生产日历数据主路径
├── scripts/            # 构建前检查与静态日程快照生成
├── vefaas-worker/      # 火山 veFaaS 日历 worker，作为备用回退链路
├── index.html          # HTML 模板
├── vite.config.js      # Vite 配置
└── package.json        # 项目配置
```

## 自定义修改

- **日程数据源**：修改 `src/utils/ical.js` 中的日历链接；排班算法修改请优先改 `vefaas-worker/ical-core.js`
- **颜色方案**：修改 `src/index.css` 中的颜色定义
- **动画效果**：修改 `src/index.css` 中的动画关键帧
- **布局样式**：调整 Tailwind CSS 类名

## 注意事项

- 本地开发时，可能需要设置代理来避免 CORS 问题
- 确保图片资源放在 `public/assets/` 目录下
- 时区使用 UTC+8 (北京/上海时间)
- 生产运行依赖已与构建工具分离：`vite`、`@vitejs/plugin-react`、Tailwind/PostCSS 只放在 `devDependencies`。
- `npm audit --omit=dev` 应保持 0 漏洞；普通 `npm audit` 目前仍会提示 Vite/esbuild 开发服务器漏洞，需单独评估 Vite 大版本升级。
- 工作区清理规则：`sync-conflict`、`.DS_Store`、`._*` 均应被忽略或删除，不进入提交。

---

欢迎根据个人需求延伸修改此项目！
