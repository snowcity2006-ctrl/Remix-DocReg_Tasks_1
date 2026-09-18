import React, { useState, useEffect } from 'react';
import { UserCheck, X, Check, AlertCircle, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { Employee, Department, Organization } from '../../types';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Omit<Employee, 'id'> & { id?: number }) => Promise<void>;
  departments: Department[];
  organizations: Organization[];
  onOpenNewOrgModal: () => void;
  onOpenNewDepartmentModal: (orgId?: number) => void;
  initialData?: Employee | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  departments,
  organizations,
  onOpenNewOrgModal,
  onOpenNewDepartmentModal,
  initialData,
}) => {
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [departmentShortName, setDepartmentShortName] = useState('');
  const [organizationId, setOrganizationId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Сброс и инициализация полей формы
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFullName(initialData.fullName || '');
      setPosition(initialData.position || '');
      setDepartmentShortName(initialData.departmentShortName || '');
      setOrganizationId(initialData.organizationId || '');
    } else {
      setFullName('');
      setPosition('');
      const firstOrgId = organizations.length > 0 ? organizations[0].id : '';
      setOrganizationId(firstOrgId);
      const filteredDepts = departments.filter((d) => !firstOrgId || d.organizationId === firstOrgId);
      setDepartmentShortName(filteredDepts.length > 0 ? filteredDepts[0].shortName : '');
    }
    setError(null);
  }, [initialData, isOpen]);

  // Автоматический выбор вновь добавленного подразделения без сброса введенного ФИО
  const prevDeptsLengthRef = React.useRef(departments.length);
  useEffect(() => {
    if (isOpen && departments.length > prevDeptsLengthRef.current) {
      const latestDept = departments[departments.length - 1];
      if (latestDept && (!organizationId || latestDept.organizationId === Number(organizationId))) {
        setDepartmentShortName(latestDept.shortName);
      }
    }
    prevDeptsLengthRef.current = departments.length;
  }, [departments, isOpen, organizationId]);

  // Фильтрация подразделений по выбранной организации
  const availableDepartments = departments.filter((d) => !organizationId || d.organizationId === Number(organizationId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Поле «Сотрудник» обязательно для заполнения');
      return;
    }
    if (!departmentShortName.trim()) {
      setError('Поле «Структурное подразделение» обязательно для заполнения');
      return;
    }
    if (!organizationId) {
      setError('Поле «Организация» обязательно для заполнения');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initialData ? initialData.id : undefined,
        fullName: fullName.trim(),
        position: position.trim(),
        departmentShortName: departmentShortName.trim(),
        organizationId: Number(organizationId),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения сотрудника');
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
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#E0E0E0] truncate">
                {initialData ? 'Редактирование сотрудника' : 'Новый сотрудник'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {initialData ? 'Изменение данных сотрудника' : 'Добавление нового сотрудника в организацию'}
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
              Сотрудник (ФИО) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Например: Иванов Иван Иванович"
              className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Должность
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Например: Главный специалист, Начальник отдела"
              className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Организация с иконкой '+' справа по ТЗ */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Организация <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2 w-full min-w-0 items-center">
              <select
                required
                value={organizationId}
                onChange={(e) => {
                  const newOrgId = e.target.value ? Number(e.target.value) : '';
                  setOrganizationId(newOrgId);
                  // Сброс подразделения при смене организации
                  const filtered = departments.filter((d) => d.organizationId === newOrgId);
                  setDepartmentShortName(filtered.length > 0 ? filtered[0].shortName : '');
                }}
                className="flex-1 w-0 min-w-0 px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
              >
                <option value="" className="bg-[#171A21] text-gray-400">-- Выберите организацию --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-[#171A21] text-[#E0E0E0]" title={org.name}>
                    {org.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onOpenNewOrgModal}
                title="Добавить новую организацию в справочник"
                className="p-2.5 bg-blue-950/80 hover:bg-blue-900 text-blue-400 rounded-xl border border-blue-800 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Структурное подразделение (заполняется из Сокращенное название СП) с кнопкой '+' */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Структурное подразделение (Сокращенное СП) <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2 w-full min-w-0 items-center">
              {availableDepartments.length > 0 ? (
                <select
                  required
                  value={departmentShortName}
                  onChange={(e) => setDepartmentShortName(e.target.value)}
                  className="flex-1 w-0 min-w-0 px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                  title={availableDepartments.find((d) => d.shortName === departmentShortName)?.name}
                >
                  <option value="" className="bg-[#171A21] text-gray-400">-- Выберите СП --</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept.id} value={dept.shortName} className="bg-[#171A21] text-[#E0E0E0]" title={`${dept.shortName} — ${dept.name}`}>
                      {dept.shortName} — {dept.name.length > 45 ? `${dept.name.slice(0, 42)}…` : dept.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={departmentShortName}
                  onChange={(e) => setDepartmentShortName(e.target.value)}
                  placeholder="Введите сокращенное название СП (например: ОЗИ)"
                  className="flex-1 w-0 min-w-0 px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                />
              )}

              <button
                type="button"
                onClick={() => onOpenNewDepartmentModal(organizationId ? Number(organizationId) : undefined)}
                title="Добавить новое структурное подразделение в справочник"
                className="p-2.5 bg-blue-950/80 hover:bg-blue-900 text-blue-400 rounded-xl border border-blue-800 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {availableDepartments.find((d) => d.shortName === departmentShortName) && (
              <p className="text-[11px] text-gray-400 mt-1 truncate" title={availableDepartments.find((d) => d.shortName === departmentShortName)?.name}>
                Полное наименование: <span className="text-gray-300 font-medium">{availableDepartments.find((d) => d.shortName === departmentShortName)?.name}</span>
              </p>
            )}
            {availableDepartments.length === 0 && (
              <p className="text-[11px] text-amber-400 mt-1">
                Для выбранной организации нет подразделений в справочнике. Нажмите «+» для добавления в справочник или укажите сокращение вручную.
              </p>
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
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
