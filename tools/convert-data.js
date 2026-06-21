/*
 * convert-data.js
 * Mengubah INSERT data dari dump MySQL menjadi seed.sql yang kompatibel
 * PostgreSQL (Supabase).
 *
 * Yang ditangani:
 *  - menghapus backtick `nama`
 *  - escaping gaya MySQL (\'  \"  \\  \n ...) -> escaping PostgreSQL
 *  - hanya tabel yang dipakai, diurut aman terhadap foreign key
 *
 * Jalankan:  node tools/convert-data.js
 * Output:    supabase/seed.sql
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'if0_38786425_kusahala.sql');
const OUT = path.join(__dirname, '..', 'supabase', 'seed.sql');

const sql = fs.readFileSync(SRC, 'latin1'); // dump bisa berisi byte non-utf8

// Urutan sesuai dependensi foreign key
const TABLES = ['pegawai', 'barang', 'pesanan', 'detail_pesanan', 'laporan', 'recent'];

/**
 * Pecah blok "VALUES (...),(...),...;" menjadi array baris,
 * tiap baris array nilai yang sudah di-escape untuk PostgreSQL.
 */
function parseValues(text) {
  const rows = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    while (i < n && text[i] !== '(') i++;      // cari awal tuple
    if (i >= n) break;
    i++;                                        // lewati '('

    const values = [];
    let token = '';
    let inStr = false;

    while (i < n) {
      const c = text[i];

      if (inStr) {
        if (c === '\\') {                       // escape MySQL
          const nx = text[i + 1];
          token += ({ "'": "'", '"': '"', '\\': '\\', n: '\n', r: '\r',
                      t: '\t', '0': '\0', Z: '\x1a' })[nx] ?? (nx ?? '');
          i += 2; continue;
        }
        if (c === "'") {
          if (text[i + 1] === "'") { token += "'"; i += 2; continue; } // '' literal
          inStr = false; i++;
          values.push("'" + token.replace(/'/g, "''") + "'");          // simpan string
          token = '';
          continue;
        }
        token += c; i++; continue;
      }

      // di luar string
      if (c === "'") { inStr = true; token = ''; i++; continue; }
      if (c === ',') { flushScalar(); i++; continue; }
      if (c === ')') { flushScalar(); i++; break; }
      token += c; i++;
    }
    rows.push(values);

    function flushScalar() {
      const t = token.trim();
      if (t !== '') values.push(t === '' || /^null$/i.test(t) ? 'NULL' : t);
      else if (values.length === 0 || true) {
        // scalar kosong hanya terjadi setelah string sudah di-push; abaikan kosong
        if (t !== '') values.push(t);
      }
      token = '';
    }
  }
  return rows;
}

function extractInsert(table) {
  const re = new RegExp('INSERT INTO `' + table + '` \\(([^)]*)\\) VALUES', 'g');
  const out = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    const cols = m[1].split(',').map(s => s.trim().replace(/`/g, ''));
    const start = re.lastIndex;
    let end = sql.indexOf(';\n', start);
    if (end === -1) end = sql.indexOf(';', start);
    const rows = parseValues(sql.slice(start, end));
    out.push({ cols, rows });
  }
  return out;
}

let result = `-- seed.sql — data hasil konversi dari MySQL ke PostgreSQL
-- Jalankan SETELAH schema.sql, di Supabase SQL Editor.
-- (di-generate oleh tools/convert-data.js)

set session_replication_role = replica;  -- tunda cek FK selama load

`;

let totalRows = 0;
for (const table of TABLES) {
  for (const { cols, rows } of extractInsert(table)) {
    if (!rows.length) continue;
    // buang baris yang jumlah kolomnya tidak cocok (jaga-jaga)
    const good = rows.filter(r => r.length === cols.length);
    if (good.length !== rows.length) {
      console.warn(`! ${table}: ${rows.length - good.length} baris dilewati (kolom tak cocok)`);
    }
    result += `-- ${table}: ${good.length} baris\n`;
    const colList = cols.join(', ');
    for (let k = 0; k < good.length; k += 500) {
      const chunk = good.slice(k, k + 500);
      result += `insert into ${table} (${colList}) values\n`;
      result += chunk.map(r => '  (' + r.join(', ') + ')').join(',\n') + ';\n';
    }
    result += '\n';
    totalRows += good.length;
  }
}

result += `set session_replication_role = default;\n\n`;
for (const table of TABLES) {
  result += `select setval(pg_get_serial_sequence('${table}','id'), coalesce((select max(id) from ${table}), 1));\n`;
}

fs.writeFileSync(OUT, result, 'utf8');
console.log(`OK -> ${OUT}`);
console.log(`Total baris: ${totalRows}`);
