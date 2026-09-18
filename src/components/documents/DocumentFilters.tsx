import React from 'react';
import {
  Search,
  Filter,
  X,
  Calendar,
  Building2,
  Tag,
  Compass,
  FileCode,
  Globe,
  RotateCcw,
} from 'lucide-react';
import {
  DocumentFilterState,
  DocumentType,
  Direction,
  Organization,
} from '../../types';

interface DocumentFiltersProps {
  filters: DocumentFilterState;
  onChange: (filters: DocumentFilterState) => void;
  documentTypes: DocumentType[];
  directions: Direction[];
  organizations: Organization[];
  totalCount: number;
  filteredCount: number;
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = React.memo(({
  filters,
  onChange,
  documentTypes,
  directions,
  organizations,
  totalCount,
  filteredCount,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const handleReset = () => {
    onChange({
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
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.docTypeId !== null ||
    filters.directionId !== null ||
    filters.senderId !== null ||
    filters.recipientId !== null ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.hasAttachment !== null ||
    filters.hasSedLink !== null;

  return (
    <div className="bg-[#171A21] rounded-2xl p-4 sm:p-5 border border-[#2D3139] shadow-xl space-y-3 text-[#E0E0E0]">
      
      {/* Верхняя строка: быстрый поиск и счетчики */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Поиск по теме, номерам (Исх/Вх), комментариям, путям..."
            className="w-full pl-9 pr-8 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
              expanded || hasActiveFilters
                ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                : 'bg-[#0F1115] text-gray-300 border-[#2D3139] hover:bg-[#1F222B]'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Фильтры</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              title="Сбросить все фильтры"
              className="px-3 py-2 bg-[#0F1115] text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 border border-[#2D3139] hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Сброс</span>
            </button>
          )}

          <div className="px-3 py-2 bg-[#0F1115] rounded-xl border border-[#2D3139] text-xs font-medium text-gray-400">
            Найдено: <strong className="text-[#E0E0E0] font-mono">{filteredCount}</strong> из {totalCount}
          </div>
        </div>
      </div>

      {/* Развернутая панель расширенных фильтров */}
      {expanded && (
        <div className="pt-3 border-t border-[#2D3139] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Тип документа */}
          <div>
            <label className="block font-semibold text-gray-400 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Тип документа</span>
            </label>
            <select
              value={filters.docTypeId || ''}
              onChange={(e) =>
                onChange({ ...filters, docTypeId: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500"
            >
              <option value="">Все типы</option>
              {documentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Направление */}
          <div>
            <label className="block font-semibold text-gray-400 mb-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>Направление</span>
            </label>
            <select
              value={filters.directionId || ''}
              onChange={(e) =>
                onChange({ ...filters, directionId: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500"
            >
              <option value="">Все направления</option>
              {directions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Отправитель */}
          <div>
            <label className="block font-semibold text-gray-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Отправитель</span>
            </label>
            <select
              value={filters.senderId || ''}
              onChange={(e) =>
                onChange({ ...filters, senderId: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500"
            >
              <option value="">Все отправители</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Получатель */}
          <div>
            <label className="block font-semibold text-gray-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Получатель</span>
            </label>
            <select
              value={filters.recipientId || ''}
              onChange={(e) =>
                onChange({ ...filters, recipientId: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500"
            >
              <option value="">Все получатели</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Диапазон дат (с возможностью выбора типа даты) */}
          <div className="sm:col-span-2 lg:col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Дата с:</span>
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Дата по:</span>
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Фильтры по наличию файлов и ссылок СЭД */}
          <div className="sm:col-span-2 lg:col-span-2 flex items-center gap-4 pt-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasAttachment === true}
                onChange={(e) =>
                  onChange({ ...filters, hasAttachment: e.target.checked ? true : null })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-[#2D3139] bg-[#0F1115]"
              />
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                С файлом/папкой
              </span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasSedLink === true}
                onChange={(e) =>
                  onChange({ ...filters, hasSedLink: e.target.checked ? true : null })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-[#2D3139] bg-[#0F1115]"
              />
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Со ссылкой на СЭД
              </span>
            </label>
          </div>

        </div>
      )}

    </div>
  );
});
