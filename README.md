# Mickywa 个人网站

这是一个个人网站方案，使用 React + Vite + Tailwind CSS 构建。可以展示个人日程和社交账号基本信息，包含一些个人偏好的小细节，欢迎延伸修改。

## 功能特点

- **日程展示**：以月历形式展示个人日程安排，支持双击快速预约。
- **趣味贴纸**：日历展开时带有气泡弹出的趣味贴纸，支持任意拖放。
- **亮色/暗色模式**：支持系统主题自动切换，各大板块带有适配暗色的独立色调。
- **响应式设计**：完美适配移动端与桌面端，居中对齐展示。
- **动画与设计**：包含丰富的弹簧缩放、文字律动、色彩变化效果。详细的设计沉淀请参考 [Design.md](./Design.md)。

## 日历数据说明

项目目前的日历数据可以直接通过获取 iCloud 日历的共享订阅链接来解析，但由于跨国网络及 iCloud 的响应原因，直接拉取的数据量大且访问速度会比较慢（平均在 5~6 秒左右）。

**加速方案推荐：**
你可以做一个国内的云函数加速中转。本项目中使用了**火山云函数**的服务，你可以通过 MCP 直接本地开发部署云函数来做缓存和解析代理。配置完成后，可以将拉取速度缩减到平均 2 秒以内，并且由于个人站点的用量很小，这几乎不会产生任何费用。

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

## 项目结构

```
Miky-index/
├── public/
│   └── assets/         # 静态资源
├── src/
│   ├── components/     # 组件
│   ├── config/         # 配置
│   ├── utils/          # 工具函数
│   ├── index.css       # 全局样式
│   └── main.jsx        # 入口文件
├── index.html          # HTML 模板
├── vite.config.js      # Vite 配置
└── package.json        # 项目配置
```

## 自定义修改

- **日程数据源**：修改 `src/utils/ical.js` 中的日历链接
- **颜色方案**：修改 `src/index.css` 中的颜色定义
- **动画效果**：修改 `src/index.css` 中的动画关键帧
- **布局样式**：调整 Tailwind CSS 类名

## 注意事项

- 本地开发时，可能需要设置代理来避免 CORS 问题
- 确保图片资源放在 `public/assets/` 目录下
- 时区使用 UTC+8 (北京/上海时间)

---

欢迎根据个人需求延伸修改此项目！