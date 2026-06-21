const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = async (label, sql) => { console.log('\n=== ' + label + ' ==='); console.table((await c.query(sql)).rows); };

  await q('Ukuran & baris per tabel', `
    select relname as tabel, n_live_tup as baris,
           pg_size_pretty(pg_total_relation_size(relid)) as total,
           pg_size_pretty(pg_indexes_size(relid)) as ukuran_index,
           seq_scan, idx_scan, n_dead_tup as baris_mati
    from pg_stat_user_tables order by pg_total_relation_size(relid) desc;`);

  await q('Index terdaftar', `
    select tablename as tabel, indexname as index
    from pg_indexes where schemaname='public' order by tablename, indexname;`);

  await q('Pemakaian index', `
    select relname as tabel, indexrelname as index, idx_scan as dipakai
    from pg_stat_user_indexes order by relname, idx_scan;`);

  await q('FK tanpa index pendukung (potensi lambat saat delete/join)', `
    select c.conrelid::regclass as tabel, a.attname as kolom_fk
    from pg_constraint c
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f'
      and not exists (
        select 1 from pg_index i
        where i.indrelid=c.conrelid and a.attnum=any(i.indkey));`);

  await c.end();
})();
