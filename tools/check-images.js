const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query('select gambar from barang');
  await c.end();
  const files = new Set(fs.readdirSync(path.join(__dirname, '..', 'uploads')));
  const missing = [];
  for (const row of r.rows) if (!files.has(row.gambar)) missing.push(row.gambar);
  console.log('Total barang:', r.rows.length, '| File di uploads:', files.size);
  console.log('Gambar DB yang TIDAK ada di uploads:', missing.length);
  missing.slice(0, 20).forEach(m => console.log('  -', m));
})();
