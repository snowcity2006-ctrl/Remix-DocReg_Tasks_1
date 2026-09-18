/**
 * Мост взаимодействия с Main-процессом Electron и Web-адаптер для режима предварительного просмотра
 */
import {
  Organization,
  Department,
  Employee,
  DocumentType,
  Direction,
  DocumentRecord,
  TaskRecord,
  DatabaseConfig,
  BackupFileInfo,
  LogEntry,
  LogLevel,
  ElectronAPI
} from '../types';
import { formatDbTimestamp } from '../utils/date';
import {
  normalizeAstraPathForStorage,
  resolveAstraPathForOpening,
  getAstraCurrentUser,
  setAstraCurrentUser,
} from '../utils/astraPath';
import { calculateDaysRemaining, getLocalTodayDateString } from '../utils/taskUtils';

const STORAGE_KEYS = {
  DB_CONFIG: 'docflow_db_config',
  ORGANIZATIONS: 'docflow_organizations',
  DEPARTMENTS: 'docflow_departments',
  EMPLOYEES: 'docflow_employees',
  DOC_TYPES: 'docflow_doc_types',
  DIRECTIONS: 'docflow_directions',
  DOCUMENTS: 'docflow_documents',
  TASKS: 'docflow_tasks',
  BACKUPS: 'docflow_backups',
  LOGS: 'docflow_logs',
  LAST_UPDATE: 'docflow_last_update_time',
};

// Начальные данные для инициализации базы данных
const INITIAL_DATA = {
  organizations: [
    { id: 1, name: 'АО «НПО РусБИТех» (Astra Linux)', director: 'Буравой С. М.', email: 'info@rusbitech.ru' },
    { id: 2, name: 'ПАО «Ростелеком»', director: 'Осеевский М. Э.', email: 'corp@rostelecom.ru' },
    { id: 3, name: 'Министерство цифрового развития РФ', director: 'Шадаев М. И.', email: 'press@digital.gov.ru' },
    { id: 4, name: 'ООО «Газпром Автоматизация»', director: 'Попов В. А.', email: 'office@gazprom-auto.ru' },
    { id: 5, name: 'ГК «Астра»', director: 'Сивцев И. И.', email: 'contact@astra.ru' },
  ],
  departments: [
    { id: 1, name: 'Управление делами и документооборота', shortName: 'УДО', organizationId: 1 },
    { id: 2, name: 'Отдел информационной безопасности', shortName: 'ОИБ', organizationId: 1 },
    { id: 3, name: 'Юридический департамент', shortName: 'ЮД', organizationId: 1 },
    { id: 4, name: 'Департамент системной интеграции', shortName: 'ДСИ', organizationId: 2 },
    { id: 5, name: 'Отдел технической поддержки', shortName: 'ОТП', organizationId: 5 },
  ],
  employees: [
    { id: 1, fullName: 'Иванов Иван Иванович', position: 'Главный специалист', departmentShortName: 'УДО', organizationId: 1 },
    { id: 2, fullName: 'Смирнова Елена Александровна', position: 'Начальник отдела', departmentShortName: 'ОИБ', organizationId: 1 },
    { id: 3, fullName: 'Кузнецов Алексей Владимирович', position: 'Ведущий юрисконсульт', departmentShortName: 'ЮД', organizationId: 1 },
    { id: 4, fullName: 'Петров Сергей Николаевич', position: 'Системный архитектор', departmentShortName: 'ДСИ', organizationId: 2 },
    { id: 5, fullName: 'Васильева Ольга Дмитриевна', position: 'Инженер техподдержки', departmentShortName: 'ОТП', organizationId: 5 },
  ],
  docTypes: [
    { id: 1, name: 'Входящее письмо' },
    { id: 2, name: 'Исходящий запрос' },
    { id: 3, name: 'Приказ' },
    { id: 4, name: 'Распоряжение' },
    { id: 5, name: 'Договор' },
    { id: 6, name: 'Акт приема-передачи' },
    { id: 7, name: 'Служебная записка' },
  ],
  directions: [
    { id: 1, name: 'Входящие' },
    { id: 2, name: 'Исходящие' },
    { id: 3, name: 'Внутренние' },
    { id: 4, name: 'Нормативно-распорядительные' },
  ],
  documents: [
    {
      id: 1,
      docTypeId: 1,
      directionId: 1,
      outgoingNumber: '102_30-6856',
      outgoingDate: '2026-09-02',
      incomingNumber: 'ВХ-00452',
      incomingDate: '2026-09-04',
      subject: 'О результатах рассм. пд втд (Кор-ка по втдответ в ГИФн)',
      senderId: 3,
      recipientId: 1,
      filePath: '@nadym-dobycha.gazprom.ru/mnt/centr/onp/экспертиза/5. ХГКМ/0825 ГПП/7. ПД/2026.08.21 Кор-ка по втдответ в ГИФн/исх. в ГиФн от 02.09.2026 102_30-6856 _0 результатах рассм.пд втд.pdf',
      sedUrl: 'https://sed.company.local/docs/card/45291',
      comments: 'Сетевая ссылка Astra Linux 1.7: при открытии на ПК автоматически подставляется /home/<пользователь>',
      relatedDocIds: [3],
      createdAt: '2026-09-02T09:15:00.000Z',
      updatedAt: '2026-09-02T09:15:00.000Z',
    },
    {
      id: 2,
      docTypeId: 2,
      directionId: 2,
      outgoingNumber: 'ИСХ-0089/26',
      outgoingDate: '2026-08-25',
      incomingNumber: '',
      incomingDate: '',
      subject: 'Запрос коммерческого предложения на поставку серверных лицензий Astra Linux 1.8',
      senderId: 1,
      recipientId: 5,
      filePath: '/mnt/network_share/documents/2026/08/Request_Astra_Licenses.docx',
      sedUrl: 'https://sed.company.local/docs/card/45312',
      comments: 'Срок ответа до 10.09.2026',
      createdAt: '2026-08-25T11:30:00.000Z',
      updatedAt: '2026-08-25T11:30:00.000Z',
    },
    {
      id: 3,
      docTypeId: 3,
      directionId: 4,
      outgoingNumber: 'ПР-45/ОД',
      outgoingDate: '2026-09-01',
      incomingNumber: '',
      incomingDate: '',
      subject: 'О вводе в промышленную эксплуатацию автономной системы учета документооборота',
      senderId: 1,
      recipientId: 1,
      filePath: '/mnt/network_share/orders/2026/Order_45_Docflow_Deploy.pdf',
      sedUrl: 'https://sed.company.local/orders/45-od',
      comments: 'Ответственным за сопровождение сетевой БД назначен отдел ОИБ',
      relatedDocIds: [1],
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 4,
      docTypeId: 5,
      directionId: 3,
      outgoingNumber: 'ДОГ-2026/91-А',
      outgoingDate: '2026-08-15',
      incomingNumber: 'ВХ-00388',
      incomingDate: '2026-08-18',
      subject: 'Договор на техническое обслуживание защищенной инфраструктуры и сетевых дисков',
      senderId: 2,
      recipientId: 1,
      filePath: '/mnt/network_share/contracts/2026/Contract_91A_Rostelecom.pdf',
      sedUrl: 'https://sed.company.local/contracts/view/91-a',
      comments: 'Подписан усиленной ЭЦП обеих сторон',
      createdAt: '2026-08-18T14:20:00.000Z',
      updatedAt: '2026-08-18T14:20:00.000Z',
    },
  ],
  tasks: [
    {
      id: 1,
      task: 'Разработать техническое задание на интеграцию с региональной СЭД',
      plannedEndDate: '2026-09-22',
      actualEndDate: '',
      isCompleted: false,
      isAccepted: false,
      frozenDaysRemaining: null,
      assigneeId: 1,
      assigneeName: 'Иванов Иван Иванович',
      result: 'Подготовлен предварительный драфт ТЗ, согласовывается с ИТ-отделом',
      createdAt: '2026-09-05T09:00:00.000Z',
      updatedAt: '2026-09-05T09:00:00.000Z',
    },
    {
      id: 2,
      task: 'Согласовать проект регламента сетевого резервного копирования баз данных SQLite',
      plannedEndDate: '2026-09-12',
      actualEndDate: '',
      isCompleted: true,
      isAccepted: false,
      frozenDaysRemaining: null,
      assigneeId: 2,
      assigneeName: 'Смирнова Елена Александровна',
      result: 'Регламент отправлен на визирование руководству',
      createdAt: '2026-09-08T10:30:00.000Z',
      updatedAt: '2026-09-08T10:30:00.000Z',
    },
    {
      id: 3,
      task: 'Провести аудит сетевых подключений SMB/CIFS на рабочих станциях Astra Linux 1.7',
      plannedEndDate: '2026-09-09',
      actualEndDate: '',
      isCompleted: false,
      isAccepted: false,
      frozenDaysRemaining: null,
      assigneeId: 1,
      assigneeName: 'Иванов Иван Иванович',
      result: 'Требуется проверка параметров nobrl на сервере хранения',
      createdAt: '2026-09-01T11:00:00.000Z',
      updatedAt: '2026-09-01T11:00:00.000Z',
    },
    {
      id: 4,
      task: 'Подготовить сводный отчет об исполнении поручений за III квартал',
      plannedEndDate: '2026-09-10',
      actualEndDate: '2026-09-10',
      isCompleted: true,
      isAccepted: true,
      frozenDaysRemaining: 0,
      assigneeId: 2,
      assigneeName: 'Смирнова Елена Александровна',
      result: 'Отчет сформирован, подписан и передан в канцелярию',
      createdAt: '2026-09-02T14:00:00.000Z',
      updatedAt: '2026-09-10T16:30:00.000Z',
    },
  ],
};

class WebMockDatabase implements ElectronAPI {
  private config: DatabaseConfig;
  private logs: LogEntry[] = [];
  private lastUpdateTime: string;

  constructor() {
    // Загрузка конфигурации
    const savedConfig = localStorage.getItem(STORAGE_KEYS.DB_CONFIG);
    if (savedConfig) {
      try {
        this.config = JSON.parse(savedConfig);
      } catch {
        this.config = this.getDefaultConfig();
      }
    } else {
      this.config = this.getDefaultConfig();
      this.saveConfig(this.config);
    }

    this.lastUpdateTime = localStorage.getItem(STORAGE_KEYS.LAST_UPDATE) || new Date().toISOString();

    // Инициализация логов
    const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (savedLogs) {
      try {
        this.logs = JSON.parse(savedLogs);
      } catch {
        this.logs = [];
      }
    }

    // Инициализация таблиц, если пусто
    this.initDatabaseIfEmpty();

    // Автоматический бэкап при запуске
    if (this.config.autoBackupOnStart) {
      setTimeout(() => {
        this.createBackup(true).catch(console.error);
      }, 500);
    }

    this.addLog('info', 'main', 'Инициализация подсистемы документооборота завершена успешно');
  }

  private getDefaultConfig(): DatabaseConfig {
    return {
      dbPath: '/mnt/smb_share/docflow/company_docs.sqlite',
      busyTimeout: 5000,
      autoBackupOnStart: true,
      backupFolder: '/mnt/smb_share/docflow/backup',
      isNetworkPath: true,
      isAccessible: true,
      lastConnected: new Date().toISOString(),
    };
  }

  private saveConfig(config: DatabaseConfig) {
    this.config = config;
    localStorage.setItem(STORAGE_KEYS.DB_CONFIG, JSON.stringify(config));
  }

  private initDatabaseIfEmpty() {
    if (!localStorage.getItem(STORAGE_KEYS.ORGANIZATIONS)) {
      localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(INITIAL_DATA.organizations));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) {
      localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(INITIAL_DATA.departments));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_DATA.employees));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DOC_TYPES)) {
      localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(INITIAL_DATA.docTypes));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DIRECTIONS)) {
      localStorage.setItem(STORAGE_KEYS.DIRECTIONS, JSON.stringify(INITIAL_DATA.directions));
    }
    const rawDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (!rawDocs) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(INITIAL_DATA.documents));
    } else {
      try {
        const docs = JSON.parse(rawDocs);
        let changed = false;
        for (const d of docs) {
          if (d.filePath) {
            const norm = normalizeAstraPathForStorage(d.filePath);
            if (norm.wasNormalized) {
              d.filePath = norm.normalizedPath;
              changed = true;
            }
          }
          // Обновляем первый документ до актуального примера с Astra Linux из промта
          if (d.id === 1 && (d.filePath === '/mnt/network_share/documents/2026/08/MCR-128_Agreement.pdf' || !d.filePath.startsWith('@'))) {
            d.filePath = INITIAL_DATA.documents[0].filePath;
            d.outgoingNumber = INITIAL_DATA.documents[0].outgoingNumber;
            d.subject = INITIAL_DATA.documents[0].subject;
            d.comments = INITIAL_DATA.documents[0].comments;
            changed = true;
          }
        }
        // Инициализация демонстрационных связанных документов, если связей еще нет
        const hasAnyRelations = docs.some((d: any) => Array.isArray(d.relatedDocIds) && d.relatedDocIds.length > 0);
        if (!hasAnyRelations) {
          const doc1 = docs.find((d: any) => d.id === 1);
          const doc3 = docs.find((d: any) => d.id === 3);
          if (doc1 && doc3) {
            doc1.relatedDocIds = [3];
            doc3.relatedDocIds = [1];
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
        }
      } catch {}
    }
    if (!localStorage.getItem(STORAGE_KEYS.BACKUPS)) {
      const initialBackups: BackupFileInfo[] = [
        {
          fileName: 'docflow_backup_auto_2026-09-01_08.00.00.sqlite',
          filePath: '/mnt/smb_share/docflow/backup/docflow_backup_auto_2026-09-01_08.00.00.sqlite',
          fileSize: 147456,
          createdAt: '2026-09-01T08:00:00.000Z',
          isAuto: true,
        },
      ];
      localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(initialBackups));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_DATA.tasks));
    }
  }

  private touchUpdateTime(): string {
    const timestamp = new Date().toISOString();
    this.lastUpdateTime = timestamp;
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, timestamp);
    return timestamp;
  }

  // --- Database Config & Maintenance ---
  async getDbConfig(): Promise<DatabaseConfig> {
    return { ...this.config };
  }

  async getDbStatus() {
    return {
      lastUpdated: this.lastUpdateTime || new Date().toISOString(),
      isNetwork: this.config.isNetworkPath,
      isAccessible: this.config.isAccessible,
      path: this.config.dbPath,
      busyTimeout: this.config.busyTimeout,
    };
  }

  async setDbPath(path: string): Promise<{ success: boolean; message: string; config?: DatabaseConfig }> {
    const trimmed = path.trim();
    if (!trimmed) {
      return { success: false, message: 'Путь к файлу базы данных не может быть пустым' };
    }

    const isNet = trimmed.startsWith('//') || trimmed.startsWith('\\\\') || trimmed.includes('/mnt/') || trimmed.includes('smb') || trimmed.includes('nfs');
    this.config = {
      ...this.config,
      dbPath: trimmed,
      isNetworkPath: isNet,
      isAccessible: true,
      lastConnected: new Date().toISOString(),
    };
    this.saveConfig(this.config);
    this.touchUpdateTime();
    await this.addLog('info', 'db', `Установлен новый путь к БД: ${trimmed} (${isNet ? 'Сетевой диск SMB/NFS' : 'Локальный диск'})`);

    return {
      success: true,
      message: `Подключение к БД успешно настроено: ${trimmed}`,
      config: this.config,
    };
  }

  async saveDbConfig(cfg: Partial<DatabaseConfig>): Promise<{ success: boolean; message: string; config?: DatabaseConfig }> {
    const trimmed = cfg.dbPath !== undefined ? cfg.dbPath.trim() : this.config.dbPath;
    if (!trimmed) {
      return { success: false, message: 'Путь к файлу базы данных не может быть пустым' };
    }

    const isNet = trimmed.startsWith('//') || trimmed.startsWith('\\\\') || trimmed.includes('/mnt/') || trimmed.includes('smb') || trimmed.includes('nfs');
    this.config = {
      ...this.config,
      ...cfg,
      dbPath: trimmed,
      backupFolder: cfg.backupFolder !== undefined ? cfg.backupFolder.trim() : this.config.backupFolder,
      busyTimeout: cfg.busyTimeout !== undefined ? cfg.busyTimeout : this.config.busyTimeout,
      autoBackupOnStart: cfg.autoBackupOnStart !== undefined ? cfg.autoBackupOnStart : this.config.autoBackupOnStart,
      isNetworkPath: isNet,
      isAccessible: true,
      lastConnected: new Date().toISOString(),
    };
    this.saveConfig(this.config);
    this.touchUpdateTime();
    await this.addLog(
      'info',
      'db',
      `Сохранены параметры подключения к БД: ${trimmed} (${isNet ? 'Сетевой диск SMB/NFS' : 'Локальный диск'}), бэкапы: ${this.config.backupFolder || 'по умолчанию'}, busy_timeout: ${this.config.busyTimeout}мс`
    );

    return {
      success: true,
      message: `Подключение к БД успешно настроено: ${trimmed}`,
      config: this.config,
    };
  }

  async testDbConnection(path?: string): Promise<{ success: boolean; message: string; isNetwork?: boolean; pingMs?: number }> {
    const targetPath = path || this.config.dbPath;
    const isNet = targetPath.startsWith('//') || targetPath.startsWith('\\\\') || targetPath.includes('/mnt/') || targetPath.includes('smb') || targetPath.includes('nfs');
    
    // Имитация сетевой задержки и проверки доступности пути
    const ping = isNet ? Math.floor(Math.random() * 15 + 8) : Math.floor(Math.random() * 3 + 1);
    await new Promise((resolve) => setTimeout(resolve, 200));

    await this.addLog('info', 'network', `Проверка доступности пути БД: ${targetPath} (время отклика: ${ping} мс, busy_timeout: ${this.config.busyTimeout} мс)`);

    return {
      success: true,
      message: `Сетевой ресурс доступен. Файл БД готов к работе (Режим блокировки: busy_timeout ${this.config.busyTimeout}мс, Journal Mode: DELETE/TRUNCATE).`,
      isNetwork: isNet,
      pingMs: ping,
    };
  }

  async refreshDb(): Promise<{ success: boolean; timestamp: string; message?: string }> {
    // Небольшая задержка для имитации сетевого запроса к файлу БД
    await new Promise((r) => setTimeout(r, 200));
    const timestamp = this.touchUpdateTime();
    const docs = await this.getDocuments();
    const orgs = await this.getOrganizations();
    await this.addLog(
      'info',
      'db',
      `Принудительное обновление данных из БД SQLite: перечитано документов: ${docs.length}, организаций: ${orgs.length} (${timestamp})`
    );
    return { success: true, timestamp, message: `База данных успешно обновлена (документов: ${docs.length})` };
  }

  // --- Справочник: Организации ---
  async getOrganizations(): Promise<Organization[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.ORGANIZATIONS);
    return raw ? JSON.parse(raw) : [];
  }

  async saveOrganization(org: Omit<Organization, 'id'> & { id?: number }): Promise<Organization> {
    const list = await this.getOrganizations();
    const cleanName = org.name.trim();

    // Запрет дублирования организации по наименованию (без учета регистра)
    const isDuplicate = list.some(
      (o) => o.id !== org.id && o.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      throw new Error(`Организация «${cleanName}» уже существует в справочнике`);
    }

    let saved: Organization;
    const now = new Date().toISOString();

    if (org.id) {
      const idx = list.findIndex((i) => i.id === org.id);
      if (idx === -1) throw new Error('Организация не найдена');
      saved = { ...list[idx], ...org, name: cleanName, updatedAt: now };
      list[idx] = saved;
      await this.addLog('info', 'db', `Обновлена организация: "${saved.name}" (ID: ${saved.id})`);
    } else {
      const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
      saved = {
        id: newId,
        name: cleanName,
        director: org.director?.trim() || '',
        email: org.email?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };
      list.push(saved);
      await this.addLog('info', 'db', `Добавлена новая организация: "${saved.name}" (ID: ${saved.id})`);
    }

    localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(list));
    this.touchUpdateTime();
    return saved;
  }

  async deleteOrganization(id: number): Promise<{ success: boolean }> {
    const list = await this.getOrganizations();
    // Проверка зависимостей
    const depts = await this.getDepartments();
    const isUsedInDept = depts.some((d) => d.organizationId === id);
    if (isUsedInDept) {
      throw new Error('Нельзя удалить организацию, так как к ней привязаны структурные подразделения');
    }

    const emps = await this.getEmployees();
    const isUsedInEmp = emps.some((e) => e.organizationId === id);
    if (isUsedInEmp) {
      throw new Error('Нельзя удалить организацию, так как к ней привязаны сотрудники');
    }

    const docs = await this.getDocuments();
    const isUsedInDocs = docs.some(
      (d) => d.senderId === id || d.recipientId === id || (d.recipientIds && d.recipientIds.includes(id))
    );
    if (isUsedInDocs) {
      throw new Error('Нельзя удалить организацию, так как она указана в зарегистрированных документах');
    }

    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(filtered));
    this.touchUpdateTime();
    await this.addLog('warn', 'db', `Удалена организация ID: ${id}`);
    return { success: true };
  }

  // --- Справочник: Структурное подразделение ---
  async getDepartments(): Promise<Department[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
    const orgs = await this.getOrganizations();
    const list: Department[] = raw ? JSON.parse(raw) : [];
    
    // Заполняем имя организации
    return list.map((dept) => {
      const org = orgs.find((o) => o.id === dept.organizationId);
      return {
        ...dept,
        organizationName: org ? org.name : '—',
      };
    });
  }

  async saveDepartment(dept: Omit<Department, 'id'> & { id?: number }): Promise<Department> {
    const list = await this.getDepartments();
    const orgs = await this.getOrganizations();
    const org = orgs.find((o) => o.id === dept.organizationId);
    if (!org) throw new Error('Выбранная организация не найдена');

    const cleanName = dept.name.trim();
    const cleanShortName = dept.shortName.trim().toUpperCase();

    // Запрет дублирования структурного подразделения в выбранной организации (по имени или сокращению)
    const isDuplicate = list.some(
      (d) =>
        d.id !== dept.id &&
        d.organizationId === dept.organizationId &&
        (d.name.trim().toLowerCase() === cleanName.toLowerCase() ||
          d.shortName.trim().toUpperCase() === cleanShortName)
    );
    if (isDuplicate) {
      throw new Error(
        `Структурное подразделение с наименованием «${cleanName}» или сокращением «${cleanShortName}» уже существует в организации «${org.name}»`
      );
    }

    let saved: Department;
    const now = new Date().toISOString();

    if (dept.id) {
      const idx = list.findIndex((i) => i.id === dept.id);
      if (idx === -1) throw new Error('Подразделение не найдено');
      const oldShortName = list[idx].shortName;
      const oldOrgId = list[idx].organizationId;
      saved = {
        ...list[idx],
        ...dept,
        name: cleanName,
        shortName: cleanShortName,
        organizationName: org.name,
        updatedAt: now,
      };
      list[idx] = saved;

      // Каскадное обновление сотрудников при переименовании сокращения подразделения
      if (oldShortName !== cleanShortName || oldOrgId !== dept.organizationId) {
        const empsRaw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
        if (empsRaw) {
          try {
            const empsList: Employee[] = JSON.parse(empsRaw);
            let changed = false;
            const updatedEmps = empsList.map((e) => {
              if (e.organizationId === oldOrgId && e.departmentShortName === oldShortName) {
                changed = true;
                return { ...e, departmentShortName: cleanShortName, organizationId: dept.organizationId, updatedAt: now };
              }
              return e;
            });
            if (changed) {
              localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updatedEmps));
            }
          } catch {}
        }
      }

      await this.addLog('info', 'db', `Обновлено структурное подразделение: "${saved.name}" (ID: ${saved.id})`);
    } else {
      const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
      saved = {
        id: newId,
        name: cleanName,
        shortName: cleanShortName,
        organizationId: dept.organizationId,
        organizationName: org.name,
        createdAt: now,
        updatedAt: now,
      };
      list.push(saved);
      await this.addLog('info', 'db', `Добавлено структурное подразделение: "${saved.name}" (${saved.shortName})`);
    }

    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(list));
    this.touchUpdateTime();
    return saved;
  }

  async deleteDepartment(id: number): Promise<{ success: boolean }> {
    const list = await this.getDepartments();
    const target = list.find((d) => d.id === id);
    if (!target) return { success: true };

    // Проверка сотрудников
    const emps = await this.getEmployees();
    const isUsedInEmps = emps.some((e) => e.departmentShortName === target.shortName && e.organizationId === target.organizationId);
    if (isUsedInEmps) {
      throw new Error('Нельзя удалить подразделение, к которому привязаны сотрудники');
    }

    // Проверка документов
    const docs = await this.getDocuments();
    const isUsedInDocs = docs.some(
      (d) => d.senderDepartmentId === id || (d.recipientDepartmentIds && d.recipientDepartmentIds.includes(id))
    );
    if (isUsedInDocs) {
      throw new Error('Нельзя удалить подразделение, так как оно указано в зарегистрированных документах');
    }

    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(filtered));
    this.touchUpdateTime();
    await this.addLog('warn', 'db', `Удалено подразделение ID: ${id}`);
    return { success: true };
  }

  // --- Справочник: Сотрудники ---
  async getEmployees(): Promise<Employee[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    const orgs = await this.getOrganizations();
    const list: Employee[] = raw ? JSON.parse(raw) : [];

    return list.map((emp) => {
      const org = orgs.find((o) => o.id === emp.organizationId);
      return {
        ...emp,
        organizationName: org ? org.name : '—',
      };
    });
  }

  async saveEmployee(emp: Omit<Employee, 'id'> & { id?: number }): Promise<Employee> {
    const list = await this.getEmployees();
    const orgs = await this.getOrganizations();
    const org = orgs.find((o) => o.id === emp.organizationId);
    if (!org) throw new Error('Выбранная организация не найдена');

    let saved: Employee;
    const now = new Date().toISOString();

    if (emp.id) {
      const idx = list.findIndex((i) => i.id === emp.id);
      if (idx === -1) throw new Error('Сотрудник не найден');
      const oldFullName = list[idx].fullName;
      saved = {
        ...list[idx],
        ...emp,
        position: emp.position !== undefined ? emp.position.trim() : list[idx].position,
        organizationName: org.name,
        updatedAt: now,
      };
      list[idx] = saved;

      // Каскадное обновление имени сотрудника в задачах и документах
      if (oldFullName !== saved.fullName) {
        try {
          const tasksRaw = localStorage.getItem(STORAGE_KEYS.TASKS);
          if (tasksRaw) {
            const tasksList: TaskRecord[] = JSON.parse(tasksRaw);
            let tasksChanged = false;
            const updatedTasks = tasksList.map((t) => {
              if (t.assigneeId === emp.id) {
                tasksChanged = true;
                return { ...t, assigneeName: saved.fullName, updatedAt: now };
              }
              return t;
            });
            if (tasksChanged) {
              localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updatedTasks));
            }
          }

          const docsRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
          if (docsRaw) {
            const docsList: DocumentRecord[] = JSON.parse(docsRaw);
            let docsChanged = false;
            const updatedDocs = docsList.map((d) => {
              let changed = false;
              let sEmpName = d.senderEmployeeName;
              let signEmpName = d.signatoryEmployeeName;
              if (d.senderEmployeeId === emp.id) {
                sEmpName = saved.fullName;
                changed = true;
              }
              if (d.signatoryEmployeeId === emp.id) {
                signEmpName = saved.fullName;
                changed = true;
              }
              if (changed) {
                docsChanged = true;
                return { ...d, senderEmployeeName: sEmpName, signatoryEmployeeName: signEmpName, updatedAt: now };
              }
              return d;
            });
            if (docsChanged) {
              localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updatedDocs));
            }
          }
        } catch {}
      }

      await this.addLog('info', 'db', `Обновлен сотрудник: "${saved.fullName}" (ID: ${saved.id})`);
    } else {
      const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
      saved = {
        id: newId,
        fullName: emp.fullName.trim(),
        position: emp.position ? emp.position.trim() : '',
        departmentShortName: emp.departmentShortName.trim(),
        organizationId: emp.organizationId,
        organizationName: org.name,
        createdAt: now,
        updatedAt: now,
      };
      list.push(saved);
      await this.addLog('info', 'db', `Добавлен сотрудник: "${saved.fullName}" (${saved.departmentShortName})`);
    }

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(list));
    this.touchUpdateTime();
    return saved;
  }

  async deleteEmployee(id: number): Promise<{ success: boolean }> {
    const list = await this.getEmployees();

    // Проверка задач
    const tasks = await this.getTasks();
    const isUsedInTasks = tasks.some((t) => t.assigneeId === id);
    if (isUsedInTasks) {
      throw new Error('Нельзя удалить сотрудника, так как на него назначены задачи');
    }

    // Проверка документов
    const docs = await this.getDocuments();
    const isUsedInDocs = docs.some((d) => d.senderEmployeeId === id || d.signatoryEmployeeId === id);
    if (isUsedInDocs) {
      throw new Error('Нельзя удалить сотрудника, так как он указан в зарегистрированных документах');
    }

    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(filtered));
    this.touchUpdateTime();
    await this.addLog('warn', 'db', `Удален сотрудник ID: ${id}`);
    return { success: true };
  }

  // --- Справочник: Тип документа ---
  async getDocumentTypes(): Promise<DocumentType[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.DOC_TYPES);
    return raw ? JSON.parse(raw) : [];
  }

  async saveDocumentType(type: Omit<DocumentType, 'id'> & { id?: number }): Promise<DocumentType> {
    const list = await this.getDocumentTypes();
    const cleanName = type.name.trim();

    // Проверка на дубликат наименования типа документа
    const isDuplicate = list.some(
      (item) => item.id !== type.id && item.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      throw new Error(`Тип документа «${cleanName}» уже существует в справочнике`);
    }

    let saved: DocumentType;
    const now = new Date().toISOString();

    if (type.id) {
      const idx = list.findIndex((i) => i.id === type.id);
      if (idx === -1) throw new Error('Тип документа не найден');
      saved = { ...list[idx], ...type, name: cleanName, updatedAt: now };
      list[idx] = saved;
      await this.addLog('info', 'db', `Обновлен тип документа: "${saved.name}" (ID: ${saved.id})`);
    } else {
      const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
      saved = {
        id: newId,
        name: cleanName,
        createdAt: now,
        updatedAt: now,
      };
      list.push(saved);
      await this.addLog('info', 'db', `Добавлен тип документа: "${saved.name}"`);
    }

    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(list));
    this.touchUpdateTime();
    return saved;
  }

  async deleteDocumentType(id: number): Promise<{ success: boolean }> {
    const list = await this.getDocumentTypes();
    const docs = await this.getDocuments();
    const isUsed = docs.some((d) => d.docTypeId === id);
    if (isUsed) {
      throw new Error('Нельзя удалить тип документа, так как он используется в зарегистрированных документах');
    }

    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(filtered));
    this.touchUpdateTime();
    await this.addLog('warn', 'db', `Удален тип документа ID: ${id}`);
    return { success: true };
  }

  // --- Справочник: Направление ---
  async getDirections(): Promise<Direction[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.DIRECTIONS);
    return raw ? JSON.parse(raw) : [];
  }

  async saveDirection(dir: Omit<Direction, 'id'> & { id?: number }): Promise<Direction> {
    const list = await this.getDirections();
    const cleanName = dir.name.trim();

    // Проверка на дубликат наименования направления
    const isDuplicate = list.some(
      (item) => item.id !== dir.id && item.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      throw new Error(`Направление «${cleanName}» уже существует в справочнике`);
    }

    let saved: Direction;
    const now = new Date().toISOString();

    if (dir.id) {
      const idx = list.findIndex((i) => i.id === dir.id);
      if (idx === -1) throw new Error('Направление не найдено');
      saved = { ...list[idx], ...dir, name: cleanName, updatedAt: now };
      list[idx] = saved;
      await this.addLog('info', 'db', `Обновлено направление: "${saved.name}" (ID: ${saved.id})`);
    } else {
      const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
      saved = {
        id: newId,
        name: cleanName,
        createdAt: now,
        updatedAt: now,
      };
      list.push(saved);
      await this.addLog('info', 'db', `Добавлено направление: "${saved.name}"`);
    }

    localStorage.setItem(STORAGE_KEYS.DIRECTIONS, JSON.stringify(list));
    this.touchUpdateTime();
    return saved;
  }

  async deleteDirection(id: number): Promise<{ success: boolean }> {
    const list = await this.getDirections();
    const docs = await this.getDocuments();
    const isUsed = docs.some((d) => d.directionId === id);
    if (isUsed) {
      throw new Error('Нельзя удалить направление, так как оно используется в документах');
    }

    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.DIRECTIONS, JSON.stringify(filtered));
    this.touchUpdateTime();
    await this.addLog('warn', 'db', `Удалено направление ID: ${id}`);
    return { success: true };
  }

  // --- Документы ---
  async getDocuments(): Promise<DocumentRecord[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const docs: DocumentRecord[] = raw ? JSON.parse(raw) : [];
    const docTypes = await this.getDocumentTypes();
    const directions = await this.getDirections();
    const orgs = await this.getOrganizations();
    const depts = await this.getDepartments();
    const emps = await this.getEmployees();

    // Быстрый поиск через Map (O(1) вместо многократного O(N) поиска)
    const docTypeMap = new Map(docTypes.map((t) => [t.id, t.name]));
    const dirMap = new Map(directions.map((d) => [d.id, d.name]));
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));
    const deptMap = new Map(depts.map((d) => [d.id, d.shortName || d.name]));
    const empMap = new Map(emps.map((e) => [e.id, e.fullName]));

    return docs.map((doc) => {
      const dtName = docTypeMap.get(doc.docTypeId) || '—';
      const dirName = dirMap.get(doc.directionId) || '—';
      const senderName = doc.senderId ? (orgMap.get(doc.senderId) || '—') : '—';

      let senderDepartmentName = doc.senderDepartmentName;
      if (doc.senderDepartmentId && deptMap.has(doc.senderDepartmentId)) {
        senderDepartmentName = deptMap.get(doc.senderDepartmentId);
      }

      let senderEmployeeName = doc.senderEmployeeName;
      if (doc.senderEmployeeId && empMap.has(doc.senderEmployeeId)) {
        senderEmployeeName = empMap.get(doc.senderEmployeeId);
      }

      let signatoryEmployeeName = doc.signatoryEmployeeName;
      if (doc.signatoryEmployeeId && empMap.has(doc.signatoryEmployeeId)) {
        signatoryEmployeeName = empMap.get(doc.signatoryEmployeeId);
      }
      
      let recipientName = '—';
      const rIds = doc.recipientIds && doc.recipientIds.length > 0
        ? doc.recipientIds
        : (doc.recipientId ? [doc.recipientId] : []);

      if (rIds.length > 0) {
        const names = rIds.map((id) => orgMap.get(id)).filter(Boolean);
        if (names.length > 0) {
          recipientName = names.join(', ');
        }
      } else if (doc.recipientId) {
        recipientName = orgMap.get(doc.recipientId) || '—';
      }

      let recipientDepartmentNames = doc.recipientDepartmentNames;
      if (doc.recipientDepartmentIds && doc.recipientDepartmentIds.length > 0) {
        const dNames = doc.recipientDepartmentIds
          .map((id) => deptMap.get(id))
          .filter(Boolean);
        if (dNames.length > 0) {
          recipientDepartmentNames = dNames.join(', ');
        }
      }

      return {
        ...doc,
        docTypeName: dtName,
        directionName: dirName,
        senderName,
        senderDepartmentName,
        senderEmployeeName,
        signatoryEmployeeName,
        recipientName,
        recipientIds: rIds,
        recipientDepartmentIds: doc.recipientDepartmentIds || [],
        recipientDepartmentNames,
      };
    });
  }

  async getDocumentById(id: number): Promise<DocumentRecord | null> {
    const docs = await this.getDocuments();
    return docs.find((d) => d.id === id) || null;
  }

  async saveDocument(doc: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }): Promise<DocumentRecord> {
    const list = await this.getDocuments();
    const now = new Date().toISOString();
    let saved: DocumentRecord;

    const rIds = doc.recipientIds || (doc.recipientId ? [doc.recipientId] : []);
    const primaryRecipientId = doc.recipientId || (rIds.length > 0 ? rIds[0] : undefined);

    // Нормализация сетевого пути Astra Linux для записи в базу данных
    let normalizedFilePath = doc.filePath?.trim() || undefined;
    if (normalizedFilePath) {
      const norm = normalizeAstraPathForStorage(normalizedFilePath);
      normalizedFilePath = norm.normalizedPath;
    }

    const docToSave = {
      ...doc,
      filePath: normalizedFilePath,
      senderDepartmentId: doc.senderDepartmentId || undefined,
      senderDepartmentName: doc.senderDepartmentName || undefined,
      senderEmployeeId: doc.senderEmployeeId || undefined,
      senderEmployeeName: doc.senderEmployeeName || undefined,
      signatoryEmployeeId: doc.signatoryEmployeeId || undefined,
      signatoryEmployeeName: doc.signatoryEmployeeName || undefined,
      recipientId: primaryRecipientId,
      recipientIds: rIds,
      recipientDepartmentIds: doc.recipientDepartmentIds || [],
      recipientDepartmentNames: doc.recipientDepartmentNames || undefined,
      relatedDocIds: Array.isArray(doc.relatedDocIds) ? doc.relatedDocIds : [],
    };

    if (doc.id) {
      const idx = list.findIndex((i) => i.id === doc.id);
      if (idx === -1) throw new Error('Документ не найден');
      saved = {
        ...list[idx],
        ...docToSave,
        updatedAt: now,
      };
      list[idx] = saved;
      await this.addLog('info', 'db', `Обновлен документ №${saved.id}: "${saved.subject}"`);
    } else {
      const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
      saved = {
        ...docToSave,
        id: newId,
        createdAt: now,
        updatedAt: now,
      };
      list.unshift(saved);
      await this.addLog('info', 'db', `Зарегистрирован новый документ №${saved.id}: "${saved.subject}"`);
    }

    // Двусторонняя синхронизация связей документов
    const currentId = saved.id;
    const targetRelatedIds = new Set(saved.relatedDocIds || []);
    for (const item of list) {
      if (item.id === currentId) continue;
      const shouldBeRelated = targetRelatedIds.has(item.id);
      const curRelated = new Set(item.relatedDocIds || []);
      let itemChanged = false;
      if (shouldBeRelated && !curRelated.has(currentId)) {
        curRelated.add(currentId);
        itemChanged = true;
      } else if (!shouldBeRelated && curRelated.has(currentId)) {
        curRelated.delete(currentId);
        itemChanged = true;
      }
      if (itemChanged) {
        item.relatedDocIds = Array.from(curRelated);
      }
    }

    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(list));
    this.touchUpdateTime();
    return saved;
  }

  async deleteDocument(id: number): Promise<{ success: boolean }> {
    const list = await this.getDocuments();
    // Удаляем документ и вычищаем ссылку на него из связанных документов
    const filtered = list
      .filter((i) => i.id !== id)
      .map((item) => {
        if (item.relatedDocIds && item.relatedDocIds.includes(id)) {
          return {
            ...item,
            relatedDocIds: item.relatedDocIds.filter((rId) => rId !== id),
          };
        }
        return item;
      });
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered));
    this.touchUpdateTime();
    await this.addLog('warn', 'db', `Удален документ ID: ${id}`);
    return { success: true };
  }

  // --- Задачи ---
  async getTasks(): Promise<TaskRecord[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const tasks: TaskRecord[] = raw ? JSON.parse(raw) : [];
    const employees = await this.getEmployees();
    const empMap = new Map(employees.map((e) => [e.id, e.fullName]));

    return tasks.map((t) => {
      let assigneeName = (t.assigneeId && empMap.get(t.assigneeId)) || t.assigneeName || '';
      return {
        ...t,
        assigneeName: assigneeName || '',
        actualEndDate: t.actualEndDate || '',
        result: t.result || '',
      };
    });
  }

  async getTaskById(id: number): Promise<TaskRecord | null> {
    const list = await this.getTasks();
    const found = list.find((t) => t.id === id);
    return found || null;
  }

  async saveTask(task: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }): Promise<TaskRecord> {
    const list = await this.getTasks();
    const now = new Date().toISOString();
    let saved: TaskRecord;

    let assigneeName = task.assigneeName || '';
    if (task.assigneeId && !assigneeName) {
      const emps = await this.getEmployees();
      const emp = emps.find((e) => e.id === task.assigneeId);
      if (emp) assigneeName = emp.fullName;
    }

    if (task.id) {
      const idx = list.findIndex((t) => t.id === task.id);
      if (idx === -1) throw new Error('Задача не найдена');
      saved = {
        ...list[idx],
        ...task,
        assigneeName,
        actualEndDate: task.actualEndDate || '',
        result: task.result || '',
        updatedAt: now,
      };
      if (saved.isAccepted) {
        saved.isCompleted = true;
        if (saved.actualEndDate) {
          saved.frozenDaysRemaining = calculateDaysRemaining(saved.plannedEndDate, true, null, saved.actualEndDate);
        } else {
          saved.frozenDaysRemaining = null;
        }
      }
      list[idx] = saved;
      await this.addLog('info', 'db', `Обновлена задача №${saved.id}: "${saved.task}"`);
    } else {
      const newId = list.length > 0 ? Math.max(...list.map((t) => t.id)) + 1 : 1;
      saved = {
        ...task,
        id: newId,
        assigneeName,
        actualEndDate: task.actualEndDate || '',
        result: task.result || '',
        frozenDaysRemaining: task.frozenDaysRemaining ?? null,
        createdAt: now,
        updatedAt: now,
      };
      if (saved.isAccepted) {
        saved.isCompleted = true;
        if (saved.actualEndDate) {
          saved.frozenDaysRemaining = calculateDaysRemaining(saved.plannedEndDate, true, null, saved.actualEndDate);
        } else {
          saved.frozenDaysRemaining = null;
        }
      }
      list.unshift(saved);
      await this.addLog('info', 'db', `Создана новая задача №${saved.id}: "${saved.task}"`);
    }

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(list));
    this.touchUpdateTime();
    return saved;
  }

  async saveTasks(taskList: Array<Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TaskRecord[]> {
    const list = await this.getTasks();
    const now = new Date().toISOString();
    const emps = await this.getEmployees();
    let maxId = list.length > 0 ? Math.max(...list.map((t) => t.id)) : 0;
    const createdTasks: TaskRecord[] = [];

    for (const task of taskList) {
      maxId += 1;
      let assigneeName = task.assigneeName || '';
      if (task.assigneeId && !assigneeName) {
        const emp = emps.find((e) => e.id === task.assigneeId);
        if (emp) assigneeName = emp.fullName;
      }

      const saved: TaskRecord = {
        ...task,
        id: maxId,
        assigneeName,
        actualEndDate: task.actualEndDate || '',
        result: task.result || '',
        frozenDaysRemaining: task.frozenDaysRemaining ?? null,
        createdAt: now,
        updatedAt: now,
      };
      if (saved.isAccepted) {
        saved.isCompleted = true;
        if (saved.actualEndDate) {
          saved.frozenDaysRemaining = calculateDaysRemaining(saved.plannedEndDate, true, null, saved.actualEndDate);
        } else {
          saved.frozenDaysRemaining = null;
        }
      }
      createdTasks.push(saved);
      list.unshift(saved);
      await this.addLog('info', 'db', `Создана новая задача №${saved.id}: "${saved.task}" для исполнителя "${assigneeName || 'Не назначен'}"`);
    }

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(list));
    this.touchUpdateTime();
    return createdTasks;
  }

  async deleteTask(id: number): Promise<{ success: boolean }> {
    const list = await this.getTasks();
    const filtered = list.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
    this.touchUpdateTime();
    await this.addLog('warn', 'db', `Удалена задача ID: ${id}`);
    return { success: true };
  }

  async toggleTaskCheck(id: number, field: 'isCompleted' | 'isAccepted', value: boolean): Promise<TaskRecord> {
    const list = await this.getTasks();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Задача не найдена');

    const target = list[idx];
    const now = new Date().toISOString();
    let updated: TaskRecord = { ...target, updatedAt: now };

    if (field === 'isCompleted') {
      updated.isCompleted = value;
      if (!value) {
        // Если отметка "Выполнено" снята, отметка "Принято" также снимается
        if (updated.isAccepted) {
          updated.isAccepted = false;
          updated.frozenDaysRemaining = null;
        }
      }
    } else if (field === 'isAccepted') {
      if (value && !updated.isCompleted) {
        throw new Error('Задача не может быть принята, пока не установлена отметка "Выполнено"');
      }
      updated.isAccepted = value;
      if (value) {
        // Принятие задачи руководителем автоматически отмечает ее выполнение
        updated.isCompleted = true;
        // Дата "Факт" выбирается только вручную!
        // Если дата "Факт" уже заполнена вручную, фиксируем значение "Осталось" как разницу между "План" - "Факт"
        if (updated.actualEndDate) {
          const days = calculateDaysRemaining(updated.plannedEndDate, true, null, updated.actualEndDate);
          updated.frozenDaysRemaining = days;
        } else {
          updated.frozenDaysRemaining = null;
        }
      } else {
        // Если отметка снята, размораживаем счет
        updated.frozenDaysRemaining = null;
      }
    }

    list[idx] = updated;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(list));
    this.touchUpdateTime();
    await this.addLog(
      'info',
      'db',
      `Изменен статус задачи №${id} (${field === 'isCompleted' ? 'Выполнено' : 'Принято'}: ${value ? 'Да' : 'Нет'})`
    );
    return updated;
  }

  // --- Резервное копирование ---
  async createBackup(isAuto: boolean = false): Promise<{ success: boolean; backupPath: string; message: string }> {
    const rawBackups = localStorage.getItem(STORAGE_KEYS.BACKUPS);
    const backups: BackupFileInfo[] = rawBackups ? JSON.parse(rawBackups) : [];

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
    const prefix = isAuto ? 'docflow_backup_auto' : 'docflow_backup_manual';
    const fileName = `${prefix}_${dateStr}.sqlite`;
    const folder = this.config.backupFolder || '/mnt/smb_share/docflow/backup';
    const filePath = `${folder}/${fileName}`;

    // Примерный размер базы на основе данных
    const approxSize = 145000 + (localStorage.getItem(STORAGE_KEYS.DOCUMENTS)?.length || 0) * 12;

    const newBackup: BackupFileInfo = {
      fileName,
      filePath,
      fileSize: approxSize,
      createdAt: now.toISOString(),
      isAuto,
    };

    backups.unshift(newBackup);
    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(backups.slice(0, 30))); // Храним последние 30 копий

    const logMsg = isAuto
      ? `Автоматическое резервное копирование выполнено: ${fileName}`
      : `Ручное резервное копирование выполнено: ${fileName}`;
    await this.addLog('success', 'backup', logMsg);

    return {
      success: true,
      backupPath: filePath,
      message: `Резервная копия успешно создана в: ${filePath}`,
    };
  }

  async getBackupsList(): Promise<BackupFileInfo[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.BACKUPS);
    return raw ? JSON.parse(raw) : [];
  }

  async restoreBackup(backupPath: string): Promise<{ success: boolean; message: string }> {
    await this.addLog('warn', 'backup', `Восстановление данных из резервной копии: ${backupPath}`);
    this.touchUpdateTime();
    return {
      success: true,
      message: `База данных успешно восстановлена из: ${backupPath}`,
    };
  }

  // --- Файловая система и диалоги ОС ---
  async selectDatabaseFile(): Promise<string | null> {
    if (typeof document === 'undefined') return '/mnt/smb_share/docflow/company_docs.sqlite';
    return new Promise((resolve) => {
      let isResolved = false;
      const done = (val: string | null) => {
        if (!isResolved) {
          isResolved = true;
          if (document.body.contains(input)) document.body.removeChild(input);
          resolve(val);
        }
      };

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sqlite,.db,.sqlite3,*';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          const fullPath = (file as any).path;
          if (fullPath) {
            done(fullPath.replace(/\\/g, '/'));
            return;
          }

          const fileName = file.name;
          const finalPath = `/mnt/smb_share/docflow/${fileName}`;
          done(finalPath);
        } else {
          done(null);
        }
      };

      input.oncancel = () => done(null);
      input.addEventListener('cancel', () => done(null));

      window.addEventListener(
        'focus',
        () => {
          setTimeout(() => {
            if (!isResolved) {
              done(null);
            }
          }, 2000);
        },
        { once: true }
      );

      input.click();
    });
  }

  async selectDatabaseFolder(): Promise<string | null> {
    if (typeof document === 'undefined') return '/mnt/smb_share/docflow/';
    return new Promise((resolve) => {
      let isResolved = false;
      const done = (val: string | null) => {
        if (!isResolved) {
          isResolved = true;
          if (document.body.contains(input)) document.body.removeChild(input);
          resolve(val);
        }
      };

      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          const fullPath = (file as any).path;
          if (fullPath) {
            const normalized = fullPath.replace(/\\/g, '/');
            const parts = normalized.split('/');
            parts.pop();
            const folderPath = parts.join('/') + '/';
            done(folderPath);
            return;
          }

          const relPath = file.webkitRelativePath || '';
          const folderName = relPath.split('/')[0] || 'docflow';
          const folderPath = `/mnt/smb_share/${folderName}/`;
          done(folderPath);
        } else {
          done(null);
        }
      };

      input.oncancel = () => done(null);
      input.addEventListener('cancel', () => done(null));

      window.addEventListener(
        'focus',
        () => {
          setTimeout(() => {
            if (!isResolved) {
              done(null);
            }
          }, 2000);
        },
        { once: true }
      );

      input.click();
    });
  }

  async selectBackupFolder(): Promise<string | null> {
    if (typeof document === 'undefined') return '/mnt/smb_share/docflow/backup';
    return new Promise((resolve) => {
      let isResolved = false;
      const done = (val: string | null) => {
        if (!isResolved) {
          isResolved = true;
          if (document.body.contains(input)) document.body.removeChild(input);
          resolve(val);
        }
      };

      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          const fullPath = (file as any).path;
          if (fullPath) {
            const normalized = fullPath.replace(/\\/g, '/');
            const parts = normalized.split('/');
            parts.pop();
            const folderPath = parts.join('/') + '/backup';
            done(folderPath);
            return;
          }

          const relPath = file.webkitRelativePath || '';
          const folderName = relPath.split('/')[0] || 'docflow';
          const folderPath = `/mnt/smb_share/${folderName}/backup`;
          done(folderPath);
        } else {
          done(null);
        }
      };

      input.oncancel = () => done(null);
      input.addEventListener('cancel', () => done(null));

      window.addEventListener(
        'focus',
        () => {
          setTimeout(() => {
            if (!isResolved) {
              done(null);
            }
          }, 2000);
        },
        { once: true }
      );

      input.click();
    });
  }

  async selectDocumentFile(): Promise<string | null> {
    if (typeof document === 'undefined') return null;
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          // Если запущен в Electron или среде с прямым доступом к FS
          const fullPath = (file as any).path;
          if (fullPath) {
            const norm = normalizeAstraPathForStorage(fullPath);
            if (norm.extractedUser) {
              setAstraCurrentUser(norm.extractedUser);
            }
            if (document.body.contains(input)) document.body.removeChild(input);
            resolve(norm.normalizedPath);
            return;
          }

          // В веб-браузере формируем сетевую гиперссылку к выбранному файлу в формате Astra Linux
          const fileName = file.name;
          const finalPath = `@nadym-dobycha.gazprom.ru/mnt/centr/onp/экспертиза/5. ХГКМ/0825 ГПП/7. ПД/2026.08.21 Кор-ка по втдответ в ГИФн/${fileName}`;
          if (document.body.contains(input)) document.body.removeChild(input);
          resolve(finalPath);
        } else {
          if (document.body.contains(input)) document.body.removeChild(input);
          resolve(null);
        }
      };

      input.oncancel = () => {
        if (document.body.contains(input)) document.body.removeChild(input);
        resolve(null);
      };

      // Страховочная очистка
      window.addEventListener(
        'focus',
        () => {
          setTimeout(() => {
            if (document.body.contains(input)) {
              document.body.removeChild(input);
              resolve(null);
            }
          }, 1500);
        },
        { once: true }
      );

      input.click();
    });
  }

  async selectDocumentFolder(): Promise<string | null> {
    if (typeof document === 'undefined') return null;
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          const fullPath = (file as any).path;
          if (fullPath) {
            const normalized = fullPath.replace(/\\/g, '/');
            const parts = normalized.split('/');
            parts.pop(); // удаляем имя файла
            const folderPath = parts.join('/') + '/';
            const norm = normalizeAstraPathForStorage(folderPath);
            if (norm.extractedUser) {
              setAstraCurrentUser(norm.extractedUser);
            }
            if (document.body.contains(input)) document.body.removeChild(input);
            resolve(norm.normalizedPath);
            return;
          }

          const relPath = file.webkitRelativePath || '';
          const folderName = relPath.split('/')[0] || '2026.08.21 Кор-ка по втдответ в ГИФн';
          const folderPath = `@nadym-dobycha.gazprom.ru/mnt/centr/onp/экспертиза/5. ХГКМ/0825 ГПП/7. ПД/${folderName}/`;
          if (document.body.contains(input)) document.body.removeChild(input);
          resolve(folderPath);
        } else {
          if (document.body.contains(input)) document.body.removeChild(input);
          resolve(null);
        }
      };

      input.oncancel = () => {
        if (document.body.contains(input)) document.body.removeChild(input);
        resolve(null);
      };

      window.addEventListener(
        'focus',
        () => {
          setTimeout(() => {
            if (document.body.contains(input)) {
              document.body.removeChild(input);
              resolve(null);
            }
          }, 1500);
        },
        { once: true }
      );

      input.click();
    });
  }

  async selectDocumentFileOrFolder(): Promise<string | null> {
    return this.selectDocumentFile();
  }

  async showSaveExcelDialog(defaultFileName: string): Promise<string | null> {
    await this.addLog('info', 'ui', `Запрос диалогового окна ОС для сохранения файла: ${defaultFileName}`);
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [
            {
              description: 'Книга Excel (*.xlsx)',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              },
            },
          ],
        });
        return handle?.name || defaultFileName;
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
      }
    }
    return defaultFileName;
  }

  async selectExportFolder(title?: string): Promise<string | null> {
    await this.addLog('info', 'ui', `Запрос диалогового окна ОС для выбора папки выгрузки (${title || 'Экспорт'})`);
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        return dirHandle?.name || 'Выбранная папка';
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
      }
    }
    return 'Загрузки';
  }

  async saveFiles(files: Array<{ filePath: string; base64Data: string }>): Promise<{ success: boolean; savedPaths?: string[]; message?: string }> {
    try {
      const savedPaths: string[] = [];
      for (const f of files) {
        // Извлекаем имя файла из пути
        const fileName = f.filePath.split(/[/\\]/).pop() || 'tasks.xlsx';
        const byteCharacters = atob(f.base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        savedPaths.push(f.filePath);
      }
      await this.addLog('info', 'ui', `Файлы Excel успешно выгружены (${savedPaths.length} шт.)`);
      return { success: true, savedPaths };
    } catch (err: any) {
      await this.addLog('error', 'ui', `Ошибка при выгрузке файлов Excel: ${err.message}`);
      return { success: false, message: err.message };
    }
  }

  async openPath(path: string): Promise<{ success: boolean; message?: string }> {
    // Разрешаем сетевой путь Astra Linux: для @domain/... подставляется /home/<пользователь>
    const resolved = resolveAstraPathForOpening(path);
    await this.addLog('info', 'ui', `Запрос на открытие файла/папки ОС: ${resolved} (исходный сетевой путь: ${path})`);
    return {
      success: true,
      message: `Открыто в файловом менеджере ОС (Astra Linux Fly / Explorer): ${resolved}`,
    };
  }

  async getCurrentUser(): Promise<string | null> {
    return getAstraCurrentUser();
  }

  async setCurrentUser(username: string): Promise<void> {
    setAstraCurrentUser(username);
  }

  async openExternal(url: string): Promise<{ success: boolean; message?: string }> {
    await this.addLog('info', 'ui', `Открытие внешней ссылки СЭД: ${url}`);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
    return {
      success: true,
      message: `Ссылка открыта в веб-браузере: ${url}`,
    };
  }

  // --- Логирование ---
  async getLogs(limit?: number): Promise<LogEntry[]> {
    if (limit && limit > 0) {
      return this.logs.slice(0, limit);
    }
    return [...this.logs];
  }

  async addLog(level: LogLevel, source: LogEntry['source'], message: string, details?: any): Promise<void> {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      details,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 200) {
      this.logs = this.logs.slice(0, 200);
    }
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.logs));
  }

  async exportLogs(): Promise<{ success: boolean; path?: string }> {
    const content = this.logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}]: ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`)
      .join('\n');
    
    // Создаем скачиваемый blob
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docflow_log_${formatDbTimestamp()}.log`;
    a.click();
    URL.revokeObjectURL(url);

    await this.addLog('info', 'main', 'Журнал событий выгружен в файл');
    return { success: true, path: a.download };
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    await this.addLog('info', 'main', 'Журнал событий очищен');
  }

  // --- Системная информация ---
  async getSystemInfo(): Promise<{ platform: string; isAstraLinux: boolean; version: string; isElectron: boolean }> {
    return {
      platform: 'Linux (Astra Linux Special Edition 1.7.4 / 1.8)',
      isAstraLinux: true,
      version: '1.0.0-portable-appimage',
      isElectron: false,
    };
  }

  setZoomFactor(factor: number): void {
    try {
      (document.documentElement.style as any).zoom = String(factor);
    } catch {}
  }

  getZoomFactor(): number {
    try {
      const z = (document.documentElement.style as any).zoom;
      return z ? parseFloat(z) : 1.0;
    } catch {
      return 1.0;
    }
  }
}

// Единый экземпляр сервиса
const webMock = new WebMockDatabase();

export const electronBridge: ElectronAPI = new Proxy({} as ElectronAPI, {
  get(_target, prop: keyof ElectronAPI) {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI[prop] === 'function') {
      return window.electronAPI[prop];
    }
    // Защитный фолбэк для Electron на Astra Linux:
    // если приложение запущено в Electron, но в текущем preload еще отсутствует метод saveTasks,
    // выполняем сохранение каждой копии в реальную SQLite базу поочередно через window.electronAPI.saveTask
    if (prop === 'saveTasks' && typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.saveTask === 'function') {
      return async (taskList: Array<Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>>) => {
        const createdList: TaskRecord[] = [];
        for (const t of taskList) {
          const res = await window.electronAPI.saveTask(t);
          createdList.push(res);
        }
        return createdList;
      };
    }
    // Фолбэк на встроенный браузерный адаптер
    if (prop in webMock) {
      return (webMock[prop] as any).bind(webMock);
    }
    return async () => ({ success: false, message: 'Метод не реализован' });
  },
});
