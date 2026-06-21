-- =====================================================================
--  rls-admin.sql — kunci hak TULIS untuk admin (authenticated)
--  Jalankan SETELAH schema.sql. Aman diulang (idempotent).
--
--  Prinsip:
--   - BACA (select)  : publik  -> katalog & laporan tetap bisa dimuat
--   - pesanan/detail : anon BOLEH insert (checkout pembeli)
--   - barang/pegawai/laporan/recent : tulis HANYA authenticated (admin login)
--
--  Dengan ini, walau seseorang punya anon key, ia TIDAK bisa menamb/
--  mengubah/menghapus barang, pegawai, atau laporan lewat API.
-- =====================================================================

-- 1) Bersihkan policy lama (mode terbuka dari schema.sql) & set BACA publik
do $$
declare t text;
begin
  foreach t in array array['pegawai','barang','pesanan','detail_pesanan','laporan','recent']
  loop
    execute format('drop policy if exists "%s_select" on %I;', t, t);
    execute format('drop policy if exists "%s_insert" on %I;', t, t);
    execute format('drop policy if exists "%s_update" on %I;', t, t);
    execute format('drop policy if exists "%s_delete" on %I;', t, t);
    execute format('create policy "%s_select" on %I for select using (true);', t, t);
  end loop;
end $$;

-- 2) Helper: bikin policy tulis "authenticated only" yang idempotent
do $$
declare t text;
begin
  foreach t in array array['barang','pegawai','laporan','recent']
  loop
    execute format('drop policy if exists "%s_ins" on %I;', t, t);
    execute format('drop policy if exists "%s_upd" on %I;', t, t);
    execute format('drop policy if exists "%s_del" on %I;', t, t);
    execute format('create policy "%s_ins" on %I for insert to authenticated with check (true);', t, t);
    execute format('create policy "%s_upd" on %I for update to authenticated using (true) with check (true);', t, t);
    execute format('create policy "%s_del" on %I for delete to authenticated using (true);', t, t);
  end loop;
end $$;

-- 3) pesanan & detail_pesanan: anon BOLEH insert (checkout); ubah/hapus admin saja
do $$
declare t text;
begin
  foreach t in array array['pesanan','detail_pesanan']
  loop
    execute format('drop policy if exists "%s_ins" on %I;', t, t);
    execute format('drop policy if exists "%s_upd" on %I;', t, t);
    execute format('drop policy if exists "%s_del" on %I;', t, t);
    execute format('create policy "%s_ins" on %I for insert with check (true);', t, t);   -- anon + authenticated
    execute format('create policy "%s_upd" on %I for update to authenticated using (true) with check (true);', t, t);
    execute format('create policy "%s_del" on %I for delete to authenticated using (true);', t, t);
  end loop;
end $$;

-- 4) Storage: gambar barang — baca publik, tulis hanya admin
drop policy if exists "barang_obj_read"   on storage.objects;
drop policy if exists "barang_obj_write"  on storage.objects;
drop policy if exists "barang_obj_update" on storage.objects;
drop policy if exists "barang_obj_delete" on storage.objects;
create policy "barang_obj_read"   on storage.objects for select using (bucket_id = 'barang');
create policy "barang_obj_write"  on storage.objects for insert to authenticated with check (bucket_id = 'barang');
create policy "barang_obj_update" on storage.objects for update to authenticated using (bucket_id = 'barang') with check (bucket_id = 'barang');
create policy "barang_obj_delete" on storage.objects for delete to authenticated using (bucket_id = 'barang');
