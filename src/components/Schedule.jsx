import React, { useState, useEffect, useRef } from 'react';
import { getCalendarsWithCache } from '../utils/ical';
import { formatRelativeDate } from '../utils/time';
import { estimateDuration, estimatePrice, formatDuration } from '../config/estimateConfig';

// Options configuration
const LENGTH_OPTIONS = ['本甲', '短甲', '中长', '长甲', '延长', '待定'];
const STYLE_OPTIONS = ['纯色', '跳色', '法式', '猫眼', '渐变', '设计', '待定'];
const REMOVE_OPTIONS = ['需要', '不需要', '待定'];

export default function Schedule({ theme }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMock, setIsMock] = useState(false);
  
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

  const dayRefs = useRef({});
  const animationInterval = useRef(null);

  const fetchData = async (isAuto = false) => {
    if (!isAuto) {
      setLoading(true);
      setError(false);
    }
    try {
      const res = await getCalendarsWithCache({ forceMock: import.meta.env.DEV });
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endExclusive = new Date(startOfToday);
      endExclusive.setDate(endExclusive.getDate() + 22);

      const nextDays = (res.schedule || [])
        .filter(day => day?.date instanceof Date)
        .filter(day => day.date >= startOfToday && day.date < endExclusive)
        .sort((a, b) => a.date - b.date);

      setSchedule(nextDays);
      setIsMock(!!res.isMock);
      setLoading(false);
      setError(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setError(true);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

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
      return;
    }

    setSelectedSlot({
      day,
      slot,
      slotIdx,
      uniqueKey
    });
  };

  const handleBookClick = (e) => {
    e.stopPropagation(); // Prevent deselecting when clicking the button
    if (!selectedSlot) return;
    openModal();
  };

  // Click background to deselect
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // If clicking inside a slot or the bottom bar or modal, do nothing
      if (e.target.closest('.slot-item') || e.target.closest('.bottom-bar') || e.target.closest('.modal-container') || e.target.closest('.theme-toggle')) {
        return;
      }
      setSelectedSlot(null);
    };
    
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const openModal = () => {
    setShowModal(true);
    // Reset form, style defaults to empty array
    setForm({ length: '', style: [], remove: '' });
  };

  const hideModal = () => {
    setShowModal(false);
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
    <div className="min-h-screen flex flex-col pb-32 dark:text-[#FFFFFF] text-[#3A3A3A] dark:bg-[#333333] bg-[#FFFFFF] transition-colors duration-300">
      <div className="pt-4 pb-4 dark:bg-[#333333] bg-[#FFFFFF] transition-colors duration-300 relative z-50 flex flex-col items-center justify-start">
        <div className="flex flex-col items-center justify-start space-y-2 spring-scale-in">
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
          <div onClick={handleTitleClick} style={{ cursor: 'pointer' }}>
            <img src="/assets/title.svg" alt="mickywa title" className="w-[225px] h-auto title-svg" />
          </div>
        </div>
      </div>

      <div className="px-5 flex-1">
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
          <div key={contentKey} className="pb-10">
            {/* 按月分组 */}
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
                    <h2 className="text-xl font-bold mb-2 dark:text-[#FFFFFF] text-[#3A3A3A]">{month}月</h2>

                    {monthIndex === 0 && (
                      <div className="grid grid-cols-7 gap-1 pb-1.5">
                        {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => (
                          <div key={index} className="text-center text-xs dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70 font-medium">
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
                              let isMorning = false;
                              let isEvening = false;

                              const isShiftWorkday = Boolean(item.holidayName && item.holidayName.includes('班'));
                              const holidayLabel = isShiftWorkday
                                ? '补班'
                                : (item.holidayName ? item.holidayName.slice(0, 2) : '');
                              
                              if (!isShiftWorkday && freeSlots.length > 0) {
                                const freeSlotKeys = freeSlots.map(slot => slot.key);
                                if (freeSlotKeys.includes('morning') && freeSlotKeys.includes('noon') && freeSlotKeys.includes('afternoon') && freeSlotKeys.includes('evening')) {
                                  bookingStatus = '全天';
                                  bookingType = 'free';
                                  isFullDay = true;
                                } else if (freeSlotKeys.includes('morning') || freeSlotKeys.includes('noon') || freeSlotKeys.includes('afternoon')) {
                                  bookingStatus = '白天';
                                  bookingType = 'free';
                                  isMorning = true;
                                } else if (freeSlotKeys.includes('evening')) {
                                  bookingStatus = '晚上';
                                  bookingType = 'free';
                                  isEvening = true;
                                }
                              }

                              if (isShiftWorkday) {
                                bookingStatus = '不空';
                                bookingType = 'busy';
                                isFullDay = false;
                                isMorning = false;
                                isEvening = false;
                              }
                              
                              const isToday = item.date.getDate() === new Date().getDate() && 
                                           item.date.getMonth() === new Date().getMonth() && 
                                           item.date.getFullYear() === new Date().getFullYear();

                              const isSelected = selectedSlot && selectedSlot.day.key === item.key;
                              const primaryTextClass = bookingType === 'busy'
                                ? "dark:text-[#FFFFFF]/60 text-[#3A3A3A]/50"
                                : isSelected
                                  ? "!text-[#3A3A3A] dark:!text-[#3A3A3A]"
                                  : "text-[#083A8E] dark:text-[#FFFFFF]";
                              
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // 选择第一个可预约的时间段
                                          const firstFreeSlot = item.slots.find(slot => slot.status === 'free');
                                          if (firstFreeSlot) {
                                            const slotIdx = item.slots.indexOf(firstFreeSlot);
                                            onSlotTap(item, firstFreeSlot, slotIdx);
                                          }
                                        }}
                                        className={["slot-item w-full h-full px-2.5 py-2 rounded-[12px] flex flex-col items-start justify-center gap-1 transition-all duration-300 transform cursor-pointer",
                                          bookingType === 'busy' 
                                            ? "dark:bg-[#FFFFFF]/4 bg-[#333333]/10 opacity-50 cursor-not-allowed" 
                                            : isSelected
                                              ? "!opacity-100 -translate-y-1.25 animate-color-change !bg-[#083A8E] dark:!bg-[#D3F1FF]"
                                              : "bg-[#D3F1FF] text-[#083A8E] dark:bg-[#083A8E] dark:text-[#FFFFFF] shadow-[0_0_32px_0_rgba(255,255,255,0.80)_inset] dark:shadow-[0_0_32px_0_rgba(255,255,255,0.20)_inset]"
                                        ].join(' ')}>
                                        <div className="min-w-0 flex items-center gap-1.5">
                                          <span className={["text-base font-semibold leading-none", primaryTextClass].join(' ')}>{item.label}</span>
                                          {holidayLabel && (
                                            <span className="text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50 text-[10px] truncate whitespace-nowrap max-w-[2.2em]">{holidayLabel}</span>
                                          )}
                                          {isToday && (
                                            <span className="text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50 text-[10px] whitespace-nowrap">今</span>
                                          )}
                                        </div>
                                        <div className={["text-xs leading-tight", primaryTextClass].join(' ')}>{bookingStatus}</div>
                                      </div>
                                    )}
                                    {!isFullDay && isMorning && (
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // 选择白天的时间段
                                          const daySlot = item.slots.find(slot => ['morning', 'noon', 'afternoon'].includes(slot.key));
                                          if (daySlot) {
                                            const slotIdx = item.slots.indexOf(daySlot);
                                            onSlotTap(item, daySlot, slotIdx);
                                          }
                                        }}
                                        className={["slot-item w-full h-full px-2.5 py-2 rounded-[12px] flex flex-col items-start justify-center gap-1 transition-all duration-300 transform cursor-pointer",
                                          isSelected
                                            ? "!opacity-100 -translate-y-1.25 animate-color-change !bg-[#083A8E] dark:!bg-[#D3F1FF]"
                                            : "bg-[#D3F1FF] text-[#083A8E] dark:bg-[#083A8E] dark:text-[#FFFFFF] shadow-[0_0_32px_0_rgba(255,255,255,0.80)_inset] dark:shadow-[0_0_32px_0_rgba(255,255,255,0.20)_inset]"
                                        ].join(' ')}>
                                        <div className="min-w-0 flex items-center gap-1.5">
                                          <span className={["text-base font-semibold leading-none", primaryTextClass].join(' ')}>{item.label}</span>
                                          {holidayLabel && (
                                            <span className="text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50 text-[10px] truncate whitespace-nowrap max-w-[2.2em]">{holidayLabel}</span>
                                          )}
                                          {isToday && (
                                            <span className="text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50 text-[10px] whitespace-nowrap">今</span>
                                          )}
                                        </div>
                                        <div className={["text-xs leading-tight", primaryTextClass].join(' ')}>{bookingStatus}</div>
                                      </div>
                                    )}
                                    {!isFullDay && isEvening && (
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // 选择晚上的时间段
                                          const eveningSlot = item.slots.find(slot => slot.key === 'evening');
                                          if (eveningSlot) {
                                            const slotIdx = item.slots.indexOf(eveningSlot);
                                            onSlotTap(item, eveningSlot, slotIdx);
                                          }
                                        }}
                                        className={["slot-item w-full h-full px-2.5 py-2 rounded-[12px] flex flex-col items-start justify-center gap-1 transition-all duration-300 transform cursor-pointer",
                                          isSelected
                                            ? "!opacity-100 -translate-y-1.25 animate-color-change !bg-[#083A8E] dark:!bg-[#D3F1FF]"
                                            : "bg-[#D3F1FF] text-[#083A8E] dark:bg-[#083A8E] dark:text-[#FFFFFF] shadow-[0_0_32px_0_rgba(255,255,255,0.80)_inset] dark:shadow-[0_0_32px_0_rgba(255,255,255,0.20)_inset]"
                                        ].join(' ')}>
                                        <div className="min-w-0 flex items-center gap-1.5">
                                          <span className={["text-base font-semibold leading-none", primaryTextClass].join(' ')}>{item.label}</span>
                                          {holidayLabel && (
                                            <span className="text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50 text-[10px] truncate whitespace-nowrap max-w-[2.2em]">{holidayLabel}</span>
                                          )}
                                          {isToday && (
                                            <span className="text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50 text-[10px] whitespace-nowrap">今</span>
                                          )}
                                        </div>
                                        <div className={["text-xs leading-tight", primaryTextClass].join(' ')}>{bookingStatus}</div>
                                      </div>
                                    )}
                                    {!isFullDay && !isMorning && !isEvening && (
                                      <div className="slot-item w-full h-full px-2.5 py-2 rounded-[12px] flex flex-col items-start justify-center gap-1 transition-all duration-300 transform dark:bg-[#FFFFFF]/4 bg-[#333333]/10 opacity-50 cursor-not-allowed">
                                        <div className="min-w-0 flex items-center gap-1.5">
                                          <span className={["text-base font-semibold leading-none", primaryTextClass].join(' ')}>{item.label}</span>
                                          {holidayLabel && (
                                            <span className="text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50 text-[10px] truncate whitespace-nowrap max-w-[2.2em]">{holidayLabel}</span>
                                          )}
                                          {isToday && (
                                            <span className="text-[#3A3A3A]/50 dark:text-[#FFFFFF]/50 text-[10px] whitespace-nowrap">今</span>
                                          )}
                                        </div>
                                        <div className={["text-xs leading-tight", primaryTextClass].join(' ')}>{bookingStatus}</div>
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
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#3A3A3A]/80 text-[#FCF7BD] px-6 py-3 rounded-lg text-sm z-[200] fade-in">
          {toast.message}
        </div>
      )}
    </div>
  );
}
