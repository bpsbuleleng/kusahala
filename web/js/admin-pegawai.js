/* admin-pegawai.js — CRUD pegawai */
document.addEventListener('DOMContentLoaded', () => {
  renderShell('admin');
  document.getElementById('btn-tambah').onclick = tambah;
  document.getElementById('f-nama').addEventListener('keydown', e => { if (e.key === 'Enter') tambah(); });
  load();
});

async function load() {
  const tbody = document.querySelector('#tabel tbody');
  const { data, error } = await sb.from('pegawai').select('*').order('id', { ascending: false });
  if (error) { tbody.innerHTML = `<tr><td colspan="2">Gagal memuat</td></tr>`; return; }
  tbody.innerHTML = data.map(p => `
    <tr data-id="${p.id}">
      <td contenteditable class="edit">${esc(p.nama)}</td>
      <td><button class="btn btn-danger btn-del" style="padding:4px 8px">🗑️</button></td>
    </tr>`).join('') || `<tr><td colspan="2" class="text-muted text-center">Belum ada pegawai.</td></tr>`;
}

async function tambah() {
  const input = document.getElementById('f-nama');
  const nama = input.value.trim();
  if (!nama) { toast('Isi nama dulu', 'danger'); return; }
  const { error } = await sb.from('pegawai').insert({ nama });
  if (error) { toast('Gagal menambah', 'danger'); return; }
  input.value = '';
  toast('Pegawai ditambahkan', 'success');
  load();
}

document.querySelector('#tabel tbody').addEventListener('blur', async (e) => {
  const cell = e.target.closest('.edit'); if (!cell) return;
  const id = Number(cell.closest('tr').dataset.id);
  const { error } = await sb.from('pegawai').update({ nama: cell.textContent.trim() }).eq('id', id);
  toast(error ? 'Gagal menyimpan' : 'Tersimpan', error ? 'danger' : 'success');
}, true);

document.querySelector('#tabel tbody').addEventListener('click', async (e) => {
  if (!e.target.closest('.btn-del')) return;
  const tr = e.target.closest('tr');
  if (!confirm('Yakin hapus pegawai ini?')) return;
  const { error } = await sb.from('pegawai').delete().eq('id', Number(tr.dataset.id));
  if (error) { toast('Gagal hapus (mungkin punya pesanan)', 'danger'); return; }
  tr.remove(); toast('Dihapus', 'success');
});
