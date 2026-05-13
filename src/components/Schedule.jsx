import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getCalendarsWithCache } from '../utils/ical';
import { formatRelativeDate } from '../utils/time';
import { estimateDuration, estimatePrice, formatDuration } from '../config/estimateConfig';
import smartActivitiesMd from '../config/smartActivities.md?raw';

const parseActivitiesByTime = (md) => {
  const res = { daytime: [], evening: [], allday: [] };
  if (!md) return res;

  const headingToKey = (h) => {
    const s = String(h || '').trim();
    if (s === '白天') return 'daytime';
    if (s === '晚上') return 'evening';
    if (s === '全天' || s === '一整天') return 'allday';
    return null;
  };

  let currentKey = null;
  md.split(/\r?\n/).forEach(line => {
    const h = /^\s*##\s+(.+?)\s*$/.exec(line);
    if (h) {
      currentKey = headingToKey(h[1]);
      return;
    }
    const b = /^\s*[-*]\s+(.+?)\s*$/.exec(line);
    if (!b || !currentKey) return;
    const item = b[1].trim();
    if (!item) return;
    res[currentKey].push(item);
  });

  const uniq = (arr) => Array.from(new Set(arr.map(s => String(s || '').trim()).filter(Boolean)));
  res.daytime = uniq(res.daytime);
  res.evening = uniq(res.evening);
  res.allday = uniq(res.allday);

  const all = uniq([...res.daytime, ...res.evening, ...res.allday]);
  if (!res.daytime.length) res.daytime = all;
  if (!res.evening.length) res.evening = all;
  if (!res.allday.length) res.allday = all;

  return res;
};

const ENTERTAINMENT_ACTIVITIES_BY_TIME = parseActivitiesByTime(smartActivitiesMd);

// Options configuration
const LENGTH_OPTIONS = ['本甲', '短甲', '中长', '长甲', '延长', '待定'];
const STYLE_OPTIONS = ['纯色', '跳色', '法式', '猫眼', '渐变', '设计', '待定'];
const REMOVE_OPTIONS = ['需要', '不需要', '待定'];

function BottomUpLettersSwap({ text, active }) {
  const [displayText, setDisplayText] = useState(text ?? '');
  const [queuedText, setQueuedText] = useState(null);
  const containerRef = useRef(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setDisplayText(text ?? '');
      setQueuedText(null);
      return;
    }
    if ((text ?? '') !== displayText) setQueuedText(text ?? '');
  }, [active, text, displayText]);

  useEffect(() => {
    if (!active) return;
    if (queuedText === null) return;
    const container = containerRef.current;
    if (!container) return;

    const spans = Array.from(container.querySelectorAll('[data-abt-char]'));
    const n = spans.length;
    const token = ++tokenRef.current;

    spans.forEach((span, i) => {
      span.getAnimations?.().forEach(a => a.cancel());
      span.animate(
        [
          { opacity: 1, transform: 'translateY(0px)' },
          { opacity: 0, transform: 'translateY(-14px)' }
        ],
        {
          duration: 280,
          delay: i * 28,
          easing: 'cubic-bezier(0.7, 0, 0.84, 0)',
          fill: 'forwards'
        }
      );
    });

    const exitTotal = n ? 280 + (n - 1) * 28 : 0;
    const t = setTimeout(() => {
      if (tokenRef.current !== token) return;
      setDisplayText(queuedText);
      setQueuedText(null);
    }, exitTotal + 35);

    return () => clearTimeout(t);
  }, [active, queuedText]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const spans = Array.from(container.querySelectorAll('[data-abt-char]'));

    spans.forEach((span, i) => {
      span.getAnimations?.().forEach(a => a.cancel());
      span.animate(
        [
          { opacity: 0, transform: 'translateY(46px)' },
          { opacity: 1, transform: 'translateY(0px)' }
        ],
        {
          duration: 400,
          delay: i * 88,
          easing: 'cubic-bezier(0.18, 1, 0.32, 1)',
          fill: 'forwards'
        }
      );
    });
  }, [active, displayText]);

  if (!active) return <span>{text}</span>;

  return (
    <span ref={containerRef} className="abt-container">
      {Array.from(displayText || '').map((ch, i) => (
        <span key={`${i}-${ch}`} data-abt-char className="abt-char">
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

function FadeTextSwap({ text }) {
  const [displayText, setDisplayText] = useState(text ?? '');
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    if ((text ?? '') !== displayText) {
      setIsAnimating(true);
      const container = containerRef.current;
      if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(-8px)';
      }
      
      const token = ++tokenRef.current;
      setTimeout(() => {
        if (tokenRef.current !== token) return;
        setDisplayText(text ?? '');
        if (container) {
          container.style.opacity = '1';
          container.style.transform = 'translateY(0)';
        }
        setTimeout(() => setIsAnimating(false), 300);
      }, 250);
    }
  }, [text, displayText]);

  return (
    <span 
      ref={containerRef}
      className="transition-all duration-300 ease-out"
    >
      {displayText}
    </span>
  );
}

function SmartRecButton({
  idx,
  recId,
  title,
  titleNode,
  disabled,
  selected,
  fading,
  pressed,
  onActivate,
  onBlurFade,
  animationDelay,
  setEl
}) {
  const lineCls = [
    "smart-rec-item relative flex items-start gap-2 transition-all duration-300 transform rounded-[12px] px-[14px] pt-2 pb-1.5 min-h-[44px]",
    disabled ? "opacity-50" : "cursor-pointer",
    selected ? "-translate-y-1.25" : ""
  ].join(' ');

  return (
    <div
      className={[lineCls, "spring-scale-in"].join(' ')}
      style={{ animationDelay: `${animationDelay}s` }}
      ref={setEl}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={Boolean(selected)}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onActivate?.();
      }}
      onBlur={() => {
        if (!disabled) onBlurFade?.(recId);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onActivate?.();
        }
      }}
    >
      {(selected || fading) && (
        <div
          className={[
            "absolute inset-0 rounded-[12px] pointer-events-none animate-color-change transition-opacity ease-out",
            selected ? "opacity-100 duration-0" : "opacity-0 duration-[1000ms]"
          ].join(' ')}
        />
      )}
      <div className={["relative z-10 min-w-0 flex-1", pressed ? "press-jump" : ""].join(' ')}>
        <div
          className={[
            "text-[16px] font-medium leading-relaxed truncate whitespace-nowrap",
            selected ? "text-[#3A3A3A]" : "text-[#083A8E] dark:text-[#D3F1FF]"
          ].join(' ')}
        >
          <span className="qh-bold-en qh-num">{idx + 1}.</span>
          {titleNode ?? title}
        </div>
      </div>
    </div>
  );
}

export default function Schedule({ theme }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [calendarSource, setCalendarSource] = useState('cloud');
  const [calendarReason, setCalendarReason] = useState('');
  const [showBottomBar, setShowBottomBar] = useState(false);
  const [preferredCalendarProvider, setPreferredCalendarProvider] = useState(null);
  const prevCalendarSourceRef = useRef(calendarSource);
  const bottomBarTimerRef = useRef(null);
  
  const [showBackToday, setShowBackToday] = useState(false);
  
  // Selection state
  const [selectedSlot, setSelectedSlot] = useState(null); // { day, slot, slotIdx, uniqueKey }
  const [shakingSlotId, setShakingSlotId] = useState(null);
  
  // Use separate state to keep content visible during exit animation
  const [displaySlot, setDisplaySlot] = useState(null);
  useEffect(() => {
    if (selectedSlot) setDisplaySlot(selectedSlot);
  }, [selectedSlot]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    length: '',
    style: [], // Changed to array for multiselect
    remove: ''
  });
  const [bookingText, setBookingText] = useState('');
  const [toast, setToast] = useState(null); // { message, type }
  const [markBgColor, setMarkBgColor] = useState('');
  const [markAnimation, setMarkAnimation] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [contentKey, setContentKey] = useState(0);
  const [pressedSlotId, setPressedSlotId] = useState(null);
  const [selectedSmartId, setSelectedSmartId] = useState(null);
  const [fadingSmartId, setFadingSmartId] = useState(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isCalendarCollapsing, setIsCalendarCollapsing] = useState(false);
  const [recNonce, setRecNonce] = useState(0);
  const [smartActivityById, setSmartActivityById] = useState({});
  const [smartAnimEnabledById, setSmartAnimEnabledById] = useState({});

  const dayRefs = useRef({});
  const animationInterval = useRef(null);
  const pressTimeoutRef = useRef(null);
  const rootRef = useRef(null);
  const calendarCardRef = useRef(null);
  const calendarTitleRef = useRef(null);
  const calendarBounceRafRef = useRef(null);
  const springAnimMapRef = useRef(new Map());
  const smartFadeTimeoutRef = useRef(null);
  const selectedSmartIdRef = useRef(null);
  const fadingSmartIdRef = useRef(null);
  const selectedSlotRef = useRef(null);
  const showModalRef = useRef(false);
  const recommendationsRef = useRef([]);
  const smartRecRefs = useRef({});
  const mockToastShownRef = useRef(false);
  const smartSwapTimersRef = useRef({ timeouts: [], intervals: [] });

  const [showBookingBar, setShowBookingBar] = useState(false);
  const [showHalfModal, setShowHalfModal] = useState(false);
  const [isHalfModalClosing, setIsHalfModalClosing] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const [halfModalScrollY, setHalfModalScrollY] = useState(0);
  const halfModalRef = useRef(null);
  const touchStartYRef = useRef(0);

  // 新增：跟踪当前焦点区域和日历中选中的可预约日期索引
  const [focusArea, setFocusArea] = useState('smart'); // 'smart' 或 'calendar'
  const calendarItemRefs = useRef({});
  const [calendarItemKeys, setCalendarItemKeys] = useState([]);

  useEffect(() => { selectedSmartIdRef.current = selectedSmartId; }, [selectedSmartId]);
  useEffect(() => { fadingSmartIdRef.current = fadingSmartId; }, [fadingSmartId]);
  useEffect(() => { selectedSlotRef.current = selectedSlot; }, [selectedSlot]);
  useEffect(() => { showModalRef.current = showModal; }, [showModal]);

  // 收集所有可预约的日期键
  useEffect(() => {
    const keys = [];
    schedule.forEach(day => {
      const freeSlots = day.slots.filter(slot => slot.status === 'free');
      if (freeSlots.length > 0) {
        keys.push(day.key);
      }
    });
    setCalendarItemKeys(keys);
  }, [schedule]);

  const triggerSlotPress = (slotId) => {
    if (!slotId) return;
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
    setPressedSlotId(null);
    requestAnimationFrame(() => setPressedSlotId(slotId));
    pressTimeoutRef.current = setTimeout(() => {
      setPressedSlotId(null);
      pressTimeoutRef.current = null;
    }, 360);
  };

  const springParams = { stiffness: 220, damping: 20, mass: 0.8 };

  const springAnimate = ({ from, to, onUpdate, onComplete, maxMs = 800, clampMin = -Infinity, clampMax = Infinity }) => {
    const { stiffness, damping, mass } = springParams;
    let x = from;
    let v = 0;
    let lastT = performance.now();
    const startT = lastT;
    let rafId = null;
    let stopped = false;

    const tick = (t) => {
      if (stopped) return;
      const dt = Math.min(0.032, (t - lastT) / 1000);
      lastT = t;

      const a = (-stiffness * (x - to) - damping * v) / mass;
      v += a * dt;
      x += v * dt;

      const next = Math.max(clampMin, Math.min(clampMax, x));
      onUpdate?.(next);

      const done = (Math.abs(v) < 0.001 && Math.abs(x - to) < 0.001) || (t - startT) > maxMs;
      if (done) {
        onUpdate?.(Math.max(clampMin, Math.min(clampMax, to)));
        onComplete?.();
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  };

  const cancelSpringForKey = (key) => {
    const map = springAnimMapRef.current;
    const cancel = map.get(key);
    if (cancel) cancel();
    map.delete(key);
  };

  const randomPastel = () => {
    const colors = ['#D3F1FF', '#CFEDD9', '#FFDDDD', '#FCF7BD', '#E7DDFF', '#FFE8CC'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const playToggleRipple = (rootEl) => {
    if (!rootEl) return;
    const fillEl = rootEl.querySelector('[data-ripple-fill]');
    const ringEl = rootEl.querySelector('[data-ripple-ring]');
    if (!fillEl && !ringEl) return;

    const color = randomPastel();

    cancelSpringForKey('toggle-fill');
    cancelSpringForKey('toggle-ring');

    if (fillEl) {
      fillEl.style.backgroundColor = color;
      fillEl.style.opacity = '0';
      fillEl.style.willChange = 'opacity';
      const cancelIn = springAnimate({
        from: 0,
        to: 0.22,
        clampMin: 0,
        clampMax: 0.22,
        maxMs: 260,
        onUpdate: (v) => (fillEl.style.opacity = String(v)),
        onComplete: () => {
          const cancelOut = springAnimate({
            from: 0.22,
            to: 0,
            clampMin: 0,
            clampMax: 0.22,
            maxMs: 320,
            onUpdate: (v) => (fillEl.style.opacity = String(v)),
            onComplete: () => {
              fillEl.style.opacity = '';
              fillEl.style.willChange = '';
            }
          });
          springAnimMapRef.current.set('toggle-fill', cancelOut);
        }
      });
      springAnimMapRef.current.set('toggle-fill', cancelIn);
    }

    if (ringEl) {
      ringEl.style.borderColor = color;
      ringEl.style.opacity = '0';
      ringEl.style.borderWidth = '0px';
      ringEl.style.borderStyle = 'solid';
      ringEl.style.boxSizing = 'border-box';
      ringEl.style.willChange = 'opacity,border-width';

      cancelSpringForKey('toggle-ring-delay');
      const delayId = window.setTimeout(() => {
        const targetW = 0.5;
        const cancelOutward = springAnimate({
          from: 0,
          to: targetW,
          clampMin: 0,
          clampMax: targetW,
          maxMs: 260,
          onUpdate: (v) => {
            ringEl.style.borderWidth = `${v}px`;
            ringEl.style.opacity = String(Math.min(0.7, v / targetW * 0.7));
          },
          onComplete: () => {
            const cancelReturn = springAnimate({
              from: targetW,
              to: 0,
              clampMin: 0,
              clampMax: targetW,
              maxMs: 420,
              onUpdate: (v) => {
                ringEl.style.borderWidth = `${v}px`;
                ringEl.style.opacity = String(Math.min(0.7, v / targetW * 0.7));
              },
              onComplete: () => {
                ringEl.style.opacity = '';
                ringEl.style.borderWidth = '';
                ringEl.style.willChange = '';
              }
            });
            springAnimMapRef.current.set('toggle-ring', cancelReturn);
          }
        });
        springAnimMapRef.current.set('toggle-ring', cancelOutward);
      }, 150);
      springAnimMapRef.current.set('toggle-ring-delay', () => window.clearTimeout(delayId));
    }
  };

  const playMonthSlotPress = (key, el) => {
    if (!key || !el) return;
    const pressKey = `month-press:${key}`;
    cancelSpringForKey(pressKey);
    el.style.willChange = 'transform';
    const setScale = (s) => {
      el.style.setProperty('--tw-scale-x', String(s));
      el.style.setProperty('--tw-scale-y', String(s));
    };
    setScale(1);
    const cancelDown = springAnimate({
      from: 1,
      to: 0.92,
      clampMin: 0.92,
      clampMax: 1,
      maxMs: 220,
      onUpdate: setScale,
      onComplete: () => {
        const cancelUp = springAnimate({
          from: 0.92,
          to: 1,
          clampMin: 0.92,
          clampMax: 1.02,
          maxMs: 420,
          onUpdate: setScale,
          onComplete: () => {
            el.style.removeProperty('--tw-scale-x');
            el.style.removeProperty('--tw-scale-y');
            el.style.willChange = '';
          }
        });
        springAnimMapRef.current.set(pressKey, cancelUp);
      }
    });
    springAnimMapRef.current.set(pressKey, cancelDown);
  };

  const handleToggleCalendar = (e) => {
    e?.stopPropagation?.();
    playToggleRipple(e?.currentTarget);
    if (isCalendarExpanded) {
      setIsCalendarCollapsing(true);
      window.setTimeout(() => setIsCalendarCollapsing(false), 220);
    } else {
      setIsCalendarCollapsing(false);
    }
    setIsCalendarExpanded(v => !v);
  };

  const triggerCalendarCardBounce = () => {
    if (calendarBounceRafRef.current) {
      cancelAnimationFrame(calendarBounceRafRef.current);
      calendarBounceRafRef.current = null;
    }

    const cardEl = calendarCardRef.current;
    const titleEl = calendarTitleRef.current;
    if (!cardEl && !titleEl) return;

    const { stiffness, damping, mass } = springParams;
    let x = 1;
    let v = 0;
    let lastT = performance.now();
    const startT = lastT;

    if (cardEl) cardEl.style.willChange = 'transform';
    if (titleEl) titleEl.style.willChange = 'transform';

    const tick = (t) => {
      const dt = Math.min(0.032, (t - lastT) / 1000);
      lastT = t;

      const a = (-stiffness * x - damping * v) / mass;
      v += a * dt;
      x += v * dt;

      const scale = 1 - 0.012 * x;
      const ty = -6 * x;

      if (cardEl) cardEl.style.transform = `scale(${scale})`;
      if (titleEl) titleEl.style.transform = `translateY(${ty}px)`;

      const done = (Math.abs(v) < 0.001 && Math.abs(x) < 0.001) || (t - startT) > 800;
      if (done) {
        if (cardEl) {
          cardEl.style.transform = '';
          cardEl.style.willChange = '';
        }
        if (titleEl) {
          titleEl.style.transform = '';
          titleEl.style.willChange = '';
        }
        calendarBounceRafRef.current = null;
        return;
      }

      calendarBounceRafRef.current = requestAnimationFrame(tick);
    };

    calendarBounceRafRef.current = requestAnimationFrame(tick);
  };

  const weekdayLabel = (date) => {
    const d = date.getDay();
    return ['日', '一', '二', '三', '四', '五', '六'][d];
  };

  const weekPrefix = (date) => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const baseDow = base.getDay();
    const baseMonday = new Date(base);
    const offsetToMonday = baseDow === 0 ? -6 : 1 - baseDow;
    baseMonday.setDate(baseMonday.getDate() + offsetToMonday);

    const nextMonday = new Date(baseMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const nextNextMonday = new Date(baseMonday);
    nextNextMonday.setDate(nextNextMonday.getDate() + 14);

    if (date >= baseMonday && date < nextMonday) return '本周';
    if (date >= nextMonday && date < nextNextMonday) return '下周';
    return '';
  };

  const getAnyFreeSlot = (day) => {
    if (!day?.slots?.length) return null;
    const free = day.slots.filter(s => s.status === 'free');
    if (free.length === 0) return null;
    const keys = new Set(free.map(s => s.key));
    const allKeys = ['daytime', 'evening'];
    const isFull = allKeys.every(k => keys.has(k));
    if (isFull) {
      const slot = day.slots.find(s => s.key === 'daytime') || free[0];
      return { slot, label: '全天' };
    }
    const evening = day.slots.find(s => s.key === 'evening' && s.status === 'free');
    if (evening) return { slot: evening, label: '晚上' };
    const daySlot = day.slots.find(s => s.key === 'daytime' && s.status === 'free');
    if (daySlot) return { slot: daySlot, label: '白天' };
    return { slot: free[0], label: free[0].label };
  };

  const recommendations = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isWeekend = (d) => {
      const dow = d.getDay();
      return dow === 0 || dow === 6;
    };

    const isHoliday = (day) => Boolean(day.holidayName && day.holidayName !== '补班');
    const isWorkday = (day) => day?.date instanceof Date && !isWeekend(day.date) && !day.holidayName;
    const isNormalWeekend = (day) => day?.date instanceof Date && isWeekend(day.date) && !day.holidayName;

    const relOrWeek = (date) => {
      const rel = formatRelativeDate(date);
      if (rel === '今天' || rel === '明天' || rel === '后天') return rel;
      const prefix = weekPrefix(date);
      if (prefix) return `${prefix}${weekdayLabel(date)}`;
      return rel;
    };

    const pickSlots = (day, prefer) => {
      if (!day?.slots?.length) return null;
      const slot = prefer
        ? day.slots.find(s => s.key === prefer && s.status === 'free')
        : null;
      if (slot) return { slot, label: slot.label };
      return getAnyFreeSlot(day);
    };

    const nextWorkday = schedule
      .filter(d => d?.date instanceof Date)
      .filter(d => d.date >= base)
      .filter(d => isWorkday(d))
      .find(d => pickSlots(d, 'evening'));

    const workdayRec = (() => {
      if (!nextWorkday) return null;
      const picked = pickSlots(nextWorkday, 'evening');
      if (!picked) return null;
      const dateText = `${relOrWeek(nextWorkday.date)}${picked.label === '全天' ? '' : picked.label}`;
      return {
        id: `rec-workday-${nextWorkday.key}`,
        type: 'workday',
        date: nextWorkday.date,
        dateText,
        dayKey: nextWorkday.key,
        slotKey: picked.slot.key,
        slotLabel: picked.label
      };
    })();

    const weekendDays = schedule
      .filter(d => d?.date instanceof Date)
      .filter(d => d.date >= base)
      .filter(d => isNormalWeekend(d))
      .filter(d => pickSlots(d));

    const weekendRec = (() => {
      if (weekendDays.length === 0) return null;

      const sat = weekendDays.find(d => d.date.getDay() === 6);
      const sun = weekendDays.find(d => d.date.getDay() === 0);
      if (sat && sun) {
        const sameWeekend = Math.abs((sun.date - sat.date) / 86400000) <= 1;
        if (sameWeekend && weekPrefix(sat.date) === weekPrefix(sun.date)) {
          const prefix = weekPrefix(sat.date);
          const baseDateText = prefix ? `${prefix}六-日` : `${sat.date.getMonth() + 1}月${sat.date.getDate()}日-${sun.date.getDate()}日`;
          const pickedSat = pickSlots(sat);
          const pickedSun = pickSlots(sun);
          const picked = pickedSat || pickedSun;
          if (!picked) return null;
          const dateText = `${baseDateText}${picked.label === '全天' ? '' : picked.label}`;
          return {
            id: `rec-weekend-${sat.key}`,
            type: 'weekend',
            date: sat.date,
            dateText,
            dayKey: (pickedSat ? sat.key : sun.key),
            slotKey: picked.slot.key,
            slotLabel: picked.label
          };
        }
      }

      const first = weekendDays[0];
      const picked = pickSlots(first);
      if (!picked) return null;
      const prefix = weekPrefix(first.date);
      const dateText = `${prefix ? `${prefix}${weekdayLabel(first.date)}` : relOrWeek(first.date)}${picked.label === '全天' ? '' : picked.label}`;
      return {
        id: `rec-weekend-${first.key}`,
        type: 'weekend',
        date: first.date,
        dateText,
        dayKey: first.key,
        slotKey: picked.slot.key,
        slotLabel: picked.label
      };
    })();

    const holidayDays = schedule
      .filter(d => d?.date instanceof Date)
      .filter(d => d.date >= base)
      .filter(d => isHoliday(d))
      .filter(d => pickSlots(d));

    const holidayRec = (() => {
      if (holidayDays.length === 0) return null;
      const first = holidayDays[0];
      const name = first.holidayName;
      const same = holidayDays.filter(d => d.holidayName === name);
      const picked = pickSlots(first);
      if (!picked) return null;
      const dateText = `${same.length >= 2 ? `${name}前两天` : `${name}当天`}${picked.label === '全天' ? '' : picked.label}`;
      return {
        id: `rec-holiday-${first.key}`,
        type: 'holiday',
        date: first.date,
        dateText,
        dayKey: first.key,
        slotKey: picked.slot.key,
        slotLabel: picked.label
      };
    })();

    const shouldAddHoliday = Boolean(workdayRec && weekendRec && holidayRec);

    const shouldAddExtraWorkday = (() => {
      if (!weekendRec) return false;
      const diffDays = Math.round((weekendRec.date - base) / 86400000);
      return diffDays >= 0 && diffDays <= 2;
    })();

    const extraWorkdayRec = (() => {
      if (!shouldAddExtraWorkday || !weekendRec) return null;
      const sat = weekendRec.date;
      const sun = new Date(sat);
      sun.setDate(sun.getDate() + (sat.getDay() === 6 ? 1 : 0));
      const after = new Date(sun);
      after.setDate(after.getDate() + 1);

      const next = schedule
        .filter(d => d?.date instanceof Date)
        .filter(d => d.date >= after)
        .filter(d => isWorkday(d))
        .find(d => pickSlots(d, 'evening'));

      if (!next) return null;
      const picked = pickSlots(next, 'evening');
      if (!picked) return null;
      const dateText = `${relOrWeek(next.date)}${picked.label === '全天' ? '' : picked.label}`;
      return {
        id: `rec-workday-next-${next.key}`,
        type: 'workday',
        date: next.date,
        dateText,
        dayKey: next.key,
        slotKey: picked.slot.key,
        slotLabel: picked.label
      };
    })();

    const list = [workdayRec, weekendRec];
    if (shouldAddHoliday) {
      list.push(holidayRec);
    } else if (extraWorkdayRec && workdayRec && extraWorkdayRec.dayKey !== workdayRec.dayKey) {
      list.push(extraWorkdayRec);
    }

    const normalized = list
      .filter(Boolean)
      .sort((a, b) => (a.date?.getTime?.() ?? 0) - (b.date?.getTime?.() ?? 0))
      .slice(0, 3);

    const pickBucket = (slotLabel) => {
      if (slotLabel === '白天') return 'daytime';
      if (slotLabel === '晚上') return 'evening';
      return 'allday';
    };

    const shuffledByTime = {
      daytime: [...ENTERTAINMENT_ACTIVITIES_BY_TIME.daytime].sort(() => 0.5 - Math.random()),
      evening: [...ENTERTAINMENT_ACTIVITIES_BY_TIME.evening].sort(() => 0.5 - Math.random()),
      allday: [...ENTERTAINMENT_ACTIVITIES_BY_TIME.allday].sort(() => 0.5 - Math.random())
    };

    const seqByBucket = { daytime: 0, evening: 0, allday: 0 };
    return normalized.map((r) => {
      const bucket = pickBucket(r.slotLabel);
      const pool = shuffledByTime[bucket] || [];
      const idx = seqByBucket[bucket]++;
      const activity = pool.length ? pool[idx % pool.length] : '';
      const dayText = r.slotLabel === '全天' ? `${r.dateText}一整天` : r.dateText;
      const prefix = `${dayText}可以`;
      return {
        ...r,
        bucket,
        prefix,
        activity,
        title: `${prefix}${activity}`
      };
    });
  }, [recNonce, schedule]);

  useEffect(() => {
    recommendationsRef.current = recommendations.filter(r => !r?.disabled);
  }, [recommendations]);

  useEffect(() => {
    const activeRecs = recommendations.filter(r => !r?.disabled);

    setSmartActivityById(prev => {
      const next = { ...prev };
      activeRecs.forEach(rec => {
        if (typeof next[rec.id] !== 'string') {
          next[rec.id] = rec.activity ?? '';
        }
      });
      Object.keys(next).forEach(id => {
        if (!activeRecs.some(r => r.id === id)) delete next[id];
      });
      return next;
    });

    setSmartAnimEnabledById(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (!activeRecs.some(r => r.id === id)) delete next[id];
      });
      return next;
    });
  }, [recommendations]);

  useEffect(() => {
    const timers = smartSwapTimersRef.current;
    timers.timeouts.forEach(t => clearTimeout(t));
    timers.intervals.forEach(i => clearInterval(i));
    timers.timeouts = [];
    timers.intervals = [];

    const targetIds = recommendations
      .filter(r => !r?.disabled)
      .slice(0, 2)
      .map(r => r.id);

    const pools = {
      daytime: ENTERTAINMENT_ACTIVITIES_BY_TIME.daytime,
      evening: ENTERTAINMENT_ACTIVITIES_BY_TIME.evening,
      allday: ENTERTAINMENT_ACTIVITIES_BY_TIME.allday
    };
    const bucketById = new Map(recommendations.map(r => [r.id, r.bucket || 'allday']));

    const pickNext = (id, current) => {
      const bucket = bucketById.get(id) || 'allday';
      const pool = pools[bucket] || pools.allday;
      if (pool.length <= 1) return current;
      let next = current;
      let guard = 0;
      while (next === current && guard < 12) {
        next = pool[Math.floor(Math.random() * pool.length)];
        guard += 1;
      }
      return next;
    };

    const swapOnce = (id) => {
      setSmartActivityById(prev => {
        const current = prev[id] ?? '';
        const nextText = pickNext(id, current);
        if (nextText === current) return prev;
        return { ...prev, [id]: nextText };
      });
    };

    const start = (id, { immediateSwap }) => {
      setSmartAnimEnabledById(prev => ({ ...prev, [id]: true }));
      if (immediateSwap) {
        const t = setTimeout(() => swapOnce(id), 80);
        timers.timeouts.push(t);
      }
      const interval = setInterval(() => swapOnce(id), 6000);
      timers.intervals.push(interval);
    };

    if (targetIds[0]) {
      timers.timeouts.push(setTimeout(() => start(targetIds[0], { immediateSwap: false }), 4000));
    }
    if (targetIds[1]) {
      timers.timeouts.push(setTimeout(() => start(targetIds[1], { immediateSwap: true }), 8000));
    }

    return () => {
      const t2 = smartSwapTimersRef.current;
      t2.timeouts.forEach(t => clearTimeout(t));
      t2.intervals.forEach(i => clearInterval(i));
      t2.timeouts = [];
      t2.intervals = [];
    };
  }, [recommendations]);

  const fadeOutSmartFill = (id) => {
    if (!id) return;
    if (selectedSmartIdRef.current !== id) return;
    if (smartFadeTimeoutRef.current) {
      clearTimeout(smartFadeTimeoutRef.current);
      smartFadeTimeoutRef.current = null;
    }
    setFadingSmartId(id);
    setSelectedSmartId(null);
    smartFadeTimeoutRef.current = setTimeout(() => {
      setFadingSmartId(null);
      smartFadeTimeoutRef.current = null;
    }, 1000);
  };

  const handleRecommendationClick = (rec) => {
    if (!rec) return;
    if (fadingSmartIdRef.current === rec.id && smartFadeTimeoutRef.current) {
      clearTimeout(smartFadeTimeoutRef.current);
      smartFadeTimeoutRef.current = null;
      setFadingSmartId(null);
    }
    setSelectedSmartId(rec.id);
    triggerSlotPress(rec.id);
    
    // Set the selected slot from the recommendation
    const day = schedule.find(d => d.key === rec.dayKey);
    if (day) {
      const slot = day.slots.find(s => s.key === rec.slotKey);
      if (slot) {
        const slotIdx = day.slots.indexOf(slot);
        setSelectedSlot({
          day,
          slot,
          slotIdx,
          uniqueKey: `${day.key}-${slotIdx}`
        });
        setShowBookingBar(true);
      }
    }
    
    requestAnimationFrame(() => {
      const el = smartRecRefs.current?.[rec.id];
      if (el) {
        try { el.focus({ preventScroll: true }); } catch { el.focus?.(); }
        el.scrollIntoView?.({ block: 'nearest' });
      }
    });
  };

  const fetchData = async ({ isAuto = false, provider, silent = false } = {}) => {
    if (!isAuto && !silent) {
      setLoading(true);
      setError(false);
    }
    try {
      const providerToUse = provider ?? preferredCalendarProvider ?? undefined;
      const res = await getCalendarsWithCache({ forceMock: false, forceRefresh: !isAuto, provider: providerToUse });
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endExclusive = new Date(startOfToday);
      endExclusive.setDate(endExclusive.getDate() + 22);

      const nextDays = (res.schedule || [])
        .filter(day => day?.date instanceof Date)
        .filter(day => day.date >= startOfToday && day.date < endExclusive)
        .sort((a, b) => a.date - b.date);

      setSchedule(nextDays);
      setRecNonce(n => n + 1);
      setIsMock(!!res.isMock);
      setCalendarSource(res.calendarSource || (res.isMock ? 'mock' : 'cloud'));
      setCalendarReason(res.calendarReason || '');
      if (!res?.isMock && (provider || preferredCalendarProvider)) {
        if (res.calendarSource === 'cloud' || res.calendarSource === 'icloud') {
          setPreferredCalendarProvider(res.calendarSource);
        }
      }
      if (!isAuto && !silent) setLoading(false);
      if (!silent) setError(false);
    } catch (e) {
      console.error(e);
      if (!isAuto && !silent) {
        setLoading(false);
        setError(true);
      } else {
        setToast({ message: '切换来源失败，请稍后重试', type: 'error' });
      }
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData({ isAuto: true }), 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (pressTimeoutRef.current) {
        clearTimeout(pressTimeoutRef.current);
        pressTimeoutRef.current = null;
      }
      if (bottomBarTimerRef.current) {
        clearTimeout(bottomBarTimerRef.current);
        bottomBarTimerRef.current = null;
      }
    };
  }, []);

  // 监听日历来源变化
  useEffect(() => {
    if (prevCalendarSourceRef.current !== calendarSource) {
      prevCalendarSourceRef.current = calendarSource;
      setShowBottomBar(true);
      
      if (bottomBarTimerRef.current) {
        clearTimeout(bottomBarTimerRef.current);
      }
      bottomBarTimerRef.current = setTimeout(() => {
        setShowBottomBar(false);
        bottomBarTimerRef.current = null;
      }, 5000);
    }
  }, [calendarSource]);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            fetchData();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const toggleCalendarProvider = () => {
    const next =
      calendarSource === 'icloud'
        ? 'cloud'
        : calendarSource === 'cloud'
          ? 'icloud'
          : 'cloud';
    setPreferredCalendarProvider(next);
    if (bottomBarTimerRef.current) {
      clearTimeout(bottomBarTimerRef.current);
      bottomBarTimerRef.current = null;
    }
    fetchData({ provider: next, silent: true });
  };

  // Update booking text when form or slot changes
  useEffect(() => {
    if (!selectedSlot) return;
    
    const d = selectedSlot.day.date;
    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
    const timeStr = `${selectedSlot.slot.label}(${selectedSlot.slot.displayTime || `${selectedSlot.slot.start}-${selectedSlot.slot.end}`})`;
    
    // Join styles if it's an array
    const styleStr = Array.isArray(form.style) 
      ? (form.style.length > 0 ? form.style.join('/') : '待定')
      : (form.style || '待定');

    const text = `你好 mickywa，我想预约：
日期：${dateStr} ${timeStr}
长度：${form.length || '待定'}
款式：${styleStr}
卸甲：${form.remove || '待定'}
备注：`;

    setBookingText(text);
  }, [form, selectedSlot]);

  const handleScroll = () => {
    if (window.scrollY > 300) {
      setShowBackToday(true);
    } else {
      setShowBackToday(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToToday = () => {
    if (schedule.length > 0) {
      const todayKey = schedule[0].key;
      const el = document.getElementById(`day-${todayKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        setShowBackToday(false);
      }
    }
  };

  const onSlotTap = (day, slot, slotIdx) => {
    const uniqueKey = `${day.key}-${slotIdx}`;
    
    if (slot.status !== 'free') {
      setShakingSlotId(uniqueKey);
      setTimeout(() => setShakingSlotId(null), 500);
      return;
    }

    // Toggle selection if clicking the same slot
    if (selectedSlot && selectedSlot.uniqueKey === uniqueKey) {
      setSelectedSlot(null);
      setShowBookingBar(false);
      return;
    }

    setSelectedSlot({
      day,
      slot,
      slotIdx,
      uniqueKey
    });
    setShowBookingBar(true);
  };

  const handleBookClick = (e) => {
    e.stopPropagation(); // Prevent deselecting when clicking the button
    if (!selectedSlot) return;
    openModal();
  };

  // Click background to deselect
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (e.target.closest('.smart-rec-item') || e.target.closest('.smart-toggle-btn')) {
        return;
      }

      const active = document.activeElement;
      if (rootRef.current && active instanceof HTMLElement && rootRef.current.contains(active)) {
        if (active.matches('button,[role="button"],a,[tabindex]')) {
          active.blur?.();
        }
      }

      if (e.target.closest('.slot-item') || e.target.closest('.bottom-bar') || e.target.closest('.modal-container') || e.target.closest('.theme-toggle')) {
        return;
      }

      if (selectedSlotRef.current) setSelectedSlot(null);
    };
    
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // 新增：选择日历中指定索引的可预约日期
  const selectCalendarItemByIndex = (index) => {
    if (!calendarItemKeys.length) return;
    const normalizedIndex = ((index % calendarItemKeys.length) + calendarItemKeys.length) % calendarItemKeys.length;
    const key = calendarItemKeys[normalizedIndex];
    if (!key) return;

    // 找到该日期并选中它
    const day = schedule.find(d => d.key === key);
    if (!day) return;

    // 获取第一个可预约的时间段
    const freeSlot = getAnyFreeSlot(day);
    if (!freeSlot) return;

    const slotIdx = day.slots.indexOf(freeSlot.slot);
    
    // 选中该时间段
    onSlotTap(day, freeSlot.slot, slotIdx);

    // 滚动到该日期并聚焦
    requestAnimationFrame(() => {
      const el = calendarItemRefs.current?.[key];
      if (el) {
        el.scrollIntoView?.({ block: 'nearest' });
        el.focus?.({ preventScroll: true });
      }
    });
  };

  // 新增：找到当前在日历中选中的日期索引
  const getCurrentCalendarIndex = () => {
    if (!selectedSlot) return -1;
    return calendarItemKeys.indexOf(selectedSlot.day.key);
  };

  // 新增：选择智能推荐中的指定索引
  const selectSmartByIndex = (nextIndex) => {
    const list = recommendationsRef.current || [];
    if (!list.length) return;
    const i = ((nextIndex % list.length) + list.length) % list.length;
    const rec = list[i];
    if (!rec?.id) return;
    if (fadingSmartIdRef.current === rec.id && smartFadeTimeoutRef.current) {
      clearTimeout(smartFadeTimeoutRef.current);
      smartFadeTimeoutRef.current = null;
      setFadingSmartId(null);
    }
    setSelectedSmartId(rec.id);
    triggerSlotPress(rec.id);
    requestAnimationFrame(() => {
      const el = smartRecRefs.current?.[rec.id];
      if (el) {
        try { el.focus({ preventScroll: true }); } catch { el.focus?.(); }
        el.scrollIntoView?.({ block: 'nearest' });
      }
    });
  };

  // 检查是否是可编辑的目标
  const isEditableTarget = (t) => {
    const el = t instanceof HTMLElement ? t : null;
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return Boolean(el.closest('[contenteditable="true"]'));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (showModalRef.current) return;

      const key = e.key;
      
      // ESC 键处理
      if (key === 'Escape') {
        const active = document.activeElement;
        const inScope = active === document.body || active === document.documentElement || (rootRef.current && active instanceof HTMLElement && rootRef.current.contains(active));
        if (!inScope && !selectedSlotRef.current && !selectedSmartIdRef.current && !fadingSmartIdRef.current) return;

        e.preventDefault();
        e.stopPropagation();

        if (selectedSlotRef.current) setSelectedSlot(null);

        const currentId = selectedSmartIdRef.current;
        if (currentId) {
          fadeOutSmartFill(currentId);
        } else if (fadingSmartIdRef.current) {
          if (smartFadeTimeoutRef.current) {
            clearTimeout(smartFadeTimeoutRef.current);
            smartFadeTimeoutRef.current = null;
          }
          setFadingSmartId(null);
        }

        if (rootRef.current && active instanceof HTMLElement && rootRef.current.contains(active)) {
          if (active.matches('button,[role="button"],a,[tabindex]')) {
            active.blur?.();
          }
        }
        setFocusArea('smart');
        return;
      }

      const isTab = key === 'Tab';
      const isPrev = (isTab && e.shiftKey) || key === 'ArrowLeft' || key === 'ArrowUp';
      const isNext = (isTab && !e.shiftKey) || key === 'ArrowRight' || key === 'ArrowDown';
      
      if (!isPrev && !isNext && key !== 'Enter' && key !== ' ') return;

      const active = document.activeElement;
      const inScope = active === document.body || active === document.documentElement || (rootRef.current && active instanceof HTMLElement && rootRef.current.contains(active));
      if (!inScope) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      // Enter 或 Space 键处理
      if (key === 'Enter' || key === ' ') {
        if (focusArea === 'smart' && selectedSmartIdRef.current) {
          // 在智能推荐区域，触发推荐点击
          const currentRec = recommendationsRef.current.find(r => r.id === selectedSmartIdRef.current);
          if (currentRec) {
            handleRecommendationClick(currentRec);
          }
        } else if (focusArea === 'calendar' && selectedSlot) {
          // 在日历区域，打开预约模态框
          openModal();
        }
        return;
      }

      // 方向键处理
      if (focusArea === 'smart') {
        // 当前在智能推荐区域
        const list = recommendationsRef.current || [];
        if (!list.length) return;

        const currentId = selectedSmartIdRef.current;
        const currentIndex = currentId ? list.findIndex(r => r?.id === currentId) : -1;
        
        if (isNext) {
          if (currentIndex === -1) {
            // 第一次，选择第一个推荐
            selectSmartByIndex(0);
          } else if (currentIndex === list.length - 1) {
            // 已经是最后一个推荐，向下移动到日历
            setFocusArea('calendar');
            if (!isCalendarExpanded) {
              setIsCalendarCollapsing(false);
              setIsCalendarExpanded(true);
            }
            // 选择第一个可预约的日期
            if (calendarItemKeys.length > 0) {
              selectCalendarItemByIndex(0);
            }
          } else {
            // 选择下一个推荐
            selectSmartByIndex(currentIndex + 1);
          }
        } else {
          // 向上移动，在智能推荐区域内循环
          if (currentIndex === -1) {
            selectSmartByIndex(0);
          } else {
            selectSmartByIndex(currentIndex - 1);
          }
        }
      } else {
        // 当前在日历区域
        if (!calendarItemKeys.length) return;
        
        const currentIndex = getCurrentCalendarIndex();
        
        if (isPrev && currentIndex === 0) {
          // 在日历的第一个位置向上移动，回到智能推荐区域
          setFocusArea('smart');
          setSelectedSlot(null);
          // 选择最后一个智能推荐
          const list = recommendationsRef.current || [];
          if (list.length > 0) {
            selectSmartByIndex(list.length - 1);
          }
        } else if (key === 'ArrowLeft') {
          // 向左移动
          selectCalendarItemByIndex(currentIndex !== -1 ? currentIndex - 1 : 0);
        } else if (key === 'ArrowRight') {
          // 向右移动
          selectCalendarItemByIndex(currentIndex !== -1 ? currentIndex + 1 : 0);
        } else if (key === 'ArrowUp') {
          // 向上移动（7天前）
          selectCalendarItemByIndex(currentIndex !== -1 ? currentIndex - 7 : 0);
        } else if (key === 'ArrowDown') {
          // 向下移动（7天后）
          selectCalendarItemByIndex(currentIndex !== -1 ? currentIndex + 7 : 0);
        } else if (isTab && e.shiftKey) {
          // Shift+Tab，回到智能推荐区域
          setFocusArea('smart');
          setSelectedSlot(null);
          const list = recommendationsRef.current || [];
          if (list.length > 0) {
            selectSmartByIndex(list.length - 1);
          }
        } else if (isTab) {
          // Tab，在日历区域内循环
          selectCalendarItemByIndex(currentIndex !== -1 ? currentIndex + 1 : 0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusArea, isCalendarExpanded, selectedSlot, calendarItemKeys, schedule]);

  const openModal = () => {
    setShowModal(true);
    // Reset form, style defaults to empty array
    setForm({ length: '', style: [], remove: '' });
  };

  const hideModal = () => {
    setShowModal(false);
  };

  const openHalfModal = () => {
    setShowHalfModal(true);
  };

  const closeHalfModal = () => {
    setIsHalfModalClosing(true);
    setTimeout(() => {
      setShowHalfModal(false);
      setIsHalfModalClosing(false);
    }, 300);
  };

  const copyBookingText = async () => {
    const text = `你好，羊石坨坨，我想要在${selectedSlot?.slot?.label || ''}跟你去${selectedActivity || '玩'}。${bookingNote ? '\n' + bookingNote : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制');
      closeHalfModal();
    } catch (err) {
      showToast('复制失败，请手动复制');
    }
  };

  const handleHalfModalTouchStart = (e) => {
    touchStartYRef.current = e.touches?.[0]?.clientY || 0;
  };

  const handleHalfModalTouchMove = (e) => {
    if (!halfModalRef.current) return;
    const currentY = e.touches?.[0]?.clientY || 0;
    const diff = currentY - touchStartYRef.current;
    if (diff > 0) {
      setHalfModalScrollY(diff);
      halfModalRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleHalfModalTouchEnd = () => {
    if (halfModalScrollY > 100) {
      closeHalfModal();
    } else {
      setHalfModalScrollY(0);
      if (halfModalRef.current) {
        halfModalRef.current.style.transform = '';
      }
    }
  };

  const handleMarkClick = (e) => {
    const svgElement = e.currentTarget.querySelector('svg');
    if (svgElement) {
      svgElement.classList.add('spring-click');
      setTimeout(() => {
        svgElement.classList.remove('spring-click');
      }, 400);
    }
    playMarkAnimation();
  };

  const handleTitleClick = (e) => {
    const imgElement = e.currentTarget.querySelector('img');
    if (imgElement) {
      imgElement.classList.add('spring-click');
      setTimeout(() => {
        imgElement.classList.remove('spring-click');
      }, 400);
    }
    setContentKey(k => k + 1);
  };

  const playMarkAnimation = () => {
    const colors = ['#D3F1FF', '#CFEDD9', '#FFDDDD', '#FCF7BD'];
    setMarkAnimation(true);
    
    let index = 0;
    const interval = setInterval(() => {
      setMarkBgColor(colors[index]);
      index = (index + 1) % colors.length;
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      // 动画结束后随机选择一个颜色作为背景
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setMarkBgColor(randomColor);
      setMarkAnimation(false);
    }, 600 + colors.length * 100);
  };

  // 组件挂载时初始化背景颜色并设置自动动画
  useEffect(() => {
    // 随机选择一个颜色作为初始背景
    const colors = ['#D3F1FF', '#CFEDD9', '#FFDDDD', '#FCF7BD'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setMarkBgColor(randomColor);

    // 设置5秒定时器自动播放动画
    animationInterval.current = setInterval(() => {
      playMarkAnimation();
    }, 5000);

    // 组件卸载时清除定时器
    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyWidth = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.font = `20px "QH-bold-en"`;
      let max = 0;
      for (let i = 0; i <= 9; i += 1) {
        const w = ctx.measureText(`${i}.`).width;
        if (w > max) max = w;
      }
      const px = Math.ceil(max);
      document.documentElement.style.setProperty('--qh-num-width', `${px}px`);
    };

    const run = async () => {
      try {
        if (document.fonts?.load) {
          await document.fonts.load(`20px "QH-bold-en"`);
        }
      } catch {}
      if (!cancelled) applyWidth();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateForm = (field, value) => {
    setForm(prev => {
      // Special handling for style multiselect
      if (field === 'style') {
        const currentStyles = Array.isArray(prev.style) ? prev.style : [];
        
        // If '待定' is selected, clear others and just select '待定'
        if (value === '待定') {
          // If already selected, deselect it (empty)
          if (currentStyles.includes('待定')) {
             return { ...prev, style: [] };
          }
          return { ...prev, style: ['待定'] };
        }
        
        // If selecting something else, remove '待定' first if present
        let newStyles = currentStyles.filter(s => s !== '待定');
        
        if (newStyles.includes(value)) {
          // Deselect
          newStyles = newStyles.filter(s => s !== value);
        } else {
          // Select
          newStyles = [...newStyles, value];
        }
        return { ...prev, style: newStyles };
      }
      
      // Normal single select for others
      return { ...prev, [field]: value };
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookingText);
      showToast('已复制');
    } catch (err) {
      showToast('复制失败，请手动复制');
    }
  };

  const showToast = (msg) => {
    setToast({ message: msg });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    if (!loading && !error && isMock && !mockToastShownRef.current) {
      mockToastShownRef.current = true;
      showToast('获取日历失败，已展示模拟数据');
    }
    if (!isMock && !loading) {
      mockToastShownRef.current = false;
    }
  }, [isMock, loading, error]);
  
  // Calculate relative date for header
  const getRelativeDateStr = () => {
    if (!selectedSlot || !selectedSlot.day) return '';
    const rel = formatRelativeDate(selectedSlot.day.date);
    // If it returns '今天', '明天', '后天' keep as is
    // If it returns 'X天后', keep as is
    return `（${rel}）`;
  };

  // Calculate estimate duration and price for display
  const getEstimateStr = () => {
    const duration = estimateDuration(form.length, form.style, form.remove);
    const price = estimatePrice(form.length, form.style, form.remove);
    const durStr = formatDuration(duration);
    return `预计 ${durStr} · ¥${price} 起`;
  };

  return (
    <div className="h-full overflow-hidden flex flex-col dark:text-[#FFFFFF] text-[#3A3A3A] dark:bg-[#333333] bg-[#FFFFFF] transition-colors duration-300">
      <div className="pt-4 pb-1 dark:bg-[#333333] bg-[#FFFFFF] transition-colors duration-300 relative z-50 flex flex-col items-center justify-start">
        <div className="flex flex-col items-center justify-start spring-scale-in">
          <div onClick={handleMarkClick} style={{ cursor: 'pointer' }}>
            <svg width="46" height="42" viewBox="0 0 46 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M25.0947 11C26.6053 11 27.8799 12.1235 28.0703 13.6221C28.1317 14.1055 28.0749 14.5737 27.9238 15H30.541C32.4238 15 34.0516 16.3131 34.4502 18.1533C34.9899 20.6457 33.0911 23 30.541 23H33.2275C35.5595 23 37.5817 24.6124 38.1015 26.8857C38.8172 30.0162 36.4387 33 33.2275 33H12.7724C9.56118 33 7.18272 30.0162 7.8984 26.8857C8.41825 24.6124 10.4404 23 12.7724 23H15.4589C12.9088 23 11.0101 20.6457 11.5498 18.1533C11.9483 16.3132 13.5761 15 15.4589 15H18.0761C17.925 14.5737 17.8673 14.1055 17.9287 13.6221C18.1191 12.1234 19.3946 11 20.9052 11H25.0947Z" 
                fill={markBgColor || '#FFDDDD'} 
                style={{ transition: 'fill 0.1s ease' }} 
              />
              <path 
                d="M21.7417 27.353H16.4292C16.2922 27.353 16.2238 27.353 16.1662 27.3463C15.7054 27.2927 15.3421 26.9293 15.2884 26.4686C15.2817 26.411 15.2817 26.3425 15.2817 26.2055C15.2817 26.0685 15.2817 26 15.2884 25.9424C15.3421 25.4817 15.7054 25.1183 16.1662 25.0647C16.2238 25.058 16.2922 25.058 16.4292 25.058H21.7417V24.157H18.2737C18.192 24.157 18.1512 24.157 18.1167 24.1546C17.6188 24.1201 17.2226 23.7239 17.1881 23.2261C17.1857 23.1916 17.1857 23.1507 17.1857 23.069C17.1857 22.9873 17.1857 22.9464 17.1881 22.9119C17.2226 22.4141 17.6188 22.0179 18.1167 21.9834C18.1512 21.981 18.192 21.981 18.2737 21.981H21.7417V21.131H17.5342C17.3972 21.131 17.3288 21.131 17.2712 21.1243C16.8104 21.0707 16.4471 20.7073 16.3934 20.2466C16.3867 20.189 16.3867 20.1205 16.3867 19.9835C16.3867 19.8465 16.3867 19.778 16.3934 19.7204C16.4471 19.2597 16.8104 18.8963 17.2712 18.8427C17.3288 18.836 17.3972 18.836 17.5342 18.836H19.0217C18.9725 18.767 18.9479 18.7326 18.9319 18.7071C18.5595 18.1133 18.8976 17.3307 19.5852 17.1948C19.6147 17.189 19.6567 17.1833 19.7407 17.1719L20.0221 17.1336C20.1547 17.1156 20.221 17.1066 20.2834 17.106C20.5657 17.103 20.8361 17.2195 21.0278 17.4268C21.0702 17.4725 21.1092 17.5269 21.1871 17.6357L22.0477 18.836H24.2067L24.5637 18.292C24.7465 18.0125 24.9101 17.7688 25.0546 17.5606C25.1054 17.4875 25.1308 17.4509 25.1708 17.4059C25.3527 17.2016 25.659 17.0668 25.9325 17.0708C25.9927 17.0717 26.0462 17.079 26.1533 17.0935L26.3505 17.1203C26.4572 17.1348 26.5105 17.142 26.5641 17.1554C27.2168 17.3188 27.5264 18.1393 27.1444 18.6932C27.1131 18.7387 27.085 18.7711 27.0287 18.836H28.4652C28.6022 18.836 28.6707 18.836 28.7283 18.8427C29.189 18.8963 29.5524 19.2597 29.606 19.7204C29.6127 19.778 29.6127 19.8465 29.6127 19.9835C29.6127 20.1205 29.6127 20.189 29.606 20.2466C29.5524 20.7073 29.189 21.0707 28.7283 21.1243C28.6707 21.131 28.6022 21.131 28.4652 21.131H24.2747V21.981H27.7257C27.8075 21.981 27.8483 21.981 27.8828 21.9834C28.3807 22.0179 28.7769 22.4141 28.8114 22.9119C28.8137 22.9464 28.8137 22.9873 28.8137 23.069C28.8137 23.1507 28.8137 23.1916 28.8114 23.2261C28.7769 23.7239 28.3807 24.1201 27.8828 24.1546C27.8483 24.157 27.8075 24.157 27.7257 24.157H24.2747V25.058H29.5702C29.7072 25.058 29.7757 25.058 29.8333 25.0647C30.294 25.1183 30.6574 25.4817 30.711 25.9424C30.7177 26 30.7177 26.0685 30.7177 26.2055C30.7177 26.3425 30.7177 26.411 30.711 26.4686C30.6574 26.9293 30.294 27.2927 29.8333 27.3463C29.7757 27.353 29.7072 27.353 29.5702 27.353H24.2747V28.4835C24.2747 28.7312 24.2747 28.855 24.2529 28.9578C24.1708 29.3442 23.8689 29.6461 23.4825 29.7282C23.3798 29.75 23.2559 29.75 23.0082 29.75C22.7605 29.75 22.6367 29.75 22.534 29.7282C22.1475 29.6461 21.8456 29.3442 21.7636 28.9578C21.7417 28.855 21.7417 28.7312 21.7417 28.4835V27.353Z" 
                fill="#3A3A3A" 
              />
            </svg>
          </div>
        </div>
      </div>

      <div ref={rootRef} className="px-5 pt-1 pb-32 flex-1 overflow-y-auto overflow-x-visible overscroll-contain">
        <div className="flex flex-col items-center justify-start spring-scale-in mb-5">
          <div onClick={handleTitleClick} style={{ cursor: 'pointer' }}>
            <img src="/assets/title.svg" alt="mickywa title" className="w-[225px] h-auto title-svg" />
          </div>
        </div>
        {loading && (
          <div className="h-80 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70 text-sm">加载中...</span>
          </div>
        )}

        {isMock && !loading && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
            <span className="text-red-400 text-xs flex-1">
              ⚠️ 获取真实日程失败，当前显示为演示数据。请检查网络或后端代理配置。
            </span>
          </div>
        )}

        {error && (
          <div className="h-80 flex flex-col items-center justify-center">
            <span className="dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70 text-sm mb-8">获取日程失败</span>
            <button 
              onClick={() => setCountdown(3)}
              className="px-8 py-2 bg-[#083A8E] text-[#FFFFFF] dark:bg-[#083A8E] dark:text-[#FFFFFF] rounded-full text-xs"
            >
              {countdown > 0 ? `自动刷新 (${countdown}s)` : '重新加载'}
            </button>
          </div>
        )}

        {!loading && !error && (
          <div key={contentKey} className="pb-10 overflow-visible">
            <div className="spring-scale-in bg-[#D3F1FF] dark:bg-[#083A8E]/25 rounded-[28px] pt-5 pb-3.5 px-3.5 overflow-visible shadow-[0_0_72px_0_rgba(255,255,255,0.70)_inset] dark:shadow-[0_0_72px_0_rgba(255,255,255,0.12)_inset]">
              <img
                src="/assets/找我耍.svg"
                alt="找我耍"
                className="h-8 w-auto mb-4 px-2 dark:brightness-0 dark:invert"
                ref={calendarTitleRef}
              />
              <div
                ref={calendarCardRef}
                className="bg-[#FFFFFF] dark:bg-[#333333] rounded-[18px] pt-3.5 pb-3.5 px-3.5 overflow-visible"
              >
                <div className="space-y-2">
                  {(recommendations.length ? recommendations : [{ id: 'rec-empty', title: '暂无可预约时间', subtitle: '', disabled: true }]).map((rec, idx) => {
                    const isDisabled = !!rec.disabled;
                    const isSelected = selectedSmartId && rec.id === selectedSmartId;

                    return (
                      <SmartRecButton
                        key={rec.id}
                        idx={idx}
                        recId={rec.id}
                        title={rec.title}
                        titleNode={rec.prefix ? (
                          <span className="min-w-0 truncate whitespace-nowrap">
                            <span className="min-w-0">{rec.prefix}</span>
                            <BottomUpLettersSwap
                              text={smartActivityById[rec.id] ?? rec.activity ?? ''}
                              active={Boolean(smartAnimEnabledById[rec.id])}
                            />
                          </span>
                        ) : undefined}
                        disabled={isDisabled}
                        selected={Boolean(isSelected)}
                        fading={rec.id === fadingSmartId}
                        pressed={pressedSlotId === rec.id}
                        animationDelay={idx * 0.05}
                        setEl={(el) => {
                          if (el) smartRecRefs.current[rec.id] = el;
                          else delete smartRecRefs.current[rec.id];
                        }}
                        onActivate={() => handleRecommendationClick(rec)}
                        onBlurFade={fadeOutSmartFill}
                      />
                    );
                  })}

                  <div
                    className="smart-toggle-btn relative flex items-start gap-2 cursor-pointer spring-scale-in transition-all duration-300 transform rounded-[12px] px-[14px] py-1.5 min-h-[44px] overflow-visible"
                    style={{ animationDelay: `${recommendations.length * 0.05 + 0.05}s` }}
                    onClick={handleToggleCalendar}
                  >
                    <span data-ripple-fill className="absolute inset-0 rounded-[12px] pointer-events-none opacity-0" />
                    <span data-ripple-ring className="absolute inset-0 rounded-[12px] pointer-events-none opacity-0 border-solid" />
                    <div className="relative z-10">
                      <div className="text-[#083A8E] dark:text-[#D3F1FF] text-[16px] font-medium leading-relaxed">
                        {isCalendarExpanded ? '收起日历 ↑' : '展开日历 ↓'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={["overflow-hidden transition-[max-height,opacity] ease-out",
                  !isCalendarExpanded && isCalendarCollapsing ? "collapse-gentle" : "",
                  isCalendarExpanded ? "duration-500" : "duration-150",
                  isCalendarExpanded ? "max-h-[2200px] opacity-100" : "max-h-0 opacity-0"
                ].join(' ')}
                onTransitionEnd={(e) => {
                  if (!isCalendarExpanded && e.propertyName === 'max-height') {
                    triggerCalendarCardBounce();
                  }
                }}>
                  <div className="my-4 h-px bg-[#3A3A3A]/10 dark:bg-[#FFFFFF]/10" />

                  {(() => {
              const months = {};
              schedule.forEach(day => {
                const monthKey = `${day.date.getFullYear()}-${day.date.getMonth() + 1}`;
                if (!months[monthKey]) {
                  months[monthKey] = [];
                }
                months[monthKey].push(day);
              });
              
              return Object.entries(months).map(([monthKey, days], monthIndex) => {
                const [year, month] = monthKey.split('-');
                const sortedDays = [...days].sort((a, b) => a.date - b.date);
                return (
                  <div key={monthKey} className="mb-4 spring-scale-in" style={{ animationDelay: `${monthIndex * 0.1}s` }}>
                    <h2 className="text-lg font-bold mb-2 dark:text-[#FFFFFF] text-[#3A3A3A]">{month}月</h2>

                    {monthIndex === 0 && (
                      <div className="grid grid-cols-7 gap-1 pb-1.5">
                        {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => (
                          <div key={index} className="text-center text-[11px] dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70 font-medium whitespace-nowrap">
                            {day}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(() => {
                      // 获取当前月份展示的第一天
                      const firstVisible = sortedDays[0]?.date;
                      if (!firstVisible) return null;

                      const firstDay = new Date(firstVisible.getFullYear(), firstVisible.getMonth(), firstVisible.getDate());
                      // 获取第一天是星期几 (0=周日, 1=周一, ..., 6=周六)
                      const firstDayOfWeek = firstDay.getDay();
                      // 计算需要的空白天数（周一为1，所以如果第一天是周日，需要6个空白）
                      const emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
                      
                      // 创建完整的日历网格
                      const calendarGrid = [];
                      
                      // 添加空白天数
                      for (let i = 0; i < emptyDays; i++) {
                        calendarGrid.push(null);
                      }
                      
                      // 添加实际日期
                      sortedDays.forEach(day => {
                        calendarGrid.push(day);
                      });
                      
                      // 按7天一行分组
                      const weekRows = [];
                      for (let i = 0; i < calendarGrid.length; i += 7) {
                        weekRows.push(calendarGrid.slice(i, i + 7));
                      }
                      
                      return (
                        <div className="flex flex-col gap-1">
                          {weekRows.map((week, weekIndex) => (
                            <div key={weekIndex}>
                              <div className="grid grid-cols-7 gap-1">
                                {week.map((item, dayIndex) => {
                                  if (!item) {
                                    // 空白天数
                                    return <div key={dayIndex} className="aspect-square"></div>;
                                  }
                              
                              // 检查当天的可预约情况
                              const freeSlots = item.slots.filter(slot => slot.status === 'free');
                              let bookingStatus = '不空';
                              let bookingType = 'busy';
                              let isFullDay = false;
                              let isDaytime = false;
                              let isEvening = false;

                              const isShiftWorkday = Boolean(item.holidayName && item.holidayName.includes('班'));
                              const holidayLabel = isShiftWorkday
                                ? '补班'
                                : (item.holidayName ? item.holidayName.slice(0, 2) : '');
                              
                              if (freeSlots.length > 0) {
                                const freeSlotKeys = freeSlots.map(slot => slot.key);
                                if (freeSlotKeys.includes('daytime') && freeSlotKeys.includes('evening')) {
                                  bookingStatus = '全天';
                                  bookingType = 'free';
                                  isFullDay = true;
                                } else if (freeSlotKeys.includes('daytime')) {
                                  bookingStatus = '白天';
                                  bookingType = 'free';
                                  isDaytime = true;
                                } else if (freeSlotKeys.includes('evening')) {
                                  bookingStatus = '晚上';
                                  bookingType = 'free';
                                  isEvening = true;
                                }
                              }

                              const isToday = item.date.getDate() === new Date().getDate() && 
                                           item.date.getMonth() === new Date().getMonth() && 
                                           item.date.getFullYear() === new Date().getFullYear();

                              const isSelected = selectedSlot && selectedSlot.day.key === item.key;
                              const fullDaySlot = isFullDay ? item.slots.find(slot => slot.status === 'free') : null;
                              const fullDaySlotIdx = fullDaySlot ? item.slots.indexOf(fullDaySlot) : null;
                              const fullDayUniqueKey = fullDaySlotIdx !== null ? `${item.key}-${fullDaySlotIdx}` : null;

                              const daySlot = isDaytime
                                ? item.slots.find(slot => slot.status === 'free' && slot.key === 'daytime')
                                : null;
                              const daySlotIdx = daySlot ? item.slots.indexOf(daySlot) : null;
                              const dayUniqueKey = daySlotIdx !== null ? `${item.key}-${daySlotIdx}` : null;

                              const eveningSlot = isEvening ? item.slots.find(slot => slot.key === 'evening') : null;
                              const eveningSlotIdx = eveningSlot ? item.slots.indexOf(eveningSlot) : null;
                              const eveningUniqueKey = eveningSlotIdx !== null ? `${item.key}-${eveningSlotIdx}` : null;
                              const showFocus = bookingType !== 'busy' && isSelected;
                              const primaryTextClass = bookingType === 'busy'
                                ? "dark:text-[#FFFFFF]/60 text-[#3A3A3A]/50"
                                : isSelected
                                  ? "!text-[#3A3A3A] dark:!text-[#3A3A3A]"
                                  : "text-[#083A8E] dark:text-[#FFFFFF]";

                              const metaTextClass = isSelected
                                ? "text-[#3A3A3A]/50 dark:text-[#083A8E]/45"
                                : "text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50";
                              
                                  return (
                                    <div 
                                      key={item.key}
                                      id={`day-${item.key}`}
                                      ref={el => dayRefs.current[item.key] = el}
                                      className="spring-scale-in aspect-square"
                                      style={{ animationDelay: `${monthIndex * 0.1 + weekIndex * 0.05 + dayIndex * 0.02}s` }}
                                    >
                                  <div>
                                    {isFullDay && (
                                      <div 
                                        ref={el => {
                                          if (el && bookingType !== 'busy') {
                                            calendarItemRefs.current[item.key] = el;
                                          }
                                        }}
                                        tabIndex={bookingType !== 'busy' ? 0 : -1}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          playMonthSlotPress(fullDayUniqueKey, e.currentTarget);
                                          triggerSlotPress(fullDayUniqueKey);
                                          if (fullDaySlot && fullDaySlotIdx !== null) onSlotTap(item, fullDaySlot, fullDaySlotIdx);
                                          setFocusArea('calendar');
                                        }}
                                        onKeyDown={(e) => {
                                          if (bookingType !== 'busy') {
                                            // 让全局键盘事件处理
                                          }
                                        }}
                                        className={["slot-item w-full h-full px-1.5 py-2 rounded-[12px] flex flex-col items-start justify-center gap-1 transition-all duration-0 ease-out transform cursor-pointer relative",
                                          bookingType === 'busy' 
                                            ? "dark:bg-[#FFFFFF]/4 bg-[#333333]/10 cursor-not-allowed" 
                                            : "bg-[#D3F1FF] text-[#083A8E] dark:bg-[#083A8E] dark:text-[#FFFFFF] shadow-[0_0_32px_0_rgba(255,255,255,0.80)_inset] dark:shadow-[0_0_32px_0_rgba(255,255,255,0.20)_inset]",
                                          showFocus ? "!opacity-100 -translate-y-1.25" : ""
                                        ].join(' ')}>
                                        {bookingType !== 'busy' && (
                                          <div className={["absolute inset-0 rounded-[12px] pointer-events-none animate-color-change transition-opacity ease-out", showFocus ? "opacity-100 duration-0" : "opacity-0 duration-[1000ms]"].join(' ')}></div>
                                        )}
                                        {isToday && (
                                          <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#3A3A3A] bg-[#FFDDDD] rounded-[10px] rotate-6 shadow-[0_0_24px_0_rgba(255,255,255,0.65)_inset]">
                                            今
                                          </span>
                                        )}
                                        <div className={["w-full", bookingType === 'busy' ? "opacity-50" : ""].join(' ')}>
                                          <div className="min-w-0 flex items-center relative z-10">
                                            <span className={["text-[15px] font-semibold leading-none", primaryTextClass].join(' ')}>{item.label}</span>
                                            {holidayLabel && (
                                              <span className={["text-[10px] truncate whitespace-nowrap max-w-[2.2em]", metaTextClass].join(' ')}>{holidayLabel}</span>
                                            )}
                                          </div>
                                          <div className={["text-[11px] leading-tight whitespace-nowrap relative z-10", primaryTextClass].join(' ')}>{bookingStatus}</div>
                                        </div>
                                      </div>
                                    )}
                                    {!isFullDay && isDaytime && (
                                      <div 
                                        ref={el => {
                                          if (el && bookingType !== 'busy') {
                                            calendarItemRefs.current[item.key] = el;
                                          }
                                        }}
                                        tabIndex={bookingType !== 'busy' ? 0 : -1}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          playMonthSlotPress(dayUniqueKey, e.currentTarget);
                                          triggerSlotPress(dayUniqueKey);
                                          if (daySlot && daySlotIdx !== null) onSlotTap(item, daySlot, daySlotIdx);
                                          setFocusArea('calendar');
                                        }}
                                        onKeyDown={(e) => {
                                          if (bookingType !== 'busy') {
                                            // 让全局键盘事件处理
                                          }
                                        }}
                                        className={["slot-item w-full h-full px-1.5 py-2 rounded-[12px] flex flex-col items-start justify-center gap-1 transition-all duration-0 ease-out transform cursor-pointer relative",
                                          "bg-[#C9F6FF] text-[#083A8E] dark:bg-[#085C8E] dark:text-[#FFFFFF] shadow-[0_0_32px_0_rgba(255,255,255,0.80)_inset] dark:shadow-[0_0_32px_0_rgba(255,255,255,0.20)_inset]",
                                          showFocus ? "!opacity-100 -translate-y-1.25" : ""
                                        ].join(' ')}>
                                        <div className={["absolute inset-0 rounded-[12px] pointer-events-none animate-color-change-day transition-opacity ease-out", showFocus ? "opacity-100 duration-0" : "opacity-0 duration-[1000ms]"].join(' ')}></div>
                                        {isToday && (
                                          <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#3A3A3A] bg-[#FFDDDD] rounded-[10px] rotate-6 shadow-[0_0_24px_0_rgba(255,255,255,0.65)_inset]">
                                            今
                                          </span>
                                        )}
                                        <div className="w-full">
                                          <div className="min-w-0 flex items-center relative z-10">
                                            <span className={["text-[15px] font-semibold leading-none", primaryTextClass].join(' ')}>{item.label}</span>
                                            {holidayLabel && (
                                              <span className={["text-[10px] truncate whitespace-nowrap max-w-[2.2em]", metaTextClass].join(' ')}>{holidayLabel}</span>
                                            )}
                                          </div>
                                          <div className={["text-[11px] leading-tight whitespace-nowrap relative z-10", primaryTextClass].join(' ')}>{bookingStatus}</div>
                                        </div>
                                      </div>
                                    )}
                                    {!isFullDay && isEvening && (
                                      <div 
                                        ref={el => {
                                          if (el && bookingType !== 'busy') {
                                            calendarItemRefs.current[item.key] = el;
                                          }
                                        }}
                                        tabIndex={bookingType !== 'busy' ? 0 : -1}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          playMonthSlotPress(eveningUniqueKey, e.currentTarget);
                                          triggerSlotPress(eveningUniqueKey);
                                          if (eveningSlot && eveningSlotIdx !== null) onSlotTap(item, eveningSlot, eveningSlotIdx);
                                          setFocusArea('calendar');
                                        }}
                                        onKeyDown={(e) => {
                                          if (bookingType !== 'busy') {
                                            // 让全局键盘事件处理
                                          }
                                        }}
                                        className={["slot-item w-full h-full px-1.5 py-2 rounded-[12px] flex flex-col items-start justify-center gap-1 transition-all duration-0 ease-out transform cursor-pointer relative",
                                          "bg-[#E1DCFF] text-[#083A8E] dark:bg-[#2A338E] dark:text-[#FFFFFF] shadow-[0_0_32px_0_rgba(255,255,255,0.80)_inset] dark:shadow-[0_0_32px_0_rgba(255,255,255,0.20)_inset]",
                                          showFocus ? "!opacity-100 -translate-y-1.25" : ""
                                        ].join(' ')}>
                                        <div className={["absolute inset-0 rounded-[12px] pointer-events-none animate-color-change-evening transition-opacity ease-out", showFocus ? "opacity-100 duration-0" : "opacity-0 duration-[1000ms]"].join(' ')}></div>
                                        {isToday && (
                                          <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#3A3A3A] bg-[#FFDDDD] rounded-[10px] rotate-6 shadow-[0_0_24px_0_rgba(255,255,255,0.65)_inset]">
                                            今
                                          </span>
                                        )}
                                        <div className="w-full">
                                          <div className="min-w-0 flex items-center relative z-10">
                                            <span className={["text-[15px] font-semibold leading-none", primaryTextClass].join(' ')}>{item.label}</span>
                                            {holidayLabel && (
                                              <span className={["text-[10px] truncate whitespace-nowrap max-w-[2.2em]", metaTextClass].join(' ')}>{holidayLabel}</span>
                                            )}
                                          </div>
                                          <div className={["text-[11px] leading-tight whitespace-nowrap relative z-10", primaryTextClass].join(' ')}>{bookingStatus}</div>
                                        </div>
                                      </div>
                                    )}
                                    {!isFullDay && !isDaytime && !isEvening && (
                                      <div className="slot-item w-full h-full px-1.5 py-2 rounded-[12px] flex flex-col items-start justify-center gap-1 transition-all duration-300 transform relative dark:bg-[#FFFFFF]/4 bg-[#333333]/10 cursor-not-allowed">
                                        {isToday && (
                                          <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#3A3A3A] bg-[#FFDDDD] rounded-[10px] rotate-6 shadow-[0_0_24px_0_rgba(255,255,255,0.65)_inset]">
                                            今
                                          </span>
                                        )}
                                        <div className="opacity-50 w-full">
                                          <div className="min-w-0 flex items-center">
                                            <span className={["text-[15px] font-semibold leading-none", primaryTextClass].join(' ')}>{item.label}</span>
                                            {holidayLabel && (
                                              <span className={["text-[10px] truncate whitespace-nowrap max-w-[2.2em]", metaTextClass].join(' ')}>{holidayLabel}</span>
                                            )}
                                          </div>
                                          <div className={["text-[11px] leading-tight whitespace-nowrap", primaryTextClass].join(' ')}>{bookingStatus}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              });
            })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#FFFFFF] text-[#3A3A3A] px-6 py-3 rounded-lg text-sm z-[200] fade-in-out shadow-lg">
          {toast.message}
        </div>
      )}

      {/* Booking Action Bar */}
      {showBookingBar && selectedSlot && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[180] w-full max-w-[440px] px-5 pointer-events-none"
          style={{
            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }}
        >
          <div 
            className="bottom-bar pointer-events-auto bg-[#FCF7BD] dark:bg-[#3A3A3A] rounded-[16px] px-4 py-3 flex items-center justify-between gap-3 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium text-[#3A3A3A] dark:text-[#FFFFFF] truncate">
                {selectedSlot.day.date.getMonth() + 1}月{selectedSlot.day.date.getDate()}日 {selectedSlot.slot.label}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-[#3A3A3A] dark:text-[#FFFFFF] bg-[#E5E5E5] dark:bg-[#444444] hover:opacity-80 active:scale-95 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  openHalfModal();
                }}
              >
                下一步
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Half Modal Overlay */}
      {showHalfModal && (
        <div 
          className={["fixed inset-0 z-[190] bg-black/30 transition-opacity duration-300",
            isHalfModalClosing ? "opacity-0 pointer-events-none" : "opacity-100"
          ].join(' ')}
          onClick={closeHalfModal}
        >
          <div 
            ref={halfModalRef}
            className={["absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-[#FFFFFF] dark:bg-[#3A3A3A] rounded-t-[24px] overflow-hidden shadow-xl transition-transform duration-300 ease-out",
              isHalfModalClosing ? "translate-y-full" : "translate-y-0"
            ].join(' ')}
            style={{ 
              maxHeight: 'calc(100vh - 44px)',
              animation: isHalfModalClosing ? 'none' : 'slideUpModal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleHalfModalTouchStart}
            onTouchMove={handleHalfModalTouchMove}
            onTouchEnd={handleHalfModalTouchEnd}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#3A3A3A]/20 dark:bg-[#FFFFFF]/20 rounded-full" />
            </div>
            
            {/* Title */}
            <div className="px-5 pb-4">
              <h2 className="text-lg font-semibold text-[#3A3A3A] dark:text-[#FFFFFF]">
                  {selectedSlot?.day.date.getMonth() + 1}月{selectedSlot?.day.date.getDate()}日 {selectedSlot?.slot.label} 
                  <BottomUpLettersSwap text={selectedActivity} active={true} />
                </h2>
            </div>
            
            {/* Content */}
            <div className="px-5 pb-8">
              {/* Activity Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#3A3A3A]/70 dark:text-[#FFFFFF]/70 mb-3">选择游玩项目</h3>
                <div className="flex flex-col gap-2">
                  {ENTERTAINMENT_ACTIVITIES_BY_TIME.daytime.slice(0, 5).map((activity, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={[
                        "px-4 py-3 rounded-[12px] text-[14px] font-medium transition-all active:scale-95 relative overflow-hidden",
                        selectedActivity === activity 
                          ? "text-[#083A8E] dark:text-[#D3F1FF]" 
                          : "bg-[#E5E5E5] dark:bg-[#444444] text-[#3A3A3A] dark:text-[#FFFFFF]"
                      ].join(' ')}
                      onClick={() => setSelectedActivity(activity)}
                    >
                      {selectedActivity === activity && (
                        <div className="absolute inset-0 animate-color-change rounded-[12px]" />
                      )}
                      <span className="relative z-10">{activity}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Booking Note */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#3A3A3A]/70 dark:text-[#FFFFFF]/70 mb-3">预约文案</h3>
                <textarea
                  className="w-full px-4 py-3 rounded-[12px] text-[14px] text-[#3A3A3A] dark:text-[#FFFFFF] bg-[#FFFFFF] dark:bg-[#333333] border border-[#3A3A3A]/10 dark:border-[#FFFFFF]/10 resize-none focus:outline-none focus:border-[#083A8E] dark:focus:border-[#D3F1FF] transition-colors"
                  rows={4}
                  placeholder={`你好，羊石坨坨，我想要在${selectedSlot?.slot?.label || '晚上'}跟你去${selectedActivity || '玩'}。`}
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                />
              </div>
              
              {/* Bottom Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-medium text-[#3A3A3A] dark:text-[#FFFFFF] bg-[#3A3A3A]/10 dark:bg-[#FFFFFF]/10 hover:opacity-80 active:scale-95 transition-all"
                  onClick={closeHalfModal}
                >
                  收起
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-medium text-[#FFFFFF] bg-[#083A8E] dark:bg-[#083A8E] hover:opacity-80 active:scale-95 transition-all"
                  onClick={copyBookingText}
                >
                  复制
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Bottom Bar for Calendar Source */}
      {!loading && !error && showBottomBar && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[180] w-full max-w-[440px] px-5 pointer-events-none">
          <div className="bottom-bar pointer-events-auto bg-[#3A3A3A]/55 dark:bg-[#3A3A3A]/55 text-[#FFFFFF]/55 rounded-full px-4 py-2 flex items-center justify-between gap-3 backdrop-blur-sm">
            <div
              className="min-w-0 text-[12px] leading-none truncate"
              title={calendarReason || ''}
            >
              {calendarSource === 'icloud'
                ? '来源：iCloud'
                : calendarSource === 'cloud'
                  ? '来源：云函数'
                  : '来源：模拟'}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                className="p-1 rounded-full hover:bg-[#FFFFFF]/10 active:bg-[#FFFFFF]/15 text-[#FFFFFF]/55 hover:text-[#FFFFFF]/70"
                aria-label="切换来源"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCalendarProvider();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 7h-5m5 0-2-2m2 2-2 2M4 17h5m-5 0 2-2m-2 2 2 2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 7a8 8 0 0 1 13 3m-3 7a8 8 0 0 1-13-3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.65"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="p-1 rounded-full hover:bg-[#FFFFFF]/10 active:bg-[#FFFFFF]/15 text-[#FFFFFF]/55 hover:text-[#FFFFFF]/70"
                aria-label="关闭状态条"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBottomBar(false);
                  if (bottomBarTimerRef.current) {
                    clearTimeout(bottomBarTimerRef.current);
                    bottomBarTimerRef.current = null;
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 7l10 10M17 7 7 17"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
