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
  const [visibleDays, setVisibleDays] = useState({});
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
  const [markBgColor, setMarkBgColor] = useState('transparent');
  const [markAnimation, setMarkAnimation] = useState(false);

  const dayRefs = useRef({});

  const fetchData = async (isAuto = false) => {
    if (!isAuto) {
      setLoading(true);
      setError(false);
    }
    try {
      const res = await getCalendarsWithCache();
      setSchedule(res.schedule);
      setIsMock(!!res.isMock);
      setLoading(false);
      setError(false);
      
      // Init observer after render
      setTimeout(initObserver, 100);
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

  const initObserver = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const key = entry.target.dataset.key;
          setVisibleDays(prev => ({ ...prev, [key]: true }));
        }
      });
    }, { threshold: 0.1 });

    Object.values(dayRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  };

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

  const handleMarkClick = () => {
    const colors = ['#D3F1FF', '#CFEDD9', '#FFDDDD', '#FCF7BD'];
    setMarkAnimation(true);
    
    let index = 0;
    const interval = setInterval(() => {
      setMarkBgColor(colors[index]);
      index = (index + 1) % colors.length;
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setMarkBgColor('transparent');
      setMarkAnimation(false);
    }, 600);
  };

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
        <div className="flex flex-col items-center justify-start space-y-2">
          <div className="relative" onClick={handleMarkClick} style={{ cursor: 'pointer' }}>
            <div 
              className="absolute inset-0 rounded-full transition-colors duration-100" 
              style={{ 
                backgroundColor: markBgColor, 
                animation: markAnimation ? 'colorShift 0.6s ease-in-out' : 'none' 
              }} 
            />
            <img src="/assets/mark.svg" alt="mickywa mark" className="w-[46px] h-auto relative z-10" />
          </div>
          <img src="/assets/title.svg" alt="mickywa title" className="w-[225px] h-auto title-svg" />
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
              onClick={() => fetchData()}
              className="px-8 py-2 bg-[#083A8E] text-[#FFFFFF] dark:bg-[#083A8E] dark:text-[#FFFFFF] rounded-full text-xs"
            >
              重新加载
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="pb-10">
            {schedule.map((item, index) => (
              <div 
                key={item.key}
                id={`day-${item.key}`}
                data-key={item.key}
                ref={el => dayRefs.current[item.key] = el}
                className={`my-3 py-2 transition-all duration-500 transform ${visibleDays[item.key] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-lg font-semibold">{item.label}</span>
                    <span className="dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70">周{item.weekday}</span>
                    {index === 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#975322] text-[#FFFFFF]/90 dark:bg-[#975322] dark:text-[#FFFFFF]/90">
                        今天
                      </span>
                    )}
                  </div>
                  {item.holidayName && (
                    <div className="text-[#3A3A3A]/60 dark:text-[#FFFFFF]/60 font-medium text-right">{item.holidayName}</div>
                  )}
                </div>

                <div className="flex justify-between gap-3">
                  {item.slots.map((slot, slotIdx) => {
                    const uniqueKey = `${item.key}-${slotIdx}`;
                    const isBusy = slot.status !== 'free';
                    const isActive = selectedSlot && selectedSlot.uniqueKey === uniqueKey;
                    const isShaking = shakingSlotId === uniqueKey;
                    const isFree = !isBusy;
                    
                    return (
                      <div
                        key={slot.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSlotTap(item, slot, slotIdx);
                        }}
                        className={`
                          slot-item flex-1 p-2 h-20 rounded-xl border flex flex-col items-start justify-center
                          transition-all duration-300 transform cursor-pointer
                          ${isBusy 
                            ? 'dark:bg-[#333333]/10 bg-[#333333]/10 dark:border-[#FFFFFF]/8 border-[#333333]/10 opacity-50 cursor-not-allowed' 
                            : 'bg-[#D3F1FF] text-[#083A8E] border border-[#083A8E]/60 hover:border-[#083A8E]/80 hover:bg-[#D3F1FF]/80 dark:bg-[#083A8E] dark:text-[#FFFFFF] dark:border dark:border-[#D3F1FF]/70 dark:hover:border-[#D3F1FF]/70 dark:hover:bg-[#083A8E]/90 shadow-[0_2px_0_rgba(0,0,0,0.08)]'
                          }
                          ${isActive ? '!opacity-100 shadow-lg animate-float !bg-[#083A8E] !border !border-[#083A8E] ring-2 ring-[#083A8E]/15 dark:!bg-[#D3F1FF] dark:!border !border-[#D3F1FF] dark:ring-[#D3F1FF]/20 dark:!text-[#083A8E]' : ''}
                          ${isShaking ? 'shake-feedback' : ''}
                        `}>
                        <span className={`text-base font-bold block mb-0.5 ${isActive ? 'text-[#FFFFFF] dark:text-[#083A8E]' : (isBusy ? 'dark:text-[#FFFFFF]/60 text-[#3A3A3A]/50' : (isFree ? 'text-[#083A8E] dark:text-[#FFFFFF]' : ''))}`}>
                          {slot.label}
                        </span>
                        <span className={`text-[10px] whitespace-nowrap block ${isBusy ? 'dark:text-[#FFFFFF]/40 text-[#3A3A3A]/40' : (isFree ? 'text-[#083A8E]/60 dark:text-[#FFFFFF]/70' : '')} ${isActive ? '!text-[#FFFFFF]/70 dark:!text-[#083A8E]/75' : ''}`}>
                          {slot.displayTime || `${slot.start}～${slot.end}`}
                        </span>
                        <span className={`text-[10px] block mt-0.5 ${isBusy ? 'dark:text-[#FFFFFF]/40 text-[#3A3A3A]/40' : (isFree ? 'text-[#083A8E]/70 dark:text-[#FFFFFF]/80' : '')} ${isActive ? '!text-[#FFFFFF]/85 dark:!text-[#083A8E]/85' : ''}`}>
                          {isBusy ? '不可预约' : '可预约'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="h-10"></div>
            <div className="text-center text-xs dark:text-[#FFFFFF]/50 text-[#3A3A3A]/50 py-10 flex items-center justify-center">
              感谢支持 mickywa！
            </div>
          </div>
        )}
      </div>

      {showBackToday && !selectedSlot && (
        <button 
          onClick={scrollToToday}
          className="fixed right-5 bottom-10 px-4 py-2 text-xs bg-[#083A8E] text-[#FFFFFF] dark:bg-[#083A8E] dark:text-[#FFFFFF] rounded-full shadow-lg z-40"
        >
          返回今天
        </button>
      )}

      {/* Bottom Booking Bar */}
      <div className={`bottom-bar fixed inset-x-0 bottom-0 p-4 pb-8 dark:bg-[#333333] bg-[#FFFFFF] border-t dark:border-[#3A3A3A]/10 border-[#3A3A3A]/10 z-50 flex items-center justify-between safe-area-bottom max-w-[440px] mx-auto min-w-[375px] transition-all duration-300 transform ${selectedSlot ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        {displaySlot && (
          <>
            <div className="flex flex-col">
              <span className="text-sm dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70">
                {displaySlot.day.label} 周{displaySlot.day.weekday}
              </span>
              <span className="text-lg font-bold dark:text-[#FFFFFF] text-[#3A3A3A]">
                {displaySlot.slot.label} {displaySlot.slot.displayTime || `${displaySlot.slot.start}～${displaySlot.slot.end}`}
              </span>
            </div>
            <button
              onClick={handleBookClick}
              className="px-8 py-3 bg-[#083A8E] text-[#FFFFFF] dark:bg-[#083A8E] dark:text-[#FFFFFF] font-bold rounded-full shadow-lg transform transition-transform active:scale-95"
            >
              预约
            </button>
          </>
        )}
      </div>

      {/* Modal Mask */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 z-[90]"
          onClick={hideModal}
        ></div>
      )}

      {/* Modal Content */}
      <div 
        className={`modal-container fixed inset-x-0 bottom-0 dark:bg-[#333333] bg-[#FFFFFF] border-t dark:border-[#3A3A3A]/10 border-[#3A3A3A]/10 rounded-t-2xl z-[100] transform transition-transform duration-300 flex flex-col max-h-[90vh] dark:text-[#FFFFFF] text-[#3A3A3A] max-w-[440px] mx-auto min-w-[375px] ${showModal ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="p-4 flex items-center justify-between border-b dark:border-[#3A3A3A]/10 border-[#3A3A3A]/10">
          <div className="text-base font-medium flex flex-col">
             <span>{selectedSlot?.day.label} 周{selectedSlot?.day.weekday} <span className="text-[#3A3A3A]/60 dark:text-[#FFFFFF]/60 text-sm ml-1">{getRelativeDateStr()}</span></span>
             <span className="text-xs dark:text-[#FFFFFF]/50 text-[#3A3A3A]/50">
               {selectedSlot?.slot.label} {selectedSlot?.slot.displayTime || `${selectedSlot?.slot.start}～${selectedSlot?.slot.end}`}
               {selectedSlot?.slot.isTight && (
                 <span className="ml-2 text-[#3A3A3A] dark:text-[#FFFFFF] font-bold">时间紧张，只能做简单点的哦</span>
               )}
             </span>
             <span className="text-xs text-[#975322] dark:text-[#975322] font-medium mt-0.5">
               {getEstimateStr()}
             </span>
          </div>
          <button onClick={hideModal} className="dark:text-[#FFFFFF]/50 text-[#3A3A3A]/50 text-xl px-2">×</button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
            {/* Length */}
            <div className="mb-6">
              <label className="block text-sm mb-2 dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70">长度</label>
              <div className="grid grid-cols-3 gap-3">
                {LENGTH_OPTIONS.map(opt => (
                  <div 
                    key={opt}
                    onClick={() => updateForm('length', opt)}
                    className={`text-center py-2 rounded-lg border text-xs cursor-pointer transition-colors ${form.length === opt ? 'bg-[#975322] border-[#975322] text-[#FFFFFF] dark:bg-[#975322] dark:border-[#975322] dark:text-[#FFFFFF]' : 'dark:border-[#FFFFFF]/20 border-[#3A3A3A]/10 dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70 dark:bg-[#CFEDD9]/5 bg-[#CFEDD9]/5'}`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>

            {/* Style (Multiselect) */}
            <div className="mb-6">
              <label className="block text-sm mb-2 dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70">款式（可多选）</label>
              <div className="grid grid-cols-4 gap-2">
                {STYLE_OPTIONS.map(opt => {
                  const isSelected = Array.isArray(form.style) && form.style.includes(opt);
                  return (
                    <div 
                      key={opt}
                      onClick={() => updateForm('style', opt)}
                      className={`text-center py-2 rounded-lg border text-xs cursor-pointer transition-colors ${isSelected ? 'bg-[#975322] border-[#975322] text-[#FFFFFF] dark:bg-[#975322] dark:border-[#975322] dark:text-[#FFFFFF]' : 'dark:border-[#FFFFFF]/20 border-[#3A3A3A]/10 dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70 dark:bg-[#CFEDD9]/5 bg-[#CFEDD9]/5'}`}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remove */}
            <div className="mb-6">
              <label className="block text-sm mb-2 dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70">卸甲</label>
              <div className="flex gap-3">
                {REMOVE_OPTIONS.map(opt => (
                  <div 
                    key={opt}
                    onClick={() => updateForm('remove', opt)}
                    className={`flex-1 text-center py-2 rounded-lg border text-xs cursor-pointer transition-colors ${form.remove === opt ? 'bg-[#975322] border-[#975322] text-[#FFFFFF] dark:bg-[#975322] dark:border-[#975322] dark:text-[#FFFFFF]' : 'dark:border-[#FFFFFF]/20 border-[#3A3A3A]/10 dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70 dark:bg-[#CFEDD9]/5 bg-[#CFEDD9]/5'}`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Text */}
            <div className="mb-6">
              <label className="block text-sm mb-2 dark:text-[#FFFFFF]/70 text-[#3A3A3A]/70">预约文案</label>
              <textarea 
                value={bookingText}
                onChange={(e) => setBookingText(e.target.value)}
                className="w-full h-32 px-4 py-3 rounded-lg border dark:border-[#FFFFFF]/15 border-[#3A3A3A]/10 dark:bg-[#CFEDD9]/5 bg-[#CFEDD9]/5 dark:text-[#FFFFFF] text-[#3A3A3A] text-sm focus:outline-none focus:border-[#975322] dark:focus:border-[#975322]"
              />
            </div>
        </div>

        <div className="p-4 pb-8 border-t dark:border-[#3A3A3A]/10 border-[#3A3A3A]/10 safe-area-bottom">
          <button 
            onClick={copyToClipboard}
            className="w-full h-10 rounded-full text-sm font-bold bg-[#083A8E] text-[#FFFFFF] dark:bg-[#083A8E] dark:text-[#FFFFFF] shadow-lg active:scale-95 transition-transform"
          >
            复制
          </button>
        </div>
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
