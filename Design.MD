# 设计规范

## 颜色系统

| 名称 | 颜色值 | 用途 |
|------|--------|------|
| 正文 | #3A3A3A | 主要文本颜色 |
| 背景1 | #FCF7BD | 背景色 |
| 纯白 | #FFFFFF | 白色背景 |
| 深灰 | #333333 | 暗色模式背景 |
| 薄荷 | #CFEDD9 | 辅助色 |
| 粉 | #FFDDDD | 辅助色 |
| 棕5 | #975322 | 辅助色 |
| 蓝5 | #083A8E | 辅助色 |
| 棕6 | #563117 | 辅助色 |
| 蓝1 | #D3F1FF | 辅助色 |

## 字体

### Typography Tokens

| Token | 值 | 现用场景（示例） |
|------|----|------------------|
| `font.weight.semibold` | 600 | 日期数字（加粗） |
| `font.size.monthTitle` | `text-xl` | 月标题（如 “5月”） |
| `font.size.weekday` | `text-xs` | 周标题（一二三四五六日） |
| `font.size.dateNumber` | `text-base` | 日期数字（如 “8”） |
| `font.size.status` | `text-xs` | 可预约状态（白天/晚上/不空） |
| `font.size.meta` | `text-[10px]` | 节假日/“今”标签 |
| `text.color.primary` | `#3A3A3A` | 正文默认色 |
| `text.color.muted` | `#3A3A3A/50` | 次要信息（节假日/今） |
| `text.color.brand` | `#083A8E` | 亮色模式按钮文字（可预约） |

说明：当前项目主要通过 Tailwind 类名落地（如 `text-base` / `text-xs` / `text-[10px]`），这些值在这里统一作为 token 记录。

## 间距

### Spacing Tokens

| Token | 值 | 现用场景（示例） |
|------|----|------------------|
| `space.grid.gap` | `gap-1`（4px） | 日期网格横纵间距、周内间距一致 |
| `space.weekHeader.pb` | `pb-1.5`（6px） | 周标题行与日期网格的间距 |
| `space.slot.px` | `px-2.5`（10px） | 预约按钮左右内边距 |
| `space.slot.py` | `py-2`（8px） | 预约按钮上下内边距 |
| `space.slot.gap` | `gap-1`（4px） | 预约按钮内两行之间间距 |

## 组件

### Component Tokens

| Token | 值 | 现用场景（示例） |
|------|----|------------------|
| `radius.slot` | `12px` | 预约按钮圆角（`rounded-[12px]`） |
| `shadow.slot.inset.light` | `0 0 32px 0 rgba(255,255,255,0.80) inset` | 亮色模式按钮内阴影 |
| `shadow.slot.inset.dark` | `0 0 32px 0 rgba(255,255,255,0.20) inset` | 暗色模式按钮内阴影 |
| `layout.cell` | `aspect-square` | 日期单元格正方形布局 |

### 规则（可预约判定）

- 国家法定节假日数据源：使用 `holiday-cn`（抓取国务院公告）提供的 JSON 数据；仅以“是否休息日/是否补班”影响工作日判定，不再使用包含节气的通用节假日订阅源作为规则依据。
- 全天日程忽略：`isAllDay` 的事件不参与“是否有空”的判断。
- 晚上是否有空：晚上时段在冲突判断时从 `17:00` 开始；只要日程“贴到 17:00”（事件结束时间 `>= 17:00` 且与 17:00-22:00 有交集），则晚上判定为 `不空`。
- 补班影响范围：若当天节假日标题包含“班”，仅强制白天（上午/中午/下午）为 `不空`；晚上仍按规则正常判断。
