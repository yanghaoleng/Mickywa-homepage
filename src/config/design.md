# 彩虹聚焦效果 (Rainbow Focus Effect)

## 概述

彩虹聚焦效果是一种选中状态的视觉反馈，通过背景色在多个柔和色调之间循环过渡，为用户提供直观的焦点提示。该效果广泛应用于智能推荐按钮、操作按钮和日历时间段选择等交互元素。

## 实现方式

### CSS Keyframes

定义在 `src/index.css` 中，使用 `@keyframes` 实现 4 色循环过渡：

| 变体 | 0%, 100% | 25% | 50% | 75% |
|------|----------|-----|-----|-----|
| `color-change` (默认) | `#D9ECFF` 浅蓝 | `#CFE0FF` 淡蓝 | `#E1D7FF` 浅紫 | `#D7CFFF` 淡紫 |
| `color-change-day` (白天) | `#D1FAF5` 青绿 | `#C7F7F0` 淡绿 | `#CFF3FF` 浅蓝 | `#C9FFE9` 薄荷 |
| `color-change-evening` (晚间) | `#EBDDFF` 浅紫 | `#E2D2FF` 淡紫 | `#DCCBFF` 藕紫 | `#EAD6FF` 粉紫 |

动画参数：`2s ease-in-out infinite`

### CSS Class

```css
.animate-color-change { animation: color-change 2s ease-in-out infinite; }
.animate-color-change-day { animation: color-change-day 2s ease-in-out infinite; }
.animate-color-change-evening { animation: color-change-evening 2s ease-in-out infinite; }
```

### React 组件使用方式

在按钮/列表项内部添加绝对定位的叠加层，配合 `selected` 和 `fading` 状态控制显隐和淡出：

```jsx
{(selected || fading) && (
  <div
    className={[
      "absolute inset-0 rounded-[12px] pointer-events-none animate-color-change transition-opacity ease-out",
      selected ? "opacity-100 duration-0" : "opacity-0 duration-[1000ms]"
    ].join(' ')}
  />
)}
```

- 选中时：`opacity-100`，立即显示彩虹背景
- 取消选中时：`opacity-0` + `duration-[1000ms]`，1 秒平滑淡出

## 适用组件

| 组件 | 用途 | 动画变体 |
|------|------|----------|
| `SmartRecButton` | 智能推荐预约按钮 | `animate-color-change` |
| `SimpleActionButton` | 刷抖音、一起vibe、随便聊等板块的操作按钮 | `animate-color-change` |
| 日历时间段选择项 | 白天/晚上/全天时间段 | `animate-color-change-day` / `animate-color-change-evening` |

## 交互模式

1. **首次点击**：元素进入选中状态，彩虹背景开始循环，右侧显示操作提示（如"约 →"、"去抖音 →"）
2. **再次点击**（2秒内）：触发实际操作（如跳转链接、发送消息）
3. **失焦**：元素进入 fading 状态，彩虹背景在 1 秒内淡出消失
