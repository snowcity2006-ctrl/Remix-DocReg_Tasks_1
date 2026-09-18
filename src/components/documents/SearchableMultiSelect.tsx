import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Plus, Search, CheckSquare, Square } from 'lucide-react';

export interface MultiSelectOption {
  id: number;
  label: string;
  subLabel?: string;
  badge?: string;
  searchStr?: string;
}

interface SearchableMultiSelectProps {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  options: MultiSelectOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  onAddNew?: () => void;
  addNewTitle?: string;
  chipColor?: 'blue' | 'indigo';
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  id,
  label,
  icon,
  options,
  selectedIds,
  onChange,
  placeholder = '-- Начните ввод или выберите из списка --',
  emptyMessage = 'Ничего не найдено',
  onAddNew,
  addNewTitle = 'Добавить в справочник',
  chipColor = 'blue',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Быстрый Set для O(1) проверки выбранных опций
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Фильтрация опций по введенному слову (регистронезависимо) с мемоизацией
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => {
      const labelMatch = opt.label.toLowerCase().includes(q);
      const subMatch = opt.subLabel?.toLowerCase().includes(q) || false;
      const badgeMatch = opt.badge?.toLowerCase().includes(q) || false;
      const searchStrMatch = opt.searchStr?.toLowerCase().includes(q) || false;
      return labelMatch || subMatch || badgeMatch || searchStrMatch;
    });
  }, [options, query]);

  const toggleOption = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeOption = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredOptions.map((o) => o.id);
    const newSelected = Array.from(new Set([...selectedIds, ...idsToAdd]));
    onChange(newSelected);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && query === '' && selectedIds.length > 0) {
      // Удаляем последний чип при нажатии Backspace в пустом поле
      const lastId = selectedIds[selectedIds.length - 1];
      removeOption(lastId);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        toggleOption(filteredOptions[0].id);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const renderHighlighted = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} className="text-blue-400 font-semibold bg-blue-500/20 px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const chipBg =
    chipColor === 'indigo'
      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
      : 'bg-blue-600/20 text-blue-300 border-blue-500/40';

  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(o.id)),
    [options, selectedSet]
  );

  return (
    <div id={id} ref={containerRef} className="min-w-0 w-full relative">
      {/* Заголовок и быстрый сброс */}
      <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
        <label className="font-semibold text-gray-300 flex items-center gap-1 min-w-0 truncate text-xs">
          {icon}
          <span className="truncate">{label}</span>
        </label>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
          >
            Очистить ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Интерактивный триггер с чипами и прямым полем ввода */}
      <div className="flex gap-2 min-w-0 w-full items-center">
        <div
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          className={`w-full min-w-0 flex-1 min-h-[42px] px-3 py-1.5 bg-[#0F1115] border ${
            isOpen ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-[#2D3139]'
          } rounded-xl cursor-text flex items-center justify-between gap-2 transition-colors`}
        >
          <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto pr-1 min-w-0 flex-1">
            {/* Выбранные чипы */}
            {selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className={`inline-flex items-center gap-1 px-2 py-1 ${chipBg} border rounded-lg text-[11px] font-medium max-w-full`}
              >
                <span className="truncate max-w-[150px]">{opt.label}</span>
                <button
                  type="button"
                  onClick={(e) => removeOption(opt.id, e)}
                  className="hover:text-rose-400 p-0.5 rounded-md hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Прямой ввод текста с клавиатуры для фильтрации */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={selectedIds.length === 0 ? placeholder : 'Поиск или ввод...'}
              className="bg-transparent border-none outline-none text-xs text-[#E0E0E0] placeholder:text-gray-500 min-w-[130px] flex-1 py-1"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {query && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 text-gray-400 hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : ''}`}
            />
          </div>
        </div>

        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            title={addNewTitle}
            className="p-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Выпадающее окно со списком совпадений и чекбоксами */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1F222B] border border-[#2D3139] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100">
          {/* Информационная панель и быстрые действия */}
          <div className="p-2.5 border-b border-[#2D3139] bg-[#171A21] flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1 truncate">
              {query.trim() ? (
                <>
                  <Search className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>По запросу «<strong className="text-gray-200">{query.trim()}</strong>»: {filteredOptions.length}</span>
                </>
              ) : (
                <span>Всего записей: {filteredOptions.length} (выбрано: {selectedIds.length})</span>
              )}
            </span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Выбрать все
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                Снять все
              </button>
            </div>
          </div>

          {/* Список вариантов с чекбоксами, отфильтрованный по введенному слову */}
          <div className="max-h-56 overflow-y-auto divide-y divide-[#2D3139]/40 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400">{emptyMessage}</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addNewTitle}
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedSet.has(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/15 text-[#E0E0E0] font-medium'
                        : 'hover:bg-[#2D3139]/40 text-gray-300'
                    }`}
                  >
                    <div className="text-blue-400 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{renderHighlighted(opt.label, query)}</span>
                        {opt.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#2D3139] text-gray-400 rounded">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <span className="text-[11px] text-gray-400 truncate mt-0.5">
                          {renderHighlighted(opt.subLabel, query)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-[#2D3139] bg-[#171A21] flex justify-between items-center">
            <span className="text-[11px] text-gray-400 px-1">
              Выбрано: <strong className="text-blue-400">{selectedIds.length}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
