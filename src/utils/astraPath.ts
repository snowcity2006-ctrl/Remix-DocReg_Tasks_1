/**
 * Утилиты для работы с сетевыми путями Astra Linux 1.7 в доменной среде (FreeIPA / Active Directory / SSSD)
 *
 * Проблема:
 * В Astra Linux при выборе файла в домашнем каталоге или сетевой точке монтирования
 * путь имеет вид:
 *   /home/burlakin.mi@nadym-dobycha.gazprom.ru/mnt/centr/...
 * или
 *   /home/nazarova.sa@nadym-dobycha.gazprom.ru/mnt/centr/...
 * где "burlakin.mi" и "nazarova.sa" — уникальные имена пользователей разных ПК.
 *
 * Решение:
 * 1. При сохранении в БД путь нормализуется в общий сетевой формат:
 *    @nadym-dobycha.gazprom.ru/mnt/centr/...
 * 2. При открытии документа на любом компьютере в сети в начало подставляется:
 *    "/home/" + <текущий пользователь этого ПК>
 *    в результате чего файл открывается по корректному полному пути:
 *    /home/<пользователь>@nadym-dobycha.gazprom.ru/mnt/centr/...
 */

const STORAGE_KEY_ASTRA_USER = 'docflow_astra_user';
const DEFAULT_USER = 'burlakin.mi';

/**
 * Получить имя текущего локального пользователя Astra Linux на данной рабочей станции
 */
export function getAstraCurrentUser(): string {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ASTRA_USER);
    if (saved && saved.trim()) {
      return saved.trim().split('@')[0]; // берем чистый логин без домена
    }
  } catch {}
  return DEFAULT_USER;
}

/**
 * Сохранить имя локального пользователя для текущей рабочей станции
 */
export function setAstraCurrentUser(username: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanUser = username.trim().replace(/^["']|["']$/g, '').split('@')[0];
    if (cleanUser) {
      localStorage.setItem(STORAGE_KEY_ASTRA_USER, cleanUser);
      // Оповещаем другие компоненты через кастомное событие
      window.dispatchEvent(new CustomEvent('docflow:astra-user-changed', { detail: cleanUser }));
    }
  } catch {}
}

export interface NormalizeResult {
  normalizedPath: string;
  extractedUser?: string;
  wasNormalized: boolean;
}

/**
 * Преобразует локальный путь Astra Linux в универсальный сетевой путь для записи в БД:
 * /home/burlakin.mi@nadym-dobycha.gazprom.ru/... -> @nadym-dobycha.gazprom.ru/...
 */
export function normalizeAstraPathForStorage(rawPath: string): NormalizeResult {
  if (!rawPath || typeof rawPath !== 'string') {
    return { normalizedPath: '', wasNormalized: false };
  }

  const trimmed = rawPath.trim().replace(/^["']|["']$/g, '');
  // Приводим обратные слэши к прямым
  const normalizedSlashes = trimmed.replace(/\\/g, '/');

  // Регулярное выражение для поиска /home/<user>@<domain>/...
  // Поддерживает как /home/user@domain, так и home/user@domain
  const astraPattern = /^\/?home\/([^/@\s\\]+)(@.+)$/i;
  const match = normalizedSlashes.match(astraPattern);

  if (match) {
    const extractedUser = match[1];
    const networkPart = match[2]; // начинается с @

    // Автоматически запоминаем пользователя этого ПК, если он ещё не был сохранен
    if (extractedUser) {
      try {
        const currentUser = localStorage.getItem(STORAGE_KEY_ASTRA_USER);
        if (!currentUser) {
          setAstraCurrentUser(extractedUser);
        }
      } catch {}
    }

    return {
      normalizedPath: networkPart,
      extractedUser,
      wasNormalized: true,
    };
  }

  return {
    normalizedPath: normalizedSlashes,
    wasNormalized: false,
  };
}

/**
 * Восстанавливает полный путь для открытия файла/папки в ОС Astra Linux на конкретном компьютере:
 * @nadym-dobycha.gazprom.ru/... -> /home/<currentUser>@nadym-dobycha.gazprom.ru/...
 */
export function resolveAstraPathForOpening(storedPath: string, specificUser?: string): string {
  if (!storedPath || typeof storedPath !== 'string') return '';

  const clean = storedPath.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/');

  // Если путь начинается с @ (например: @nadym-dobycha.gazprom.ru/mnt/centr/...)
  if (clean.startsWith('@')) {
    const user = (specificUser || getAstraCurrentUser()).trim().split('@')[0] || DEFAULT_USER;
    return `/home/${user}${clean}`;
  }

  // Если путь начинается с /@
  if (clean.startsWith('/@')) {
    const user = (specificUser || getAstraCurrentUser()).trim().split('@')[0] || DEFAULT_USER;
    return `/home/${user}${clean.substring(1)}`;
  }

  return clean;
}

/**
 * Проверяет, является ли путь сетевой ссылкой Astra Linux с относительным префиксом домена
 */
export function isAstraNetworkPath(path?: string): boolean {
  if (!path) return false;
  const clean = path.trim();
  return clean.startsWith('@') || clean.startsWith('/@') || /^\/?home\/[^/@\s\\]+@/i.test(clean);
}
