/**
 * Preload скрипт для безопасного IPC обмена между Main и Renderer процессами Electron
 */
import { contextBridge, ipcRenderer, webFrame } from 'electron';
import { ElectronAPI, LogLevel } from '../src/types';

const api: ElectronAPI = {
  // База данных
  getDbConfig: () => ipcRenderer.invoke('db:getConfig'),
  getDbStatus: () => ipcRenderer.invoke('db:getStatus'),
  setDbPath: (path: string) => ipcRenderer.invoke('db:setPath', path),
  saveDbConfig: (config) => ipcRenderer.invoke('db:saveConfig', config),
  testDbConnection: (path?: string) => ipcRenderer.invoke('db:testConnection', path),
  refreshDb: () => ipcRenderer.invoke('db:refresh'),

  // Справочники
  getOrganizations: () => ipcRenderer.invoke('org:getAll'),
  saveOrganization: (org) => ipcRenderer.invoke('org:save', org),
  deleteOrganization: (id) => ipcRenderer.invoke('org:delete', id),

  getDepartments: () => ipcRenderer.invoke('dept:getAll'),
  saveDepartment: (dept) => ipcRenderer.invoke('dept:save', dept),
  deleteDepartment: (id) => ipcRenderer.invoke('dept:delete', id),

  getEmployees: () => ipcRenderer.invoke('emp:getAll'),
  saveEmployee: (emp) => ipcRenderer.invoke('emp:save', emp),
  deleteEmployee: (id) => ipcRenderer.invoke('emp:delete', id),

  getDocumentTypes: () => ipcRenderer.invoke('docType:getAll'),
  saveDocumentType: (type) => ipcRenderer.invoke('docType:save', type),
  deleteDocumentType: (id) => ipcRenderer.invoke('docType:delete', id),

  getDirections: () => ipcRenderer.invoke('direction:getAll'),
  saveDirection: (dir) => ipcRenderer.invoke('direction:save', dir),
  deleteDirection: (id) => ipcRenderer.invoke('direction:delete', id),

  // Документы
  getDocuments: () => ipcRenderer.invoke('doc:getAll'),
  getDocumentById: (id) => ipcRenderer.invoke('doc:getById', id),
  saveDocument: (doc) => ipcRenderer.invoke('doc:save', doc),
  deleteDocument: (id) => ipcRenderer.invoke('doc:delete', id),

  // Задачи
  getTasks: () => ipcRenderer.invoke('task:getAll'),
  getTaskById: (id) => ipcRenderer.invoke('task:getById', id),
  saveTask: (task) => ipcRenderer.invoke('task:save', task),
  saveTasks: (tasks) => ipcRenderer.invoke('task:saveTasks', tasks),
  deleteTask: (id) => ipcRenderer.invoke('task:delete', id),
  toggleTaskCheck: (id, field, value) => ipcRenderer.invoke('task:toggleCheck', id, field, value),

  // Бэкап
  createBackup: (isAuto) => ipcRenderer.invoke('backup:create', isAuto),
  getBackupsList: () => ipcRenderer.invoke('backup:getList'),
  restoreBackup: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),

  // Диалоги ОС и открытие файлов
  selectDatabaseFile: () => ipcRenderer.invoke('dialog:selectDbFile'),
  selectDatabaseFolder: () => ipcRenderer.invoke('dialog:selectDbFolder'),
  selectBackupFolder: () => ipcRenderer.invoke('dialog:selectBackupFolder'),
  selectDocumentFile: () => ipcRenderer.invoke('dialog:selectDocFile'),
  selectDocumentFolder: () => ipcRenderer.invoke('dialog:selectDocFolder'),
  selectDocumentFileOrFolder: () => ipcRenderer.invoke('dialog:selectDocFileOrFolder'),
  showSaveExcelDialog: (defaultFileName: string) => ipcRenderer.invoke('dialog:showSaveExcelDialog', defaultFileName),
  selectExportFolder: (title?: string) => ipcRenderer.invoke('dialog:selectExportFolder', title),
  saveFiles: (files: Array<{ filePath: string; base64Data: string }>) => ipcRenderer.invoke('fs:saveFiles', files),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Логирование
  getLogs: () => ipcRenderer.invoke('logs:getAll'),
  addLog: (level: LogLevel, source, message, details) => ipcRenderer.invoke('logs:add', level, source, message, details),
  exportLogs: () => ipcRenderer.invoke('logs:export'),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),

  // Системная информация и масштабирование
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),
  getCurrentUser: () => ipcRenderer.invoke('system:getCurrentUser'),
  setZoomFactor: (factor: number) => {
    try {
      webFrame.setZoomFactor(factor);
    } catch (e) {
      console.error('Error setting zoom factor:', e);
    }
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch {
      return 1.0;
    }
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
