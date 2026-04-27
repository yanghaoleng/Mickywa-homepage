# mickywa 个人网站

这是一个个人网站方案，使用 React + Vite + Tailwind CSS 构建。可以展示个人日程和社交账号基本信息，包含一些个人偏好的小细节，欢迎延伸修改。

## 功能特点

- **日程展示**：以月历形式展示个人日程安排
- **亮色/暗色模式**：支持系统主题自动切换
- **响应式设计**：适配不同屏幕尺寸
- **动画效果**：添加了弹簧动画和颜色变化效果
- **加载状态**：日历加载失败时会自动重试

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