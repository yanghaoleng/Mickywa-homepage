# Mickywa 项目语义化映射表

本文档用于将常用的模糊/语义化描述与代码中具体的变量名、组件名、类名等建立对应关系，避免后续开发时产生歧义。

---

## 一、核心组件与容器

| 语义化描述 | 代码中的对应名称 | 文件位置 | 说明 |
|-----------|----------------|---------|------|
| 主应用组件 | `App` | [src/App.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/App.jsx#L7) | 根组件 |
| 日程组件（核心） | `Schedule` | [src/components/Schedule.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/components/Schedule.jsx#L338) | 主功能组件，包含日历、推荐等 |
| 可拖拽贴纸组件 | `DraggableStickers` | [src/components/DraggableStickers.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/components/DraggableStickers.jsx#L251) | 贴纸功能主组件 |
| 独立贴纸浮层 | `DetachedStickersOverlay` | [src/components/DraggableStickers.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/components/DraggableStickers.jsx#L79) | 拖出后的贴纸展示层 |
| 顶部可撕 SVG 贴纸 | `PeelableStickerSvg` | `src/components/Schedule.jsx` | 首页顶部 mark 和 title 的撕下再贴回交互 |

---

## 二、UI 元素与区域

| 语义化描述 | 代码中的对应名称 | 类型 | 说明 |
|-----------|----------------|------|------|
| 智能推荐区域 / 推荐列表 | `recommendations` | 变量 | Schedule 组件中的推荐列表数据 |
| 日历区域 / 月历区域 | `schedule` 相关渲染代码 | 变量 | 日程数据数组 |
| 板块 / 彩色板块 | 各 section（找我耍、一起Vibe等） | 元素 | 页面上的各个彩色区块 |
| 泛泛而谈 / 灰色知识板块 / 羊石坨坨 Know-how | `KnowHowSection` / `KNOW_HOW_TOPICS` / `currentKnowHow` | 组件/数据 | 移动端在联系入口上方，桌面端在日历栏下方 |
| 顶部云朵 / mark / 小羊石图标 | `peelable-sticker-mark` | 元素 | 页面最顶部内联 SVG，可撕下再贴回 |
| 首页标题 / 羊石坨坨字样 | `peelable-sticker-title` | 元素 | `title.svg` 标题图，可撕下再贴回 |
| 信息流 / 内容流 | 主要滚动容器 | 容器 | 包含所有内容的滚动区域 |
| 底部信息栏 / 预约条 | `showBookingBar` 相关 | 状态 | 选中日期后底部弹出的预约栏 |
| 半弹窗 / 模态框 / 预约弹窗 | `showHalfModal` / `HalfModal` | 状态/组件 | 预约确认弹窗 |

---

## 三、按钮与交互元素

| 语义化描述 | 代码中的对应名称 | 类型 | 文件位置 | 说明 |
|-----------|----------------|------|---------|------|
| 智能推荐预约按钮 | `SmartRecButton` | 组件 | [src/components/Schedule.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/components/Schedule.jsx#L179) | 顶部智能推荐列表中的按钮 |
| 日历中的预约按钮 / 可预约日期格 | 日历中的 `slot.status === 'free'` 元素 | 元素 | 月历中可点击的日期格子 |
| 普通操作按钮 / 链接按钮 | `SimpleActionButton` | 组件 | [src/components/Schedule.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/components/Schedule.jsx#L268) | 板块中的通用按钮 |
| 展开/收起日历按钮 | `handleToggleCalendar` | 函数 | [src/components/Schedule.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/components/Schedule.jsx#L637) | 控制日历展开收起的按钮 |
| 刷新按钮 | 刷新相关的按钮元素 | 元素 | 重新加载日历数据的按钮 |
| 泛泛而谈随机按钮 | `ShuffleIcon` / `randomKnowHow` | 组件/函数 | 右侧乱序播放图标随机一篇；不提供上一条或下一条 |
| 微信复制按钮 | `copyWechatId` | 函数 | 随便聊板块中的“微信”按钮，复制 `yanghaoleng` 并提示 |

---

## 四、视觉效果与动画

| 语义化描述 | 代码中的对应名称 | 类型 | 说明 |
|-----------|----------------|------|------|
| 弹簧缩放入场动画 | `spring-scale-in` | CSS 类 | 元素进入时的弹簧效果 |
| 弹跳效果 / 按压弹跳 | `press-jump` | CSS 类 | 按钮被点击时的弹跳效果 |
| 彩虹背景 / 选中变色效果 | `animate-color-change` | CSS 类 | 按钮被选中时的彩虹渐变动画 |
| 贴纸气泡弹出效果 | `bubble-in` | CSS 类 | 贴纸出现时的气泡动画 |
| 顶部 SVG 撕贴效果 | `PeelableStickerSvg` / `peelable-sticker-*` | 组件/CSS 类 | 拖拽超过阈值后撕下，1 秒后自动贴回 |
| 日历卡片回弹效果 | `triggerCalendarCardBounce` | 函数 | 收起日历时的回弹动画 |
| 软模糊入场效果 | `soft-blur-in` | CSS 类 | 备用的柔和入场动画 |
| 文字律动 / 文字切换动画 | `BottomUpLettersSwap` | 组件 | 逐字上下切换的文字动画 |
| 泛泛而谈逐字翻页动画 | `AnimatedKnowHowText` / `know-how-char` | 组件/CSS 类 | 翻页时整段文字在 800ms 内逐字翻入 |

---

## 五、状态变量

| 语义化描述 | 代码中的对应名称 | 类型 | 说明 |
|-----------|----------------|------|------|
| 选中的日期 / 选中的预约格 | `selectedSlot` | 状态 | 当前选中的可预约日期槽 |
| 选中的推荐按钮 | `selectedSmartId` | 状态 | 当前选中的智能推荐项 ID |
| 淡出中的推荐按钮 | `fadingSmartId` | 状态 | 正在淡出的推荐项 ID |
| 日历展开状态 | `isCalendarExpanded` | 状态 | 日历是否展开 |
| 半弹窗显示状态 | `showHalfModal` | 状态 | 预约弹窗是否显示 |
| 底部预约栏显示状态 | `showBookingBar` | 状态 | 底部预约条是否显示 |
| 暗色模式 | `theme` / `dark:` | 状态/CSS | 暗色主题相关 |

---

## 六、数据与配置

| 语义化描述 | 代码中的对应名称 | 类型 | 文件位置 | 说明 |
|-----------|----------------|------|---------|------|
| 日历数据 / 日程数据 | `schedule` | 状态 | Schedule 组件 | 从 iCloud 获取的日程数组 |
| 娱乐活动列表 | `ENTERTAINMENT_ACTIVITIES_BY_TIME` | 常量 | Schedule 组件顶部 | 按白天/晚上分类的活动列表 |
| 泛泛而谈内容源 | `src/config/knowHow.md` / `parseKnowHowTopics` / `getKnowHowBlocks` | Markdown/函数 | 按 `## 数字. 小主题` 切分正文，过滤分组标题，列表统一圆点展示 |
| 贴纸资源 | `STICKERS` | 常量 | [src/components/DraggableStickers.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/components/DraggableStickers.jsx#L4) | 所有可用的贴纸图片路径 |
| 贴纸存储 | `stickerStore` | 对象 | [src/components/DraggableStickers.jsx](file:///Users/jojo/Documents/编程/Mikey-index/src/components/DraggableStickers.jsx#L26) | 管理贴纸状态的存储对象 |

---

## 七、引用与 Refs

| 语义化描述 | 代码中的对应名称 | 类型 | 说明 |
|-----------|----------------|------|------|
| 根容器引用 | `rootRef` | Ref | 页面根元素的引用 |
| 日历卡片引用 | `calendarCardRef` | Ref | 日历卡片元素的引用 |
| 推荐按钮引用集合 | `smartRecRefs` | Ref | 存储所有推荐按钮引用的对象 |
| 日历项引用集合 | `calendarItemRefs` | Ref | 存储所有可预约日期引用的对象 |

---

## 八、CSS 类名速查

| 语义化描述 | CSS 类名 | 说明 |
|-----------|---------|------|
| 智能推荐按钮容器 | `smart-rec-item` | 推荐按钮的外层容器 |
| 主题蓝色文字 | `text-[#083A8E]` 或相应类 | 品牌蓝色文字 |
| 圆角板块 | `rounded-[28px]` | 外层板块的圆角 |
| 圆角卡片 | `rounded-[18px]` | 内层卡片的圆角 |
| 触控热区最小高度 | `min-h-[44px]` | 按钮的最小高度 |

---

## 九、关键函数

| 语义化描述 | 函数名 | 说明 |
|-----------|--------|------|
| 打开预约弹窗 | `打开半弹窗` 相关逻辑 | 选中日期后打开预约确认 |
| 发送预约短信 | `sendSmartIMessage` | 发送 iMessage 预约 |
| 获取日历数据 | `fetchData` / `getCalendarsWithCache` | 加载日程数据 |
| 切换泛泛而谈内容 | `randomKnowHow` | 随机切换到另一篇 |
| 复制微信号 | `copyWechatId` / `copyText` | 复制 `yanghaoleng`，toast 提示“已复制微信号” |
| 首屏加载状态 / 转圈失败页 | `loading` / `error` / `loadingWatchdogError` | 只允许驱动日历区轻提示，不再控制整页正文是否渲染 |
| 静态日程快照 | `/schedule-snapshot.json` / `STATIC_SCHEDULE_JSON_URL` | 构建前生成的 21 天日程快照，首屏后台读取 |
| 处理推荐点击 | `handleRecommendationClick` | 点击智能推荐时的处理 |

---

## 注意事项

1. **二次确认机制**：所有跳转或发送消息的按钮都采用"首次点击选中 → 二次点击确认"的模式，避免误触
2. **动画时长标准**：常规反馈 150-400ms，入场和趣味动画 600ms，二次确认窗口 2000ms
3. **主题切换**：暗色模式通过 `dark:` 前缀和 `theme` 状态控制
4. **响应式宽度**：主体内容最大宽度 440px，保持移动端和桌面端一致
5. **首屏原则**：日历同步慢或失败时，不要恢复全屏 loading / error；静态内容必须先显示。

---

*最后更新：2026-07-27*
