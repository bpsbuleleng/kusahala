/* =====================================================================
 *  admin-barang.js — CRUD barang + upload gambar ke Supabase Storage
 * ===================================================================== */
const PAGE = 30;
let page = 0, done = false, keyword = '';

document.addEventListener('DOMContentLoaded', () => {
  renderShell('admin');
  document.getElementById('btn-tambah').onclick = () => openModal();
  document.getElementById('btn-more').onclick = () => load();
  document.getElementById('cari').addEventListener('input', debounce(e => {
    keyword = e.target.value.trim(); reset();
  }, 350));
  setupModal();
  reset();
});

function reset() {
  page = 0; done = false;
  document.querySelector('#tabel tbody').innerHTML = '';
  load();
}

async function load() {
  const from = page * PAGE, to = from + PAGE - 1;
  let q = sb.from('barang').select('*').order('id', { ascending: false }).range(from, to);
  if (keyword) q = q.ilike('nama', `%${keyword}%`);
  const { data, error } = await q;
  if (error) { toast('Gagal memuat', 'danger'); return; }

  const tbody = document.querySelector('#tabel tbody');
  tbody.insertAdjacentHTML('beforeend', data.map(rowHtml).join(''));
  page++;
  done = data.length < PAGE;
  document.getElementById('btn-more').hidden = done;
  if (page === 1 && !data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tidak ada barang.</td></tr>`;
  }
}

function rowHtml(b) {
  return `<tr data-id="${b.id}" data-gambar="${esc(b.gambar || '')}">
    <td><img src="${imgUrl(b.gambar)}" onerror="this.src='img/placeholder.svg'"
             style="width:44px;height:44px;object-fit:cover;border-radius:6px"></td>
    <td contenteditable class="edit" data-field="nama">${esc(b.nama)}</td>
    <td contenteditable class="edit" data-field="deskripsi">${esc(b.deskripsi || '')}</td>
    <td contenteditable class="edit" data-field="harga_beli">${b.harga_beli ?? 0}</td>
    <td contenteditable class="edit" data-field="harga_jual">${b.harga_jual ?? 0}</td>
    <td style="white-space:nowrap">
      <button class="btn btn-outline btn-edit" style="padding:4px 8px">✏️</button>
      <button class="btn btn-danger btn-del" style="padding:4px 8px">🗑️</button>
    </td></tr>`;
}

/* ---------- inline edit (blur menyimpan) ---------- */
document.querySelector('#tabel tbody').addEventListener('blur', async (e) => {
  const cell = e.target.closest('.edit'); if (!cell) return;
  const tr = cell.closest('tr');
  const id = Number(tr.dataset.id);
  const field = cell.dataset.field;
  let value = cell.textContent.trim();
  if (field === 'harga_beli' || field === 'harga_jual') value = parseInt(value) || 0;
  const { error } = await sb.from('barang').update({ [field]: value }).eq('id', id);
  toast(error ? 'Gagal menyimpan' : 'Tersimpan', error ? 'danger' : 'success');
}, true);

/* ---------- edit & hapus ---------- */
document.querySelector('#tabel tbody').addEventListener('click', async (e) => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const id = Number(tr.dataset.id);
  if (e.target.closest('.btn-del')) {
    if (!confirm('Yakin hapus barang ini?')) return;
    const { error } = await sb.from('barang').delete().eq('id', id);
    if (error) { toast('Gagal hapus (mungkin dipakai di pesanan)', 'danger'); return; }
    tr.remove(); toast('Barang dihapus', 'success');
  } else if (e.target.closest('.btn-edit')) {
    const { data } = await sb.from('barang').select('*').eq('id', id).single();
    openModal(data);
  }
});

/* ---------- modal tambah/edit ---------- */
function setupModal() {
  const modal = document.getElementById('modal');
  modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => modal.hidden = true);
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

  document.getElementById('f-gambar').addEventListener('change', e => {
    const f = e.target.files[0]; const img = document.getElementById('f-preview');
    if (f) { img.src = URL.createObjectURL(f); img.style.display = 'block'; }
  });

  document.getElementById('f-simpan').onclick = simpan;
}

function openModal(b = null) {
  const modal = document.getElementById('modal');
  document.getElementById('modal-title').textContent = b ? 'Edit Barang' : 'Tambah Barang';
  document.getElementById('f-id').value = b?.id || '';
  document.getElementById('f-nama').value = b?.nama || '';
  document.getElementById('f-deskripsi').value = b?.deskripsi || '';
  document.getElementById('f-beli').value = b?.harga_beli ?? 0;
  document.getElementById('f-jual').value = b?.harga_jual ?? 0;
  document.getElementById('f-gambar').value = '';
  const img = document.getElementById('f-preview');
  if (b?.gambar) { img.src = imgUrl(b.gambar); img.style.display = 'block'; img.dataset.old = b.gambar; }
  else { img.style.display = 'none'; img.dataset.old = ''; }
  modal.hidden = false;
}

async function simpan() {
  const id = document.getElementById('f-id').value;
  const nama = document.getElementById('f-nama').value.trim();
  if (!nama) { toast('Nama wajib diisi', 'danger'); return; }

  const btn = document.getElementById('f-simpan');
  btn.disabled = true; btn.textContent = 'Menyimpan…';

  const rec = {
    nama,
    deskripsi: document.getElementById('f-deskripsi').value.trim(),
    harga_beli: parseInt(document.getElementById('f-beli').value) || 0,
    harga_jual: parseInt(document.getElementById('f-jual').value) || 0,
  };

  // upload gambar bila ada file baru
  const file = document.getElementById('f-gambar').files[0];
  if (file) {
    const fname = `${Date.now()}_${file.name.replace(/[^\w.\- ]/g, '')}`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(fname, file, { upsert: false });
    if (upErr) { toast('Gagal upload gambar', 'danger'); btn.disabled = false; btn.textContent = 'Simpan'; return; }
    rec.gambar = fname;
  }

  let error;
  if (id) ({ error } = await sb.from('barang').update(rec).eq('id', Number(id)));
  else { rec.gambar = rec.gambar || 'default.jpg'; ({ error } = await sb.from('barang').insert(rec)); }

  btn.disabled = false; btn.textContent = 'Simpan';
  if (error) { toast('Gagal menyimpan', 'danger'); return; }
  document.getElementById('modal').hidden = true;
  toast('Tersimpan', 'success');
  reset();
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
