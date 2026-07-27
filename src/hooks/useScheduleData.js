import { useCallback, useEffect, useRef, useState } from 'react';
import { getCalendarsWithCache, readFreshScheduleCache } from '../utils/ical';

const DISPLAY_DAYS = 22;
const SLOW_FETCH_MS = 5000;
const FAIL_SAFE_MS = 12000;
const LIVE_REFRESH_DELAY_MS = 2500;
const LIVE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function getDisplayScheduleDays(data) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endExclusive = new Date(startOfToday);
  endExclusive.setDate(endExclusive.getDate() + DISPLAY_DAYS);

  return (data?.schedule || [])
    .filter(day => day?.date instanceof Date || typeof day.date === 'string')
    .map(day => ({
      ...day,
      date: typeof day.date === 'string' ? new Date(day.date) : day.date
    }))
    .filter(day => day.date instanceof Date && !Number.isNaN(day.date.valueOf()))
    .filter(day => day.date >= startOfToday && day.date < endExclusive)
    .sort((a, b) => a.date - b.date);
}

export default function useScheduleData({ setToast } = {}) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [calendarSource, setCalendarSource] = useState('cloud');
  const [calendarReason, setCalendarReason] = useState('');
  const [cloudFetchDeltaMs, setCloudFetchDeltaMs] = useState(null);
  const [slowFetch, setSlowFetch] = useState(false);
  const [loadingWatchdogError, setLoadingWatchdogError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [recNonce, setRecNonce] = useState(0);

  const baseContentReadyAtRef = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const cloudFetchDeltaMsRef = useRef(null);
  const fetchSeqRef = useRef(0);
  const fetchTimeoutRef = useRef(null);
  const fetchFailSafeRef = useRef(null);
  const loadingWatchdogRef = useRef(null);
  const scheduleReadyRef = useRef(false);

  useEffect(() => {
    cloudFetchDeltaMsRef.current = cloudFetchDeltaMs;
  }, [cloudFetchDeltaMs]);

  useEffect(() => {
    scheduleReadyRef.current = schedule.length > 0;
  }, [schedule]);

  const clearFetchTimers = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
    if (fetchFailSafeRef.current) {
      clearTimeout(fetchFailSafeRef.current);
      fetchFailSafeRef.current = null;
    }
    if (loadingWatchdogRef.current) {
      clearTimeout(loadingWatchdogRef.current);
      loadingWatchdogRef.current = null;
    }
  }, []);

  const applyScheduleData = useCallback((data) => {
    setSchedule(getDisplayScheduleDays(data));
    setRecNonce(n => n + 1);
    setIsMock(!!data?.isMock);
    setCalendarSource(data?.calendarSource || (data?.isMock ? 'mock' : 'cloud'));
    setCalendarReason(data?.calendarReason || '');

    if (!data || data.isMock) return;
    if ((data.calendarSource || 'cloud') !== 'cloud') return;

    const actualElapsed = Number(data.calendarFetchElapsedMs);
    if (Number.isFinite(actualElapsed) && actualElapsed >= 0) {
      setCloudFetchDeltaMs(actualElapsed);
      return;
    }
    if (cloudFetchDeltaMsRef.current !== null) return;
    if (typeof baseContentReadyAtRef.current !== 'number') return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    setCloudFetchDeltaMs(now - baseContentReadyAtRef.current);
  }, []);

  const fetchData = useCallback(async ({ isAuto = false, silent = false, backgroundOnly = false, forceRefresh = false } = {}) => {
    const seq = ++fetchSeqRef.current;
    let hasCache = false;

    if (!isAuto && !silent && !backgroundOnly) {
      setSlowFetch(false);
      setLoadingWatchdogError('');
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        if (fetchSeqRef.current !== seq) return;
        setSlowFetch(true);
        if (!hasCache) {
          setLoadingWatchdogError('日历同步比预期慢，仍在等待准确数据。');
        }
        setCountdown(c => (c > 0 ? c : 3));
      }, SLOW_FETCH_MS);
    }

    if (!backgroundOnly) {
      try {
        const cached = readFreshScheduleCache();
        if (cached?.data) {
          applyScheduleData(cached.data);
          hasCache = true;
          if (!isAuto && !silent) {
            setLoading(false);
            setError(false);
            setLoadingWatchdogError('');
            setSlowFetch(false);
          }
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = null;
          }
          if (fetchFailSafeRef.current) {
            clearTimeout(fetchFailSafeRef.current);
            fetchFailSafeRef.current = null;
          }
        }
      } catch (_) {
        // Cache read failure should not block the live refresh path.
      }
    }

    if (!isAuto && !silent && !hasCache && !backgroundOnly) {
      setLoading(true);
      setError(false);
      setLoadingWatchdogError('');
      if (fetchFailSafeRef.current) clearTimeout(fetchFailSafeRef.current);
      fetchFailSafeRef.current = setTimeout(() => {
        if (fetchSeqRef.current !== seq) return;
        setLoading(false);
        setError(true);
        setSlowFetch(true);
        setCalendarReason('日历请求超时，已停止等待本次同步返回');
        setCountdown(c => (c > 0 ? c : 3));
      }, FAIL_SAFE_MS);
    }

    try {
      const liveRefresh = isAuto && !forceRefresh;
      const data = await getCalendarsWithCache({ forceMock: false, forceRefresh, liveRefresh });
      if (fetchSeqRef.current !== seq) return;

      applyScheduleData(data);
      if (!isAuto && !silent && !hasCache) setLoading(false);
      if (!silent) setError(false);
      if (fetchSeqRef.current === seq) {
        clearFetchTimers();
        setSlowFetch(false);
      }
    } catch (e) {
      console.error(e);
      const reason = String(e?.calendarReason || e?.message || e || '');
      if (reason) setCalendarReason(reason);
      if (!isAuto && !silent && !hasCache) {
        setLoading(false);
        setError(true);
      } else if (isAuto || silent) {
        setToast?.({ message: '刷新失败，请稍后重试', type: 'error' });
      }
      if (fetchSeqRef.current === seq) {
        clearFetchTimers();
      }
    }
  }, [applyScheduleData, clearFetchTimers, setToast]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      baseContentReadyAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    fetchData();
    const liveRefreshTimer = setTimeout(() => {
      if (scheduleReadyRef.current) {
        fetchData({ isAuto: true, silent: true });
      }
    }, LIVE_REFRESH_DELAY_MS);
    const timer = setInterval(() => {
      if (scheduleReadyRef.current) {
        fetchData({ isAuto: true, silent: true });
      }
    }, LIVE_REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(liveRefreshTimer);
      clearInterval(timer);
    };
  }, [fetchData]);

  useEffect(() => {
    if (loading) {
      if (loadingWatchdogRef.current) clearTimeout(loadingWatchdogRef.current);
      loadingWatchdogRef.current = setTimeout(() => {
        setSlowFetch(true);
        setLoadingWatchdogError('日历同步比预期慢，静态内容已先显示。');
      }, SLOW_FETCH_MS);
      return () => {
        if (loadingWatchdogRef.current) {
          clearTimeout(loadingWatchdogRef.current);
          loadingWatchdogRef.current = null;
        }
      };
    }
    setLoadingWatchdogError('');
    if (loadingWatchdogRef.current) {
      clearTimeout(loadingWatchdogRef.current);
      loadingWatchdogRef.current = null;
    }
  }, [loading]);

  useEffect(() => {
    return () => {
      clearFetchTimers();
    };
  }, [clearFetchTimers]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchData({ forceRefresh: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, fetchData]);

  return {
    calendarReason,
    calendarSource,
    cloudFetchDeltaMs,
    countdown,
    error,
    fetchData,
    isMock,
    loading,
    loadingWatchdogError,
    recNonce,
    schedule,
    slowFetch
  };
}
