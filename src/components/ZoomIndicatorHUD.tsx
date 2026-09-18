import React from 'react';
import { ZoomIn, RotateCcw, X } from 'lucide-react';

interface ZoomIndicatorHUDProps {
  zoomPercent: number;
  showHud: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onClose?: () => void;
}

export const ZoomIndicatorHUD: React.FC<ZoomIndicatorHUDProps> = ({
  zoomPercent,
  showHud,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onClose,
}) => {
  if (!showHud) return null;

  return (
    <div
      id="zoom-indicator-hud"
      className="fixed bottom-14 right-6 z-60 bg-[#171A21]/95 text-[#E0E0E0] px-4 py-3 rounded-2xl border border-blue-500/60 shadow-2xl backdrop-blur-md flex items-center gap-3.5 select-none transition-all duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
        <ZoomIn className="w-5 h-5" />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-300 font-medium">Масштаб интерфейса:</span>
          <span className="text-sm font-bold font-mono text-blue-400">
            {zoomPercent}%
          </span>
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          Ctrl + колёсико мыши (шаг 5%) • Ctrl + 0 для сброса
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-3 border-l border-[#2D3139]">
        <button
          type="button"
          onClick={onZoomOut}
          title="Уменьшить на 5% (Ctrl + -)"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0F1115] hover:bg-blue-600 text-gray-300 hover:text-white border border-[#2D3139] text-sm font-bold transition-colors cursor-pointer"
        >
          −
        </button>

        <button
          type="button"
          onClick={onResetZoom}
          title="Сбросить масштаб к 100% (Ctrl + 0)"
          className="px-2 h-7 flex items-center justify-center gap-1 rounded-lg bg-[#0F1115] hover:bg-blue-600 text-gray-300 hover:text-white border border-[#2D3139] text-[11px] font-medium transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>100%</span>
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          title="Увеличить на 5% (Ctrl + +)"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0F1115] hover:bg-blue-600 text-gray-300 hover:text-white border border-[#2D3139] text-sm font-bold transition-colors cursor-pointer"
        >
          +
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Закрыть уведомление"
            className="w-7 h-7 ml-1 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

