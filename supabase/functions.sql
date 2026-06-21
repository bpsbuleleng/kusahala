-- =====================================================================
--  Fungsi (RPC) & View untuk Koperasi
--  Jalankan SETELAH schema.sql (boleh kapan saja, aman diulang).
--
--  Kenapa agregasi ada di sini, bukan di browser?
--  Menjumlahkan ribuan baris pesanan lebih ringan dikerjakan Postgres
--  daripada mengunduh semua baris ke HP pelanggan. Jadi yang berat
--  (ranking, rekap laporan, transaksi pesanan) = RPC di DB; yang ringan
--  (keranjang, pencarian, render kartu) = di client.
-- =====================================================================

-- ---------------------------------------------------------------------
-- buat_pesanan: simpan 1 pesanan + semua itemnya dalam 1 transaksi atomik
--   p_items = jsonb array: [{ "id":1, "jumlah":2, "catatan":"" }, ...]
--   return  = id pesanan baru
-- ---------------------------------------------------------------------
create or replace function buat_pesanan(p_pegawai_id int, p_items jsonb)
returns int
language plpgsql
as $$
declare
  v_id int;
  it   jsonb;
begin
  insert into pesanan (pegawai_id, tanggal)
  values (p_pegawai_id, now())
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_items)
  loop
    insert into detail_pesanan (pesanan_id, barang_id, kuantitas, catatan)
    values (
      v_id,
      (it->>'id')::int,
      greatest((it->>'jumlah')::int, 1),
      coalesce(it->>'catatan', '')
    );
  end loop;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- juara_belanja: ranking pegawai berdasarkan total belanja per bulan
-- ---------------------------------------------------------------------
create or replace function juara_belanja(p_bulan int, p_tahun int)
returns table (
  pegawai_id   int,
  nama_pegawai text,
  jumlah       bigint,
  total_jual   bigint
)
language sql
stable
as $$
  select
    pg.id,
    pg.nama::text,
    coalesce(sum(dp.kuantitas), 0)                   as jumlah,
    coalesce(sum(dp.kuantitas * b.harga_jual), 0)    as total_jual
  from pegawai pg
  left join pesanan p
         on pg.id = p.pegawai_id
        and extract(month from p.tanggal) = p_bulan
        and extract(year  from p.tanggal) = p_tahun
  left join detail_pesanan dp on p.id = dp.pesanan_id
  left join barang b          on b.id = dp.barang_id
  group by pg.id, pg.nama
  order by total_jual desc;
$$;

-- ---------------------------------------------------------------------
-- generate_laporan: snapshot laporan bulanan (MENGGANTI, bukan menumpuk)
--   Generate ulang bulan yang sama akan MENGHAPUS snapshot lama bulan itu
--   lalu menulis yang baru. Jadi hanya ada 1 snapshot terakhir per bulan
--   (generate_ke selalu 1). Mencegah tabel laporan membengkak.
-- ---------------------------------------------------------------------
create or replace function generate_laporan(p_bulan int, p_tahun int)
returns int
language plpgsql
as $$
begin
  -- buang snapshot lama bulan ini supaya tidak menumpuk
  delete from laporan where bulan = p_bulan and tahun = p_tahun;

  insert into laporan (
    bulan, tahun, nama_pegawai, nama_barang,
    harga_beli, harga_jual,
    total_harga_beli, total_harga_jual, keuntungan, generate_ke
  )
  select
    p_bulan, p_tahun, pg.nama, b.nama,
    b.harga_beli, b.harga_jual,
    b.harga_beli * sum(dp.kuantitas),
    b.harga_jual * sum(dp.kuantitas),
    (b.harga_jual - b.harga_beli) * sum(dp.kuantitas),
    1
  from detail_pesanan dp
  join pesanan p  on p.id  = dp.pesanan_id
  join pegawai pg on pg.id = p.pegawai_id
  join barang  b  on b.id  = dp.barang_id
  where extract(month from p.tanggal) = p_bulan
    and extract(year  from p.tanggal) = p_tahun
  group by pg.id, pg.nama, b.id, b.nama, b.harga_beli, b.harga_jual;

  return 1;
end;
$$;
