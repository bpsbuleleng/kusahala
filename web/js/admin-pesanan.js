/* =====================================================================
 *  admin-pesanan.js — daftar pesanan + edit tanggal pesan
 *  Tujuan: pengurus bisa memindahkan pesanan susulan (mis. ditulis awal
 *  bulan depan) ke akhir bulan ini, supaya masuk periode laporan yang benar.
 *  generate_laporan memfilter berdasar bulan/tahun dari kolom `tanggal`.
 * ===================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  if (!await guardAdmin()) return;
  renderShell('admin');
  renderAdminBar();

  // default rentang: awal bulan ini -> tanggal 10 bulan depan
  const now = new Date();
  document.getElementById('dari').value = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  document.getElementById('sampai').value = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 10));

  document.getElementById('btn-tampil').onclick = load;
  load();
});

// Date -> "YYYY-MM-DD" (waktu lokal, bukan UTC)
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "YYYY-MM-DD" + n hari -> "YYYY-MM-DD"
function plusDays(s, n) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}

async function load() {
  const dari = document.getElementById('dari').value;
  const sampai = document.getElementById('sampai').value;
  const tbody = document.querySelector('#tabel tbody');
  const info = document.getElementById('info');
  if (!dari || !sampai) { toast('Isi rentang tanggal', 'danger'); return; }

  tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Memuat…</td></tr>`;

  const { data, error } = await sb
    .from('pesanan')
    .select('id, tanggal, pegawai:pegawai_id(nama), detail_pesanan(kuantitas, barang:barang_id(nama))')
    .gte('tanggal', dari)
    .lt('tanggal', plusDays(sampai, 1))     // termasuk hari "sampai" penuh
    .order('tanggal', { ascending: true });

  if (error) { tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat</td></tr>`; return; }

  info.textContent = `${data.length} pesanan`;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Tidak ada pesanan pada rentang ini.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(rowHtml).join('');
}

function rowHtml(p) {
  const tgl = String(p.tanggal).slice(0, 10);    // YYYY-MM-DD
  const isi = (p.detail_pesanan || [])
    .map(d => `${esc(d.barang?.nama || '?')} ×${d.kuantitas}`)
    .join(', ') || '<span class="text-muted">—</span>';
  return `<tr data-id="${p.id}" data-asli="${tgl}">
    <td><input type="date" class="ed-tgl" value="${tgl}" style="width:150px"></td>
    <td>${esc(p.pegawai?.nama || '—')}</td>
    <td style="font-size:13px">${isi}</td>
    <td><button class="btn btn-green btn-save" style="padding:4px 10px">Simpan</button></td>
  </tr>`;
}

// Simpan tanggal baru (event delegation)
document.querySelector('#tabel tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-save');
  if (!btn) return;
  const tr = e.target.closest('tr');
  const id = Number(tr.dataset.id);
  const baru = tr.querySelector('.ed-tgl').value;
  if (!baru) { toast('Tanggal kosong', 'danger'); return; }
  if (baru === tr.dataset.asli) { toast('Tanggal tidak berubah'); return; }

  btn.disabled = true; btn.textContent = '…';
  const { error } = await sb.from('pesanan').update({ tanggal: baru }).eq('id', id);
  btn.disabled = false; btn.textContent = 'Simpan';
  if (error) { toast('Gagal menyimpan', 'danger'); return; }
  tr.dataset.asli = baru;
  toast('Tanggal pesanan diperbarui', 'success');
});
