/* =====================================================================
 *  auth.js — penjaga halaman admin (Supabase Auth)
 *  - guardAdmin(): pastikan sudah login; kalau belum -> ke login.html
 *  - renderAdminBar(): tampilkan email admin + tombol Keluar (#admin-bar)
 *  - doLogout(): keluar lalu kembali ke halaman belanja
 *
 *  Catatan keamanan: ini BUKAN sekadar sembunyikan tombol. Hak tulis
 *  (tambah/ubah/hapus barang, pegawai, laporan) dikunci di sisi server
 *  lewat RLS (lihat supabase/rls-admin.sql) — anon TIDAK bisa menulis
 *  walau memanggil API langsung.
 * ===================================================================== */
async function guardAdmin() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const next = encodeURIComponent(location.pathname.split('/').pop() || 'admin-barang.html');
    location.replace(`login.html?next=${next}`);
    return false;
  }
  return true;
}

async function doLogout() {
  await sb.auth.signOut();
  location.replace('index.html');
}

async function renderAdminBar() {
  const el = document.getElementById('admin-bar');
  if (!el) return;
  const { data: { user } } = await sb.auth.getUser();
  el.innerHTML =
    `<span class="text-muted" style="font-size:13px;margin-right:8px">👤 ${esc(user?.email || 'admin')}</span>
     <button class="btn btn-outline" id="btn-logout" style="padding:4px 10px">Keluar</button>`;
  document.getElementById('btn-logout').onclick = doLogout;
}
