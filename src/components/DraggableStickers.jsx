import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const STICKERS = [
  '/assets/道具/Rectangle-1.webp',
  '/assets/道具/Rectangle.webp',
  '/assets/道具/五彩窗花.webp',
  '/assets/道具/健身.webp',
  '/assets/道具/大红花.webp',
  '/assets/道具/教堂.webp',
  '/assets/道具/番茄炒蛋.webp',
  '/assets/道具/白色芍药.webp',
  '/assets/道具/马鞭.webp',
  '/assets/道具/黄色法拉利.webp',
  '/assets/道具/宝矿力.webp'
];

// 预加载所有贴纸
if (typeof window !== 'undefined') {
  STICKERS.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

export const stickerStore = {
  detached: [],
  isDragging: false,
  trashHovered: false,
  forceShowTrash: false,
  listeners: new Set(),
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  notify() {
    this.listeners.forEach(l => l());
  },
  add(sticker) {
    this.detached = [...this.detached, sticker];
    this.notify();
  },
  remove(id) {
    this.detached = this.detached.filter(s => s.id !== id);
    this.notify();
  },
  update(id, updates) {
    this.detached = this.detached.map(s => s.id === id ? { ...s, ...updates } : s);
    this.notify();
  },
  setDragging(val) {
    this.isDragging = val;
    this.notify();
  },
  setTrashHovered(val) {
    this.trashHovered = val;
    this.notify();
  },
  triggerTrashDelay() {
    this.forceShowTrash = true;
    this.notify();
    setTimeout(() => {
      this.forceShowTrash = false;
      this.notify();
    }, 1000);
  },
  getAllSrcs() {
    return this.detached.map(s => s.src);
  }
};

export function getRandomSticker(exclude = []) {
  const allExclude = [...exclude, ...stickerStore.getAllSrcs()];
  const available = STICKERS.filter(s => !allExclude.includes(s));
  if (available.length === 0) return STICKERS[Math.floor(Math.random() * STICKERS.length)];
  return available[Math.floor(Math.random() * available.length)];
}

export function DetachedStickersOverlay({ scrollContainerRef, isVisible = true }) {
  const [state, setState] = useState({
    stickers: stickerStore.detached,
    isDragging: stickerStore.isDragging,
    trashHovered: stickerStore.trashHovered,
    forceShowTrash: stickerStore.forceShowTrash
  });

  useEffect(() => {
    return stickerStore.subscribe(() => {
      setState({
        stickers: stickerStore.detached,
        isDragging: stickerStore.isDragging,
        trashHovered: stickerStore.trashHovered,
        forceShowTrash: stickerStore.forceShowTrash
      });
    });
  }, []);

  if (!isVisible) return null;

  const showTrash = state.isDragging || state.forceShowTrash;

  return (
    <>
      {state.stickers.map(sticker => (
        <DetachedSticker 
          key={sticker.id} 
          sticker={sticker} 
          scrollContainerRef={scrollContainerRef}
        />
      ))}
      
      {createPortal(
        <TrashBin isVisible={showTrash} isHovered={state.trashHovered} />,
        document.body
      )}
    </>
  );
}

function TrashBin({ isVisible, isHovered }) {
  return (
    <div 
      id="trash-bin-icon"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ease-out z-[999999] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      } ${
        isHovered ? 'bg-red-500 scale-110 shadow-lg' : 'bg-red-400/80 scale-100 shadow-md'
      }`}
    >
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </div>
  );
}

function DetachedSticker({ sticker, scrollContainerRef }) {
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef(null);
  const positionRef = useRef({ x: sticker.x, y: sticker.y });
  
  useEffect(() => {
    positionRef.current = { x: sticker.x, y: sticker.y };
    if (imgRef.current && !isDragging) {
      imgRef.current.style.left = `${sticker.x}px`;
      imgRef.current.style.top = `${sticker.y}px`;
    }
  }, [sticker.x, sticker.y, isDragging]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    stickerStore.setDragging(true);
    
    const startPos = { x: e.clientX, y: e.clientY };
    const initialX = positionRef.current.x;
    const initialY = positionRef.current.y;
    
    let currentAbsoluteX = initialX;
    let currentAbsoluteY = initialY;
    let lastHoverState = false;

    const checkTrashHover = (clientX, clientY) => {
      const trashBin = document.getElementById('trash-bin-icon');
      let isHovered = false;
      if (trashBin) {
        const binRect = trashBin.getBoundingClientRect();
        const padding = 20;
        isHovered = (
          clientX >= binRect.left - padding &&
          clientX <= binRect.right + padding &&
          clientY >= binRect.top - padding &&
          clientY <= binRect.bottom + padding
        );
      } else {
        isHovered = clientY > window.innerHeight - 100;
      }
      if (isHovered !== lastHoverState) {
        lastHoverState = isHovered;
        stickerStore.setTrashHovered(isHovered);
      }
      return isHovered;
    };

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startPos.x;
      const deltaY = moveEvent.clientY - startPos.y;
      
      currentAbsoluteX = initialX + deltaX;
      currentAbsoluteY = initialY + deltaY;
      
      if (imgRef.current) {
        imgRef.current.style.left = `${currentAbsoluteX}px`;
        imgRef.current.style.top = `${currentAbsoluteY}px`;
      }
      
      checkTrashHover(moveEvent.clientX, moveEvent.clientY);
    };

    const handlePointerUp = (upEvent) => {
      setIsDragging(false);
      stickerStore.setDragging(false);
      stickerStore.setTrashHovered(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      const isHovered = checkTrashHover(upEvent.clientX, upEvent.clientY);
      
      if (isHovered) {
        stickerStore.triggerTrashDelay();
        stickerStore.update(sticker.id, { isDeleting: true });
        setTimeout(() => {
          stickerStore.remove(sticker.id);
        }, 300);
      } else {
        positionRef.current = { x: currentAbsoluteX, y: currentAbsoluteY };
        stickerStore.update(sticker.id, { x: currentAbsoluteX, y: currentAbsoluteY });
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <img
      ref={imgRef}
      src={sticker.src}
      alt="sticker"
      onPointerDown={handlePointerDown}
      style={{
        zIndex: isDragging ? 9999999 : 100,
        position: 'absolute',
        left: `${positionRef.current.x}px`,
        top: `${positionRef.current.y}px`,
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        filter: 'drop-shadow(2px 0px 0px white) drop-shadow(-2px 0px 0px white) drop-shadow(0px 2px 0px white) drop-shadow(0px -2px 0px white) drop-shadow(0px 2px 3px rgba(0,0,0,0.15))'
      }}
      className={`w-10 h-10 object-contain cursor-grab active:cursor-grabbing transition duration-300 ${
        sticker.isDeleting ? 'scale-0 opacity-0' : (isDragging ? 'scale-150' : 'scale-100 hover:scale-110')
      }`}
      draggable={false}
    />
  );
}

export default function DraggableStickers({ isExpanded, scrollContainerRef }) {
  const [slots, setSlots] = useState([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isExpanded && !hasInitialized.current) {
      hasInitialized.current = true;
      const initial = [];
      for (let i = 0; i < 3; i++) {
        initial.push({ id: Math.random().toString(), src: getRandomSticker(initial.map(s => s.src)) });
      }
      setSlots(initial);
    }
  }, [isExpanded]);

  if (!isExpanded) return null;

  return (
    <div className="flex items-center gap-2 ml-auto justify-end flex-1">
      {slots.map((slot, index) => (
        <StickerSlot 
          key={slot.id} 
          slotSticker={slot} 
          index={index}
          scrollContainerRef={scrollContainerRef}
          onReplace={() => {
            setSlots(prev => {
              const newSlots = [...prev];
              newSlots[index] = { ...newSlots[index], src: getRandomSticker(newSlots.map(s => s.src)) };
              return newSlots;
            });
          }}
        />
      ))}
    </div>
  );
}

function StickerSlot({ slotSticker, index, scrollContainerRef, onReplace }) {
  const [isDragging, setIsDragging] = useState(false);
  const elRef = useRef(null);
  
  const previewRef = useRef(null);
  const [previewMounted, setPreviewMounted] = useState(false);
  const previewStartPos = useRef({ x: 0, y: 0 });
  const dragSrcRef = useRef('');

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!elRef.current) return;
    
    setIsDragging(true);
    stickerStore.setDragging(true);
    
    const rect = elRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    previewStartPos.current = { x: rect.left, y: rect.top };
    dragSrcRef.current = slotSticker.src;
    setPreviewMounted(true);
    
    let hasDetachedLocal = false;
    let currentX = rect.left;
    let currentY = rect.top;
    let lastHoverState = false;

    const checkTrashHover = (clientX, clientY) => {
      const trashBin = document.getElementById('trash-bin-icon');
      let isHovered = false;
      if (trashBin) {
        const binRect = trashBin.getBoundingClientRect();
        const padding = 20;
        isHovered = (
          clientX >= binRect.left - padding &&
          clientX <= binRect.right + padding &&
          clientY >= binRect.top - padding &&
          clientY <= binRect.bottom + padding
        );
      } else {
        isHovered = clientY > window.innerHeight - 100;
      }
      if (isHovered !== lastHoverState) {
        lastHoverState = isHovered;
        stickerStore.setTrashHovered(isHovered);
      }
      return isHovered;
    };

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      currentX = moveEvent.clientX - startX;
      currentY = moveEvent.clientY - startY;
      
      if (previewRef.current) {
        previewRef.current.style.left = `${currentX}px`;
        previewRef.current.style.top = `${currentY}px`;
      }
      
      checkTrashHover(moveEvent.clientX, moveEvent.clientY);

      if (!hasDetachedLocal) {
        const dist = Math.hypot(currentX - rect.left, currentY - rect.top);
        if (dist > 20) {
          hasDetachedLocal = true;
          onReplace();
        }
      }
    };

    const handlePointerUp = (upEvent) => {
      setIsDragging(false);
      setPreviewMounted(false);
      stickerStore.setDragging(false);
      stickerStore.setTrashHovered(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (hasDetachedLocal) {
        let absoluteX = currentX;
        let absoluteY = currentY;
        
        if (scrollContainerRef && scrollContainerRef.current) {
          const containerRect = scrollContainerRef.current.getBoundingClientRect();
          absoluteX = currentX - containerRect.left + scrollContainerRef.current.scrollLeft;
          absoluteY = currentY - containerRect.top + scrollContainerRef.current.scrollTop;
        }

        const isHovered = checkTrashHover(upEvent.clientX, upEvent.clientY);

        if (isHovered) {
          stickerStore.triggerTrashDelay();
          const tempId = Math.random().toString();
          stickerStore.add({
            id: tempId,
            src: dragSrcRef.current,
            x: absoluteX,
            y: absoluteY,
            isDeleting: false
          });
          setTimeout(() => {
            stickerStore.update(tempId, { isDeleting: true });
          }, 10);
          
          setTimeout(() => {
            stickerStore.remove(tempId);
          }, 300);
        } else {
          stickerStore.add({
            id: Math.random().toString(),
            src: dragSrcRef.current,
            x: absoluteX,
            y: absoluteY
          });
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
  };

  const previewContent = previewMounted ? (
    <img
      ref={previewRef}
      src={dragSrcRef.current}
      alt="sticker"
      style={{
        zIndex: 9999999,
        position: 'fixed',
        left: `${previewStartPos.current.x}px`,
        top: `${previewStartPos.current.y}px`,
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        filter: 'drop-shadow(2px 0px 0px white) drop-shadow(-2px 0px 0px white) drop-shadow(0px 2px 0px white) drop-shadow(0px -2px 0px white) drop-shadow(0px 2px 3px rgba(0,0,0,0.15))'
      }}
      className={`w-10 h-10 object-contain cursor-grabbing transition duration-300 scale-150`}
      draggable={false}
    />
  ) : null;

  return (
    <div 
      className={`relative w-10 h-10 flex-shrink-0 animate-bubble-in`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <img
        key={slotSticker.src}
        ref={elRef}
        src={slotSticker.src}
        alt="sticker"
        onPointerDown={handlePointerDown}
        style={{
          zIndex: 10,
          position: 'absolute',
          left: '0',
          top: '0',
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          opacity: isDragging ? 0 : 1,
          filter: 'drop-shadow(2px 0px 0px white) drop-shadow(-2px 0px 0px white) drop-shadow(0px 2px 0px white) drop-shadow(0px -2px 0px white) drop-shadow(0px 2px 3px rgba(0,0,0,0.15))'
        }}
        className="w-10 h-10 object-contain cursor-grab transition duration-300 scale-100 hover:scale-110 animate-bubble-in"
        draggable={false}
      />
      {previewMounted && createPortal(previewContent, document.body)}
    </div>
  );
}
