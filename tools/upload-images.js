/*
 * upload-images.js
 * Mengunggah semua gambar di folder ../uploads ke Supabase Storage
 * (bucket "barang"). Jalankan SEKALI saja saat migrasi.
 *
 * Butuh Node 18+ (fetch sudah bawaan, tanpa npm install).
 *
 * Cara pakai (PowerShell):
 *   $env:SUPABASE_URL   = "https://xxxx.supabase.co"
 *   $env:SERVICE_KEY    = "service_role key dari Dashboard > Settings > API"
 *   node tools/upload-images.js
 *
 * CATATAN: service_role key bersifat RAHASIA. Hanya dipakai di skrip lokal
 * ini, JANGAN pernah ditaruh di kode web (folder web/).
 */
const fs = require('fs');
const path = require('path');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SERVICE_KEY;
const BUCKET = process.env.BUCKET || 'barang';
const DIR = path.join(__dirname, '..', 'uploads');

if (!URL || !KEY) {
  console.error('Set dulu env SUPABASE_URL dan SERVICE_KEY. Lihat komentar di file ini.');
  process.exit(1);
}

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp'
};

async function main() {
  // Pastikan bucket ada & publik (buat bila belum)
  const mk = await fetch(`${URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true })
  });
  if (mk.ok) console.log(`Bucket "${BUCKET}" dibuat (public).`);
  else if (mk.status === 409) console.log(`Bucket "${BUCKET}" sudah ada.`);
  else { console.error(`Gagal membuat bucket: ${mk.status} ${await mk.text()}`); process.exit(1); }

  const files = fs.readdirSync(DIR).filter(f => MIME[path.extname(f).toLowerCase()]);
  console.log(`Menemukan ${files.length} gambar di ${DIR}`);
  let ok = 0, skip = 0, fail = 0;

  for (const name of files) {
    const body = fs.readFileSync(path.join(DIR, name));
    const url = `${URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': MIME[path.extname(name).toLowerCase()],
        'x-upsert': 'true'
      },
      body
    });
    if (res.ok) { ok++; process.stdout.write('.'); }
    else if (res.status === 409) { skip++; process.stdout.write('-'); }
    else { fail++; console.error(`\nGAGAL ${name}: ${res.status} ${await res.text()}`); }
  }
  console.log(`\nSelesai. Berhasil: ${ok}, dilewati(ada): ${skip}, gagal: ${fail}`);
}
main();
