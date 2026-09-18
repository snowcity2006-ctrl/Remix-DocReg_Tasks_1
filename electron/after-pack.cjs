/**
 * Hook afterPack для electron-builder.
 * 1. Патчит native-модули (.node) для гарантированной совместимости с Astra Linux 1.7 (glibc 2.28).
 * 2. Создает надежный wrapper-скрипт запуска для Astra Linux 1.7/1.8.
 *    Гарантирует передачу флагов --no-sandbox и поддержку программного рендеринга
 *    еще до инициализации C++ процессов Chromium zygote / sandbox.
 */

const path = require('path');
const fs = require('fs');
const { scanAndPatchDir } = require('./patch-glibc.cjs');

exports.default = async function(context) {
  if (context.electronPlatformName === 'linux') {
    const appDir = context.appOutDir;

    // 1. Патчим все native-модули (.node) в распакованном приложении для glibc 2.28
    console.log(`[afterPack] Проверка и патчинг native-модулей в: ${appDir}`);
    scanAndPatchDir(appDir);

    // 2. Создаем wrapper-скрипт запуска
    const binaryName = 'docflow-portable';
    const originalBinPath = path.join(appDir, binaryName);
    const renamedBinPath = path.join(appDir, `${binaryName}.bin`);

    if (fs.existsSync(originalBinPath) && !fs.existsSync(renamedBinPath)) {
      // Переименовываем исходный ELF-бинарник
      fs.renameSync(originalBinPath, renamedBinPath);

      // Создаем wrapper-скрипт с необходимыми переменными окружения и флагами для Astra Linux
      const launcherScript = `#!/bin/bash
HERE="$(dirname "$(readlink -f "\$0")")"
export ELECTRON_DISABLE_SANDBOX=1
export LIBGL_ALWAYS_SOFTWARE=1
exec "\$HERE/${binaryName}.bin" \\
  --no-sandbox \\
  --disable-setuid-sandbox \\
  --disable-gpu-sandbox \\
  --disable-dev-shm-usage \\
  "\$@"
`;

      fs.writeFileSync(originalBinPath, launcherScript, { mode: 0o755 });
      fs.chmodSync(originalBinPath, 0o755);
      console.log(`[afterPack] Astra Linux safety wrapper created at: ${originalBinPath}`);
    }
  }
};
