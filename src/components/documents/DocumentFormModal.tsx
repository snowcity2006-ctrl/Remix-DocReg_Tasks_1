import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Calendar,
  FolderOpen,
  Globe,
  Building2,
  Tag,
  Compass,
  X,
  Check,
  AlertCircle,
  Plus,
  Paperclip,
  ClipboardPaste,
  Layers,
  User,
  UserCheck,
  Maximize2,
  Minimize2,
  Link2,
} from 'lucide-react';
import {
  DocumentRecord,
  DocumentType,
  Direction,
  Organization,
  Department,
  Employee,
} from '../../types';
import { electronBridge } from '../../services/electronBridge';
import { SearchableCombobox, ComboboxOption } from './SearchableCombobox';
import { SearchableMultiSelect, MultiSelectOption } from './SearchableMultiSelect';
import { RelatedDocumentsModal } from './RelatedDocumentsModal';
import {
  normalizeAstraPathForStorage,
  setAstraCurrentUser,
} from '../../utils/astraPath';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>;
  documentTypes: DocumentType[];
  directions: Direction[];
  organizations: Organization[];
  departments: Department[];
  employees: Employee[];
  onOpenNewOrgModal: () => void;
  onOpenNewDepartmentModal: () => void;
  onOpenNewEmployeeModal: () => void;
  onOpenNewDocTypeModal: () => void;
  onOpenNewDirectionModal: () => void;
  initialData?: DocumentRecord | null;
  allDocuments?: DocumentRecord[];
}

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  documentTypes,
  directions,
  organizations,
  departments,
  employees,
  onOpenNewOrgModal,
  onOpenNewDepartmentModal,
  onOpenNewEmployeeModal,
  onOpenNewDocTypeModal,
  onOpenNewDirectionModal,
  initialData,
  allDocuments = [],
}) => {
  const [docTypeId, setDocTypeId] = useState<number | ''>('');
  const [directionId, setDirectionId] = useState<number | ''>('');
  const [outgoingNumber, setOutgoingNumber] = useState('');
  const [outgoingDate, setOutgoingDate] = useState('');
  const [incomingNumber, setIncomingNumber] = useState('');
  const [incomingDate, setIncomingDate] = useState('');
  const [subject, setSubject] = useState('');
  
  // Отправитель: Организация, СП, Подписал и Исполнитель (Сотрудники)
  const [senderId, setSenderId] = useState<number | ''>('');
  const [senderDepartmentId, setSenderDepartmentId] = useState<number | ''>('');
  const [senderEmployeeId, setSenderEmployeeId] = useState<number | ''>('');
  const [signatoryEmployeeId, setSignatoryEmployeeId] = useState<number | ''>('');

  // Отслеживание добавления сотрудника для авто-выбора (Подписал / Исполнитель)
  const [pendingEmployeeTarget, setPendingEmployeeTarget] = useState<'signatory' | 'executor' | null>(null);
  const prevEmployeesCountRef = useRef(employees.length);

  // Отслеживание открытия модалки и предыдущих списков справочников, чтобы не сбрасывать форму при добавлении записей через плюсики
  const prevIsOpenRef = useRef(false);
  const prevInitialDataRef = useRef<DocumentRecord | null | undefined>(undefined);
  const prevDocTypesCountRef = useRef(documentTypes.length);
  const prevDirectionsCountRef = useRef(directions.length);
  const prevOrgsCountRef = useRef(organizations.length);
  const prevDeptsCountRef = useRef(departments.length);

  // Множественный выбор получателей (Организации)
  const [recipientIds, setRecipientIds] = useState<number[]>([]);

  // Состояние разворачивания окна на весь экран
  const [isMaximized, setIsMaximized] = useState(false);

  // Множественный выбор структурных подразделений для Получателя
  const [recipientDepartmentIds, setRecipientDepartmentIds] = useState<number[]>([]);

  const [filePath, setFilePath] = useState('');
  const [sedUrl, setSedUrl] = useState('');
  const [comments, setComments] = useState('');

  // Связанные документы
  const [relatedDocIds, setRelatedDocIds] = useState<number[]>([]);
  const [isRelatedModalOpen, setIsRelatedModalOpen] = useState(false);

  const [pastedFeedback, setPastedFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFilePathChange = (value: string) => {
    const norm = normalizeAstraPathForStorage(value);
    if (norm.wasNormalized) {
      setFilePath(norm.normalizedPath);
      if (norm.extractedUser) {
        setAstraCurrentUser(norm.extractedUser);
      }
    } else {
      setFilePath(value);
    }
  };

  useEffect(() => {
    // Если модальное окно закрыто, обновляем ref состояния и ничего не сбрасываем
    if (!isOpen) {
      prevIsOpenRef.current = false;
      prevInitialDataRef.current = undefined;
      return;
    }

    const isNewlyOpened = !prevIsOpenRef.current && isOpen;
    const isDataChanged = initialData !== prevInitialDataRef.current;

    // Сбрасываем форму ТОЛЬКО при первичном открытии модального окна или при смене редактируемого документа
    if (isNewlyOpened || isDataChanged) {
      if (initialData) {
        setDocTypeId(initialData.docTypeId || '');
        setDirectionId(initialData.directionId || '');
        setOutgoingNumber(initialData.outgoingNumber || '');
        setOutgoingDate(initialData.outgoingDate || '');
        setIncomingNumber(initialData.incomingNumber || '');
        setIncomingDate(initialData.incomingDate || '');
        setSubject(initialData.subject || '');
        setSenderId(initialData.senderId || '');
        setSenderDepartmentId(initialData.senderDepartmentId || '');
        setSenderEmployeeId(initialData.senderEmployeeId || '');
        setSignatoryEmployeeId(initialData.signatoryEmployeeId || '');

        // Инициализация получателей
        if (initialData.recipientIds && initialData.recipientIds.length > 0) {
          setRecipientIds(initialData.recipientIds);
        } else if (initialData.recipientId) {
          setRecipientIds([initialData.recipientId]);
        } else {
          setRecipientIds([]);
        }

        // Инициализация структурных подразделений получателя
        setRecipientDepartmentIds(initialData.recipientDepartmentIds || []);

        setFilePath(initialData.filePath || '');
        setSedUrl(initialData.sedUrl || '');
        setComments(initialData.comments || '');
        setRelatedDocIds(initialData.relatedDocIds || []);
      } else {
        setDocTypeId(documentTypes.length > 0 ? documentTypes[0].id : '');
        setDirectionId(directions.length > 0 ? directions[0].id : '');
        setOutgoingNumber('');
        setOutgoingDate('');
        setIncomingNumber('');
        setIncomingDate(new Date().toISOString().slice(0, 10)); // Текущая дата по умолчанию
        setSubject('');
        setSenderId('');
        setSenderDepartmentId('');
        setSenderEmployeeId('');
        setSignatoryEmployeeId('');
        setRecipientIds([]);
        setRecipientDepartmentIds([]);
        setFilePath('');
        setSedUrl('');
        setComments('');
        setRelatedDocIds([]);
      }
      setError(null);

      // Синхронизируем начальное количество элементов в справочниках при открытии
      prevDocTypesCountRef.current = documentTypes.length;
      prevDirectionsCountRef.current = directions.length;
      prevOrgsCountRef.current = organizations.length;
      prevDeptsCountRef.current = departments.length;
      prevEmployeesCountRef.current = employees.length;
    } else {
      // Модальное окно УЖЕ открыто и пользователь вносит данные!
      // Если в этот момент обновились справочники (через нажатие плюсика), НЕ сбрасываем поля формы,
      // а наоборот: если добавился новый тип документа или направление, авто-выбираем его.
      if (documentTypes.length > prevDocTypesCountRef.current) {
        const newestType = documentTypes[documentTypes.length - 1];
        if (newestType) {
          setDocTypeId(newestType.id);
        }
      }
      if (directions.length > prevDirectionsCountRef.current) {
        const newestDirection = directions[directions.length - 1];
        if (newestDirection) {
          setDirectionId(newestDirection.id);
        }
      }
      // Если добавилась новая организация и отправитель ещё не был выбран — подставляем её
      if (organizations.length > prevOrgsCountRef.current) {
        const newestOrg = organizations[organizations.length - 1];
        if (newestOrg) {
          setSenderId((prev) => (prev === '' ? newestOrg.id : prev));
        }
      }
      // Если добавилось подразделение и СП отправителя не выбрано — подставляем
      if (departments.length > prevDeptsCountRef.current) {
        const newestDept = departments[departments.length - 1];
        if (newestDept) {
          setSenderDepartmentId((prev) => (prev === '' ? newestDept.id : prev));
        }
      }

      prevDocTypesCountRef.current = documentTypes.length;
      prevDirectionsCountRef.current = directions.length;
      prevOrgsCountRef.current = organizations.length;
      prevDeptsCountRef.current = departments.length;
    }

    prevIsOpenRef.current = isOpen;
    prevInitialDataRef.current = initialData;
  }, [initialData, isOpen, documentTypes, directions, organizations, departments]);

  // Автоматический выбор добавленного сотрудника (для «Подписал» или «Исполнитель»)
  useEffect(() => {
    if (employees.length > prevEmployeesCountRef.current) {
      const newestEmp = employees[employees.length - 1];
      if (newestEmp && pendingEmployeeTarget === 'signatory') {
        setSignatoryEmployeeId(newestEmp.id);
        if (!senderId || senderId !== newestEmp.organizationId) {
          setSenderId(newestEmp.organizationId);
        }
      } else if (newestEmp && pendingEmployeeTarget === 'executor') {
        handleSenderEmployeeChange(newestEmp.id);
      }
      setPendingEmployeeTarget(null);
    }
    prevEmployeesCountRef.current = employees.length;
  }, [employees]);

  const handleBrowseFile = async () => {
    try {
      const selected = electronBridge.selectDocumentFile
        ? await electronBridge.selectDocumentFile()
        : await electronBridge.selectDocumentFileOrFolder();
      if (selected) {
        handleFilePathChange(selected);
      }
    } catch (e: any) {
      setError(`Ошибка выбора файла: ${e.message}`);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = electronBridge.selectDocumentFolder
        ? await electronBridge.selectDocumentFolder()
        : await electronBridge.selectDocumentFileOrFolder();
      if (selected) {
        handleFilePathChange(selected);
      }
    } catch (e: any) {
      setError(`Ошибка выбора папки: ${e.message}`);
    }
  };

  // Вставка ссылки из буфера обмена для поля "Путь к документу в СЭД"
  const handlePasteFromClipboard = async () => {
    try {
      let clipboardText = '';
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        clipboardText = await navigator.clipboard.readText();
      }

      if (clipboardText && clipboardText.trim()) {
        const clean = clipboardText.trim();
        setSedUrl(clean);
        setPastedFeedback(true);
        setTimeout(() => setPastedFeedback(false), 2200);
      } else {
        setError('Буфер обмена пуст или не содержит текстовую ссылку');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err: any) {
      setError(`Не удалось вставить из буфера: ${err.message || 'нет доступа к буферу обмена'}`);
      setTimeout(() => setError(null), 4000);
    }
  };

  // Обработка переключения получателя (Организации)
  const toggleRecipient = (orgId: number) => {
    setRecipientIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  };

  const removeRecipient = (orgId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecipientIds((prev) => prev.filter((id) => id !== orgId));
  };

  const handleSelectAllRecipients = () => {
    setRecipientIds(organizations.map((org) => org.id));
  };

  const handleClearRecipients = () => {
    setRecipientIds([]);
  };

  // Обработка переключения структурных подразделений получателя
  const toggleDepartment = (deptId: number) => {
    setRecipientDepartmentIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  // Доступные подразделения для получателя: при выборе получателей фильтруются по ним, иначе доступны все
  const availableDepartments = useMemo(() => {
    if (recipientIds.length === 0) return departments;
    return departments.filter((d) => recipientIds.includes(d.organizationId));
  }, [departments, recipientIds]);

  // Обработка выбора для Отправителя: Организация, СП, Исполнитель (Сотрудник), Подписал
  const handleSenderOrgChange = (newOrgId: number | '') => {
    setSenderId(newOrgId);
    if (newOrgId) {
      if (senderDepartmentId) {
        const dept = departments.find((d) => d.id === senderDepartmentId);
        if (dept && dept.organizationId !== newOrgId) {
          setSenderDepartmentId('');
        }
      }
      if (senderEmployeeId) {
        const emp = employees.find((e) => e.id === senderEmployeeId);
        if (emp && emp.organizationId !== newOrgId) {
          setSenderEmployeeId('');
        }
      }
      if (signatoryEmployeeId) {
        const emp = employees.find((e) => e.id === signatoryEmployeeId);
        if (emp && emp.organizationId !== newOrgId) {
          setSignatoryEmployeeId('');
        }
      }
    }
  };

  const handleSignatoryEmployeeChange = (newEmpId: number | '') => {
    setSignatoryEmployeeId(newEmpId);
    if (newEmpId) {
      const emp = employees.find((e) => e.id === newEmpId);
      if (emp) {
        if (!senderId || senderId !== emp.organizationId) {
          setSenderId(emp.organizationId);
        }
      }
    }
  };

  const handleSenderDeptChange = (newDeptId: number | '') => {
    setSenderDepartmentId(newDeptId);
    if (newDeptId) {
      const dept = departments.find((d) => d.id === newDeptId);
      if (dept) {
        if (!senderId || senderId !== dept.organizationId) {
          setSenderId(dept.organizationId);
        }
      }
    }
  };

  const handleSenderEmployeeChange = (newEmpId: number | '') => {
    setSenderEmployeeId(newEmpId);
    if (newEmpId) {
      const emp = employees.find((e) => e.id === newEmpId);
      if (emp) {
        if (!senderId || senderId !== emp.organizationId) {
          setSenderId(emp.organizationId);
        }
        // Если СП отправителя еще не выбрано, можно аккуратно подставить СП сотрудника
        if (!senderDepartmentId && emp.departmentShortName) {
          const matchingDept = departments.find(
            (d) =>
              d.organizationId === emp.organizationId &&
              d.shortName.toLowerCase() === emp.departmentShortName.toLowerCase()
          );
          if (matchingDept) {
            setSenderDepartmentId(matchingDept.id);
          }
        }
      }
    }
  };

  // Фильтрация СП для отправителя
  const filteredSenderDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (!senderId) return true;
      return d.organizationId === senderId;
    });
  }, [departments, senderId]);

  // Фильтрация сотрудников для «Подписал»:
  // Включает всех сотрудников организации отправителя (или всех если не выбрана).
  // Всегда включает текущего выбранного исполнителя или подписавшего, гарантируя возможность выбора одного и того же человека!
  const availableSignatoryEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (e.id === signatoryEmployeeId || e.id === senderEmployeeId) return true;
      if (senderId) {
        return e.organizationId === senderId;
      }
      return true;
    });
  }, [employees, senderId, signatoryEmployeeId, senderEmployeeId]);

  // Фильтрация сотрудников для «Исполнитель»:
  // Включает всех сотрудников организации отправителя.
  // Также всегда включает текущего подписавшего, гарантируя возможность выбора одного и того же человека!
  const availableExecutorEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (e.id === senderEmployeeId || e.id === signatoryEmployeeId) return true;
      if (senderId) {
        return e.organizationId === senderId;
      }
      return true;
    });
  }, [employees, senderId, senderEmployeeId, signatoryEmployeeId]);

  // Опции для комбобоксов быстрого ввода с клавиатуры
  const senderOrgOptions: ComboboxOption[] = useMemo(() => {
    return organizations.map((org) => ({
      id: org.id,
      label: org.name,
      searchStr: org.name,
    }));
  }, [organizations]);

  const senderDeptOptions: ComboboxOption[] = useMemo(() => {
    return filteredSenderDepartments.map((dept) => ({
      id: dept.id,
      label: dept.shortName ? `${dept.shortName} — ${dept.name}` : dept.name,
      badge: !senderId && dept.organizationName ? dept.organizationName : undefined,
      searchStr: `${dept.name} ${dept.shortName || ''} ${dept.organizationName || ''}`,
    }));
  }, [filteredSenderDepartments, senderId]);

  const signatoryOptions: ComboboxOption[] = useMemo(() => {
    return availableSignatoryEmployees.map((emp) => ({
      id: emp.id,
      label: emp.fullName,
      subLabel: emp.departmentShortName ? `СП: ${emp.departmentShortName}` : undefined,
      badge: !senderId && emp.organizationName ? emp.organizationName : undefined,
      searchStr: `${emp.fullName} ${emp.departmentShortName || ''} ${emp.position || ''} ${emp.organizationName || ''}`,
    }));
  }, [availableSignatoryEmployees, senderId]);

  const executorOptions: ComboboxOption[] = useMemo(() => {
    return availableExecutorEmployees.map((emp) => ({
      id: emp.id,
      label: emp.fullName,
      subLabel: emp.departmentShortName ? `СП: ${emp.departmentShortName}` : undefined,
      badge: !senderId && emp.organizationName ? emp.organizationName : undefined,
      searchStr: `${emp.fullName} ${emp.departmentShortName || ''} ${emp.position || ''} ${emp.organizationName || ''}`,
    }));
  }, [availableExecutorEmployees, senderId]);

  const recipientOrgOptions: MultiSelectOption[] = useMemo(() => {
    return organizations.map((org) => ({
      id: org.id,
      label: org.name,
      searchStr: org.name,
    }));
  }, [organizations]);

  const recipientDeptOptions: MultiSelectOption[] = useMemo(() => {
    return availableDepartments.map((dept) => ({
      id: dept.id,
      label: dept.shortName || dept.name,
      subLabel: dept.shortName ? dept.name : undefined,
      badge: dept.organizationName,
      searchStr: `${dept.name} ${dept.shortName || ''} ${dept.organizationName || ''}`,
    }));
  }, [availableDepartments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация обязательных полей по ТЗ
    if (!docTypeId) {
      setError('Поле «Тип документа» обязательно для заполнения');
      return;
    }
    if (!directionId) {
      setError('Поле «Направление» обязательно для заполнения');
      return;
    }
    if (!subject.trim()) {
      setError('Поле «Тема» обязательно для заполнения');
      return;
    }

    let formattedSedUrl = sedUrl.trim();
    if (formattedSedUrl && !/^https?:\/\//i.test(formattedSedUrl) && !formattedSedUrl.startsWith('http')) {
      formattedSedUrl = `https://${formattedSedUrl}`;
    }

    // Составляем названия подразделения и исполнителя отправителя
    const senderDept = departments.find((d) => d.id === senderDepartmentId);
    const senderDeptName = senderDept ? (senderDept.shortName || senderDept.name) : undefined;

    const senderEmp = employees.find((e) => e.id === senderEmployeeId);
    const senderEmpName = senderEmp ? senderEmp.fullName : undefined;

    // Подписавший сотрудник
    const signatoryEmp = employees.find((e) => e.id === signatoryEmployeeId);
    const signatoryEmpName = signatoryEmp ? signatoryEmp.fullName : undefined;

    // Составляем строку названий структурных подразделений
    const selectedDepts = departments.filter((d) => recipientDepartmentIds.includes(d.id));
    const recipientDeptNames = selectedDepts.map((d) => d.shortName || d.name).join(', ');

    // Названия выбранных организаций-получателей
    const selectedOrgs = organizations.filter((o) => recipientIds.includes(o.id));
    const recipientNames = selectedOrgs.map((o) => o.name).join(', ');

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initialData ? initialData.id : undefined,
        docTypeId: Number(docTypeId),
        directionId: Number(directionId),
        outgoingNumber: outgoingNumber.trim() || undefined,
        outgoingDate: outgoingDate.trim() || undefined,
        incomingNumber: incomingNumber.trim() || undefined,
        incomingDate: incomingDate.trim() || undefined,
        subject: subject.trim(),
        senderId: senderId ? Number(senderId) : undefined,
        senderDepartmentId: senderDepartmentId ? Number(senderDepartmentId) : undefined,
        senderDepartmentName: senderDeptName,
        senderEmployeeId: senderEmployeeId ? Number(senderEmployeeId) : undefined,
        senderEmployeeName: senderEmpName,
        signatoryEmployeeId: signatoryEmployeeId ? Number(signatoryEmployeeId) : undefined,
        signatoryEmployeeName: signatoryEmpName,
        // Для обратной совместимости сохраняем первого получателя в recipientId
        recipientId: recipientIds.length > 0 ? recipientIds[0] : undefined,
        recipientName: recipientNames || undefined,
        recipientIds: recipientIds.length > 0 ? recipientIds : undefined,
        recipientDepartmentIds: recipientDepartmentIds.length > 0 ? recipientDepartmentIds : undefined,
        recipientDepartmentNames: recipientDeptNames || undefined,
        filePath: filePath.trim() ? normalizeAstraPathForStorage(filePath.trim()).normalizedPath : undefined,
        sedUrl: formattedSedUrl || undefined,
        comments: comments.trim() || undefined,
        relatedDocIds: relatedDocIds.length > 0 ? relatedDocIds : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения документа');
    } finally {
      setSaving(false);
    }
  };

  // Вспомогательные данные для всплывающих подсказок (title) и предотвращения визуальных наложений
  const selectedDocType = documentTypes.find((t) => t.id === Number(docTypeId));
  const selectedDirection = directions.find((d) => d.id === Number(directionId));
  const selectedSenderOrg = organizations.find((o) => o.id === Number(senderId));
  const selectedSenderDept = departments.find((d) => d.id === Number(senderDepartmentId));
  const selectedSenderEmp = employees.find((e) => e.id === Number(senderEmployeeId));
  const selectedSignatoryEmp = employees.find((e) => e.id === Number(signatoryEmployeeId));

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMaximized ? 'p-1' : 'p-2 sm:p-4'} bg-black/75 backdrop-blur-xs animate-in fade-in duration-150`}>
      <div
        className={`bg-[#171A21] shadow-2xl border border-[#2D3139] overflow-hidden flex flex-col text-[#E0E0E0] transition-all duration-200 ${
          isMaximized
            ? 'w-[99vw] h-[98vh] rounded-xl'
            : 'w-[94vw] max-w-6xl max-h-[94vh] rounded-2xl'
        }`}
      >
        {/* Заголовок формы (двойной клик разворачивает окно) */}
        <div
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#2D3139] flex items-center justify-between bg-[#1F222B] shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#E0E0E0] truncate">
                {initialData ? `Редактирование карточки документа №${initialData.id}` : 'Регистрация нового документа'}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                Символом <span className="text-rose-400 font-bold">*</span> обозначены обязательные для заполнения поля
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

        {/* Тело формы с полосой прокрутки */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 sm:space-y-5 text-xs flex-1">
          
          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-900/60 rounded-xl text-xs text-rose-300 flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* 1. Блок классификации: Тип документа и Направление */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 min-w-0 w-full">
            <div className="min-w-0 w-full">
              <label className="block font-semibold text-gray-300 mb-1.5 flex items-center gap-1 min-w-0 truncate">
                <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Тип документа <span className="text-rose-400 font-bold">*</span></span>
              </label>
              <div className="flex gap-2 min-w-0 w-full items-center">
                <select
                  required
                  value={docTypeId}
                  onChange={(e) => setDocTypeId(e.target.value ? Number(e.target.value) : '')}
                  title={selectedDocType ? selectedDocType.name : undefined}
                  className="w-full min-w-0 flex-1 truncate px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 font-medium transition-colors"
                >
                  <option value="">-- Выберите тип документа --</option>
                  {documentTypes.map((t) => (
                    <option key={t.id} value={t.id} title={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onOpenNewDocTypeModal}
                  title="Добавить новый тип документа в справочник"
                  className="p-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="min-w-0 w-full">
              <label className="block font-semibold text-gray-300 mb-1.5 flex items-center gap-1 min-w-0 truncate">
                <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Направление <span className="text-rose-400 font-bold">*</span></span>
              </label>
              <div className="flex gap-2 min-w-0 w-full items-center">
                <select
                  required
                  value={directionId}
                  onChange={(e) => setDirectionId(e.target.value ? Number(e.target.value) : '')}
                  title={selectedDirection ? selectedDirection.name : undefined}
                  className="w-full min-w-0 flex-1 truncate px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 font-medium transition-colors"
                >
                  <option value="">-- Выберите направление --</option>
                  {directions.map((d) => (
                    <option key={d.id} value={d.id} title={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onOpenNewDirectionModal}
                  title="Добавить новое направление в справочник"
                  className="p-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Блок номеров и дат: Исходящие и Входящие с календарем */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 sm:p-4 bg-[#0F1115] rounded-xl border border-[#2D3139] min-w-0 w-full">
            <div className="min-w-0 w-full">
              <label className="block font-semibold text-gray-300 mb-1 truncate">
                Исх. №
              </label>
              <input
                type="text"
                value={outgoingNumber}
                onChange={(e) => setOutgoingNumber(e.target.value)}
                placeholder="Например: ИСХ-102/26"
                className="w-full min-w-0 px-3 py-2 bg-[#171A21] border border-[#2D3139] rounded-lg text-xs font-mono text-[#E0E0E0] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="min-w-0 w-full">
              <label className="block font-semibold text-gray-300 mb-1 flex items-center gap-1 min-w-0 truncate">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Исх. дата</span>
              </label>
              <input
                type="date"
                value={outgoingDate}
                onChange={(e) => setOutgoingDate(e.target.value)}
                className="w-full min-w-0 px-3 py-2 bg-[#171A21] border border-[#2D3139] rounded-lg text-xs font-mono text-[#E0E0E0] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="min-w-0 w-full">
              <label className="block font-semibold text-gray-300 mb-1 truncate">
                Вх. №
              </label>
              <input
                type="text"
                value={incomingNumber}
                onChange={(e) => setIncomingNumber(e.target.value)}
                placeholder="Например: ВХ-00452"
                className="w-full min-w-0 px-3 py-2 bg-[#171A21] border border-[#2D3139] rounded-lg text-xs font-mono text-[#E0E0E0] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="min-w-0 w-full">
              <label className="block font-semibold text-gray-300 mb-1 flex items-center gap-1 min-w-0 truncate">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Вх. дата</span>
              </label>
              <input
                type="date"
                value={incomingDate}
                onChange={(e) => setIncomingDate(e.target.value)}
                className="w-full min-w-0 px-3 py-2 bg-[#171A21] border border-[#2D3139] rounded-lg text-xs font-mono text-[#E0E0E0] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 3. Тема документа */}
          <div className="min-w-0 w-full">
            <label className="block font-semibold text-gray-300 mb-1.5 min-w-0 truncate">
              <span className="truncate">Тема (краткое содержание)</span> <span className="text-rose-400 font-bold">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Опишите краткое содержание или предмет документа..."
              className="w-full min-w-0 px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 4. Блок: Отправитель (Организация, СП, Исполнитель) */}
          <div className="p-3.5 sm:p-4 bg-[#0F1115] rounded-xl border border-[#2D3139] space-y-3 min-w-0 w-full">
            <div className="flex items-center justify-between min-w-0">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5 min-w-0 truncate">
                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Отправитель</span>
              </span>
              {(senderId || senderDepartmentId || senderEmployeeId || signatoryEmployeeId) && (
                <button
                  type="button"
                  onClick={() => {
                    setSenderId('');
                    setSenderDepartmentId('');
                    setSenderEmployeeId('');
                    setSignatoryEmployeeId('');
                  }}
                  className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Очистить отправителя
                </button>
              )}
            </div>

            {/* Организация */}
            <div className="min-w-0 w-full">
              <label className="block text-[11px] font-medium text-gray-400 mb-1 truncate">
                Организация
              </label>
              <SearchableCombobox
                id="sender-org-combobox"
                options={senderOrgOptions}
                value={senderId}
                onChange={handleSenderOrgChange}
                placeholder="-- Введите название или выберите организацию --"
                emptyMessage="Организации не найдены"
                onAddNew={onOpenNewOrgModal}
                addNewTitle="Добавить новую организацию в справочник"
              />
            </div>

            {/* Структурное подразделение */}
            <div className="min-w-0 w-full">
              <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1 min-w-0 truncate">
                  <Layers className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">Структурное подразделение</span>
                </label>
                {senderDepartmentId && (
                  <button
                    type="button"
                    onClick={() => setSenderDepartmentId('')}
                    className="text-[10px] text-gray-500 hover:text-rose-400 transition-colors shrink-0"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              <SearchableCombobox
                id="sender-dept-combobox"
                options={senderDeptOptions}
                value={senderDepartmentId}
                onChange={handleSenderDeptChange}
                placeholder="-- Введите название СП или выберите --"
                emptyMessage="Подразделения не найдены"
                onAddNew={onOpenNewDepartmentModal}
                addNewTitle="Добавить структурное подразделение в справочник"
              />
            </div>

            {/* Выбор Подписал и Исполнитель: адаптивная сетка с min-w-0, поиском с клавиатуры и возможностью выбора одного человека */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 pt-0.5 min-w-0 w-full">
              
              {/* Подписал (Сотрудник) */}
              <div className="min-w-0 w-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                  <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1 min-w-0 truncate">
                    <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">Подписал</span>
                  </label>
                  <div className="flex items-center gap-2 shrink-0">
                    {senderEmployeeId && signatoryEmployeeId !== senderEmployeeId && (
                      <button
                        type="button"
                        onClick={() => handleSignatoryEmployeeChange(senderEmployeeId)}
                        title="Выбрать того же человека, что указан исполнителем"
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                      >
                        Как у «Исполнитель»
                      </button>
                    )}
                    {senderEmployeeId && signatoryEmployeeId && senderEmployeeId === signatoryEmployeeId && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                        ✓ Тот же сотрудник
                      </span>
                    )}
                    {signatoryEmployeeId && (
                      <button
                        type="button"
                        onClick={() => setSignatoryEmployeeId('')}
                        className="text-[10px] text-gray-500 hover:text-rose-400 transition-colors"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                </div>
                <SearchableCombobox
                  id="signatory-emp-combobox"
                  options={signatoryOptions}
                  value={signatoryEmployeeId}
                  onChange={handleSignatoryEmployeeChange}
                  placeholder="-- Введите ФИО или выберите сотрудника --"
                  emptyMessage="Сотрудники не найдены"
                  onAddNew={() => {
                    setPendingEmployeeTarget('signatory');
                    onOpenNewEmployeeModal();
                  }}
                  addNewTitle="Добавить сотрудника в справочник"
                />
              </div>

              {/* Исполнитель (Сотрудник) */}
              <div className="min-w-0 w-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                  <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1 min-w-0 truncate">
                    <User className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="truncate">Исполнитель (Сотрудник)</span>
                  </label>
                  <div className="flex items-center gap-2 shrink-0">
                    {signatoryEmployeeId && senderEmployeeId !== signatoryEmployeeId && (
                      <button
                        type="button"
                        onClick={() => handleSenderEmployeeChange(signatoryEmployeeId)}
                        title="Выбрать того же человека, что подписал документ"
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        Как у «Подписал»
                      </button>
                    )}
                    {senderEmployeeId && signatoryEmployeeId && senderEmployeeId === signatoryEmployeeId && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                        ✓ Тот же сотрудник
                      </span>
                    )}
                    {senderEmployeeId && (
                      <button
                        type="button"
                        onClick={() => setSenderEmployeeId('')}
                        className="text-[10px] text-gray-500 hover:text-rose-400 transition-colors"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                </div>
                <SearchableCombobox
                  id="executor-emp-combobox"
                  options={executorOptions}
                  value={senderEmployeeId}
                  onChange={handleSenderEmployeeChange}
                  placeholder="-- Введите ФИО или выберите сотрудника --"
                  emptyMessage="Сотрудники не найдены"
                  onAddNew={() => {
                    setPendingEmployeeTarget('executor');
                    onOpenNewEmployeeModal();
                  }}
                  addNewTitle="Добавить сотрудника в справочник"
                />
              </div>

            </div>
          </div>

          {/* 5. ПОЛУЧАТЕЛЬ (Множественный выбор организаций) и СТРУКТУРНЫЕ ПОДРАЗДЕЛЕНИЯ ПОЛУЧАТЕЛЯ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 min-w-0 w-full">
            {/* 5.1 Множественный выбор: Получатель (Организации) с прямым поиском с клавиатуры */}
            <SearchableMultiSelect
              id="recipient-orgs-multiselect"
              label="Получатель (множественный выбор)"
              icon={<Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              options={recipientOrgOptions}
              selectedIds={recipientIds}
              onChange={setRecipientIds}
              placeholder="-- Введите название организации или выберите --"
              emptyMessage="Организации не найдены"
              onAddNew={onOpenNewOrgModal}
              addNewTitle="Добавить новую организацию в справочник"
              chipColor="blue"
            />

            {/* 5.2 Множественный выбор: Структурные подразделения для Получателя с прямым поиском с клавиатуры */}
            <SearchableMultiSelect
              id="recipient-depts-multiselect"
              label="СП для «Получателя» (множественный выбор)"
              icon={<Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              options={recipientDeptOptions}
              selectedIds={recipientDepartmentIds}
              onChange={setRecipientDepartmentIds}
              placeholder="-- Введите название или аббревиатуру СП --"
              emptyMessage={
                availableDepartments.length === 0
                  ? 'Для выбранных получателей нет СП в справочнике'
                  : 'Подразделения не найдены'
              }
              onAddNew={onOpenNewDepartmentModal}
              addNewTitle="Добавить структурное подразделение в справочник"
              chipColor="indigo"
            />
          </div>

          {/* 6. Путь к файлу/папке и ссылка на СЭД с иконкой вставки из буфера обмена */}
          <div className="space-y-3 min-w-0 w-full">
            {/* Путь к сетевой папке/файлу */}
            <div className="min-w-0 w-full">
              <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                <label className="font-semibold text-gray-300 flex items-center gap-1 min-w-0 truncate text-xs">
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Путь к документу (гиперссылка на сетевую папку или файл)</span>
                </label>
                {filePath && (
                  <button
                    type="button"
                    onClick={() => setFilePath('')}
                    className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                    title="Очистить поле пути"
                  >
                    Очистить
                  </button>
                )}
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 min-w-0 w-full items-center">
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => handleFilePathChange(e.target.value)}
                  placeholder="@nadym-dobycha.gazprom.ru/mnt/... или /home/user@nadym-dobycha.gazprom.ru/mnt/..."
                  className="flex-1 min-w-0 px-3.5 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs font-mono text-[#E0E0E0] placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleBrowseFile}
                    title="Открыть окно операционной среды для выбора конкретного файла"
                    className="px-3 py-2 bg-[#0F1115] hover:bg-[#1F222B] text-gray-300 hover:text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#2D3139] cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                    <span>Файл</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseFolder}
                    title="Открыть окно операционной среды для выбора папки с файлами"
                    className="px-3 py-2 bg-[#0F1115] hover:bg-[#1F222B] text-gray-300 hover:text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#2D3139] cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Папка</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Путь к документу в СЭД с кнопкой/иконкой вставки из буфера обмена */}
            <div className="min-w-0 w-full">
              <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                <label className="font-semibold text-gray-300 flex items-center gap-1 min-w-0 truncate">
                  <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Путь к документу в СЭД (гиперссылка в формате интернет браузера)</span>
                </label>
                {sedUrl && (
                  <button
                    type="button"
                    onClick={() => setSedUrl('')}
                    className="text-[11px] text-gray-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                  >
                    Очистить
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 min-w-0 w-full">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="url"
                    value={sedUrl}
                    onChange={(e) => setSedUrl(e.target.value)}
                    placeholder="https://sed.company.local/documents/card/12345"
                    className="w-full min-w-0 px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs font-mono text-[#E0E0E0] placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                {/* Иконка / кнопка вставки ссылки из буфера обмена */}
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  title="Вставить ссылку из буфера обмена"
                  className={`px-3.5 py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all border cursor-pointer shrink-0 ${
                    pastedFeedback
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-[#0F1115] hover:bg-[#1F222B] text-gray-300 hover:text-blue-400 border-[#2D3139] hover:border-blue-500/40'
                  }`}
                >
                  {pastedFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 animate-in zoom-in-50 duration-150 shrink-0" />
                      <span className="text-emerald-400 font-semibold whitespace-nowrap">Вставлено!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardPaste className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="whitespace-nowrap">Вставить из буфера</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 7. Дополнительные примечания и Связанные документы */}
          <div className="min-w-0 w-full">
            <div className="flex flex-col sm:flex-row items-end gap-3 min-w-0 w-full">
              <div className="flex-1 min-w-0 w-full">
                <label className="block font-semibold text-gray-300 mb-1 truncate">
                  Примечания и комментарии
                </label>
                <input
                  type="text"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Дополнительные сведения, резолюция, ответственный исполнитель..."
                  className="w-full min-w-0 px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 1.2: Справа от поля для ввода примечаний и комментариев кнопка "Добавить связанные документы" */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRelatedModalOpen(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white dark:bg-[#0F1115] dark:hover:bg-[#1F222B] dark:text-gray-200 dark:hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-blue-600 dark:border-[#2D3139] hover:border-blue-500/50 shadow-xs shadow-blue-500/20 dark:shadow-none transition-colors cursor-pointer whitespace-nowrap"
                  title="Открыть форму «Связанные документы»"
                >
                  <Link2 className="w-4 h-4 text-white dark:text-blue-400 shrink-0" />
                  <span>Добавить связанные документы</span>
                  {relatedDocIds.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-white/20 text-white border border-white/30 dark:bg-blue-600/30 dark:text-blue-300 dark:border-blue-500/40 rounded-full text-[11px] font-bold">
                      {relatedDocIds.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Отображение выбранных связанных документов */}
            {relatedDocIds.length > 0 && (
              <div className="mt-2.5 p-2.5 bg-blue-600 text-white border border-blue-500 dark:bg-[#0F1115]/80 dark:border-[#2D3139] dark:text-[#E0E0E0] rounded-xl shadow-xs shadow-blue-500/20 dark:shadow-none">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold text-white dark:text-gray-400 flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-white dark:text-blue-400" />
                    Выбранные связанные документы ({relatedDocIds.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setRelatedDocIds([])}
                    className="text-[10px] text-blue-100 hover:text-white dark:text-gray-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Очистить все
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {relatedDocIds.map((rId) => {
                    const rDoc = allDocuments.find((d) => d.id === rId);
                    const label = rDoc
                      ? `№${rDoc.id}${rDoc.outgoingNumber ? ` (Исх. ${rDoc.outgoingNumber})` : rDoc.incomingNumber ? ` (Вх. ${rDoc.incomingNumber})` : ''}: ${rDoc.subject}`
                      : `Документ №${rId}`;

                    return (
                      <span
                        key={rId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-700/60 border border-blue-400/40 text-white dark:bg-[#1F222B] dark:border-[#2D3139] dark:text-[#E0E0E0] rounded-lg text-xs max-w-xs truncate"
                        title={label}
                      >
                        <span className="truncate">{label}</span>
                        <button
                          type="button"
                          onClick={() => setRelatedDocIds((prev) => prev.filter((id) => id !== rId))}
                          className="text-blue-200 hover:text-white dark:text-gray-400 dark:hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                          title="Удалить связь"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Футер формы с кнопкой Сохранить */}
          <div className="pt-4 border-t border-[#2D3139] flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              id="btn-save-document"
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

      {/* 1.3: Модальная форма "Связанные документы" */}
      {isRelatedModalOpen && (
        <RelatedDocumentsModal
          isOpen={isRelatedModalOpen}
          onClose={() => setIsRelatedModalOpen(false)}
          currentDocId={initialData?.id}
          initialSelectedDocIds={relatedDocIds}
          onApply={(ids) => setRelatedDocIds(ids)}
          documents={allDocuments}
          documentTypes={documentTypes}
          directions={directions}
          organizations={organizations}
        />
      )}
    </div>
  );
};
