import { TaskRecord } from '../types';

/**
 * Расчет разницы в календарных днях между двумя датами (dateA - dateB).
 * Формат дат: YYYY-MM-DD.
 * Положительное значение: dateA позже dateB (запас дней).
 * Отрицательное значение: dateA раньше dateB (просрочка).
 */
export function calculateDaysBetweenDates(dateAStr?: string | null, dateBStr?: string | null): number {
  if (!dateAStr || !dateBStr) return 0;
  const partsA = dateAStr.split('-').map(Number);
  const partsB = dateBStr.split('-').map(Number);
  if (partsA.length !== 3 || partsB.length !== 3) return 0;

  // Используем UTC полночь для исключения сдвигов часовых поясов и перехода на сезонное время
  const utcA = Date.UTC(partsA[0], partsA[1] - 1, partsA[2]);
  const utcB = Date.UTC(partsB[0], partsB[1] - 1, partsB[2]);

  const diffMs = utcA - utcB;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Получить текущую локальную дату пользователя в формате YYYY-MM-DD
 */
export function getLocalTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Расчет количества дней в колонке «Осталось»:
 * 1. При установке отметки «Принято» значение рассчитывается как разница между колонками «План» - «Факт».
 * 2. Если отметка «Принято» не установлена, значение рассчитывается как разница между «План» и текущей датой.
 */
export function calculateDaysRemaining(
  plannedDateStr: string | null | undefined,
  isAccepted: boolean = false,
  frozenDays?: number | null,
  actualDateStr?: string | null
): number {
  if (!plannedDateStr) return 0;

  // При установке галочки в колонке "Принято": разница между колонками "План" - "Факт"
  if (isAccepted) {
    if (actualDateStr) {
      return calculateDaysBetweenDates(plannedDateStr, actualDateStr);
    }
    if (typeof frozenDays === 'number') {
      return frozenDays;
    }
    const today = getLocalTodayDateString();
    return calculateDaysBetweenDates(plannedDateStr, today);
  }

  // Для незавершенных / непринятых задач: разница между «План» и текущей датой
  const today = getLocalTodayDateString();
  return calculateDaysBetweenDates(plannedDateStr, today);
}

export interface TaskStatusInfo {
  colorType: 'green' | 'yellow' | 'red';
  dotClass: string;
  badgeBg: string;
  badgeText: string;
  badgeClass: string;
  textClass: string;
  label: string;
  statusText: string;
}

/**
 * Цветовой статус задачи по ТЗ:
 * «В ячейке «Статус» разместить цветовой элемент (кружок). Цвет выбирать:
 * если количество дней до окончания >0 – зеленый,
 * если количество дней до окончания =0 – желтый,
 * если количество дней до окончания <0 – красный.»
 */
export function getTaskStatusInfo(
  daysRemaining: number | null | undefined,
  isAccepted?: boolean,
  isCompleted?: boolean
): TaskStatusInfo {
  const days = daysRemaining ?? 0;

  if (days > 0) {
    return {
      colorType: 'green',
      dotClass: 'bg-emerald-500 shadow-emerald-500/40',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      badgeText: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      textClass: 'text-emerald-400',
      label: isAccepted ? 'Принято (в срок)' : isCompleted ? 'Выполнено' : 'В работе (срок не истек)',
      statusText: isAccepted ? 'Принято' : isCompleted ? 'Выполнено' : 'В работе',
    };
  } else if (days === 0) {
    return {
      colorType: 'yellow',
      dotClass: 'bg-amber-400 shadow-amber-400/40',
      badgeBg: 'bg-amber-400/10 border-amber-400/30 text-amber-400',
      badgeText: 'text-amber-400',
      badgeClass: 'bg-amber-400/10 border-amber-400/30 text-amber-400',
      textClass: 'text-amber-400',
      label: 'Срок завершения — сегодня',
      statusText: 'Срок сегодня',
    };
  } else {
    return {
      colorType: 'red',
      dotClass: 'bg-rose-500 shadow-rose-500/40',
      badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      badgeText: 'text-rose-400',
      badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      textClass: 'text-rose-400',
      label: isAccepted ? 'Принято (с просрочкой)' : 'Просрочено',
      statusText: 'Просрочено',
    };
  }
}

/**
 * Форматирует отображение количества дней
 */
export function formatDaysDisplay(
  days: number | null | undefined,
  isAccepted: boolean = false
): string {
  if (days === null || days === undefined) return '—';
  const sign = days > 0 ? `+${days}` : `${days}`;
  return isAccepted ? `${sign} (зафиксир.)` : sign;
}
