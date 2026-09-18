import * as XLSX from 'xlsx';
import { TaskRecord } from '../types';
import { calculateDaysRemaining, getTaskStatusInfo } from './taskUtils';
import { formatDateRussian } from './date';

/**
 * Получить текущую дату в формате «гггг.мм.дд» (с точками по ТЗ)
 * Например: 2026.09.18
 */
export function getExportDatePrefix(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}.${month}.${day}`;
}

/**
 * Очистить имя исполнителя от символов, запрещенных в именах файлов ОС
 */
export function sanitizeFileNamePart(name?: string | null): string {
  if (!name || !name.trim()) return 'Без_исполнителя';
  return name.trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, ' ');
}

/**
 * Сформировать имя общего файла выгрузки по ТЗ: «гггг.мм.дд_текущие задачи.xlsx»
 */
export function getSingleExportFileName(date: Date = new Date()): string {
  const prefix = getExportDatePrefix(date);
  return `${prefix}_текущие задачи.xlsx`;
}

/**
 * Сформировать имя файла для конкретного исполнителя по ТЗ: «гггг.мм.дд_имя исполнителя.xlsx»
 */
export function getAssigneeExportFileName(assigneeName?: string | null, date: Date = new Date()): string {
  const prefix = getExportDatePrefix(date);
  const safeAssignee = sanitizeFileNamePart(assigneeName);
  return `${prefix}_${safeAssignee}.xlsx`;
}

export interface GeneratedExcelFile {
  fileName: string;
  base64Data: string;
  blob: Blob;
  taskCount: number;
  assigneeName?: string;
}

/**
 * Генерация книги Excel для переданного списка задач
 */
export function createTasksWorkbook(tasks: TaskRecord[], sheetTitle = 'Текущие задачи'): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Заголовки колонок согласно таблице задач
  const headers = [
    '№',
    'Задача',
    'План',
    'Факт',
    'Выполнено',
    'Принято',
    'Осталось (дней)',
    'Статус',
    'Ответственный',
    'Результат',
  ];

  const rows: any[][] = [headers];

  for (const t of tasks) {
    const days = calculateDaysRemaining(
      t.plannedEndDate,
      t.isAccepted,
      t.frozenDaysRemaining,
      t.actualEndDate
    );
    const statusInfo = getTaskStatusInfo(days, t.isAccepted, t.isCompleted);

    rows.push([
      t.id,
      t.task || '',
      formatDateRussian(t.plannedEndDate),
      t.actualEndDate ? formatDateRussian(t.actualEndDate) : '',
      t.isCompleted ? 'Да' : 'Нет',
      t.isAccepted ? 'Да' : 'Нет',
      days,
      statusInfo.label,
      t.assigneeName || 'Без исполнителя',
      t.result || '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Настройка комфортной ширины столбцов
  ws['!cols'] = [
    { wch: 6 },  // №
    { wch: 46 }, // Задача
    { wch: 13 }, // План
    { wch: 13 }, // Факт
    { wch: 12 }, // Выполнено
    { wch: 12 }, // Принято
    { wch: 16 }, // Осталось (дней)
    { wch: 24 }, // Статус
    { wch: 28 }, // Ответственный
    { wch: 42 }, // Результат
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.substring(0, 31));
  return wb;
}

/**
 * Конвертация книги XLSX в Base64 и Blob
 */
export function workbookToPayload(wb: XLSX.WorkBook, fileName: string, taskCount: number, assigneeName?: string): GeneratedExcelFile {
  const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return {
    fileName,
    base64Data,
    blob,
    taskCount,
    assigneeName,
  };
}

/**
 * Подготовка файлов выгрузки:
 * Либо один общий файл «гггг.мм.дд_текущие задачи.xlsx»,
 * Либо отдельные файлы по каждому из исполнителей «гггг.мм.дд_имя исполнителя.xlsx»
 */
export function prepareTaskExcelFiles(
  filteredTasks: TaskRecord[],
  splitByAssignee: boolean,
  date: Date = new Date()
): GeneratedExcelFile[] {
  if (!splitByAssignee) {
    const fileName = getSingleExportFileName(date);
    const wb = createTasksWorkbook(filteredTasks, 'Текущие задачи');
    return [workbookToPayload(wb, fileName, filteredTasks.length)];
  }

  // Группировка по исполнителям
  const groups = new Map<string, TaskRecord[]>();

  for (const task of filteredTasks) {
    const rawName = (task.assigneeName || '').trim();
    const key = rawName || 'Без исполнителя';
    const list = groups.get(key) || [];
    list.push(task);
    groups.set(key, list);
  }

  const result: GeneratedExcelFile[] = [];

  // Сортируем исполнителей по алфавиту для аккуратности
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'Без исполнителя') return 1;
    if (b === 'Без исполнителя') return -1;
    return a.localeCompare(b, 'ru');
  });

  for (const assigneeName of sortedKeys) {
    const tasksForAssignee = groups.get(assigneeName) || [];
    const fileName = getAssigneeExportFileName(assigneeName, date);
    const wb = createTasksWorkbook(tasksForAssignee, assigneeName);
    result.push(workbookToPayload(wb, fileName, tasksForAssignee.length, assigneeName));
  }

  return result;
}
