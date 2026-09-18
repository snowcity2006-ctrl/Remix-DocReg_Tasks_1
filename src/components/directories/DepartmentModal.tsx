import React, { useState, useEffect, useMemo } from 'react';
import { Network, X, Check, AlertCircle, AlertTriangle, Plus, Building2, Maximize2, Minimize2 } from 'lucide-react';
import { Department, Organization } from '../../types';
import { SearchableCombobox, ComboboxOption } from '../documents/SearchableCombobox';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dept: Omit<Department, 'id'> & { id?: number }) => Promise<void>;
  organizations: Organization[];
  onOpenNewOrgModal: () => void;
  initialData?: Department | null;
  existingDepartments?: Department[];
  departments?: Department[];
  defaultOrganizationId?: number;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  organizations,
  onOpenNewOrgModal,
  initialData,
  existingDepartments,
  departments,
  defaultOrganizationId,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [organizationId, setOrganizationId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const allDepartments = existingDepartments || departments || [];

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setShortName(initialData.shortName || '');
      setOrganizationId(initialData.organizationId || '');
    } else {
      setName('');
      setShortName('');
      setOrganizationId(defaultOrganizationId || '');
    }
    setError(null);
  }, [initialData, isOpen, organizations, defaultOrganizationId]);

  const orgOptions: ComboboxOption[] = useMemo(() => {
    return organizations.map((org) => ({
      id: org.id,
      label: org.name,
      searchStr: org.name,
    }));
  }, [organizations]);

  const selectedOrg = organizations.find((o) => o.id === Number(organizationId));
  
  // Подразделения, привязанные именно к выбранной организации
  const orgDepartments = organizationId
    ? allDepartments.filter((d) => d.organizationId === Number(organizationId))
    : [];

  const normalizedName = name.trim().toLowerCase();
  const normalizedShortName = shortName.trim().toLowerCase();

  // Поиск дубликата в выбранной организации (по полному названию или сокращению)
  const duplicateByName = orgDepartments.find(
    (d) => d.id !== initialData?.id && d.name.trim().toLowerCase() === normalizedName
  );
  const duplicateByShortName = orgDepartments.find(
    (d) => d.id !== initialData?.id && d.shortName.trim().toLowerCase() === normalizedShortName
  );

  const isDuplicate = Boolean(
    (normalizedName && duplicateByName) || (normalizedShortName && duplicateByShortName)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Поле «Структурное подразделение» обязательно для заполнения');
      return;
    }
    if (!shortName.trim()) {
      setError('Поле «Сокращенное название СП» обязательно для заполнения');
      return;
    }
    if (!organizationId) {
      setError('Поле «Организация» обязательно для заполнения');
      return;
    }

    if (duplicateByName) {
      setError(
        `Подразделение с наименованием «${duplicateByName.name}» уже существует в организации «${selectedOrg?.name}». Дублирование запрещено.`
      );
      return;
    }

    if (duplicateByShortName) {
      setError(
        `Подразделение с сокращением «${duplicateByShortName.shortName}» (${duplicateByShortName.name}) уже существует в организации «${selectedOrg?.name}». Дублирование запрещено.`
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initialData ? initialData.id : undefined,
        name: name.trim(),
        shortName: shortName.trim(),
        organizationId: Number(organizationId),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения структурного подразделения');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center ${isMaximized ? 'p-1' : 'p-2 sm:p-4'} bg-black/75 backdrop-blur-xs animate-in fade-in duration-150`}>
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
              <Network className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#E0E0E0] truncate">
                {initialData ? 'Редактирование подразделения' : 'Новое структурное подразделение'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {initialData ? 'Изменение данных подразделения' : 'Добавление подразделения в выбранную организацию'}
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
                <span className="font-semibold">Внимание: подразделение уже существует в этой организации!</span>
                <p className="mt-0.5 text-[11px] text-amber-200/90 leading-relaxed">
                  {duplicateByName ? (
                    <>
                      Подразделение «<strong className="text-amber-100">{duplicateByName.name}</strong>» ({duplicateByName.shortName}, ID: #{duplicateByName.id}) уже есть в организации «{selectedOrg?.name}».
                    </>
                  ) : (
                    <>
                      Сокращение «<strong className="text-amber-100">{duplicateByShortName?.shortName}</strong>» уже используется для «{duplicateByShortName?.name}» в организации «{selectedOrg?.name}».
                    </>
                  )}
                  {' '}Повторное создание дубликата запрещено.
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

          {/* Организация с клавиатурным вводом, поиском и кнопкой добавления новой организации */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Организация <span className="text-rose-500">*</span>
            </label>
            <SearchableCombobox
              id="department-modal-organization"
              options={orgOptions}
              value={organizationId}
              onChange={(newVal) => {
                setOrganizationId(newVal);
                if (error) setError(null);
              }}
              placeholder="-- Начните ввод названия или выберите организацию --"
              emptyMessage="Организации не найдены"
              onAddNew={onOpenNewOrgModal}
              addNewTitle="Добавить новую организацию в справочник"
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Структурное подразделение <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Например: Отдел информационной безопасности"
              className={`w-full px-3.5 py-2.5 bg-[#0F1115] border ${
                duplicateByName
                  ? 'border-amber-500/80 focus:border-amber-500 ring-1 ring-amber-500/20'
                  : 'border-[#2D3139] focus:ring-1 focus:ring-blue-500'
              } rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none transition-all`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Сокращенное название СП <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={shortName}
              onChange={(e) => {
                setShortName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Например: ОИБ или Отд. ИБ"
              className={`w-full px-3.5 py-2.5 bg-[#0F1115] border ${
                duplicateByShortName
                  ? 'border-amber-500/80 focus:border-amber-500 ring-1 ring-amber-500/20'
                  : 'border-[#2D3139] focus:ring-1 focus:ring-blue-500'
              } rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none transition-all font-semibold`}
            />
          </div>

          {/* Блок информации об уже существующих структурных подразделениях в выбранной организации */}
          <div className="bg-[#0F1115] border border-[#2D3139] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-gray-300">
                  Существующие СП в выбранной организации
                </span>
              </div>
              {selectedOrg && (
                <span className="text-[11px] px-2 py-0.5 bg-blue-950/80 text-blue-400 border border-blue-900/60 rounded-md font-medium truncate max-w-[200px]" title={selectedOrg.name}>
                  {selectedOrg.name}: {orgDepartments.length}
                </span>
              )}
            </div>

            {!organizationId ? (
              <div className="text-xs text-gray-500 italic py-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-600" />
                <span>Выберите организацию выше для просмотра существующих подразделений</span>
              </div>
            ) : orgDepartments.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-1">
                В организации «{selectedOrg?.name}» пока нет подразделений — это будет первое.
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {orgDepartments.map((d) => {
                    const isNameMatch = normalizedName && d.name.trim().toLowerCase() === normalizedName;
                    const isShortMatch = normalizedShortName && d.shortName.trim().toUpperCase() === normalizedShortName;
                    const isExactMatch = isNameMatch || isShortMatch;
                    const isPartialMatch =
                      !isExactMatch &&
                      ((normalizedName && d.name.trim().toLowerCase().includes(normalizedName)) ||
                        (normalizedShortName && d.shortName.trim().toUpperCase().includes(normalizedShortName)));

                    return (
                      <span
                        key={d.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isExactMatch
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 ring-1 ring-amber-500/30 font-semibold'
                            : isPartialMatch
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-[#171A21] text-gray-300 border border-[#2D3139]'
                        }`}
                      >
                        <span className="font-semibold text-blue-300">{d.shortName}</span>
                        <span className="text-gray-400 truncate max-w-[150px]">({d.name})</span>
                        <span className="text-[10px] text-gray-500">#{d.id}</span>
                      </span>
                    );
                  })}
                </div>
                {normalizedName && !isDuplicate && (
                  <p className="text-[11px] text-emerald-400/90 flex items-center gap-1 pt-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Подразделение свободно для создания в организации «{selectedOrg?.name}»</span>
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
              disabled={saving || isDuplicate || !name.trim() || !shortName.trim() || !organizationId}
              title={isDuplicate ? 'Подразделение с такими данными уже существует в организации' : undefined}
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
