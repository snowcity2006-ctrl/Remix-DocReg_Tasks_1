import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Plus, Search, Check } from 'lucide-react';

export interface ComboboxOption {
  id: number;
  label: string;
  subLabel?: string;
  badge?: string;
  searchStr?: string;
}

interface SearchableComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  onAddNew?: () => void;
  addNewTitle?: string;
  icon?: React.ReactNode;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = '-- Начните ввод или выберите --',
  emptyMessage = 'Ничего не найдено',
  disabled = false,
  className = '',
  onAddNew,
  addNewTitle = 'Добавить в справочник',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Находим выбранный элемент с мемоизацией
  const selectedOption = useMemo(() => options.find((opt) => opt.id === value), [options, value]);

  // Синхронизируем текст инпута при изменении value извне, когда дропдаун закрыт
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption ? selectedOption.label : '');
      setHasUserTyped(false);
    }
  }, [value, selectedOption, isOpen]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Если введенный текст точно совпадает с одной из опций, выбираем её
        if (hasUserTyped && query.trim()) {
          const exactMatch = options.find((opt) => opt.label.trim().toLowerCase() === query.trim().toLowerCase());
          if (exactMatch) {
            onChange(exactMatch.id);
            setQuery(exactMatch.label);
          } else {
            // Восстанавливаем отображение выбранного значения
            setQuery(selectedOption ? selectedOption.label : '');
          }
        } else {
          setQuery(selectedOption ? selectedOption.label : '');
        }
        setHasUserTyped(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, hasUserTyped, query, options, onChange]);

  // Фильтрация опций по введенному тексту (регистронезависимо):
  // По мере набора скрываются все опции, не содержащие введенный текст
  const filteredOptions = useMemo(() => {
    if (!hasUserTyped || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => {
      const labelMatch = opt.label.toLowerCase().includes(q);
      const subMatch = opt.subLabel?.toLowerCase().includes(q) || false;
      const badgeMatch = opt.badge?.toLowerCase().includes(q) || false;
      const searchStrMatch = opt.searchStr?.toLowerCase().includes(q) || false;
      return labelMatch || subMatch || badgeMatch || searchStrMatch;
    });
  }, [options, hasUserTyped, query]);

  // Авто-скролл к подсвеченному элементу при навигации стрелками
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.combobox-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelectOption = (opt: ComboboxOption) => {
    onChange(opt.id);
    setQuery(opt.label);
    setHasUserTyped(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setHasUserTyped(false);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (isOpen && filteredOptions.length === 1) {
        e.preventDefault();
        handleSelectOption(filteredOptions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHasUserTyped(false);
      setQuery(selectedOption ? selectedOption.label : '');
    }
  };

  // Подсветка совпадений в тексте
  const renderHighlighted = (text: string, highlight: string) => {
    if (!hasUserTyped || !highlight.trim()) return text;
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

  return (
    <div id={id} ref={containerRef} className={`relative min-w-0 w-full ${className}`}>
      <div className="flex gap-2 min-w-0 w-full items-center">
        {/* Поле ввода с автодополнением и клавиатурным поиском */}
        <div
          className={`relative min-w-0 flex-1 flex items-center bg-[#171A21] border ${
            isOpen ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-[#2D3139]'
          } rounded-xl transition-all duration-150 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
        >
          {icon && <div className="pl-3 text-gray-500 shrink-0">{icon}</div>}

          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={query}
            placeholder={placeholder}
            onFocus={() => {
              setIsOpen(true);
              setHighlightedIndex(-1);
              setTimeout(() => {
                inputRef.current?.select();
              }, 20);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setHasUserTyped(true);
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-[#E0E0E0] placeholder:text-gray-500 focus:outline-none truncate"
          />

          <div className="flex items-center gap-1 pr-2 shrink-0">
            {value !== '' && (
              <button
                type="button"
                onClick={handleClear}
                title="Очистить выбор"
                className="p-1 text-gray-400 hover:text-rose-400 rounded-md hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const nextOpen = !isOpen;
                  setIsOpen(nextOpen);
                  if (nextOpen) {
                    inputRef.current?.focus();
                  }
                }
              }}
              className="p-1 text-gray-400 hover:text-gray-200 transition-transform"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Кнопка быстрого добавления в справочник */}
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            title={addNewTitle}
            className="p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Выпадающий список совпадений */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#1F222B] border border-[#2D3139] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 overflow-y-auto"
        >
          {hasUserTyped && query.trim() && (
            <div className="px-3 py-1.5 bg-[#171A21] border-b border-[#2D3139] text-[11px] text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Search className="w-3 h-3 text-blue-400" />
                Поиск: «<strong className="text-gray-200">{query.trim()}</strong>»
              </span>
              <span>Найдено: {filteredOptions.length}</span>
            </div>
          )}

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
            <div className="divide-y divide-[#2D3139]/40 p-1">
              {filteredOptions.map((opt, index) => {
                const isSelected = opt.id === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`combobox-item flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-200 font-medium'
                        : isHighlighted
                        ? 'bg-[#2D3139]/70 text-[#E0E0E0]'
                        : 'hover:bg-[#2D3139]/40 text-gray-300'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
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

                    {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
