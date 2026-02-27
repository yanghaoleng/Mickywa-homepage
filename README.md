# 罗师傅的档期 Web 版

这是一个从微信小程序移植过来的 Web 版本。使用 React + Vite + Tailwind CSS 构建。

## 本地开发

1. 进入目录：
   ```bash
   cd web
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 部署说明 (详细中文指南)

由于浏览器的安全策略（CORS），我们不能直接从网页访问 iCloud 的日历地址。必须通过一个中间的“代理服务”来转发请求。

推荐方案：**Supabase (后端代理) + Vercel (前端托管)**。这两个都有免费额度，且足够使用。

### 第一步：准备 Supabase 代理服务

1. **注册/登录 Supabase**：访问 [supabase.com](https://supabase.com) 并创建一个新项目。
2. **获取 Project Ref**：在项目设置中找到 Reference ID（如 `abcdefghijklm`）。
3. **本地部署 Function**：
   - 确保安装了 Supabase CLI (`brew install supabase/tap/supabase` 或 `npm i -g supabase`)。
   - 登录：`supabase login`
   - 在项目根目录（`web` 的上一级）运行：
     ```bash
     supabase link --project-ref <你的ProjectRef>
     supabase functions deploy fetch-calendar --no-verify-jwt
     ```
   - **注意**：如果不熟悉命令行，可以使用提供的 `supabase/functions/fetch-calendar/index.ts` 代码，在 Supabase 网页控制台的 "Edge Functions" 中手动创建一个名为 `fetch-calendar` 的函数，并将代码复制进去保存。
4. **获取 Function URL**：部署成功后会获得类似 `https://<project-ref>.supabase.co/functions/v1/fetch-calendar` 的地址。

### 第二步：部署前端网站

推荐使用 Vercel，因为它对 Vite 项目支持最好。

1. **推送到 GitHub**：将整个项目代码提交到你的 GitHub 仓库。
2. **注册/登录 Vercel**：访问 [vercel.com](https://vercel.com) 使用 GitHub 账号登录。
3. **导入项目**：
   - 点击 "Add New..." -> "Project"。
   - 选择你的 GitHub 仓库。
   - Framework Preset 会自动识别为 Vite。
   - Root Directory 选择 `web` (重要！因为前端代码在 web 目录下)。
4. **设置环境变量 (Environment Variables)**：
   - 展开 "Environment Variables" 选项卡。
   - Key: `VITE_PROXY_URL`
   - Value: `https://<你的project-ref>.supabase.co/functions/v1/fetch-calendar?url=`
   - **注意**：Value 的末尾一定要带上 `?url=`。
5. **点击 Deploy**。

### 第三步：访问

部署完成后，Vercel 会提供一个 `https://xxxx.vercel.app` 的域名，访问即可使用。

---

## 常见问题

**Q: 为什么本地运行图片不显示？**
A: 请确保图片在 `web/public/assets/` 目录下。代码中引用路径为 `/assets/topimg.png`。

**Q: 为什么显示“获取日程失败”？**
A: 请检查 `VITE_PROXY_URL` 环境变量是否正确设置，以及 Supabase Function 是否正常运行。如果本地开发，需要在本地 `.env` 文件中设置该变量，或者手动修改代码中的 `PROXY_URL` 常量。

**Q: 时区准确吗？**
A: 程序内部强制使用了 UTC+8 (北京/上海时间) 进行计算，无论用户设备的本地时区是什么，都会按照罗师傅所在的上海时间显示日程。
