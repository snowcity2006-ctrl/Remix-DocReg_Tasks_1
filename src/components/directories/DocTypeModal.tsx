import React, { useState, useEffect } from 'react';
import { Tag, X, Check, AlertCircle, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { DocumentType } from '../../types';

interface DocTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: Omit<DocumentType, 'id'> & { id?: number }) => Promise<void>;
  initialData?: DocumentType | null;
  existingTypes?: DocumentType[];
}

export const DocTypeModal: React.FC<DocTypeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingTypes = [],
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
    } else {
      setName('');
    }
    setError(null);
  }, [initialData, isOpen]);

  const normalizedName = name.trim().toLowerCase();

  // Поиск дубликата среди существующих типов (исключая редактируемую запись)
  const duplicateType = existingTypes.find(
    (t) => t.id !== initialData?.id && t.name.trim().toLowerCase() === normalizedName
  );
  const isDuplicate = Boolean(normalizedName && duplicateType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Поле «Тип документа» обязательно для заполнения');
      return;
    }

    if (isDuplicate) {
      setError(`Тип документа «${duplicateType?.name}» уже существует в справочнике. Дублирование запрещено.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initialData ? initialData.id : undefined,
        name: name.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения типа документа');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center ${isMaximized ? 'p-1' : 'p-2 sm:p-4'} bg-black/75 backdrop-blur-xs animate-in fade-in duration-150`}>
      <div
        className={`bg-[#171A21] shadow-2xl border border-[#2D3139] overflow-hidden flex flex-col text-[#E0E0E0] transition-all duration-200 ${
          isMaximized
            ? 'w-[99vw] h-[98vh] rounded-xl'
            : 'w-[88vw] max-w-3xl max-h-[92vh] rounded-2xl'
        }`}
      >
        {/* Заголовок (двойной клик разворачивает окно) */}
        <div
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="px-6 py-4 border-b border-[#2D3139] flex items-center justify-between bg-[#12151B]/60 shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center border border-blue-900/60 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#E0E0E0] truncate">
                {initialData ? 'Редактирование типа документа' : 'Новый тип документа'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {initialData ? 'Изменение наименования записи' : 'Добавление новой классификации документов'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть на весь экран'}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Закрыть окно"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-900/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isDuplicate && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-semibold">Внимание: тип документа уже существует!</span>
                <p className="mt-0.5 text-[11px] text-amber-200/90 leading-relaxed">
                  Запись с наименованием «<strong className="text-amber-100">{duplicateType?.name}</strong>» (ID: #{duplicateType?.id}) уже есть в справочнике. Повторное создание запрещено.
                </p>
              </div>
            </div>
          )}

          {initialData && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                ID записи
              </label>
              <input
                type="text"
                disabled
                value={initialData.id}
                className="w-24 px-3 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs font-mono text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Тип документа <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Например: Приказ, Служебная записка, Акт"
              className={`w-full px-3.5 py-2.5 bg-[#0F1115] border ${
                isDuplicate
                  ? 'border-amber-500/80 focus:border-amber-500 ring-1 ring-amber-500/20'
                  : 'border-[#2D3139] focus:ring-1 focus:ring-blue-500'
              } rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none transition-all`}
            />
          </div>

          {/* Блок информации об уже существующих типах документов */}
          <div className="bg-[#0F1115] border border-[#2D3139] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-gray-300">
                  Существующие типы документов
                </span>
              </div>
              <span className="text-[11px] px-2 py-0.5 bg-blue-950/80 text-blue-400 border border-blue-900/60 rounded-md font-medium">
                Всего в базе: {existingTypes.length}
              </span>
            </div>

            {existingTypes.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-1">
                В справочнике пока нет зарегистрированных типов документов.
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {existingTypes.map((t) => {
                    const isExactMatch = normalizedName && t.name.trim().toLowerCase() === normalizedName;
                    const isPartialMatch =
                      normalizedName &&
                      !isExactMatch &&
                      t.name.trim().toLowerCase().includes(normalizedName);

                    return (
                      <span
                        key={t.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isExactMatch
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 ring-1 ring-amber-500/30 font-semibold'
                            : isPartialMatch
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-[#171A21] text-gray-300 border border-[#2D3139]'
                        }`}
                      >
                        <span>{t.name}</span>
                        <span className="text-[10px] text-gray-500">#{t.id}</span>
                      </span>
                    );
                  })}
                </div>
                {normalizedName && !isDuplicate && (
                  <p className="text-[11px] text-emerald-400/90 flex items-center gap-1 pt-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Наименование «{name.trim()}» свободно для создания</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#2D3139] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || isDuplicate || !name.trim()}
              title={isDuplicate ? 'Тип документа с таким наименованием уже существует' : undefined}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
