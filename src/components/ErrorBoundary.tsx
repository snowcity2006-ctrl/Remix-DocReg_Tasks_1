import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
    try {
      if (window.electronAPI && typeof window.electronAPI.addLog === 'function') {
        window.electronAPI.addLog('error', 'main', `Ошибка рендеринга интерфейса: ${error.message}`, {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }
    } catch {}
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-screen" className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 select-none">
          <div className="max-w-lg w-full bg-slate-800/95 border border-slate-700/80 rounded-xl p-8 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <AlertTriangle className="w-8 h-8 flex-shrink-0" />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Произошла ошибка интерфейса</h1>
                <p className="text-xs text-slate-400">Система учета документооборота</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Компонент приложения столкнулся с непредвиденным исключением. Вы можете обновить страницу или сбросить временные параметры кэша.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 mb-6 text-xs font-mono text-rose-300 overflow-x-auto max-h-40">
                <p className="font-semibold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap">{this.state.error.stack.split('\n').slice(0, 5).join('\n')}</pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="btn-error-reload"
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow"
              >
                <RefreshCw className="w-4 h-4" />
                Перезагрузить окно
              </button>
              <button
                id="btn-error-reset"
                type="button"
                onClick={this.handleResetAndReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-750 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-600"
              >
                <RotateCcw className="w-4 h-4" />
                Сбросить кэш и перезапуск
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
