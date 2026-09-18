import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  X,
  Check,
  Maximize2,
  Minimize2,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  DocumentRecord,
  DocumentType,
  Direction,
  Organization,
  DocumentFilterState,
} from '../../types';
import { DocumentFilters } from './DocumentFilters';
import { DocumentTable } from './DocumentTable';

interface RelatedDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocId?: number;
  initialSelectedDocIds: number[];
  onApply: (selectedDocIds: number[]) => void;
  documents: DocumentRecord[];
  documentTypes: DocumentType[];
  directions: Direction[];
  organizations: Organization[];
}

export const RelatedDocumentsModal: React.FC<RelatedDocumentsModalProps> = ({
  isOpen,
  onClose,
  currentDocId,
  initialSelectedDocIds,
  onApply,
  documents,
  documentTypes,
  directions,
  organizations,
}) => {
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);

  // Фильтры поиска аналогично главной странице закладки "Документооборот"
  const [filters, setFilters] = useState<DocumentFilterState>({
    searchQuery: '',
    docTypeId: null,
    directionId: null,
    senderId: null,
    recipientId: null,
    dateType: 'all',
    dateFrom: '',
    dateTo: '',
    hasAttachment: null,
    hasSedLink: null,
  });

  // При открытии окна инициализируем список выбранных связанных документов
  useEffect(() => {
    if (isOpen) {
      setSelectedDocIds(initialSelectedDocIds || []);
    }
  }, [isOpen, initialSelectedDocIds]);

  // Фильтрация документов по строке поиска и фильтрам
  const filteredDocuments = useMemo(() => {
    const rawQuery = filters.searchQuery ? filters.searchQuery.trim().toLowerCase() : '';

    return documents.filter((doc) => {
      if (rawQuery) {
        const matches =
          (doc.subject && doc.subject.toLowerCase().includes(rawQuery)) ||
          (doc.outgoingNumber && doc.outgoingNumber.toLowerCase().includes(rawQuery)) ||
          (doc.incomingNumber && doc.incomingNumber.toLowerCase().includes(rawQuery)) ||
          (doc.comments && doc.comments.toLowerCase().includes(rawQuery)) ||
          (doc.senderName && doc.senderName.toLowerCase().includes(rawQuery)) ||
          (doc.senderDepartmentName && doc.senderDepartmentName.toLowerCase().includes(rawQuery)) ||
          (doc.senderEmployeeName && doc.senderEmployeeName.toLowerCase().includes(rawQuery)) ||
          (doc.signatoryEmployeeName && doc.signatoryEmployeeName.toLowerCase().includes(rawQuery)) ||
          (doc.recipientName && doc.recipientName.toLowerCase().includes(rawQuery)) ||
          (doc.recipientDepartmentNames && doc.recipientDepartmentNames.toLowerCase().includes(rawQuery)) ||
          (doc.filePath && doc.filePath.toLowerCase().includes(rawQuery)) ||
          (doc.sedUrl && doc.sedUrl.toLowerCase().includes(rawQuery)) ||
          String(doc.id).includes(rawQuery);

        if (!matches) {
          return false;
        }
      }

      if (filters.docTypeId !== null && doc.docTypeId !== filters.docTypeId) {
        return false;
      }

      if (filters.directionId !== null && doc.directionId !== filters.directionId) {
        return false;
      }

      if (filters.senderId !== null && doc.senderId !== filters.senderId) {
        return false;
      }

      if (filters.recipientId !== null) {
        const isPrimary = doc.recipientId === filters.recipientId;
        const isInMulti = Array.isArray(doc.recipientIds) && doc.recipientIds.includes(filters.recipientId);
        if (!isPrimary && !isInMulti) {
          return false;
        }
      }

      if (filters.dateFrom || filters.dateTo) {
        const docDate =
          filters.dateType === 'incoming'
            ? doc.incomingDate
            : filters.dateType === 'outgoing'
            ? doc.outgoingDate
            : doc.incomingDate || doc.outgoingDate || '';

        if (filters.dateFrom && (!docDate || docDate < filters.dateFrom)) {
          return false;
        }

        if (filters.dateTo && (!docDate || docDate > filters.dateTo)) {
          return false;
        }
      }

      if (filters.hasAttachment !== null) {
        const has = Boolean(doc.filePath && doc.filePath.trim().length > 0);
        if (has !== filters.hasAttachment) {
          return false;
        }
      }

      if (filters.hasSedLink !== null) {
        const has = Boolean(doc.sedUrl && doc.sedUrl.trim().length > 0);
        if (has !== filters.hasSedLink) {
          return false;
        }
      }

      return true;
    });
  }, [documents, filters]);

  // Переключение выбора одного документа
  const handleToggleDocSelect = (docId: number) => {
    if (docId === currentDocId) return; // Нельзя привязать документ сам к себе
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Кнопка 2.3: "Выбрать все"
  const handleSelectAll = () => {
    const idsToAdd = filteredDocuments
      .map((d) => d.id)
      .filter((id) => id !== currentDocId);
    setSelectedDocIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  // Кнопка 2.4: "Снять все"
  const handleDeselectAll = () => {
    const visibleIds = new Set(filteredDocuments.map((d) => d.id));
    setSelectedDocIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  // Кнопка 2.5: "Применить"
  const handleApply = () => {
    onApply(selectedDocIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center ${
        isMaximized ? 'p-1' : 'p-2 sm:p-4'
      } bg-black/80 backdrop-blur-xs animate-in fade-in duration-150`}
    >
      <div
        className={`bg-[#171A21] shadow-2xl border border-[#2D3139] overflow-hidden flex flex-col text-[#E0E0E0] transition-all duration-200 ${
          isMaximized
            ? 'w-[99vw] h-[98vh] rounded-xl'
            : 'w-[95vw] max-w-7xl h-[92vh] rounded-2xl'
        }`}
      >
        {/* Заголовок формы */}
        <div
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="px-5 sm:px-6 py-3 sm:py-3.5 border-b border-[#2D3139] flex items-center justify-between bg-[#1F222B] shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#E0E0E0] truncate">
                  Связанные документы
                </h3>
                {selectedDocIds.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-full text-xs font-semibold">
                    Выбрано: {selectedDocIds.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">
                Отметьте галочками документы, с которыми должен быть взаимосвязан регистрируемый документ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть на весь экран'}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#2D3139] transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Закрыть окно"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#2D3139] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Тело формы: Поиск, фильтры и таблица */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* 2.1: Строка поиска и кнопка "Фильтры" */}
          <DocumentFilters
            filters={filters}
            onChange={setFilters}
            documentTypes={documentTypes}
            directions={directions}
            organizations={organizations}
            totalCount={documents.length}
            filteredCount={filteredDocuments.length}
          />

          {/* 2.2: Таблица документов со столбцом чекбоксов "Связанные документы" */}
          <div className="flex-1 min-h-[350px]">
            <DocumentTable
              documents={filteredDocuments}
              allDocuments={documents}
              isRelatedSelectionMode={true}
              selectedDocIds={selectedDocIds}
              onToggleDocSelect={handleToggleDocSelect}
              currentDocumentId={currentDocId}
            />
          </div>
        </div>

        {/* Подвал формы: кнопки управления */}
        <div className="px-5 py-3.5 border-t border-[#2D3139] bg-[#171A21] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Левый нижний угол: 2.3 "Выбрать все" и 2.4 "Снять все" */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3.5 py-2 bg-[#0F1115] hover:bg-[#1F222B] text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-[#2D3139] hover:border-blue-500/40 transition-colors cursor-pointer"
              title="Установить галочки во всех строках таблицы"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Выбрать все</span>
            </button>

            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3.5 py-2 bg-[#0F1115] hover:bg-[#1F222B] text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-[#2D3139] hover:border-rose-500/40 transition-colors cursor-pointer"
              title="Снять галочки со всех строк таблицы"
            >
              <Square className="w-3.5 h-3.5 text-gray-400" />
              <span>Снять все</span>
            </button>

            {selectedDocIds.length > 0 && (
              <span className="text-xs text-blue-400 font-medium ml-2">
                Связано: {selectedDocIds.length}
              </span>
            )}
          </div>

          {/* Правый нижний угол: 2.5 "Применить" и "Отмена" */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Применить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
