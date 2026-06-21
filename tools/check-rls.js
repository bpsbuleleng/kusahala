// Verifikasi RLS dengan ANON key (meniru browser pembeli).
const KEY = process.env.ANON;
const URL = 'https://bebtuqrxdhjfgtchyswe.supabase.co';
const h = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

(async () => {
  // 1) BACA barang -> harus boleh
  let r = await fetch(`${URL}/rest/v1/barang?select=id&limit=1`, { headers: h });
  console.log('1. anon BACA barang :', r.status, r.ok ? 'BOLEH (benar)' : 'ditolak');

  // 2) TAMBAH barang sebagai anon -> harus DITOLAK
  r = await fetch(`${URL}/rest/v1/barang`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ nama: '__tes_rls__', harga_jual: 0, harga_beli: 0 })
  });
  console.log('2. anon TAMBAH barang:', r.status, r.status >= 400 ? 'DITOLAK (benar)' : 'LOLOS (BAHAYA!)');

  // 3) CHECKOUT (RPC buat_pesanan) sebagai anon -> harus boleh
  r = await fetch(`${URL}/rest/v1/rpc/buat_pesanan`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ p_pegawai_id: 1, p_items: [{ id: 1, jumlah: 1, catatan: '__tes_rls__' }] })
  });
  const body = await r.text();
  console.log('3. anon CHECKOUT     :', r.status, r.ok ? `BOLEH (benar) pesanan_id=${body}` : 'ditolak: ' + body);
})();
