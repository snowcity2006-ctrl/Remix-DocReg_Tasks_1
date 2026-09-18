/**
 * Утилита патчинга native-библиотек ELF (.node) для совместимости с Astra Linux 1.7 (glibc 2.28).
 * В Astra Linux 1.7 используется glibc 2.28 (Debian 10 Buster).
 * При сборке на современных системах (Ubuntu 22.04+ / glibc 2.35+) better-sqlite3 линкуется
 * с математическими функциями pow, exp, log, log2 из libm.so.6 с версией символа GLIBC_2.29.
 *
 * Данный скрипт безопасно перенаправляет требования этих символов на GLIBC_2.2.5 (которая присутствует
 * во всех версиях glibc x86_64 с 2001 года), убирая зависимость от GLIBC_2.29 из заголовков ELF.
 */

const fs = require('fs');
const path = require('path');

function patchNodeFileForAstra(filePath) {
  if (!fs.existsSync(filePath)) return false;

  let buf;
  try {
    buf = fs.readFileSync(filePath);
  } catch (err) {
    console.error(`[patch-glibc] Ошибка чтения файла ${filePath}:`, err.message);
    return false;
  }

  // Проверка ELF Magic (0x7F 'E' 'L' 'F')
  if (buf.length < 64 || buf[0] !== 0x7f || buf[1] !== 0x45 || buf[2] !== 0x4c || buf[3] !== 0x46) {
    return false;
  }

  // Проверяем, есть ли вообще упоминание GLIBC_2.29 в бинарнике
  if (!buf.includes(Buffer.from('GLIBC_2.29'))) {
    return true; // Патчинг не требуется
  }

  console.log(`[patch-glibc] Анализ ELF файла для совместимости с glibc 2.28: ${filePath}`);

  try {
    const e_shoff = Number(buf.readBigUInt64LE(40));
    const e_shentsize = buf.readUInt16LE(58);
    const e_shnum = buf.readUInt16LE(60);
    const e_shstrndx = buf.readUInt16LE(62);

    const shstr_offset = Number(buf.readBigUInt64LE(e_shoff + e_shstrndx * e_shentsize + 24));

    const sections = {};
    for (let i = 0; i < e_shnum; i++) {
      const sh = e_shoff + i * e_shentsize;
      const sh_name = buf.readUInt32LE(sh);
      const sh_offset = Number(buf.readBigUInt64LE(sh + 24));
      const sh_size = Number(buf.readBigUInt64LE(sh + 32));
      const nameEnd = buf.indexOf(0, shstr_offset + sh_name);
      const name = buf.toString('utf8', shstr_offset + sh_name, nameEnd);
      sections[name] = { offset: sh_offset, size: sh_size };
    }

    if (!sections['.gnu.version_r'] || !sections['.gnu.version'] || !sections['.dynstr']) {
      console.log('[patch-glibc] Секции версионирования не найдены');
      return false;
    }

    const vr_off = sections['.gnu.version_r'].offset;
    const vr_size = sections['.gnu.version_r'].size;
    const gnuv_off = sections['.gnu.version'].offset;
    const gnuv_size = sections['.gnu.version'].size;
    const dynstr_off = sections['.dynstr'].offset;

    let curr = vr_off;
    let idx229 = null;
    let idx225 = null;
    let libmVerneedOffset = null;
    let libmVnAux = null;

    while (curr < vr_off + vr_size) {
      const vn_cnt = buf.readUInt16LE(curr + 2);
      const vn_file = buf.readUInt32LE(curr + 4);
      const vn_aux = buf.readUInt32LE(curr + 8);
      const vn_next = buf.readUInt32LE(curr + 12);

      const fileEnd = buf.indexOf(0, dynstr_off + vn_file);
      const filename = buf.toString('utf8', dynstr_off + vn_file, fileEnd);

      if (filename === 'libm.so.6') {
        libmVerneedOffset = curr;
        libmVnAux = vn_aux;
        let aux_curr = curr + vn_aux;
        for (let i = 0; i < vn_cnt; i++) {
          const vna_other = buf.readUInt16LE(aux_curr + 6);
          const vna_name = buf.readUInt32LE(aux_curr + 8);
          const vna_next = buf.readUInt32LE(aux_curr + 12);
          const verEnd = buf.indexOf(0, dynstr_off + vna_name);
          const vername = buf.toString('utf8', dynstr_off + vna_name, verEnd);

          if (vername === 'GLIBC_2.29') {
            idx229 = vna_other;
          } else if (vername === 'GLIBC_2.2.5') {
            idx225 = vna_other;
          }
          if (vna_next === 0) break;
          aux_curr += vna_next;
        }
      }
      if (vn_next === 0) break;
      curr += vn_next;
    }

    if (idx229 && idx225 && libmVerneedOffset !== null) {
      // Перенаправляем все ссылки с GLIBC_2.29 на GLIBC_2.2.5
      const num_syms = Math.floor(gnuv_size / 2);
      let remapped = 0;
      for (let i = 0; i < num_syms; i++) {
        const pos = gnuv_off + i * 2;
        const val = buf.readUInt16LE(pos);
        const idx = val & 0x7fff;
        if (idx === idx229) {
          buf.writeUInt16LE((val & 0x8000) | idx225, pos);
          remapped++;
        }
      }

      // Обновляем запись libm.so.6: уменьшаем количество версий и пропускаем запись GLIBC_2.29
      buf.writeUInt16LE(1, libmVerneedOffset + 2);
      buf.writeUInt32LE(libmVnAux + 16, libmVerneedOffset + 8);

      fs.writeFileSync(filePath, buf);
      console.log(`[patch-glibc] Успешно пропатчен: ${filePath} (${remapped} математических символов переведено на GLIBC_2.2.5)`);
      return true;
    }
  } catch (err) {
    console.error('[patch-glibc] Ошибка при анализе/патчинге:', err.message);
  }

  return false;
}

function scanAndPatchDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanAndPatchDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.node')) {
      patchNodeFileForAstra(fullPath);
    }
  }
}

// Запуск сканирования в node_modules и release/
if (require.main === module) {
  const nodeModulesDir = path.join(process.cwd(), 'node_modules', 'better-sqlite3');
  if (fs.existsSync(nodeModulesDir)) {
    scanAndPatchDir(nodeModulesDir);
  }
  const releaseDir = path.join(process.cwd(), 'release');
  if (fs.existsSync(releaseDir)) {
    scanAndPatchDir(releaseDir);
  }
}

module.exports = { patchNodeFileForAstra, scanAndPatchDir };
