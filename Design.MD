# Mickywa 网站设计系统沉淀

这份文档是本项目的主设计规范，目标不是只记录“长什么样”，而是记录可复用的视觉 token、交互状态、按钮反馈、动效参数和工程落地方式。后续做同类个人站、预约页、轻量工具页时，可以直接从这里抽取组件和状态模型。

## 1. 设计定位

网站是一个移动优先的个人预约与兴趣入口页，核心气质是轻盈、亲近、带一点玩心，但交互上要像工具一样明确。视觉上用大色块区分内容区，用白色或深灰内层承载列表，用微交互让每一次点击都有确认感。

复用时优先保留这些原则：

1. **先给反馈，再执行动作**：重要跳转或发消息按钮采用“首次点击选中，二次点击确认”的模式，避免误触。
2. **反馈分层**：背景负责状态，文字负责意图，位移和缩放负责触感。
3. **暗色不是反色**：暗色使用主题色低透明背景加浅色文字，保持通透感。
4. **动效短而有物理感**：常规反馈控制在 150ms 到 400ms，入场和贴纸类趣味动效可以到 600ms。
5. **单屏宽度稳定**：主体最大宽度 `440px`，让移动端和桌面端共享同一套视觉节奏。

## 2. 文件职责

| 文件 | 职责 |
| --- | --- |
| `Design.MD` | 主设计系统文档，记录全站规范、token、状态和复用建议 |
| `src/config/design.md` | 已合并到本文，保留迁移说明和入口 |
| `src/index.css` | CSS 动效、字体、滚动条、全局工具类 |
| `src/components/Schedule.jsx` | 日程、推荐按钮、半弹窗、键盘交互、按钮状态机 |
| `src/components/DraggableStickers.jsx` | 贴纸拖拽、删除区、贴纸生成动效 |
| `tailwind.config.js` | Tailwind 基础配置，目前只保留少量扩展色 |

## 3. 色彩系统

### 3.1 中性色

| Token | Light | Dark | 使用场景 |
| --- | --- | --- | --- |
| `page-bg` | `#FFFFFF` | `#333333` | 页面背景、App 外壳 |
| `surface` | `#FFFFFF` | `#333333` | 卡片内层、半弹窗 |
| `text-primary` | `#3A3A3A` | `#FFFFFF` | 主文字、标题、选中态文字 |
| `text-secondary` | `#3A3A3A/70` | `#FFFFFF/70` | 辅助说明 |
| `text-muted` | `#3A3A3A/50` | `#FFFFFF/50` | 日期 meta、不可用状态 |
| `divider` | `#3A3A3A/10` | `#FFFFFF/10` | 分隔线 |
| `modal-overlay` | `#3A3A3A/30` | `#000000/30` | 半弹窗遮罩 |

注意：旧文档里的全局背景 `#F9F9F9` 和暗色 `#1E1E1E` 已不匹配当前实现；当前代码以 `#FFFFFF` 和 `#333333` 为准。

### 3.2 品牌与动作色

| Token | 值 | 使用场景 |
| --- | --- | --- |
| `brand-blue` | `#083A8E` | 预约主色、主按钮、亮色链接、推荐文字 |
| `brand-blue-soft` | `#D3F1FF` | “找我耍”背景、暗色标题 mask、彩虹聚焦候选色 |
| `selected-text` | `#3A3A3A` | 彩虹聚焦上的文字 |
| `danger-soft` | `#FFDDDD` | 今日角标、mark 动画候选色 |
| `danger-trash` | `red-400/80` 到 `red-500` | 贴纸删除区 |

### 3.3 板块主题色

| 板块 | Light 背景 | Light 文字 | Dark 背景 | Dark 文字/标题 |
| --- | --- | --- | --- | --- |
| 找我耍 | `#D3F1FF` | `#083A8E` | `#083A8E/25` | `#D3F1FF` |
| 一起 Vibe | `#FEF3C7` | `#8E6A08` | `#8E6A08/25` | `#FFF4D3` |
| 刷抖音 | `#FFE4E6` | `#8E083A` | `#8E083A/25` | `#FFD3F1` |
| 随便聊 | `#E6F4EA` | `#088E3A` | `#088E3A/25` | `#D3FFD3` |

复用新板块时，必须补齐这 4 个值：`lightBg`、`lightText`、`darkBg`、`darkText`。暗色背景建议用深色主题值加 `25%` 透明度，暗色文字建议用同色相的浅色版本。

### 3.4 日历状态色

| 状态 | Light | Dark | 说明 |
| --- | --- | --- | --- |
| 全天可约 | 背景 `#D3F1FF`，文字 `#083A8E` | 背景 `#083A8E`，文字 `#FFFFFF` | 主预约状态 |
| 白天可约 | 背景 `#C9F6FF`，文字 `#083A8E` | 背景 `#085C8E`，文字 `#FFFFFF` | 偏青蓝 |
| 晚上可约 | 背景 `#E1DCFF`，文字 `#083A8E` | 背景 `#2A338E`，文字 `#FFFFFF` | 偏紫蓝 |
| 不可约 | 背景 `#333333/10` | 背景 `#FFFFFF/4` | 文案整体 `opacity-50` |
| 今日角标 | `#FFDDDD` + `#3A3A3A` | 同 light | 右上角旋转 `6deg` |

### 3.5 彩虹聚焦色

彩虹聚焦用于选中态和二次确认态，所有变体时长统一为 `2s ease-in-out infinite`。

| 变体 | 使用场景 | 0%,100% | 25% | 50% | 75% |
| --- | --- | --- | --- | --- | --- |
| `color-change` | 推荐按钮、普通动作按钮、全天可约 | `#D9ECFF` | `#CFE0FF` | `#E1D7FF` | `#D7CFFF` |
| `color-change-day` | 白天可约 | `#D1FAF5` | `#C7F7F0` | `#CFF3FF` | `#C9FFE9` |
| `color-change-evening` | 晚上可约 | `#EBDDFF` | `#E2D2FF` | `#DCCBFF` | `#EAD6FF` |

### 3.6 随机柔色池

用于 mark 动画、日历展开 ripple 和趣味反馈：

`#D3F1FF`、`#CFEDD9`、`#FFDDDD`、`#FCF7BD`、`#E7DDFF`、`#FFE8CC`

新项目复用时，这组颜色可以作为 “playful pastel” 范围。不要把它们用于正文文字，主要用于背景、波纹、标记和短时反馈。

## 4. 排版与字体

| 项目 | 规范 |
| --- | --- |
| Logo/标题 SVG | 使用图片资源，暗色下用 `mask + background-color` 换色 |
| 数字序号 | `QH-bold-en` 字体，元素同时使用 `qh-bold-en` 和 `qh-num` |
| 序号宽度 | 运行时测量 `0.` 到 `9.`，写入 `--qh-num-width`，避免列表抖动 |
| 主列表文字 | `16px`，`font-medium`，`leading-relaxed` |
| 日历日期 | 日期 `15px font-semibold`，状态 `11px` |
| 半弹窗标题 | `18px font-semibold` |
| 半弹窗活动按钮 | `14px font-medium` |
| 弱提示 | `12px` 到 `15px`，透明度 `50%` 到 `72%` |

文本容器需要保留 `min-w-0`、`truncate` 或 `break-words`，避免按钮右侧 action 文案出现时挤压溢出。

## 5. 布局、圆角与阴影

### 5.1 页面结构

| Token | 值 | 使用场景 |
| --- | --- | --- |
| `content-max-width` | `440px` | 主内容、底部预约条、移动半弹窗 |
| `page-x-padding` | `20px` | 主内容左右留白 |
| `section-gap` | `24px` | 大板块之间 |
| `list-gap` | `8px` | 列表项之间 |
| `bottom-safe-space` | `128px` | 主滚动区域底部，给预约条留空间 |

### 5.2 圆角

| Token | 值 | 使用场景 |
| --- | --- | --- |
| `radius-section` | `28px` | 彩色外层板块 |
| `radius-surface` | `18px` | 白色或深灰内层容器 |
| `radius-control` | `12px` | 推荐按钮、动作按钮、日历格、半弹窗按钮 |
| `radius-modal` | `24px` | 半弹窗桌面四角、移动端顶部 |
| `radius-pill` | `999px` | 小型刷新按钮 |
| `radius-badge` | `10px` | 今日角标 |

### 5.3 阴影与光感

| 场景 | 值 |
| --- | --- |
| 彩色板块内发光 | Light `inset 0 0 72px rgba(255,255,255,0.70)`，Dark `rgba(255,255,255,0.12)` |
| 日历可约格内发光 | Light `inset 0 0 32px rgba(255,255,255,0.80)`，Dark `rgba(255,255,255,0.20)` |
| 今日角标内发光 | `inset 0 0 24px rgba(255,255,255,0.65)` |
| 底部预约条 | `0 -12px 32px rgba(0,0,0,0.08)` |
| Toast | `shadow-lg` |
| 贴纸描边 | 四向白色 `drop-shadow(2px)` + 下方 `rgba(0,0,0,0.15)` |

## 6. 按钮与交互反馈

### 6.1 推荐按钮和普通动作按钮

适用组件：`SmartRecButton`、`SimpleActionButton`。

基础结构：

- 外层：`relative flex items-start gap-2 rounded-[12px] px-[14px] pt-2 pb-1.5 min-h-[44px]`
- 文本：`16px font-medium leading-relaxed truncate`
- 右侧动作：`18px font-bold` 箭头，动作词 `14px`
- 入场：`spring-scale-in`，列表项按 `0.05s` 递增延迟

状态机：

| 状态 | 触发 | 视觉反馈 | 行为 |
| --- | --- | --- | --- |
| Default | 初始 | 主题文字色，透明背景 | 等待点击 |
| Pressed | 点击瞬间 | 内容层执行 `press-jump`，`0.28s` | 给即时触感 |
| Selected | 首次点击 | 彩虹背景立即显示，文字转 `#3A3A3A`，右侧显示动作词和箭头 | 进入二次确认窗口 |
| Confirm | 2 秒内再次点击 | 再次播放按压反馈 | 执行跳转、打开短信或发送 |
| Fading | 失焦或外部点击 | 彩虹背景和动作词 `1000ms` 淡出 | 清理选中态 |
| Disabled | 无数据 | `opacity-50`，不可聚焦 | 不响应点击 |

关键参数：

- 二次确认窗口：`2000ms`
- `pressed` 保持：约 `200ms`，外部 `triggerSlotPress` 为 `360ms`
- 彩虹背景：`absolute inset-0 rounded-[12px] pointer-events-none`
- 选中显示：`opacity-100 duration-0`
- 退出淡出：`opacity-0 duration-[1000ms] ease-out`
- 键盘：`Enter` / `Space` 可触发按钮；推荐按钮在 selected 状态下按键会直接确认，指针点击则受 `2000ms` 二次确认窗口约束

工程注意：

- 如果复用到真实支付、删除等高风险动作，应把二次确认窗口延长到 `3000ms`，并把右侧动作词写成明确动词。
- 如果按钮文案超过一行，右侧 action 必须 `shrink-0`，左侧必须 `min-w-0`。
- 当前实现用彩虹聚焦替代传统 focus ring；未来做无障碍增强时应补 `focus-visible` 外描边，不能只依赖颜色变化。

### 6.2 半弹窗活动按钮

适用场景：半弹窗内选择游玩项目。

| 状态 | 视觉 |
| --- | --- |
| Default | `#E5E5E5` / Dark `#444444` 背景，正文色 |
| Active Press | `active:scale-95 transition-all` |
| Selected | 彩虹背景铺满，文字 `#083A8E` |
| Random | 第三个按钮显示 `随机：{activity}`，点击时只更新随机项目和预约文案 |

这类按钮不做二次确认，因为它只改变本地选择，不立即离开页面。

### 6.3 底部预约条

触发：选择日历可预约日期后出现。

- 入场：`slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`
- 容器：固定底部，`max-width: 440px`，`rounded-t-[18px]`
- 反馈：`hover:opacity-90`，`active:scale-[0.99]`，`transition-all`
- 点击：打开半弹窗

### 6.4 刷新、重试、发送、收起按钮

这些是传统命令按钮，当前实现较轻：

- 刷新/重试：`rounded-full`，主色背景，无显式按压缩放。
- 半弹窗底部“收起/发送”：`rounded-[12px]`，`hover:opacity-80`，`active:scale-95`。
- 主按钮使用 `#083A8E` + `#FFFFFF`；次按钮使用中性色透明背景。

复用建议：所有命令按钮至少补齐 `hover`、`active`、`disabled`、`loading` 四态。当前项目未实现 loading spinner 版按钮，未来可以追加。

### 6.5 日历格反馈

| 状态 | 触发 | 反馈 |
| --- | --- | --- |
| 可约 Default | 初始 | 时间段主题背景 + 内发光 |
| Press | 点击 | 物理弹簧缩放 `1 -> 0.92 -> 1`，最长约 `640ms` |
| Selected | 首次点击 | 彩虹聚焦覆盖，文字转深色，底部预约条出现 |
| Confirm | 同一日期 2 秒内再次点击 | 打开半弹窗 |
| Deselect | 同一日期超过 2 秒再次点击 | 取消选中 |
| Busy | 不可约 | 低透明背景，`cursor-not-allowed`，内容 `opacity-50` |

注意：CSS 中有 `shake` / `shake-feedback`，代码里也保留了 `shakingSlotId`，但当前日历格未实际绑定 shake class。若未来要强化不可约反馈，应把不可约点击接入 `shake-feedback 0.5s cubic-bezier(.36,.07,.19,.97)`。

### 6.6 展开日历按钮

展开/收起日历是一个轻量 toggle：

- 外观沿用推荐按钮尺寸和文字样式。
- 点击会触发随机柔色 ripple：
  - fill：透明度 `0 -> 0.22 -> 0`，`260ms + 320ms`
  - ring：延迟 `150ms`，边框 `0 -> 0.5px -> 0`，透明度最高 `0.7`，`260ms + 420ms`
- 收起时额外触发：
  - `navigator.vibrate(10)`，移动端短震动
  - `haptic-pulse 0.15s`
  - 内容区 `collapse-gentle 0.22s`
  - 过渡结束后日历卡片执行物理回弹，卡片 scale 约 `1%`，标题上移约 `6px`

## 7. 动效 Token

### 7.1 核心 CSS 动效

| 名称 | 时长 | 缓动 | 关键帧 | 使用场景 |
| --- | --- | --- | --- | --- |
| `spring-scale-in` | `0.6s` | `cubic-bezier(0.34,1.56,0.64,1)` | opacity `0 -> 1`，scale `0.6 -> 1` | 标题、板块、列表、日历格入场 |
| `spring-click` | `0.4s` | 同上 | scale `1 -> 1.25 -> 1` | 顶部 mark、标题点击 |
| `press-jump` | `0.28s` | 同上 | y `0 -> -10px -> 2px -> 0` | 推荐按钮和动作按钮按压 |
| `haptic-pulse` | `0.15s` | `ease-out` | scale `1 -> 0.97 -> 1`，opacity `1 -> 0.8 -> 1` | 收起日历 |
| `collapse-gentle` | `0.22s` | `cubic-bezier(0.22,1,0.36,1)` | y `0 -> -8px -> 2px -> 0` | 日历折叠 |
| `fade-in-out` | `2s` | `ease-in-out` | opacity/scale 进出 | Toast |
| `bubble-in` | `0.6s` | 弹簧贝塞尔 | scale `0.3 -> 1.15 -> 1`，y `10px -> -2px -> 0` | 贴纸生成 |
| `soft-blur-in` | `0.8s` | `cubic-bezier(0.25,0.46,0.45,0.94)` | opacity `0 -> 1`，blur `12px -> 0`，y `8px -> 0` | 备用柔和入场 |
| `animate-text` | `7s` | `ease-in-out` | 文字出现、停留、上移淡出 | 备用循环文字 |
| `shake` | `0.5s` | `cubic-bezier(.36,.07,.19,.97)` | x 方向快速摆动 | 备用错误反馈 |
| `float` | `2s` | `ease-in-out` | y `-4px -> -8px -> -4px` | 备用悬浮反馈 |

`press-shrink` 和 `press-bouncy` 已定义但当前主界面未使用。复用时建议：

- 危险/删除类按钮用 `press-shrink`，更克制。
- 趣味型按钮用 `press-bouncy`，更活泼。
- 普通列表项继续用 `press-jump`，保持本项目识别度。

### 7.2 文字切换动效

`BottomUpLettersSwap` 使用 WAAPI 逐字动画，适合短活动词、短标签和半弹窗副标题。

| 阶段 | 时长 | stagger | 缓动 | from | to |
| --- | --- | --- | --- | --- | --- |
| Exit | `280ms` | `28ms/字` | `cubic-bezier(0.7,0,0.84,0)` | opacity `1`，y `0` | opacity `0`，y `-14px` |
| Gap | `35ms` | 无 | 无 | 旧文本卸载 | 新文本挂载 |
| Enter | `400ms` | `88ms/字` | `cubic-bezier(0.18,1,0.32,1)` | opacity `0`，y `46px` | opacity `1`，y `0` |

复用边界：

- 适合短文本，最好少于 12 个中文字符。
- 不加 blur，保证小字号也清晰。
- 长文案请改成整句 fade 或逐词动画，避免总时长过长。

### 7.3 半弹窗动效

| 场景 | 入场 | 退出 |
| --- | --- | --- |
| Mobile | `slideUpModalMobile 0.4s cubic-bezier(0.16,1,0.3,1)` | `slideDownModal 0.3s ease-in` |
| Desktop | `scaleInModal 0.3s ease-out` | `scaleOutModal 0.25s ease-out` |
| Overlay | opacity `0 -> 1`，`300ms` | opacity `1 -> 0`，`300ms` |

移动端半弹窗顶部圆角 `24px`，底部无圆角；桌面端居中，最大宽度 `400px`，最大高度 `80vh`，四角 `24px`。

代码里保留了下拉关闭相关方法：下拉超过 `100px` 可关闭。但当前 JSX 未绑定 touch handlers，未来要做手势关闭时需要补接 `onTouchStart`、`onTouchMove`、`onTouchEnd`。

### 7.4 贴纸动效

| 行为 | 反馈 |
| --- | --- |
| 贴纸槽出现 | `bubble-in`，每个贴纸延迟 `index * 0.1s` |
| hover 贴纸 | scale `1 -> 1.1`，`300ms` |
| 开始拖拽 | 原位图隐藏，预览图 fixed，scale `1.5`，z-index `9999999` |
| 放置到页面 | 绝对定位，保留白色描边和投影 |
| 拖到删除区 | 删除区 scale `1.1`，背景变 `red-500` |
| 删除 | 贴纸 scale `0` + opacity `0`，`300ms` 后移除 |
| 删除区出现/隐藏 | `translate-y-24 -> 0` / `0 -> translate-y-24`，即约 `96px` 位移，opacity `0 -> 1` / `1 -> 0`，`300ms` |

## 8. 组件复用清单

### 8.1 新增一个彩色板块

必须准备：

1. 板块 SVG 标题，light 模式直接显示，dark 模式用 mask 上色。
2. `lightBg`、`lightText`、`darkBg`、`darkText` 四色。
3. 外层 `rounded-[28px] pt-5 pb-3.5 px-3.5`。
4. 内层 `bg-[#FFFFFF] dark:bg-[#333333] rounded-[18px] pt-3.5 pb-3.5 px-3.5`。
5. 列表按钮使用 `SimpleActionButton` 的二次确认模型。
6. 每个按钮必须有明确 `actionText`，例如 `发送消息`、`去 github`、`打开链接`。

### 8.2 新增一个推荐按钮

必须准备：

1. 稳定的 `id`，用于 refs、选中态和淡出态。
2. `title` 或 `titleNode`。
3. `onActivate` 只进入选中，不做最终动作。
4. `onConfirm` 才执行最终动作。
5. `disabled` 时必须去掉可点击行为和 tab 进入。
6. 如果使用动效文字，优先用 `BottomUpLettersSwap`。

### 8.3 新增一种日历可用状态

必须准备：

1. Default 背景和文字色。
2. Dark 背景和文字色。
3. 对应彩虹聚焦 keyframes，或明确复用 `color-change`。
4. 选中后文字统一回到 `#3A3A3A`。
5. 不可约 fallback，不允许只有颜色差异而无文案。

## 9. 键盘和可访问性

当前已实现：

- 推荐按钮和普通动作按钮支持 `Enter` / `Space`。
- 推荐按钮使用 `role="button"`、`tabIndex`、`aria-pressed`。
- 全局 `Escape` 清理日历选择、推荐选中或 fading 状态。
- `Tab`、`Shift+Tab`、方向键可在智能推荐和日历之间移动。
- 半弹窗打开后：`Escape` 关闭，`ArrowLeft` / `ArrowRight` 切换活动，`Enter` 发送。

需要补齐的工程化项：

1. `focus-visible`：给键盘用户明确描边，例如 `outline: 2px solid currentColor; outline-offset: 3px;`。
2. `prefers-reduced-motion`：关闭无限彩虹动画、降低弹簧位移、保留 opacity 反馈。
3. `disabled` 语义：原生 `button` 用 `disabled`，`role="button"` 元素补 `aria-disabled`。
4. 颜色对比：彩虹背景上的文字统一使用 `#3A3A3A`，不要使用浅色文字。
5. 触摸热区：核心交互最小高度保持 `44px`。

## 10. 工程化建议

为了让这套设计更容易跨项目复用，建议后续逐步做这些整理：

1. **抽出 token 文件**：把颜色、圆角、时长、缓动写成 JS object 或 CSS variables，避免散落在 className。
2. **补 Tailwind token**：把 `brand-blue`、板块色、`radius-section` 等放进 `tailwind.config.js`。
3. **统一按钮组件**：把 `SmartRecButton` 和 `SimpleActionButton` 的二次确认逻辑提成 hook，例如 `useTwoStepConfirm`。
4. **统一 motion preset**：把 `springParams`、`press-jump`、`fadeOutMs` 变成命名常量。
5. **补 reduced motion**：为无限循环动画和大位移动效提供无障碍降级。
6. **补状态测试清单**：至少覆盖首次点击、2 秒内确认、失焦淡出、键盘触发、暗色模式、长文案、不可用状态。
7. **修正无效 Tailwind 类**：如需稳定轻微上浮，建议使用 `-translate-y-[5px]` 这类明确 arbitrary value，而不是非标准 spacing 名。

## 11. 快速复用参数

```js
export const motion = {
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  standardOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  modalOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  pressJumpMs: 280,
  selectedFadeMs: 1000,
  twoStepConfirmMs: 2000,
  sectionEnterMs: 600,
};

export const radii = {
  section: 28,
  surface: 18,
  control: 12,
  modal: 24,
};

export const layout = {
  contentMaxWidth: 440,
  pageXPadding: 20,
  minTouchTarget: 44,
};
```

## 12. 复用验收标准

复用这套设计时，至少检查：

1. Light / Dark 下所有板块都有对应背景、文字和标题颜色。
2. 所有会跳转或发消息的列表按钮都有首次选中和二次确认。
3. 选中态有背景、文字、动作词、位移或缩放中的至少 3 层反馈。
4. 失焦或外部点击后，选中背景能平滑淡出。
5. 键盘可以完成主要路径，不依赖鼠标。
6. 长文案不会把右侧箭头或动作词挤出容器。
7. 无限动画在 reduced motion 下可以关闭或弱化。
8. 半弹窗在移动端贴底，在桌面端居中，且遮罩和退出动画一致。

## 13. 彩虹聚焦专项附录

本节由原 `src/config/design.md` 合并而来，作为可点击列表项、二次确认按钮和日历格的工程复用模板。核心原则：彩虹聚焦是选中态反馈，不是普通装饰；它应该帮助用户确认当前意图，并在需要时阻止误触。

### 13.1 适用场景

| 场景 | 是否适合 | 原因 |
| --- | --- | --- |
| 推荐预约按钮 | 适合 | 首次点击先确认意图，二次点击再发消息 |
| 外部链接按钮 | 适合 | 避免误触跳出当前页面 |
| 日历可预约格 | 适合 | 明确当前选中的日期和时段 |
| 半弹窗内选项 | 适合 | 表示当前选择，不执行高风险动作 |
| 删除、支付、提交表单 | 谨慎 | 可以使用，但必须增加明确文案和更长确认窗口 |
| 纯展示卡片 | 不适合 | 会误导用户以为可以继续操作 |

### 13.2 DOM 分层模板

按钮内部建议固定为 3 层：

1. **Root**：负责尺寸、圆角、点击、键盘和 aria。
2. **Focus Fill**：绝对定位，负责彩虹背景，不接收事件。
3. **Content**：相对定位，负责文字、动作词、箭头和 press 动效。

```jsx
<div className="relative rounded-[12px] min-h-[44px]" role="button" tabIndex={0}>
  {(selected || fading) && (
    <div
      className={[
        "absolute inset-0 rounded-[12px] pointer-events-none animate-color-change transition-opacity ease-out",
        selected ? "opacity-100 duration-0" : "opacity-0 duration-[1000ms]"
      ].join(" ")}
    />
  )}
  <div className={["relative z-10 flex items-center justify-between", pressed ? "press-jump" : ""].join(" ")}>
    <span className="min-w-0 truncate">按钮文案</span>
    {(selected || fading) && <span className="shrink-0">动作 →</span>}
  </div>
</div>
```

### 13.3 CSS 类和动效降级

彩虹聚焦对应 CSS class：

```css
.animate-color-change { animation: color-change 2s ease-in-out infinite; }
.animate-color-change-day { animation: color-change-day 2s ease-in-out infinite; }
.animate-color-change-evening { animation: color-change-evening 2s ease-in-out infinite; }
```

推荐 reduced motion 降级：

```css
@media (prefers-reduced-motion: reduce) {
  .animate-color-change,
  .animate-color-change-day,
  .animate-color-change-evening {
    animation: none;
    background-color: #D9ECFF;
  }

  .press-jump {
    animation-duration: 120ms;
  }
}
```

### 13.4 状态实现细节

二次确认状态机参见 6.1，日历格反馈参见 6.5。实现时要特别注意淡出不应立即卸载，而是保留一帧 fading 状态：

```jsx
setFading(true);
setSelected(false);
setTimeout(() => setFading(false), 1000);
```

这样可以保证彩虹背景和动作词从 `opacity-100` 平滑降到 `opacity-0`，避免硬切。

### 13.5 专项验收清单

1. 第一次点击只选中，不执行最终动作。
2. 第二次点击必须在 `2000ms` 内才确认。
3. blur、Escape、外部点击能触发 `1000ms` 淡出。
4. 长文案不会挤掉右侧动作词和箭头。
5. 键盘 `Enter` / `Space` 能完成同等路径；如果要严格等价鼠标二次确认，需要在键盘分支也检查 `2000ms`。
6. Dark mode 下彩虹聚焦仍使用浅色背景，文字保持深色。
7. reduced motion 下不会出现无限循环闪动。

## 14. 首屏加载体验

羊石坨坨首页是静态信息优先的页面，日历数据属于增强内容。首屏不得用全屏 loading、全屏失败态或刷新按钮遮挡标题、推荐区和链接区。

- 日历同步中：正文正常显示，日历卡片内部可用一行轻提示。
- 有旧日程缓存：继续展示最近一次可用日程，并用小提示说明后台同步。
- 无日程数据：推荐位显示“暂无可预约时间”，日历展开区显示“日历正在后台同步，其他内容可先浏览。”
- 真正失败：只影响日历区，不阻塞“一起 Vibe / 刷抖音 / 随便聊”等静态板块。
