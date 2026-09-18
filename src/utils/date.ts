/**
 * Утилиты форматирования дат и времени в соответствии с ТЗ
 */

/**
 * Форматирует дату в формат «дд.мм.гггг_чч.мм.сс»
 * Например: 02.09.2026_14.30.45
 */
export function formatDbTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}.${month}.${year}_${hours}.${minutes}.${seconds}`;
}

/**
 * Форматирует дату обновления базы данных в строгий формат по ТЗ:
 * «Дата: ДД-ММ-ГГГГ, Время: ЧЧ:ММ:СС»
 * Например: Дата: 06-09-2026, Время: 10:37:29
 */
export function formatDbUpdateDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Дата: —';
  try {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    // Если строка уже в формате «Дата: ДД-ММ-ГГГГ, Время: ЧЧ:ММ:СС»
    if (typeof dateInput === 'string' && dateInput.startsWith('Дата: ')) {
      return dateInput;
    }

    // Если передана строка в формате «дд.мм.гггг_чч.мм.сс»
    if (typeof dateInput === 'string' && /^\d{2}\.\d{2}\.\d{4}_\d{2}\.\d{2}\.\d{2}$/.test(dateInput)) {
      const [dPart, tPart] = dateInput.split('_');
      const [day, month, year] = dPart.split('.');
      const [hours, minutes, seconds] = tPart.split('.');
      return `Дата: ${day}-${month}-${year}, Время: ${hours}:${minutes}:${seconds}`;
    }

    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      return String(dateInput);
    }
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    return `Дата: ${day}-${month}-${year}, Время: ${hours}:${minutes}:${seconds}`;
  } catch {
    return String(dateInput || '—');
  }
}

/**
 * Форматирует дату в формат «дд.мм.гггг» (для отображения в таблицах и карточках)
 */
export function formatDateRussian(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // Формат YYYY-MM-DD
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  } catch {
    return dateStr || '—';
  }
}

/**
 * Форматирует дату и время в «дд.мм.гггг чч:мм:сс»
 */
export function formatDateTimeRussian(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return isoStr || '—';
  }
}

/**
 * Форматирует размер файла в человекочитаемый вид (Б, КБ, МБ)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Байт';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
