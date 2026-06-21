// Rapikan nama pegawai: buang spasi/enter di awal-akhir, ringkas
// spasi/baris berlebih di tengah jadi satu spasi.
// PREVIEW dulu: node tools/clean-pegawai.js
// TERAPKAN   : node tools/clean-pegawai.js --apply
const { Client } = require('pg');
const apply = process.argv.includes('--apply');
const bersih = (s) => String(s).trim().replace(/\s+/g, ' ');

(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows } = await c.query('select id, nama from pegawai order by id');
  const ubah = rows
    .map(r => ({ id: r.id, sebelum: r.nama, sesudah: bersih(r.nama) }))
    .filter(r => r.sebelum !== r.sesudah);

  console.log(`Nama yang akan dirapikan: ${ubah.length}`);
  console.table(ubah.map(r => ({ id: r.id, sebelum: JSON.stringify(r.sebelum), sesudah: r.sesudah })));

  if (apply && ubah.length) {
    for (const r of ubah) {
      await c.query('update pegawai set nama = $1 where id = $2', [r.sesudah, r.id]);
    }
    console.log(`\nDITERAPKAN: ${ubah.length} nama diperbarui.`);
  } else if (!apply) {
    console.log('\n(PREVIEW saja — jalankan dengan --apply untuk menyimpan)');
  }
  await c.end();
})();
