import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  FolderOpen,
  Globe,
  Eye,
  Edit2,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Maximize2,
  Minimize2,
  RotateCcw,
  GripHorizontal,
  MoveDiagonal,
} from 'lucide-react';
import { DocumentRecord } from '../../types';
import { formatDateRussian } from '../../utils/date';
import { electronBridge } from '../../services/electronBridge';
import { hasRelatedDocuments, getRelatedDocumentsCount } from '../../utils/relatedDocs';

interface DocumentTableProps {
  documents: DocumentRecord[];
  allDocuments?: DocumentRecord[];
  onView?: (doc: DocumentRecord) => void;
  onEdit?: (doc: DocumentRecord) => void;
  onDelete?: (id: number) => Promise<void>;
  isRelatedSelectionMode?: boolean;
  selectedDocIds?: number[];
  onToggleDocSelect?: (docId: number) => void;
  currentDocumentId?: number;
  activeRelatedFilterDocId?: number | null;
  onToggleRelatedFilter?: (docId: number) => void;
}

type SortField =
  | 'id'
  | 'docTypeName'
  | 'directionName'
  | 'outgoingNumber'
  | 'outgoingDate'
  | 'incomingNumber'
  | 'incomingDate'
  | 'subject'
  | 'senderName'
  | 'recipientName';

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  allDocuments,
  onView,
  onEdit,
  onDelete,
  isRelatedSelectionMode = false,
  selectedDocIds = [],
  onToggleDocSelect,
  currentDocumentId,
  activeRelatedFilterDocId = null,
  onToggleRelatedFilter,
}) => {
  // Сортировка
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortAsc, setSortAsc] = useState(false); // Новые сначала по умолчанию

  // Пагинация
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Диалог подтверждения удаления
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    docId: number | null;
    docSubject: string;
  }>({
    isOpen: false,
    docId: null,
    docSubject: '',
  });
  const [deleting, setDeleting] = useState(false);

  // Управление шириной колонок (Column Resizing) по ТЗ
  const defaultColWidths: Record<string, number> = {
    id: 64,
    docType: 140,
    direction: 130,
    outNum: 110,
    outDate: 100,
    inNum: 110,
    inDate: 100,
    subject: 280,
    sender: 170,
    recipient: 170,
    filePath: 140,
    sedUrl: 80,
    actions: isRelatedSelectionMode ? 165 : 135,
  };

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const storageKey = isRelatedSelectionMode ? 'sed_table_widths_related' : 'sed_table_widths';
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...defaultColWidths, ...JSON.parse(saved) } : defaultColWidths;
    } catch {
      return defaultColWidths;
    }
  });

  const latestColWidthsRef = useRef<Record<string, number>>(colWidths);
  latestColWidthsRef.current = colWidths;

  const totalTableWidth = useMemo(() => {
    return Object.values(colWidths).reduce((a, b) => a + b, 0);
  }, [colWidths]);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const initialScrollLeftRef = useRef<number>(0);

  const resizingCol = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
    direction: 'left' | 'right';
  } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { colKey, startX, startWidth, direction } = resizingCol.current;
    const delta = direction === 'left' ? startX - e.clientX : e.clientX - startX;
    const minW = colKey === 'actions' ? 36 : 40;
    const newWidth = Math.max(minW, startWidth + delta);
    setColWidths((prev) => {
      const updated = { ...prev, [colKey]: newWidth };
      latestColWidthsRef.current = updated;
      return updated;
    });

    if (direction === 'left' && tableContainerRef.current) {
      const actualDelta = newWidth - startWidth;
      tableContainerRef.current.scrollLeft = initialScrollLeftRef.current + actualDelta;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingCol.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    try {
      const storageKey = isRelatedSelectionMode ? 'sed_table_widths_related' : 'sed_table_widths';
      localStorage.setItem(storageKey, JSON.stringify(latestColWidthsRef.current));
    } catch {}
  }, [handleMouseMove, isRelatedSelectionMode]);

  const startResizing = (colKey: string, e: React.MouseEvent, direction: 'left' | 'right' = 'right') => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = {
      colKey,
      startX: e.clientX,
      startWidth: colWidths[colKey] || 120,
      direction,
    };
    if (direction === 'left' && tableContainerRef.current) {
      initialScrollLeftRef.current = tableContainerRef.current.scrollLeft;
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Масштабирование границ окна таблицы мышкой (Window Border Resizing)
  const DEFAULT_TABLE_HEIGHT = 540;
  const [tableHeight, setTableHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('docflow_table_height');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 240 && val <= 2500) return val;
      }
    } catch {}
    return DEFAULT_TABLE_HEIGHT;
  });

  const [tableWidth, setTableWidth] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('docflow_table_width');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 380 && val <= 4000) return val;
      }
    } catch {}
    return null;
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizingTable, setIsResizingTable] = useState<'bottom' | 'right' | 'left' | 'corner-se' | 'corner-sw' | null>(null);
  const [liveDimensions, setLiveDimensions] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const resizingTable = useRef<{
    edge: 'bottom' | 'right' | 'left' | 'corner-se' | 'corner-sw';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startColWidths: Record<string, number>;
  } | null>(null);

  const startResizingTable = (edge: 'bottom' | 'right' | 'left' | 'corner-se' | 'corner-sw', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMaximized || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    resizingTable.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startColWidths: { ...colWidths },
    };
    setIsResizingTable(edge);
    setLiveDimensions({ width: Math.round(rect.width), height: Math.round(rect.height) });

    let latestDimensions = { width: Math.round(rect.width), height: Math.round(rect.height) };
    let latestScaledWidths: Record<string, number> | null = null;

    const handleTableMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingTable.current) return;
      const { edge: currentEdge, startX, startY, startWidth, startHeight, startColWidths } = resizingTable.current;

      let newHeight = startHeight;
      let newWidth = startWidth;

      // Масштабирование по высоте (вверх — в меньшую сторону, вниз — в большую сторону)
      if (currentEdge === 'bottom' || currentEdge === 'corner-se' || currentEdge === 'corner-sw') {
        const deltaY = moveEvent.clientY - startY;
        newHeight = Math.max(180, Math.min(window.innerHeight - 40, startHeight + deltaY));
        setTableHeight(newHeight);
      }

      // Масштабирование по ширине с правой стороны или правого угла (влево — меньше, вправо — больше)
      if (currentEdge === 'right' || currentEdge === 'corner-se') {
        const deltaX = moveEvent.clientX - startX;
        const minW = 380;
        const maxW = Math.max(window.innerWidth - 32, 3800);
        newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
        setTableWidth(newWidth);

        // Пропорциональное масштабирование ширины столбцов по ТЗ
        const totalStartColW = Object.values(startColWidths).reduce((a, b) => a + b, 0) || startWidth;
        const ratio = newWidth / totalStartColW;
        const scaledColWidths: Record<string, number> = {};

        for (const [key, initialW] of Object.entries(startColWidths)) {
          scaledColWidths[key] = Math.max(24, Math.round(initialW * ratio));
        }

        latestScaledWidths = scaledColWidths;
        setColWidths(scaledColWidths);
      }

      // Масштабирование по ширине с левой стороны или левого угла
      if (currentEdge === 'left' || currentEdge === 'corner-sw') {
        const deltaX = startX - moveEvent.clientX;
        const minW = 380;
        const maxW = Math.max(window.innerWidth - 32, 3800);
        newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
        setTableWidth(newWidth);

        // Пропорциональное масштабирование ширины столбцов по ТЗ
        const totalStartColW = Object.values(startColWidths).reduce((a, b) => a + b, 0) || startWidth;
        const ratio = newWidth / totalStartColW;
        const scaledColWidths: Record<string, number> = {};

        for (const [key, initialW] of Object.entries(startColWidths)) {
          scaledColWidths[key] = Math.max(24, Math.round(initialW * ratio));
        }

        latestScaledWidths = scaledColWidths;
        setColWidths(scaledColWidths);
      }

      latestDimensions = { width: Math.round(newWidth), height: Math.round(newHeight) };
      setLiveDimensions(latestDimensions);
    };

    const handleTableMouseUp = () => {
      resizingTable.current = null;
      setIsResizingTable(null);
      setLiveDimensions(null);
      document.removeEventListener('mousemove', handleTableMouseMove);
      document.removeEventListener('mouseup', handleTableMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      try {
        localStorage.setItem('docflow_table_height', String(latestDimensions.height));
        localStorage.setItem('docflow_table_width', String(latestDimensions.width));
        if (latestScaledWidths) {
          localStorage.setItem('sed_table_widths', JSON.stringify(latestScaledWidths));
        }
      } catch {}
    };

    document.body.style.userSelect = 'none';
    if (edge === 'bottom') document.body.style.cursor = 'row-resize';
    else if (edge === 'right' || edge === 'left') document.body.style.cursor = 'col-resize';
    else if (edge === 'corner-se') document.body.style.cursor = 'se-resize';
    else if (edge === 'corner-sw') document.body.style.cursor = 'sw-resize';

    document.addEventListener('mousemove', handleTableMouseMove);
    document.addEventListener('mouseup', handleTableMouseUp);
  };

  const resetTableDimensions = () => {
    setTableHeight(DEFAULT_TABLE_HEIGHT);
    setTableWidth(null);
    setColWidths(defaultColWidths);
    setIsMaximized(false);
    try {
      localStorage.removeItem('docflow_table_height');
      localStorage.removeItem('docflow_table_width');
      localStorage.removeItem('sed_table_widths');
    } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  // Сортировка данных с мемоизацией (не пересчитывается при ресайзе и внешних событиях)
  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const aVal = (a as any)[sortField] ?? '';
      const bVal = (b as any)[sortField] ?? '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }

      const cmp = String(aVal).localeCompare(String(bVal), 'ru', { numeric: true, sensitivity: 'base' });
      return sortAsc ? cmp : -cmp;
    });
  }, [documents, sortField, sortAsc]);

  // Пагинация
  const totalPages = useMemo(() => Math.ceil(sortedDocuments.length / pageSize) || 1, [sortedDocuments.length, pageSize]);
  const paginatedDocuments = useMemo(() => {
    return sortedDocuments.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedDocuments, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-500 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-blue-400 shrink-0 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400 shrink-0 ml-1" />
    );
  };

  const handleOpenFile = async (path?: string) => {
    if (path) {
      await electronBridge.openPath(path);
    }
  };

  const handleOpenSed = async (url?: string) => {
    if (url) {
      await electronBridge.openExternal(url);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.docId !== null) {
      setDeleting(true);
      try {
        await onDelete(deleteDialog.docId);
        setDeleteDialog({ isOpen: false, docId: null, docSubject: '' });
      } catch (e: any) {
        alert(`Ошибка удаления: ${e.message}`);
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <>
      {isMaximized && (
        <div
          className="fixed inset-0 z-45 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsMaximized(false)}
        />
      )}

      <div
        ref={containerRef}
        style={
          isMaximized
            ? undefined
            : {
                height: `${tableHeight}px`,
                width: tableWidth ? `${tableWidth}px` : '100%',
                maxWidth: '100%',
              }
        }
        className={`${
          isMaximized
            ? 'fixed inset-2 sm:inset-4 z-50 rounded-2xl shadow-2xl border border-blue-500/50'
            : 'relative rounded-2xl shadow-xl border border-[#2D3139]'
        } bg-[#171A21] flex flex-col overflow-hidden text-[#E0E0E0] ${
          isResizingTable ? 'transition-none select-none' : 'transition-all'
        }`}
      >
        {/* Шапка окна таблицы документов: заголовок, статистика и управление масштабированием */}
        <div
          id="document-table-header"
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает окно таблицы на весь экран или восстанавливает исходный размер"
          className="px-4 py-2.5 bg-blue-600 border-b border-blue-500/50 text-white flex flex-wrap items-center justify-between gap-2 shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-700/80 border border-blue-400/40 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h3
                id="document-table-title"
                className="text-xs font-bold text-white tracking-wide uppercase truncate"
              >
                Перечень зарегистрированных документов
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-700/80 text-white border border-blue-400/40 shrink-0">
                {documents.length}
              </span>
            </div>
          </div>

          {/* Элементы управления масштабированием и размером окна таблицы */}
          <div className="flex items-center gap-1.5 text-xs text-blue-100 shrink-0">
            {/* Кнопка: на 100% ширины окна */}
            {tableWidth && (
              <button
                type="button"
                onClick={() => {
                  setTableWidth(null);
                  try {
                    localStorage.removeItem('docflow_table_width');
                  } catch {}
                }}
                title="Растянуть таблицу на 100% ширины окна"
                className="px-2 py-1 bg-blue-700/80 hover:bg-blue-800 text-white rounded-lg transition-colors cursor-pointer text-[11px] font-medium border border-blue-400/30"
              >
                100% ширины
              </button>
            )}

            {/* Сброс размера */}
            <button
              type="button"
              onClick={resetTableDimensions}
              title="Сбросить размеры окна таблицы и ширину столбцов к стандартным"
              className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Развернуть / Восстановить */}
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть окно таблицы на весь экран'}
              className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded-lg transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Левая граница: масштабирование ширины окна таблицы мышкой */}
        {!isMaximized && (
          <div
            onMouseDown={(e) => startResizingTable('left', e)}
            className="absolute top-0 left-0 bottom-0 w-3.5 cursor-col-resize hover:bg-blue-500/25 active:bg-blue-500/40 transition-colors z-30 group flex items-center justify-center"
            title="Потяните левую границу для изменения ширины окна таблицы в большую или меньшую сторону (столбцы масштабируются пропорционально)"
          >
            <div className="w-1 h-14 rounded-full bg-[#2D3139] group-hover:bg-blue-400 group-active:bg-blue-300 transition-colors" />
          </div>
        )}

        {/* Правая граница: масштабирование ширины окна таблицы мышкой со столбцами */}
        {!isMaximized && (
          <div
            onMouseDown={(e) => startResizingTable('right', e)}
            className="absolute top-0 right-0 bottom-0 w-3.5 cursor-col-resize hover:bg-blue-500/25 active:bg-blue-500/40 transition-colors z-30 group flex items-center justify-center"
            title="Потяните правую границу для изменения ширины окна таблицы в большую или меньшую сторону (столбцы масштабируются пропорционально)"
          >
            <div className="w-1 h-14 rounded-full bg-[#2D3139] group-hover:bg-blue-400 group-active:bg-blue-300 transition-colors" />
          </div>
        )}

        {/* Контейнер таблицы с горизонтальным и вертикальным скроллом */}
        <div ref={tableContainerRef} className="overflow-auto flex-1 min-h-[160px]">
          <table
            className="w-full text-left border-collapse text-xs select-none table-fixed"
            style={{
              minWidth: `${totalTableWidth}px`,
            }}
          >
            <colgroup>
              <col style={{ width: `${colWidths.id}px` }} />
              <col style={{ width: `${colWidths.docType}px` }} />
              <col style={{ width: `${colWidths.direction}px` }} />
              <col style={{ width: `${colWidths.outNum}px` }} />
              <col style={{ width: `${colWidths.outDate}px` }} />
              <col style={{ width: `${colWidths.inNum}px` }} />
              <col style={{ width: `${colWidths.inDate}px` }} />
              <col style={{ width: `${colWidths.subject}px` }} />
              <col style={{ width: `${colWidths.sender}px` }} />
              <col style={{ width: `${colWidths.recipient}px` }} />
              <col style={{ width: `${colWidths.filePath}px` }} />
              <col style={{ width: `${colWidths.sedUrl}px` }} />
              <col style={{ width: `${colWidths.actions}px` }} />
            </colgroup>
            <thead className="sticky top-0 z-20 bg-[#1F222B] shadow-xs">
              <tr className="border-b border-[#2D3139] bg-[#1F222B] text-slate-800 dark:text-gray-400 font-bold dark:font-semibold uppercase tracking-wider">
              
              {/* ID */}
              <th
                style={{ width: `${colWidths.id}px`, minWidth: `${colWidths.id}px`, maxWidth: `${colWidths.id}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('id')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block" title="ID">ID</span>
                  {renderSortIcon('id')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('id', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Тип документа */}
              <th
                style={{ width: `${colWidths.docType}px`, minWidth: `${colWidths.docType}px`, maxWidth: `${colWidths.docType}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('docTypeName')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block" title="Тип документа">Тип</span>
                  {renderSortIcon('docTypeName')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('docType', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Направление */}
              <th
                style={{ width: `${colWidths.direction}px`, minWidth: `${colWidths.direction}px`, maxWidth: `${colWidths.direction}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('directionName')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block" title="Направление">Направление</span>
                  {renderSortIcon('directionName')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('direction', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Исх.№ */}
              <th
                style={{ width: `${colWidths.outNum}px`, minWidth: `${colWidths.outNum}px`, maxWidth: `${colWidths.outNum}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('outgoingNumber')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block" title="Исходящий номер">Исх.№</span>
                  {renderSortIcon('outgoingNumber')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('outNum', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Исх.дата */}
              <th
                style={{ width: `${colWidths.outDate}px`, minWidth: `${colWidths.outDate}px`, maxWidth: `${colWidths.outDate}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('outgoingDate')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block" title="Исходящая дата">Исх.дата</span>
                  {renderSortIcon('outgoingDate')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('outDate', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Вх.№ */}
              <th
                style={{ width: `${colWidths.inNum}px`, minWidth: `${colWidths.inNum}px`, maxWidth: `${colWidths.inNum}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('incomingNumber')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block" title="Входящий номер">Вх.№</span>
                  {renderSortIcon('incomingNumber')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('inNum', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Вх.дата */}
              <th
                style={{ width: `${colWidths.inDate}px`, minWidth: `${colWidths.inDate}px`, maxWidth: `${colWidths.inDate}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('incomingDate')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block" title="Входящая дата">Вх.дата</span>
                  {renderSortIcon('incomingDate')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('inDate', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Тема */}
              <th
                style={{ width: `${colWidths.subject}px`, minWidth: `${colWidths.subject}px`, maxWidth: `${colWidths.subject}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('subject')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block">Тема *</span>
                  {renderSortIcon('subject')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('subject', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Отправитель */}
              <th
                style={{ width: `${colWidths.sender}px`, minWidth: `${colWidths.sender}px`, maxWidth: `${colWidths.sender}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('senderName')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block">Отправитель</span>
                  {renderSortIcon('senderName')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('sender', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Получатель */}
              <th
                style={{ width: `${colWidths.recipient}px`, minWidth: `${colWidths.recipient}px`, maxWidth: `${colWidths.recipient}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div
                  onClick={() => handleSort('recipientName')}
                  className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                >
                  <span className="truncate block" title="Получатель">Получатель</span>
                  {renderSortIcon('recipientName')}
                </div>
                <div
                  onMouseDown={(e) => startResizing('recipient', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Путь к документу */}
              <th
                style={{ width: `${colWidths.filePath}px`, minWidth: `${colWidths.filePath}px`, maxWidth: `${colWidths.filePath}px` }}
                className="py-3 px-3 relative group overflow-hidden border-r border-[#2D3139]"
              >
                <div className="flex items-center justify-between min-w-0 pr-1.5">
                  <span className="truncate block">Файл / Папка</span>
                </div>
                <div
                  onMouseDown={(e) => startResizing('filePath', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Путь к документу в СЭД */}
              <th
                style={{ width: `${colWidths.sedUrl}px`, minWidth: `${colWidths.sedUrl}px`, maxWidth: `${colWidths.sedUrl}px` }}
                className="py-3 px-3 relative group overflow-hidden text-center border-r border-[#2D3139]"
              >
                <div className="flex items-center justify-center min-w-0 pr-1.5">
                  <span className="truncate block" title="СЭД">СЭД</span>
                </div>
                <div
                  onMouseDown={(e) => startResizing('sedUrl', e)}
                  title="Изменить ширину столбца"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10"
                />
              </th>

              {/* Действия / Связанные документы */}
              <th
                style={{ width: `${colWidths.actions}px`, minWidth: `${colWidths.actions}px`, maxWidth: `${colWidths.actions}px` }}
                className={`py-3 px-2 ${isRelatedSelectionMode ? 'text-center' : 'text-right'} bg-[#1F222B] relative group select-none`}
              >
                {/* Разделитель и интерактивная зона изменения ширины колонки с левой стороны */}
                <div
                  onMouseDown={(e) => startResizing('actions', e, 'left')}
                  title="Потяните для изменения ширины колонки «Действия»"
                  className="absolute left-0 top-0 bottom-0 w-3 -translate-x-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20 flex items-center justify-center group/handle"
                >
                  <div className="w-[2px] h-4 rounded-full bg-blue-500/0 group-hover/handle:bg-white transition-colors" />
                </div>

                <div className={`flex items-center ${isRelatedSelectionMode ? 'justify-center' : 'justify-end'} min-w-0 pr-1 pl-1`}>
                  <span
                    className="truncate block"
                    title={isRelatedSelectionMode ? 'Связанные документы' : 'Действия'}
                  >
                    {isRelatedSelectionMode ? 'Связанные документы' : 'Действия'}
                  </span>
                </div>

                {/* Интерактивная зона изменения ширины колонки с правой стороны */}
                <div
                  onMouseDown={(e) => startResizing('actions', e, 'right')}
                  title="Потяните для изменения ширины колонки «Действия»"
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                />
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-[#2D3139] text-slate-900 dark:text-[#E0E0E0] font-medium">
            {paginatedDocuments.map((doc) => {
              const isSelectedInModal = isRelatedSelectionMode && selectedDocIds.includes(doc.id);
              const isCurrentInModal = isRelatedSelectionMode && currentDocumentId === doc.id;
              const isFilterSource = !isRelatedSelectionMode && activeRelatedFilterDocId === doc.id;

              return (
              <tr
                key={doc.id}
                onClick={(e) => {
                  if (isRelatedSelectionMode && !isCurrentInModal) {
                    // Если клик не был по ссылке или кнопке
                    const target = e.target as HTMLElement;
                    if (!target.closest('button') && !target.closest('a') && target.tagName !== 'INPUT') {
                      onToggleDocSelect?.(doc.id);
                    }
                  }
                }}
                className={`transition-colors group select-none ${
                  isSelectedInModal
                    ? 'bg-blue-600/15 dark:bg-blue-900/30 hover:bg-blue-600/25 dark:hover:bg-blue-900/40'
                    : isFilterSource
                    ? 'bg-blue-500/10 dark:bg-blue-950/40 border-l-2 border-l-blue-500 hover:bg-blue-500/20'
                    : isCurrentInModal
                    ? 'opacity-60 bg-gray-500/10'
                    : 'hover:bg-slate-100/80 dark:hover:bg-[#1F222B]/70'
                } ${isRelatedSelectionMode && !isCurrentInModal ? 'cursor-pointer' : ''}`}
              >
                {/* ID */}
                <td
                  style={{ width: `${colWidths.id}px`, minWidth: `${colWidths.id}px`, maxWidth: `${colWidths.id}px` }}
                  className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-gray-500 overflow-hidden border-r border-[#2D3139]"
                  title={String(doc.id)}
                >
                  <span className="truncate block">{doc.id}</span>
                </td>

                {/* Тип документа */}
                <td
                  style={{ width: `${colWidths.docType}px`, minWidth: `${colWidths.docType}px`, maxWidth: `${colWidths.docType}px` }}
                  className="py-2.5 px-3 overflow-hidden border-r border-[#2D3139]"
                  title={doc.docTypeName || '—'}
                >
                  <span className="truncate block leading-tight text-slate-800 dark:text-gray-300 font-medium">
                    {doc.docTypeName || '—'}
                  </span>
                </td>

                {/* Направление */}
                <td
                  style={{ width: `${colWidths.direction}px`, minWidth: `${colWidths.direction}px`, maxWidth: `${colWidths.direction}px` }}
                  className="py-2.5 px-3 overflow-hidden border-r border-[#2D3139]"
                  title={doc.directionName || '—'}
                >
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 truncate max-w-full inline-block align-middle"
                  >
                    {doc.directionName || '—'}
                  </span>
                </td>

                {/* Исх.№ */}
                <td
                  style={{ width: `${colWidths.outNum}px`, minWidth: `${colWidths.outNum}px`, maxWidth: `${colWidths.outNum}px` }}
                  className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-gray-300 overflow-hidden border-r border-[#2D3139]"
                  title={doc.outgoingNumber || '—'}
                >
                  <span className="truncate block">
                    {doc.outgoingNumber || '—'}
                  </span>
                </td>

                {/* Исх.дата */}
                <td
                  style={{ width: `${colWidths.outDate}px`, minWidth: `${colWidths.outDate}px`, maxWidth: `${colWidths.outDate}px` }}
                  className="py-2.5 px-3 font-mono text-slate-800 dark:text-gray-300 overflow-hidden border-r border-[#2D3139]"
                  title={formatDateRussian(doc.outgoingDate)}
                >
                  <span className="truncate block">
                    {formatDateRussian(doc.outgoingDate)}
                  </span>
                </td>

                {/* Вх.№ */}
                <td
                  style={{ width: `${colWidths.inNum}px`, minWidth: `${colWidths.inNum}px`, maxWidth: `${colWidths.inNum}px` }}
                  className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-gray-300 overflow-hidden border-r border-[#2D3139]"
                  title={doc.incomingNumber || '—'}
                >
                  <span className="truncate block">
                    {doc.incomingNumber || '—'}
                  </span>
                </td>

                {/* Вх.дата */}
                <td
                  style={{ width: `${colWidths.inDate}px`, minWidth: `${colWidths.inDate}px`, maxWidth: `${colWidths.inDate}px` }}
                  className="py-2.5 px-3 font-mono text-slate-800 dark:text-gray-300 overflow-hidden border-r border-[#2D3139]"
                  title={formatDateRussian(doc.incomingDate)}
                >
                  <span className="truncate block">
                    {formatDateRussian(doc.incomingDate)}
                  </span>
                </td>

                {/* Тема (с переносом по словам по ТЗ) */}
                <td
                  style={{ width: `${colWidths.subject}px`, minWidth: `${colWidths.subject}px`, maxWidth: `${colWidths.subject}px` }}
                  className="py-2.5 px-3 overflow-hidden border-r border-[#2D3139]"
                >
                  <span
                    onClick={() => onView(doc)}
                    title={doc.subject}
                    className="font-bold text-slate-900 dark:text-[#E0E0E0] hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer break-words whitespace-normal leading-relaxed transition-colors block"
                  >
                    {doc.subject}
                  </span>
                </td>

                {/* Отправитель */}
                <td
                  style={{ width: `${colWidths.sender}px`, minWidth: `${colWidths.sender}px`, maxWidth: `${colWidths.sender}px` }}
                  className="py-2.5 px-3 overflow-hidden break-words whitespace-normal text-slate-800 dark:text-gray-300 font-medium border-r border-[#2D3139]"
                >
                  <div>
                    <span className="break-words">{doc.senderName || '—'}</span>
                    {(doc.senderDepartmentName || doc.signatoryEmployeeName || doc.senderEmployeeName) && (
                      <div className="mt-1 flex flex-col gap-0.5 text-[10px]">
                        {doc.senderDepartmentName && (
                          <span className="inline-flex items-center text-blue-700 dark:text-blue-400 font-semibold break-words">
                            СП: {doc.senderDepartmentName}
                          </span>
                        )}
                        {doc.signatoryEmployeeName && (
                          <span className="inline-flex items-center text-emerald-700 dark:text-emerald-400/90 font-semibold break-words">
                            Подписал: {doc.signatoryEmployeeName}
                          </span>
                        )}
                        {doc.senderEmployeeName && (
                          <span className="inline-flex items-center text-slate-600 dark:text-gray-400 break-words">
                            Исп: {doc.senderEmployeeName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* Получатель */}
                <td
                  style={{ width: `${colWidths.recipient}px`, minWidth: `${colWidths.recipient}px`, maxWidth: `${colWidths.recipient}px` }}
                  className="py-2.5 px-3 overflow-hidden break-words whitespace-normal text-slate-800 dark:text-gray-300 font-medium border-r border-[#2D3139]"
                >
                  <div>
                    <span className="break-words">{doc.recipientName || '—'}</span>
                    {doc.recipientDepartmentNames && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 break-words">
                          СП: {doc.recipientDepartmentNames}
                        </span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Путь к документу (гиперссылка) */}
                <td
                  style={{ width: `${colWidths.filePath}px`, minWidth: `${colWidths.filePath}px`, maxWidth: `${colWidths.filePath}px` }}
                  className="py-2.5 px-3 overflow-hidden border-r border-[#2D3139]"
                >
                  {doc.filePath ? (
                    (() => {
                      const isFolder = doc.filePath.endsWith('/') || doc.filePath.endsWith('\\') || !/\.[a-zA-Z0-9]{1,8}$/.test(doc.filePath.trim());
                      const cleanPath = doc.filePath.replace(/[/\\]+$/, '');
                      const displayName = cleanPath.split(/[/\\]/).pop() || doc.filePath;

                      return (
                        <button
                          type="button"
                          onClick={() => handleOpenFile(doc.filePath)}
                          className={`inline-flex items-center gap-1.5 ${isFolder ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300' : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'} hover:underline max-w-full font-mono text-[11px] cursor-pointer break-all whitespace-normal text-left`}
                        >
                          {isFolder ? (
                            <FolderOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                          <span className="break-all font-semibold">{displayName}</span>
                        </button>
                      );
                    })()
                  ) : (
                    <span className="text-slate-400 dark:text-gray-500 text-[11px]">—</span>
                  )}
                </td>

                {/* Путь к документу в СЭД (гиперссылка) */}
                <td
                  style={{ width: `${colWidths.sedUrl}px`, minWidth: `${colWidths.sedUrl}px`, maxWidth: `${colWidths.sedUrl}px` }}
                  className="py-2.5 px-3 text-center overflow-hidden border-r border-[#2D3139]"
                >
                  {doc.sedUrl ? (
                    <button
                      type="button"
                      onClick={() => handleOpenSed(doc.sedUrl)}
                      title={`Открыть в СЭД: ${doc.sedUrl}`}
                      className="inline-flex items-center justify-center p-1 rounded-md text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                    >
                      <Globe className="w-4 h-4 shrink-0" />
                    </button>
                  ) : (
                    <span className="text-slate-400 dark:text-gray-500 text-[11px]">—</span>
                  )}
                </td>

                {/* Действия / Связанные документы */}
                <td
                  style={{ width: `${colWidths.actions}px`, minWidth: `${colWidths.actions}px`, maxWidth: `${colWidths.actions}px` }}
                  className={`py-2 px-1.5 ${isRelatedSelectionMode ? 'text-center' : 'text-right'} bg-white dark:bg-[#171A21] group-hover:bg-slate-100 dark:group-hover:bg-[#1F222B] transition-colors overflow-hidden`}
                >
                  {isRelatedSelectionMode ? (
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        disabled={currentDocumentId === doc.id}
                        onChange={() => onToggleDocSelect?.(doc.id)}
                        className="w-4 h-4 rounded border-gray-400 dark:border-[#3D424D] text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          currentDocumentId === doc.id
                            ? 'Текущий регистрируемый документ'
                            : selectedDocIds.includes(doc.id)
                            ? 'Снять связь с документом'
                            : 'Связать с регистрируемым документом'
                        }
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-end gap-1 py-0.5 max-w-full">
                      {/* CheckBox для фильтрации связанных документов */}
                      {(() => {
                        const hasRel = hasRelatedDocuments(doc.id, allDocuments || documents);
                        const isFilterActive = activeRelatedFilterDocId === doc.id;

                        return (
                          <label
                            title="Связанные документы"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center justify-center p-1 rounded-md transition-colors shrink-0 ${
                              hasRel
                                ? isFilterActive
                                  ? 'bg-blue-600/25 text-blue-400 ring-1 ring-blue-500/40'
                                  : 'cursor-pointer hover:bg-slate-200 dark:hover:bg-[#2D3139]'
                                : 'opacity-25 cursor-not-allowed'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isFilterActive}
                              disabled={!hasRel}
                              onChange={(e) => {
                                e.stopPropagation();
                                onToggleRelatedFilter?.(doc.id);
                              }}
                              className={`w-3.5 h-3.5 rounded border-gray-400 dark:border-[#3D424D] text-blue-600 focus:ring-blue-500 accent-blue-600 ${
                                hasRel ? 'cursor-pointer' : 'cursor-not-allowed pointer-events-none'
                              }`}
                              title="Связанные документы"
                            />
                          </label>
                        );
                      })()}

                      {/* Просмотр карточки документа */}
                      {onView && (
                        <button
                          onClick={() => onView(doc)}
                          title="Просмотр карточки документа"
                          className="p-1.5 text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-[#2D3139] rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Редактирование */}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(doc)}
                          title="Редактировать запись"
                          className="p-1.5 text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-[#2D3139] rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Удаление */}
                      {onDelete && (
                        <button
                          onClick={() =>
                            setDeleteDialog({
                              isOpen: true,
                              docId: doc.id,
                              docSubject: doc.subject,
                            })
                          }
                          title="Удалить документ"
                          className="p-1.5 text-slate-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </td>

              </tr>
            );
          })}

            {paginatedDocuments.length === 0 && (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-gray-600" />
                    <p className="text-sm font-medium">Документы не найдены</p>
                    <p className="text-xs text-gray-500">Попробуйте изменить параметры поиска или фильтрации</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация и выбор количества записей */}
      <div className="px-4 py-3 border-t border-[#2D3139] bg-[#171A21] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span>Строк на странице:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <span className="ml-2 font-mono">
            Всего записей: <strong className="text-[#E0E0E0]">{documents.length}</strong>
          </span>
        </div>

        {/* Навигация по страницам */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1 rounded-lg border border-[#2D3139] bg-[#0F1115] text-gray-300 disabled:opacity-40 hover:bg-[#1F222B] cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-lg border border-[#2D3139] bg-[#0F1115] text-gray-300 disabled:opacity-40 hover:bg-[#1F222B] cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-medium">
            Стр. <strong className="text-[#E0E0E0] font-mono">{currentPage}</strong> из <span className="font-mono text-gray-400">{totalPages}</span>
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-lg border border-[#2D3139] bg-[#0F1115] text-gray-300 disabled:opacity-40 hover:bg-[#1F222B] cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 rounded-lg border border-[#2D3139] bg-[#0F1115] text-gray-300 disabled:opacity-40 hover:bg-[#1F222B] cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Нижняя граница: удобная планка масштабирования высоты окна таблицы мышкой (вверх — меньше, вниз — больше) */}
      {!isMaximized && (
        <div
          onMouseDown={(e) => startResizingTable('bottom', e)}
          onDoubleClick={() => setIsMaximized(true)}
          title="Потяните вверх или вниз для изменения высоты окна таблицы мышкой (двойной клик — во весь экран)"
          className="h-5.5 w-full bg-[#12151B] hover:bg-blue-950/70 active:bg-blue-900/80 border-t border-[#2D3139] flex items-center justify-center cursor-row-resize transition-all select-none group shrink-0 relative"
        >
          {/* Левый угловой маркер масштабирования */}
          <div
            onMouseDown={(e) => startResizingTable('corner-sw', e)}
            title="Потяните угол для одновременного масштабирования ширины и высоты окна (все столбцы масштабируются пропорционально)"
            className="absolute left-0 bottom-0 top-0 w-8 flex items-center justify-center cursor-sw-resize text-gray-400 hover:text-white bg-[#1F222B]/60 hover:bg-blue-600 rounded-tr transition-colors group/corner"
          >
            <MoveDiagonal className="w-3.5 h-3.5 -scale-x-100 group-hover/corner:scale-115 transition-transform" />
          </div>

          <div className="w-32 h-1.5 rounded-full bg-[#2D3139] group-hover:bg-blue-500 transition-colors flex items-center justify-center">
            <GripHorizontal className="w-4 h-4 text-gray-500 group-hover:text-blue-300 transition-colors" />
          </div>

          {/* Правый угловой маркер масштабирования: одновременно ширина и высота с масштабированием колонок */}
          <div
            onMouseDown={(e) => startResizingTable('corner-se', e)}
            title="Потяните угол для одновременного масштабирования ширины и высоты окна (все столбцы масштабируются пропорционально)"
            className="absolute right-0 bottom-0 top-0 w-8 flex items-center justify-center cursor-se-resize text-gray-400 hover:text-white bg-[#1F222B]/60 hover:bg-blue-600 rounded-tl transition-colors group/corner"
          >
            <MoveDiagonal className="w-3.5 h-3.5 group-hover/corner:scale-115 transition-transform" />
          </div>
        </div>
      )}

      {/* Всплывающий индикатор размеров во время масштабирования мышкой */}
      {isResizingTable && liveDimensions && (
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white font-mono text-xs px-3.5 py-1.5 rounded-full shadow-2xl border border-blue-400 flex items-center gap-2 pointer-events-none animate-in fade-in zoom-in-95">
          <span className="font-semibold">
            {liveDimensions.width} × {liveDimensions.height} px
          </span>
          <span className="text-blue-100 text-[11px]">
            {isResizingTable === 'bottom'
              ? '• Высота окна'
              : '• Столбцы масштабируются пропорционально'}
          </span>
        </div>
      )}

      {/* Модалка подтверждения удаления документа */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#171A21] rounded-2xl shadow-2xl border border-[#2D3139] w-full max-w-md overflow-hidden p-6 space-y-4 text-[#E0E0E0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-900">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#E0E0E0]">
                  Удаление документа №{deleteDialog.docId}
                </h4>
                <p className="text-xs text-gray-400">
                  Подтверждение операции
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Вы уверены, что хотите безвозвратно удалить документ: <br />
              <strong className="text-[#E0E0E0]">«{deleteDialog.docSubject}»</strong>?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialog({ isOpen: false, docId: null, docSubject: '' })}
                className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-[#1F222B] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
};
