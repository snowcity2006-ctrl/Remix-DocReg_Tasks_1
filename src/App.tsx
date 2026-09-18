import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  BookOpen,
  Plus,
  RefreshCw,
  Database,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FolderSync,
  Archive,
  Terminal,
  CheckSquare,
  Link2,
  X,
} from 'lucide-react';
import {
  DocumentRecord,
  TaskRecord,
  Organization,
  Department,
  Employee,
  DocumentType,
  Direction,
  DbStatus,
  DocumentFilterState,
} from './types';
import { electronBridge } from './services/electronBridge';
import { getInterconnectedDocIds } from './utils/relatedDocs';
import { useTheme } from './hooks/useTheme';
import { formatDbTimestamp, formatDbUpdateDateTime } from './utils/date';
import { Navbar } from './components/Navbar';
import { DbConfigModal } from './components/DbConfigModal';
import { LogsModal } from './components/LogsModal';
import { DocumentFilters } from './components/documents/DocumentFilters';
import { DocumentTable } from './components/documents/DocumentTable';
import { DocumentFormModal } from './components/documents/DocumentFormModal';
import { DocumentCardModal } from './components/documents/DocumentCardModal';
import { DirectoriesView } from './components/directories/DirectoriesView';
import { OrganizationModal } from './components/directories/OrganizationModal';
import { DepartmentModal } from './components/directories/DepartmentModal';
import { EmployeeModal } from './components/directories/EmployeeModal';
import { DocTypeModal } from './components/directories/DocTypeModal';
import { DirectionModal } from './components/directories/DirectionModal';
import { TasksView } from './components/tasks/TasksView';
import { useZoom } from './hooks/useZoom';
import { ZoomIndicatorHUD } from './components/ZoomIndicatorHUD';

export default function App() {
  const { theme, setTheme } = useTheme();
  const { zoom, zoomPercent, showHud, zoomIn, zoomOut, resetZoom, closeHud } = useZoom();

  // Основная навигация: 'documents' | 'directories' | 'tasks'
  const [activeTab, setActiveTab] = useState<'documents' | 'directories' | 'tasks'>('documents');

  // Данные базы
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);

  // Фильтрация документов
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

  // Фильтр взаимосвязанных документов (клик по чекбоксу в таблице)
  const [activeRelatedFilterDocId, setActiveRelatedFilterDocId] = useState<number | null>(null);

  const handleToggleRelatedFilter = useCallback((docId: number) => {
    setActiveRelatedFilterDocId((prev) => (prev === docId ? null : docId));
  }, []);

  // Модальные окна
  const [dbConfigOpen, setDbConfigOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [docFormOpen, setDocFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);

  // Быстрое добавление справочников из модалок
  const [quickOrgModalOpen, setQuickOrgModalOpen] = useState(false);
  const [quickDeptModalOpen, setQuickDeptModalOpen] = useState(false);
  const [quickDeptInitialOrgId, setQuickDeptInitialOrgId] = useState<number | undefined>(undefined);
  const [quickEmpModalOpen, setQuickEmpModalOpen] = useState(false);
  const [quickDocTypeModalOpen, setQuickDocTypeModalOpen] = useState(false);
  const [quickDirectionModalOpen, setQuickDirectionModalOpen] = useState(false);

  // Уведомления (Toasts)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Состояние ручного обновления базы данных и времени синхронизации
  const [isRefreshingDb, setIsRefreshingDb] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  // Загрузка всех данных
  const loadAllData = useCallback(async () => {
    try {
      const [status, orgs, depts, emps, types, dirs, docs, tsks] = await Promise.all([
        electronBridge.getDbStatus(),
        electronBridge.getOrganizations(),
        electronBridge.getDepartments(),
        electronBridge.getEmployees(),
        electronBridge.getDocumentTypes(),
        electronBridge.getDirections(),
        electronBridge.getDocuments(),
        electronBridge.getTasks(),
      ]);

      setDbStatus(status);
      setOrganizations(orgs);
      setDepartments(depts);
      setEmployees(emps);
      setDocumentTypes(types);
      setDirections(dirs);
      setDocuments(docs);
      setTasks(tsks || []);
      if (status.lastUpdated) {
        setLastUpdateTime(formatDbUpdateDateTime(status.lastUpdated));
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      showNotification(`Ошибка загрузки данных: ${err.message}`, 'error');
    }
  }, []);

  // Ручное обновление базы данных по нажатию на кнопку в Navbar
  const handleManualRefresh = async () => {
    setIsRefreshingDb(true);
    try {
      // 1. Обновляем метку времени и регистрируем событие в базе данных SQLite
      const refreshRes = await electronBridge.refreshDb();

      // 2. Выполняем полную перезагрузку данных и статуса сетевого диска
      const [status, orgs, depts, emps, types, dirs, docs, tsks] = await Promise.all([
        electronBridge.getDbStatus(),
        electronBridge.getOrganizations(),
        electronBridge.getDepartments(),
        electronBridge.getEmployees(),
        electronBridge.getDocumentTypes(),
        electronBridge.getDirections(),
        electronBridge.getDocuments(),
        electronBridge.getTasks(),
      ]);

      const updatedTime = formatDbUpdateDateTime(refreshRes?.timestamp || status.lastUpdated || new Date());
      setLastUpdateTime(updatedTime);
      setDbStatus(status);
      setOrganizations(orgs);
      setDepartments(depts);
      setEmployees(emps);
      setDocumentTypes(types);
      setDirections(dirs);
      setDocuments(docs);
      setTasks(tsks || []);

      // 3. Синхронизируем открытые карточки и формы
      if (viewingDoc) {
        const freshDoc = docs.find((d) => d.id === viewingDoc.id);
        if (freshDoc) setViewingDoc(freshDoc);
      }
      if (editingDoc) {
        const freshDoc = docs.find((d) => d.id === editingDoc.id);
        if (freshDoc) setEditingDoc(freshDoc);
      }

      showNotification(`База данных успешно обновлена (${updatedTime})`, 'success');
    } catch (err: any) {
      console.error('Ошибка обновления базы данных:', err);
      showNotification(`Ошибка обновления БД: ${err.message}`, 'error');
    } finally {
      setIsRefreshingDb(false);
    }
  };

  // Загрузка при старте
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Периодическое обновление статуса БД (каждые 30 секунд для проверки сетевого диска)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await electronBridge.getDbStatus();
        setDbStatus(status);
      } catch (e) {
        console.error(e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Фильтрация документов на клиенте с оптимизацией поиска и мемоизацией
  const filteredDocuments = useMemo(() => {
    // При активном фильтре связанных документов отображаются только взаимосвязанные документы
    if (activeRelatedFilterDocId !== null) {
      const interconnectedIds = getInterconnectedDocIds(activeRelatedFilterDocId, documents);
      const interconnectedDocs = documents.filter((doc) => interconnectedIds.has(doc.id));

      const rawQuery = filters.searchQuery ? filters.searchQuery.trim().toLowerCase() : '';
      if (!rawQuery) {
        return interconnectedDocs;
      }

      return interconnectedDocs.filter((doc) => {
        return (
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
          String(doc.id).includes(rawQuery)
        );
      });
    }

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
            : doc.incomingDate || doc.outgoingDate;

        if (filters.dateFrom && (!docDate || docDate < filters.dateFrom)) return false;
        if (filters.dateTo && (!docDate || docDate > filters.dateTo)) return false;
      }

      if (filters.hasAttachment === true && !doc.filePath) {
        return false;
      }

      if (filters.hasSedLink === true && !doc.sedUrl) {
        return false;
      }

      return true;
    });
  }, [documents, filters, activeRelatedFilterDocId]);

  // CRUD для документов
  const handleSaveDocument = useCallback(async (docData: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => {
    try {
      const saved = await electronBridge.saveDocument(docData);
      showNotification(docData.id ? `Документ №${saved.id} успешно обновлен` : `Документ №${saved.id} успешно зарегистрирован`);
      setEditingDoc(null);
      await loadAllData();
    } catch (err: any) {
      showNotification(`Ошибка сохранения документа: ${err.message}`, 'error');
      throw err;
    }
  }, [loadAllData]);

  const handleDeleteDocument = useCallback(async (id: number) => {
    try {
      await electronBridge.deleteDocument(id);
      showNotification(`Документ №${id} удален`);
      await loadAllData();
    } catch (err: any) {
      showNotification(`Ошибка удаления: ${err.message}`, 'error');
      throw err;
    }
  }, [loadAllData]);

  // CRUD для Задач
  const handleSaveTask = useCallback(async (taskData: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => {
    try {
      const saved = await electronBridge.saveTask(taskData);
      showNotification(taskData.id ? `Задача №${saved.id} обновлена` : `Задача №${saved.id} создана`);
      await loadAllData();
    } catch (err: any) {
      showNotification(`Ошибка сохранения задачи: ${err.message}`, 'error');
      throw err;
    }
  }, [loadAllData]);

  const handleSaveTasks = useCallback(async (taskList: Array<Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const created = await electronBridge.saveTasks(taskList);
      showNotification(`Успешно создано задач: ${created.length} (для каждого выбранного исполнителя)`);
      await loadAllData();
    } catch (err: any) {
      showNotification(`Ошибка сохранения задач: ${err.message}`, 'error');
      throw err;
    }
  }, [loadAllData]);

  const handleDeleteTask = useCallback(async (id: number) => {
    try {
      await electronBridge.deleteTask(id);
      showNotification(`Задача №${id} удалена`);
      await loadAllData();
    } catch (err: any) {
      showNotification(`Ошибка удаления задачи: ${err.message}`, 'error');
      throw err;
    }
  }, [loadAllData]);

  const handleToggleTaskCheck = useCallback(async (id: number, field: 'isCompleted' | 'isAccepted', value: boolean) => {
    try {
      await electronBridge.toggleTaskCheck(id, field, value);
      await loadAllData();
    } catch (err: any) {
      showNotification(`Ошибка изменения статуса задачи: ${err.message}`, 'error');
      throw err;
    }
  }, [loadAllData]);

  // CRUD для Справочников: Организации
  const handleSaveOrg = useCallback(async (orgData: Omit<Organization, 'id'> & { id?: number }) => {
    const saved = await electronBridge.saveOrganization(orgData);
    showNotification(orgData.id ? `Организация «${saved.name}» обновлена` : `Организация «${saved.name}» добавлена`);
    await loadAllData();
  }, [loadAllData]);

  const handleDeleteOrg = useCallback(async (id: number) => {
    await electronBridge.deleteOrganization(id);
    showNotification('Организация удалена');
    await loadAllData();
  }, [loadAllData]);

  // CRUD: Подразделения
  const handleSaveDept = useCallback(async (deptData: Omit<Department, 'id'> & { id?: number }) => {
    const saved = await electronBridge.saveDepartment(deptData);
    showNotification(deptData.id ? `Подразделение «${saved.shortName}» обновлено` : `Подразделение «${saved.shortName}» добавлено`);
    await loadAllData();
  }, [loadAllData]);

  const handleDeleteDept = useCallback(async (id: number) => {
    await electronBridge.deleteDepartment(id);
    showNotification('Подразделение удалено');
    await loadAllData();
  }, [loadAllData]);

  // CRUD: Сотрудники
  const handleSaveEmp = useCallback(async (empData: Omit<Employee, 'id'> & { id?: number }) => {
    const saved = await electronBridge.saveEmployee(empData);
    showNotification(empData.id ? `Сотрудник «${saved.fullName}» обновлен` : `Сотрудник «${saved.fullName}» добавлен`);
    await loadAllData();
  }, [loadAllData]);

  const handleDeleteEmp = useCallback(async (id: number) => {
    await electronBridge.deleteEmployee(id);
    showNotification('Сотрудник удален');
    await loadAllData();
  }, [loadAllData]);

  // CRUD: Типы документов
  const handleSaveDocType = useCallback(async (typeData: Omit<DocumentType, 'id'> & { id?: number }) => {
    const saved = await electronBridge.saveDocumentType(typeData);
    showNotification(typeData.id ? `Тип документа «${saved.name}» обновлен` : `Тип документа «${saved.name}» добавлен`);
    await loadAllData();
  }, [loadAllData]);

  const handleDeleteDocType = useCallback(async (id: number) => {
    await electronBridge.deleteDocumentType(id);
    showNotification('Тип документа удален');
    await loadAllData();
  }, [loadAllData]);

  // CRUD: Направления
  const handleSaveDir = useCallback(async (dirData: Omit<Direction, 'id'> & { id?: number }) => {
    const saved = await electronBridge.saveDirection(dirData);
    showNotification(dirData.id ? `Направление «${saved.name}» обновлено` : `Направление «${saved.name}» добавлено`);
    await loadAllData();
  }, [loadAllData]);

  const handleDeleteDir = useCallback(async (id: number) => {
    await electronBridge.deleteDirection(id);
    showNotification('Направление удалено');
    await loadAllData();
  }, [loadAllData]);

  // Резервное копирование
  const handleCreateBackup = async () => {
    try {
      const backupPath = await electronBridge.createBackup();
      showNotification(`Резервная копия успешно создана в: ${backupPath}`);
    } catch (e: any) {
      showNotification(`Ошибка создания бэкапа: ${e.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E0E0E0] flex flex-col font-sans transition-colors duration-200 antialiased">
      
      {/* Главная навигационная панель со статусом сетевой БД */}
      <Navbar
        dbStatus={dbStatus}
        theme={theme}
        onThemeChange={setTheme}
        onOpenDbConfig={() => setDbConfigOpen(true)}
        onOpenLogs={() => setLogsModalOpen(true)}
        onRefreshData={handleManualRefresh}
        onRefreshDb={handleManualRefresh}
        refreshing={isRefreshingDb}
        lastUpdateTime={lastUpdateTime || dbStatus?.lastUpdated}
        onCreateBackup={handleCreateBackup}
      />

      {/* Тост уведомлений */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5 fade-in duration-200 ${
            notification.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-900 shadow-rose-950/40'
              : notification.type === 'info'
              ? 'bg-[#171A21] text-[#E0E0E0] border-[#2D3139]'
              : 'bg-emerald-950 text-emerald-200 border-emerald-900 shadow-emerald-950/40'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Основной контент на всю ширину экрана */}
      <main className="flex-1 w-full px-3 sm:px-4 py-3 sm:py-4 space-y-4">
        
        {/* Панель переключения разделов и быстрая регистрация документа */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#171A21] p-3 rounded-2xl border border-[#2D3139] shadow-xs">
          
          <div className="flex items-center gap-1.5 bg-[#0F1115] p-1 rounded-xl border border-[#2D3139]">
            <button
              id="tab-nav-documents"
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-[#1F222B] text-blue-400 shadow-xs'
                  : 'text-gray-400 hover:text-[#E0E0E0]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Документооборот</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-600/10 text-blue-400 border border-blue-500/20 font-mono">
                {documents.length}
              </span>
            </button>

            <button
              id="tab-nav-tasks"
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-[#1F222B] text-blue-400 shadow-xs'
                  : 'text-gray-400 hover:text-[#E0E0E0]'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Задачи</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-600/10 text-blue-400 border border-blue-500/20 font-mono">
                {tasks.length}
              </span>
            </button>

            <button
              id="tab-nav-directories"
              onClick={() => setActiveTab('directories')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'directories'
                  ? 'bg-[#1F222B] text-blue-400 shadow-xs'
                  : 'text-gray-400 hover:text-[#E0E0E0]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Справочники</span>
            </button>
          </div>

          {/* Кнопка действия в зависимости от активного таба */}
          <div className="flex items-center gap-2">
            {activeTab === 'documents' && (
              <button
                id="btn-register-document"
                onClick={() => {
                  setEditingDoc(null);
                  setDocFormOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Регистрация документа</span>
              </button>
            )}
          </div>
        </div>

        {/* Раздел 1: Реестр документов */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            
            {/* Панель фильтров и поиска */}
            <DocumentFilters
              filters={filters}
              onChange={setFilters}
              documentTypes={documentTypes}
              directions={directions}
              organizations={organizations}
              totalCount={documents.length}
              filteredCount={filteredDocuments.length}
            />

            {/* Информационная плашка активного фильтра связанных документов */}
            {activeRelatedFilterDocId !== null && (
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-blue-300 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">
                    Отображаются взаимосвязанные документы для документа №<strong>{activeRelatedFilterDocId}</strong> ({filteredDocuments.length} из {documents.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRelatedFilterDocId(null)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs shadow-blue-500/20 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                  <span>Сбросить фильтр связей</span>
                </button>
              </div>
            )}

            {/* Таблица документов */}
            <DocumentTable
              documents={filteredDocuments}
              allDocuments={documents}
              activeRelatedFilterDocId={activeRelatedFilterDocId}
              onToggleRelatedFilter={handleToggleRelatedFilter}
              onView={(doc) => setViewingDoc(doc)}
              onEdit={(doc) => {
                setEditingDoc(doc);
                setDocFormOpen(true);
              }}
              onDelete={handleDeleteDocument}
            />
          </div>
        )}

        {/* Раздел 2: Модуль задач */}
        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            employees={employees}
            onSaveTask={handleSaveTask}
            onSaveTasks={handleSaveTasks}
            onDeleteTask={handleDeleteTask}
            onToggleTaskCheck={handleToggleTaskCheck}
            onOpenNewEmployeeModal={() => setQuickEmpModalOpen(true)}
            showNotification={showNotification}
          />
        )}

        {/* Раздел 3: Модуль справочников */}
        {activeTab === 'directories' && (
          <DirectoriesView
            organizations={organizations}
            departments={departments}
            employees={employees}
            documentTypes={documentTypes}
            directions={directions}
            onSaveOrg={handleSaveOrg}
            onDeleteOrg={handleDeleteOrg}
            onSaveDept={handleSaveDept}
            onDeleteDept={handleDeleteDept}
            onSaveEmp={handleSaveEmp}
            onDeleteEmp={handleDeleteEmp}
            onSaveDocType={handleSaveDocType}
            onDeleteDocType={handleDeleteDocType}
            onSaveDir={handleSaveDir}
            onDeleteDir={handleDeleteDir}
          />
        )}

      </main>

      {/* Подвал приложения */}
      <footer className="border-t border-[#2D3139] py-3 px-4 sm:px-6 bg-[#171A21]/70 text-gray-400 text-xs w-full">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#E0E0E0]">
              СЭД «Документооборот ОПР»
            </span>
            <span>•</span>
            <span className="font-mono text-[11px]">SQLite Network Share Edition</span>
            <span>•</span>
            <span className="text-blue-400 font-medium">
              Astra Linux 1.7 / 1.8 Ready
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span>Блокировка busy_timeout: <strong>5000 мс</strong></span>
            <span>•</span>
            <span>Режим журнала: <strong>DELETE (Network Safe)</strong></span>
            <span>•</span>
            {/* Элемент управления масштабом интерфейса (шаг 5%) */}
            <div className="flex items-center gap-1 bg-[#0F1115] px-2 py-0.5 rounded-lg border border-[#2D3139] text-xs select-none">
              <span className="text-[10px] text-gray-400 mr-0.5">Масштаб:</span>
              <button
                type="button"
                onClick={zoomOut}
                title="Уменьшить масштаб на 5% (Ctrl + колёсико вниз или Ctrl + -)"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#2D3139] text-gray-300 hover:text-white cursor-pointer font-bold text-xs transition-colors"
              >
                −
              </button>
              <button
                type="button"
                onClick={resetZoom}
                title="Текущий масштаб. Кликните для сброса к 100% (Ctrl + 0)"
                className="px-1.5 font-mono text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
              >
                {zoomPercent}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                title="Увеличить масштаб на 5% (Ctrl + колёсико вверх или Ctrl + +)"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#2D3139] text-gray-300 hover:text-white cursor-pointer font-bold text-xs transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Модальное окно настройки БД */}
      <DbConfigModal
        isOpen={dbConfigOpen}
        onClose={() => setDbConfigOpen(false)}
        onSaved={handleManualRefresh}
      />

      {/* Модальное окно журнала логов */}
      <LogsModal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
      />

      {/* Модальное окно формы документа */}
      <DocumentFormModal
        isOpen={docFormOpen}
        onClose={() => {
          setDocFormOpen(false);
          setEditingDoc(null);
        }}
        onSave={handleSaveDocument}
        documentTypes={documentTypes}
        directions={directions}
        organizations={organizations}
        departments={departments}
        employees={employees}
        onOpenNewOrgModal={() => setQuickOrgModalOpen(true)}
        onOpenNewDepartmentModal={() => setQuickDeptModalOpen(true)}
        onOpenNewEmployeeModal={() => setQuickEmpModalOpen(true)}
        onOpenNewDocTypeModal={() => setQuickDocTypeModalOpen(true)}
        onOpenNewDirectionModal={() => setQuickDirectionModalOpen(true)}
        initialData={editingDoc}
        allDocuments={documents}
      />

      {/* Модальное окно просмотра карточки документа */}
      <DocumentCardModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
        allDocuments={documents}
        onViewDoc={(doc) => setViewingDoc(doc)}
        onEdit={(doc) => {
          setEditingDoc(doc);
          setDocFormOpen(true);
        }}
      />

      {/* Быстрое добавление организации из форм */}
      <OrganizationModal
        isOpen={quickOrgModalOpen}
        onClose={() => setQuickOrgModalOpen(false)}
        existingOrganizations={organizations}
        onSave={async (orgData) => {
          await handleSaveOrg(orgData);
          setQuickOrgModalOpen(false);
        }}
      />

      {/* Быстрое добавление структурного подразделения */}
      <DepartmentModal
        isOpen={quickDeptModalOpen}
        onClose={() => {
          setQuickDeptModalOpen(false);
          setQuickDeptInitialOrgId(undefined);
        }}
        organizations={organizations}
        existingDepartments={departments}
        defaultOrganizationId={quickDeptInitialOrgId}
        onOpenNewOrgModal={() => setQuickOrgModalOpen(true)}
        onSave={async (deptData) => {
          await handleSaveDept(deptData);
          setQuickDeptModalOpen(false);
          setQuickDeptInitialOrgId(undefined);
        }}
      />

      {/* Быстрое добавление сотрудника */}
      <EmployeeModal
        isOpen={quickEmpModalOpen}
        onClose={() => setQuickEmpModalOpen(false)}
        departments={departments}
        organizations={organizations}
        onOpenNewOrgModal={() => setQuickOrgModalOpen(true)}
        onOpenNewDepartmentModal={(orgId) => {
          setQuickDeptInitialOrgId(orgId);
          setQuickDeptModalOpen(true);
        }}
        onSave={async (empData) => {
          await handleSaveEmp(empData);
          setQuickEmpModalOpen(false);
        }}
      />

      {/* Быстрое добавление типа документа */}
      <DocTypeModal
        isOpen={quickDocTypeModalOpen}
        onClose={() => setQuickDocTypeModalOpen(false)}
        existingTypes={documentTypes}
        onSave={async (typeData) => {
          await handleSaveDocType(typeData);
          setQuickDocTypeModalOpen(false);
        }}
      />

      {/* Быстрое добавление направления */}
      <DirectionModal
        isOpen={quickDirectionModalOpen}
        onClose={() => setQuickDirectionModalOpen(false)}
        existingDirections={directions}
        onSave={async (dirData) => {
          await handleSaveDir(dirData);
          setQuickDirectionModalOpen(false);
        }}
      />

      {/* Всплывающий индикатор масштабирования при Ctrl+колёсико мыши (шаг 5%) */}
      <ZoomIndicatorHUD
        zoomPercent={zoomPercent}
        showHud={showHud}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onClose={closeHud}
      />

    </div>
  );
}
