/**
 * Типы данных для системы учета документооборота
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Organization {
  id: number;
  name: string; // Организация (обязательно *)
  director?: string; // Руководитель
  email?: string; // e-mail
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: number;
  name: string; // Структурное подразделение (обязательно *)
  shortName: string; // Сокращенное название СП (обязательно *)
  organizationId: number; // Организация (обязательно *)
  organizationName?: string; // Название организации для отображения
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: number;
  fullName: string; // Сотрудник (обязательно *)
  position?: string; // Должность (по ТЗ)
  departmentShortName: string; // Сокращенное название СП (обязательно *)
  organizationId: number; // Организация (обязательно *)
  organizationName?: string; // Название организации для отображения
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentType {
  id: number;
  name: string; // Тип документа (обязательно *)
  createdAt?: string;
  updatedAt?: string;
}

export interface Direction {
  id: number;
  name: string; // Направление (обязательно *)
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskRecord {
  id: number;
  task: string; // Задача (обязательно *)
  plannedEndDate: string; // Плановая дата окончания (ГГГГ-ММ-ДД, обязательно *)
  actualEndDate?: string; // Фактическая дата окончания (ГГГГ-ММ-ДД)
  isCompleted: boolean; // Выполнено (CheckBox)
  isAccepted: boolean; // Принято (CheckBox)
  frozenDaysRemaining?: number | null; // Зафиксированное кол-во дней при установке "Принято"
  assigneeId?: number | null; // Исполнитель (id сотрудника из справочника "Сотрудники")
  assigneeName?: string; // ФИО исполнителя
  result?: string; // Результат
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskFilterState {
  searchQuery: string;
  isCompleted?: boolean | null; // null = все, true = да, false = нет
  isAccepted?: boolean | null; // null = все, true = да, false = нет
  assigneeId?: number | null; // Совместимость
  assigneeIds: number[]; // Множественный выбор исполнителей
  daysRemainingType?: 'all' | 'overdue' | 'today' | 'upcoming' | 'custom';
  daysMin?: number;
  daysMax?: number;
  status?: 'all' | 'in_progress' | 'completed' | 'accepted' | 'due_today' | 'overdue';
  plannedFrom?: string;
  plannedTo?: string;
}

export interface DocumentRecord {
  id: number;
  docTypeId: number; // Тип документа (обязательно *)
  docTypeName?: string;
  directionId: number; // Направление (обязательно *)
  directionName?: string;
  outgoingNumber?: string; // Исх.№
  outgoingDate?: string; // Исх.дата (ГГГГ-ММ-ДД)
  incomingNumber?: string; // Вх.№
  incomingDate?: string; // Вх.дата (ГГГГ-ММ-ДД)
  subject: string; // Тема (обязательно *)
  senderId?: number; // Отправитель (Организация)
  senderName?: string;
  senderDepartmentId?: number; // Структурное подразделение отправителя
  senderDepartmentName?: string; // Название/краткое наименование СП отправителя
  senderEmployeeId?: number; // Исполнитель (Сотрудник отправителя)
  senderEmployeeName?: string; // ФИО исполнителя
  signatoryEmployeeId?: number; // Подписал (Сотрудник)
  signatoryEmployeeName?: string; // ФИО подписавшего
  recipientId?: number; // Получатель (Организация, первый/основной)
  recipientName?: string;
  recipientIds?: number[]; // Множественный выбор получателей (Организаций)
  recipientDepartmentIds?: number[]; // Множественный выбор структурных подразделений получателя
  recipientDepartmentNames?: string; // Названия структурных подразделений получателя
  filePath?: string; // Путь к документу (гиперссылка на папку или файл)
  sedUrl?: string; // Путь к документу в СЭД (гиперссылка в формате интернет браузера)
  comments?: string;
  relatedDocIds?: number[]; // Связанные документы (ID взаимосвязанных документов)
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseConfig {
  dbPath: string; // Путь к файлу .sqlite (сетевой или локальный)
  busyTimeout: number; // busy_timeout в мс (по умолчанию 5000)
  autoBackupOnStart: boolean;
  backupFolder: string;
  isNetworkPath: boolean;
  isAccessible: boolean;
  lastConnected?: string;
  syncMode?: 'auto' | 'direct' | 'cache_sync';
  isUsingLocalCache?: boolean;
  astraDefaultUser?: string;
}

export interface DbStatus {
  lastUpdated: string;
  isNetwork: boolean;
  isAccessible: boolean;
  path: string;
  busyTimeout: number;
  mountWarning?: string;
  isUsingLocalCache?: boolean;
  syncMode?: 'auto' | 'direct' | 'cache_sync';
  hasNobrl?: boolean;
}

export interface BackupFileInfo {
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
  isAuto: boolean;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: 'main' | 'db' | 'ipc' | 'ui' | 'backup' | 'network';
  message: string;
  details?: any;
}

export interface ColumnConfig {
  id: keyof DocumentRecord | 'actions';
  label: string;
  width: number;
  minWidth: number;
  visible: boolean;
  sortable: boolean;
}

export interface DocumentFilterState {
  searchQuery: string;
  docTypeId: number | null;
  directionId: number | null;
  senderId: number | null;
  recipientId: number | null;
  dateType: 'incoming' | 'outgoing' | 'created' | 'all';
  dateFrom: string;
  dateTo: string;
  hasAttachment: boolean | null;
  hasSedLink: boolean | null;
}

export interface ElectronAPI {
  // База данных
  getDbConfig: () => Promise<DatabaseConfig>;
  getDbStatus: () => Promise<DbStatus>;
  setDbPath: (path: string) => Promise<{ success: boolean; message: string; config?: DatabaseConfig }>;
  saveDbConfig: (config: Partial<DatabaseConfig>) => Promise<{ success: boolean; message: string; config?: DatabaseConfig }>;
  testDbConnection: (path?: string) => Promise<{
    success: boolean;
    message: string;
    isNetwork?: boolean;
    pingMs?: number;
    hasNobrl?: boolean;
    isCifs?: boolean;
    writeLockOk?: boolean;
    mountWarning?: string;
    recommendedMode?: 'direct' | 'cache_sync';
  }>;
  refreshDb: () => Promise<{ success: boolean; timestamp: string }>;
  
  // Справочники
  getOrganizations: () => Promise<Organization[]>;
  saveOrganization: (org: Omit<Organization, 'id'> & { id?: number }) => Promise<Organization>;
  deleteOrganization: (id: number) => Promise<{ success: boolean }>;

  getDepartments: () => Promise<Department[]>;
  saveDepartment: (dept: Omit<Department, 'id'> & { id?: number }) => Promise<Department>;
  deleteDepartment: (id: number) => Promise<{ success: boolean }>;

  getEmployees: () => Promise<Employee[]>;
  saveEmployee: (emp: Omit<Employee, 'id'> & { id?: number }) => Promise<Employee>;
  deleteEmployee: (id: number) => Promise<{ success: boolean }>;

  getDocumentTypes: () => Promise<DocumentType[]>;
  saveDocumentType: (type: Omit<DocumentType, 'id'> & { id?: number }) => Promise<DocumentType>;
  deleteDocumentType: (id: number) => Promise<{ success: boolean }>;

  getDirections: () => Promise<Direction[]>;
  saveDirection: (dir: Omit<Direction, 'id'> & { id?: number }) => Promise<Direction>;
  deleteDirection: (id: number) => Promise<{ success: boolean }>;

  // Документы
  getDocuments: () => Promise<DocumentRecord[]>;
  getDocumentById: (id: number) => Promise<DocumentRecord | null>;
  saveDocument: (doc: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<DocumentRecord>;
  deleteDocument: (id: number) => Promise<{ success: boolean }>;

  // Задачи
  getTasks: () => Promise<TaskRecord[]>;
  getTaskById: (id: number) => Promise<TaskRecord | null>;
  saveTask: (task: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<TaskRecord>;
  saveTasks: (tasks: Array<Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<TaskRecord[]>;
  deleteTask: (id: number) => Promise<{ success: boolean }>;
  toggleTaskCheck: (id: number, field: 'isCompleted' | 'isAccepted', value: boolean) => Promise<TaskRecord>;

  // Бэкап
  createBackup: (isAuto?: boolean) => Promise<{ success: boolean; backupPath: string; message: string }>;
  getBackupsList: () => Promise<BackupFileInfo[]>;
  restoreBackup: (backupPath: string) => Promise<{ success: boolean; message: string }>;

  // Файловая система и ОС диалоги
  selectDatabaseFile: () => Promise<string | null>;
  selectDatabaseFolder: () => Promise<string | null>;
  selectBackupFolder: () => Promise<string | null>;
  selectDocumentFile: () => Promise<string | null>;
  selectDocumentFolder: () => Promise<string | null>;
  selectDocumentFileOrFolder: () => Promise<string | null>;
  showSaveExcelDialog?: (defaultFileName: string) => Promise<string | null>;
  selectExportFolder?: (title?: string) => Promise<string | null>;
  saveFiles?: (files: Array<{ filePath: string; base64Data: string }>) => Promise<{ success: boolean; savedPaths?: string[]; message?: string }>;
  openPath: (path: string) => Promise<{ success: boolean; message?: string }>;
  openExternal: (url: string) => Promise<{ success: boolean; message?: string }>;

  // Логирование
  getLogs: (limit?: number) => Promise<LogEntry[]>;
  addLog: (level: LogLevel, source: LogEntry['source'], message: string, details?: any) => Promise<void>;
  exportLogs: () => Promise<{ success: boolean; path?: string }>;
  clearLogs: () => Promise<void>;

  // Системная информация и масштабирование
  getSystemInfo: () => Promise<{ platform: string; isAstraLinux: boolean; version: string; isElectron: boolean }>;
  getCurrentUser?: () => Promise<string | null>;
  setCurrentUser?: (username: string) => Promise<void>;
  setZoomFactor?: (factor: number) => void;
  getZoomFactor?: () => number;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
