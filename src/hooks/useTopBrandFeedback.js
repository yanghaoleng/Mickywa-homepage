import { useCallback, useEffect, useRef, useState } from 'react';

const MARK_COLORS = ['#D3F1FF', '#CFEDD9', '#FFDDDD', '#FCF7BD'];

export default function useTopBrandFeedback() {
  const [markBgColor, setMarkBgColor] = useState('');
  const [contentKey, setContentKey] = useState(0);
  const animationInterval = useRef(null);
  const activeColorInterval = useRef(null);
  const activeColorTimeout = useRef(null);
  const springTimeouts = useRef([]);

  const clearColorAnimation = useCallback(() => {
    if (activeColorInterval.current) {
      window.clearInterval(activeColorInterval.current);
      activeColorInterval.current = null;
    }
    if (activeColorTimeout.current) {
      window.clearTimeout(activeColorTimeout.current);
      activeColorTimeout.current = null;
    }
  }, []);

  const playMarkAnimation = useCallback(() => {
    clearColorAnimation();
    let index = 0;
    activeColorInterval.current = window.setInterval(() => {
      setMarkBgColor(MARK_COLORS[index]);
      index = (index + 1) % MARK_COLORS.length;
    }, 100);

    activeColorTimeout.current = window.setTimeout(() => {
      clearColorAnimation();
      const randomColor = MARK_COLORS[Math.floor(Math.random() * MARK_COLORS.length)];
      setMarkBgColor(randomColor);
    }, 600 + MARK_COLORS.length * 100);
  }, [clearColorAnimation]);

  const playSpringClick = useCallback((element) => {
    if (!element) return;
    element.classList.add('spring-click');
    const timeout = window.setTimeout(() => {
      element.classList.remove('spring-click');
      springTimeouts.current = springTimeouts.current.filter(item => item !== timeout);
    }, 400);
    springTimeouts.current.push(timeout);
  }, []);

  const handleMarkClick = useCallback((e) => {
    const svgElement = e.currentTarget.querySelector('svg');
    playSpringClick(svgElement);
    playMarkAnimation();
  }, [playMarkAnimation, playSpringClick]);

  const handleTitleClick = useCallback((e) => {
    const imgElement = e.currentTarget.querySelector('img');
    playSpringClick(imgElement);
    setContentKey(key => key + 1);
  }, [playSpringClick]);

  useEffect(() => {
    const randomColor = MARK_COLORS[Math.floor(Math.random() * MARK_COLORS.length)];
    setMarkBgColor(randomColor);

    animationInterval.current = window.setInterval(() => {
      playMarkAnimation();
    }, 5000);

    return () => {
      if (animationInterval.current) {
        window.clearInterval(animationInterval.current);
        animationInterval.current = null;
      }
      clearColorAnimation();
      springTimeouts.current.forEach(timeout => window.clearTimeout(timeout));
      springTimeouts.current = [];
    };
  }, [clearColorAnimation, playMarkAnimation]);

  return {
    contentKey,
    handleMarkClick,
    handleTitleClick,
    markBgColor
  };
}
