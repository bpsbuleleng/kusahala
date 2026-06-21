// Menjalankan file SQL besar ke Supabase via direct connection.
// Pakai: node tools/run-seed.js supabase/seed.sql
// Password & host diambil dari env CONN (connection string).
const fs = require('fs');
const { Client } = require('pg');

const file = process.argv[2] || 'supabase/seed.sql';
const conn = process.env.CONN;
if (!conn) { console.error('Set env CONN ke connection string.'); process.exit(1); }

(async () => {
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`File: ${file} (${(sql.length/1024/1024).toFixed(2)} MB)`);
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Terhubung. Menjalankan SQL...');
    await client.query(sql); // simple query protocol: jalankan semua statement dalam 1 sesi
    console.log('SELESAI tanpa error.');
  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.position) console.error('Posisi:', e.position);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
