import { toShanghaiDate } from './ical';

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const HOLIDAY_KEYWORDS = [
  { name: '五一', months: [5], days: [1, 2, 3, 4, 5] },
  { name: '国庆', months: [10], days: [1, 2, 3, 4, 5, 6, 7] },
  { name: '元旦', months: [1], days: [1, 2, 3] },
  { name: '春节', months: [1, 2] },
  { name: '清明', months: [4], days: [4, 5, 6] },
  { name: '端午', months: [5, 6] },
  { name: '中秋', months: [9, 10] }
];

function getHolidayName(dateObj) {
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  return HOLIDAY_KEYWORDS.find(item => {
    if (!item.months.includes(month)) return false;
    if (!item.days) return true;
    return item.days.includes(day);
  })?.name || '';
}

function getWeekStart(dateObj) {
  const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}

function getWeekDistance(targetDate, baseDate) {
  const msPerDay = 86400000;
  const targetWeekStart = getWeekStart(targetDate);
  const baseWeekStart = getWeekStart(baseDate);
  return Math.round((targetWeekStart.getTime() - baseWeekStart.getTime()) / (7 * msPerDay));
}

export function formatRelativeDate(targetDate) {
  const now = toShanghaiDate(new Date());
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const t = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.round((t.getTime() - base.getTime()) / 86400000);

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';
  if (diffDays === 2) return '后天';

  const holidayName = getHolidayName(targetDate);
  if (holidayName) return holidayName;

  if (diffDays > 0) {
    const dayLabel = WEEKDAY_LABELS[t.getDay()];
    const weekDistance = getWeekDistance(t, base);
    if (weekDistance === 0) return `本周${dayLabel}`;
    if (weekDistance === 1) return t.getDay() >= 5 ? '下周末' : `下周${dayLabel}`;
    if (weekDistance === 2) return t.getDay() >= 5 ? '下下周末' : `下下周${dayLabel}`;
    if (weekDistance > 2) return t.getDay() >= 5 ? `${weekDistance}周后周末` : `${weekDistance}周后${dayLabel}`;
  }

  if (diffDays < 0) return `${-diffDays}天前`;
  return `${t.getMonth() + 1}月${t.getDate()}日`;
}

export function formatOrderText(dateObj, slotLabel, lengthText, styleText, removeText, remarkText) {
  const m = dateObj.getMonth() + 1;
  const d = dateObj.getDate();
  const relative = formatRelativeDate(dateObj);
  const lenPart = lengthText || '';
  const stylePart = styleText || '';
  const removePart = removeText || '';
  const remark = remarkText ? `备注：${remarkText}` : '备注：无';
  const datePart = getHolidayName(dateObj) || `${m}月${d}日`;

  return `预约${datePart}${slotLabel}（${relative}）做${lenPart}${stylePart}，${removePart}，${remark}。静候 mickywa 安排！`;
}
