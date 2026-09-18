import { useState, useEffect, useCallback, useRef } from 'react';
import { electronBridge } from '../services/electronBridge';

const ZOOM_STORAGE_KEY = 'docflow_ui_zoom';
export const ZOOM_STEP = 0.05; // Шаг изменения 5%
export const MIN_ZOOM = 0.50; // Минимальный масштаб 50%
export const MAX_ZOOM = 2.00; // Максимальный масштаб 200%

// Точное округление до кратного 0.05 без артефактов вещественных чисел
export const roundToStep = (val: number): number => {
  return Math.round(val * 20) / 20;
};

export function useZoom() {
  const [zoom, setZoomState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= MIN_ZOOM && val <= MAX_ZOOM) {
          return roundToStep(val);
        }
      }
    } catch {}
    return 1.0;
  });

  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;

  const [showHud, setShowHud] = useState(false);
  const hudTimerRef = useRef<number | null>(null);
  const lastWheelTimeRef = useRef<number>(0);

  // Показ HUD с гарантированным автоматическим скрытием через 1.6 сек
  const triggerHud = useCallback(() => {
    setShowHud(true);
    if (hudTimerRef.current) {
      window.clearTimeout(hudTimerRef.current);
    }
    hudTimerRef.current = window.setTimeout(() => {
      setShowHud(false);
      hudTimerRef.current = null;
    }, 1600);
  }, []);

  const closeHud = useCallback(() => {
    if (hudTimerRef.current) {
      window.clearTimeout(hudTimerRef.current);
      hudTimerRef.current = null;
    }
    setShowHud(false);
  }, []);

  // Очистка таймера при полном размонтировании хука
  useEffect(() => {
    return () => {
      if (hudTimerRef.current) {
        window.clearTimeout(hudTimerRef.current);
      }
    };
  }, []);

  const applyZoom = useCallback((factor: number) => {
    const rounded = roundToStep(factor);
    try {
      // 1. Применяем через Electron webFrame, если запущен в нативном Electron
      if (electronBridge.setZoomFactor) {
        electronBridge.setZoomFactor(rounded);
      }
      // 2. И гарантированно через CSS zoom для браузерного рендеринга
      (document.documentElement.style as any).zoom = String(rounded);
      document.documentElement.style.setProperty('--app-scale', String(rounded));
      localStorage.setItem(ZOOM_STORAGE_KEY, String(rounded));
    } catch (e) {
      console.error('Failed to apply zoom:', e);
    }
  }, []);

  const setZoom = useCallback(
    (newZoom: number, showFeedback = true) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, roundToStep(newZoom)));
      zoomRef.current = clamped;
      setZoomState(clamped);
      applyZoom(clamped);
      if (showFeedback) {
        triggerHud();
      }
    },
    [applyZoom, triggerHud]
  );

  const zoomIn = useCallback(() => {
    setZoom(roundToStep(zoomRef.current + ZOOM_STEP));
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(roundToStep(zoomRef.current - ZOOM_STEP));
  }, [setZoom]);

  const resetZoom = useCallback(() => {
    setZoom(1.0);
  }, [setZoom]);

  // Применяем сохранённый зум при первой загрузке без всплывающего HUD
  useEffect(() => {
    applyZoom(zoom);
  }, [zoom, applyZoom]);

  // Глобальный слушатель: Ctrl + колёсико мыши (шаг 5%), Ctrl + '+', Ctrl + '-', Ctrl + '0'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd' || e.key === 'Add') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-' || e.code === 'NumpadSubtract' || e.key === 'Subtract') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0' || e.code === 'Numpad0') {
          e.preventDefault();
          resetZoom();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Блокируем встроенное браузерное поведение
        e.preventDefault();

        // Троттлинг 50 мс для защиты от чрезмерной прокрутки на тачпадах
        const now = Date.now();
        if (now - lastWheelTimeRef.current < 50) return;
        lastWheelTimeRef.current = now;

        if (e.deltaY < 0) {
          // Колёсико вверх — увеличиваем масштаб на +5%
          zoomIn();
        } else if (e.deltaY > 0) {
          // Колёсико вниз — уменьшаем масштаб на -5%
          zoomOut();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [zoomIn, zoomOut, resetZoom]);

  return {
    zoom,
    zoomPercent: Math.round(zoom * 100),
    showHud,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    closeHud,
    triggerHud,
  };
}

