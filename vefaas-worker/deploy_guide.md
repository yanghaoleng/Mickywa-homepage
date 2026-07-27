# veFaaS Deploy 配置指南 (AI 操作手册)

> **这是一份给 AI 助手的操作指南**。当用户说"帮我配置部署"或"根据这个指南配置"时，请按照本文档的步骤操作。

## 🎯 你的任务

帮助用户创建或修改 `deploy.config.json` 配置文件，使其能够通过 `vefaas-deploy` CLI 工具将 Docker 镜像部署到火山引擎 veFaaS。

---

## 📋 操作步骤

### 第 1 步：一键检查环境 ⭐

**首先让用户运行环境检查命令**：

```bash
vefaas-deploy check
```

这会一次性检查：
- Docker 是否可用
- skopeo 是否安装（用于 --auto 版本递增）
- 火山引擎凭证是否配置
- 项目配置文件是否存在
- 各服务的函数 ID 是否有效

**根据检查结果处理问题**：

| 检查结果 | 解决方案 |
|----------|----------|
| ❌ 火山引擎凭证未配置 | `vefaas-deploy config` |
| ⚠️ skopeo 未安装 | `brew install skopeo` (macOS) 或 `apt install skopeo` (Linux) |
| ❌ 项目配置不存在 | 继续第 2 步创建配置 |
| ⚠️ 服务未配置函数ID | 运行 `vefaas-deploy function list` 获取函数 ID |

### 第 2 步：获取函数和镜像信息（如 check 显示缺失）

```bash
# 列出所有 veFaaS 函数（获取函数 ID）
vefaas-deploy function list

# 查看某个函数详情（从镜像 URI 提取 registry/namespace）
vefaas-deploy function info <函数ID>
```

### 第 3 步：分析项目 Dockerfile

1. **查找所有 Dockerfile**
   ```bash
   find . -name "Dockerfile*" -type f
   ```

2. **阅读 Dockerfile**，确定 context：
   - context 是 `docker build` 的最后一个参数，决定了 COPY 的相对路径基准
   - 如果 `COPY package.json .`，则 context 目录下必须有 `package.json`

### 第 4 步：生成配置文件

创建 `deploy.config.json`：

```json
{
  "name": "项目名称",
  "registry": {
    "url": "镜像仓库地址",
    "namespace": "命名空间"
  },
  "services": {
    "服务名": {
      "functionId": "veFaaS函数ID或留空",
      "dockerfile": "相对路径/Dockerfile",
      "context": "构建上下文目录",
      "imageName": "镜像名",
      "platform": "linux/amd64"
    }
  }
}
```

### 第 5 步：验证并部署

```bash
# 再次检查配置是否正确
vefaas-deploy check

# 测试构建（不推送）
vefaas-deploy deploy --version v0.0.1 --skip-push --dry-run

# 正式部署
vefaas-deploy deploy --auto
```

---

## 📖 字段详解

### context 确定方法（重点）

| Dockerfile 内容 | 正确的 context |
|-----------------|----------------|
| `COPY package.json .` 且 package.json 在项目根目录 | `"."` |
| `COPY . .` 且 Dockerfile 在 `backend/Dockerfile` 只需要 backend 代码 | `"backend"` |
| `COPY frontend/ ./fe` + `COPY backend/ ./be` | `"."`（需要访问多个顶层目录） |

### 服务命名建议

| 服务类型 | 命名示例 |
|----------|----------|
| 主 API 服务 | `api` |
| 后台 Worker | `worker` |
| 定时任务 | `cron` |
| 前端 SSR | `web` |

### 镜像名称建议

- 单服务项目：直接用项目名，如 `my-project`
- 多服务项目：`项目名-服务名`，如 `my-project-api`、`my-project-worker`

---

## ⚠️ 常见问题处理

> 💡 大多数问题可以通过 `vefaas-deploy check` 发现并给出解决建议

### 问题 1：check 显示凭证未配置
**解决**：`vefaas-deploy config`

### 问题 2：check 显示 skopeo 未安装
**影响**：`--auto` 版本递增不可用
**解决**：`brew install skopeo` (macOS) 或 `apt install skopeo` (Linux)

### 问题 3：用户不知道镜像仓库地址或函数 ID
**解决**：
```bash
vefaas-deploy function list        # 获取函数 ID
vefaas-deploy function info <ID>   # 从镜像 URI 提取 registry/namespace
```

### 问题 4：构建时 COPY 失败
**原因**：context 设置错误
**解决**：检查 Dockerfile 中 COPY 的源路径相对于哪个目录

### 问题 5：push 时报 authentication required
**解决**：`docker login <镜像仓库地址>`

### 问题 6：多个 Dockerfile 不知道配哪个
**回复**："这个项目有多个 Dockerfile，请告诉我你想部署哪些服务？"

---

## 🔧 CLI 命令参考

### 最常用命令
```bash
# ⭐ 一键检查环境和配置状态
vefaas-deploy check

# 部署（自动递增版本号）
vefaas-deploy deploy --auto

# 部署指定版本
vefaas-deploy deploy --version v1.0.0
```

### 配置和查询
```bash
# 配置火山引擎凭证
vefaas-deploy config

# 初始化项目配置（交互式向导）
vefaas-deploy init

# 列出所有 veFaaS 函数（获取函数 ID）
vefaas-deploy function list

# 查看函数详情（获取镜像 URI）
vefaas-deploy function info <函数ID>

# 查看项目函数当前运行的镜像
vefaas-deploy function current

# 查看远端仓库的镜像版本（需要 skopeo）
vefaas-deploy images
```

### 测试和调试
```bash
# 仅构建不推送（测试 Dockerfile 和 context）
vefaas-deploy deploy --version v0.0.1 --skip-push --dry-run
```

---

## 📄 当前项目状态

**尚未创建配置文件**

请按照上述步骤帮助用户创建 `deploy.config.json`。


---

## 💡 对话示例

**用户**："帮我配置部署"

**AI 回复**：
> 好的，先检查一下环境状态：
> ```bash
> vefaas-deploy check
> ```
> 请把输出结果发给我。

---

**用户**：（贴出 check 结果，显示凭证OK但没有项目配置）

**AI 回复**：
> 环境已就绪 ✅ 现在来创建配置文件。
>
> 我先查一下项目的 Dockerfile...（分析项目）
>
> 找到了 `deployments/Dockerfile`，需要以下信息：
> 1. 镜像仓库地址和命名空间？
>    - 可以运行 `vefaas-deploy function info <函数ID>` 从已有函数的镜像 URI 中提取
> 2. 要部署到哪个函数？
>    - 可以运行 `vefaas-deploy function list` 查看

---

**配置完成后**：
> 配置文件已生成，再跑一次检查：
> ```bash
> vefaas-deploy check
> ```
> 如果全部通过，就可以部署了：
> ```bash
> vefaas-deploy deploy --auto
> ```
