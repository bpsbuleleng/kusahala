/* =====================================================================
 *  pesanan.js — "Juara Belanja": ranking pegawai per bulan
 *  Agregasi dilakukan Postgres via RPC juara_belanja (ringan di client).
 * ===================================================================== */
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
               'Agustus','September','Oktober','November','Desember'];

document.addEventListener('DOMContentLoaded', () => {
  renderShell('pesanan');
  initFilter();
  document.getElementById('btn-tampil').onclick = muat;
  document.getElementById('btn-xlsx').onclick = unduhExcel;
  document.getElementById('btn-pdf').onclick = unduhPdf;
  muat();
});

function initFilter() {
  const now = new Date();
  const selB = document.getElementById('bulan');
  selB.innerHTML = BULAN.map((n, i) =>
    `<option value="${i + 1}" ${i === now.getMonth() ? 'selected' : ''}>${n}</option>`).join('');
  const selT = document.getElementById('tahun');
  let h = '';
  for (let y = 2020; y <= now.getFullYear(); y++)
    h += `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`;
  selT.innerHTML = h;
}

async function muat() {
  const bulan = Number(document.getElementById('bulan').value);
  const tahun = Number(document.getElementById('tahun').value);
  const tbody = document.querySelector('#tabel tbody');
  tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Memuat…</td></tr>`;

  const { data, error } = await sb.rpc('juara_belanja', { p_bulan: bulan, p_tahun: tahun });
  if (error) { tbody.innerHTML = `<tr><td colspan="4" class="text-center">Gagal memuat</td></tr>`; return; }

  const medali = ['🥇', '🥈', '🥉'];
  let rank = 0, totQty = 0, totJual = 0;
  tbody.innerHTML = data.map((r, i) => {
    totQty += Number(r.jumlah); totJual += Number(r.total_jual);
    const medal = r.total_jual == 0 ? '💀 ' : (rank < 3 ? medali[rank] + ' ' : '');
    if (r.total_jual > 0) rank++;
    const warn = r.total_jual < 50000 ? ' class="row-warn"' : '';
    return `<tr${warn}>
      <td>${i + 1}</td>
      <td>${medal}${esc(r.nama_pegawai)}</td>
      <td>${Number(r.jumlah).toLocaleString('id-ID')}</td>
      <td>${Number(r.total_jual).toLocaleString('id-ID')}</td></tr>`;
  }).join('') || `<tr><td colspan="4" class="text-center text-muted">Belum ada data.</td></tr>`;

  document.getElementById('f-qty').textContent = totQty.toLocaleString('id-ID');
  document.getElementById('f-total').textContent = totJual.toLocaleString('id-ID');
}

function unduhExcel() {
  const wb = XLSX.utils.table_to_book(document.getElementById('tabel'), { sheet: 'Juara Belanja' });
  XLSX.writeFile(wb, 'juara_belanja.xlsx');
}

function unduhPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Juara Belanja', 14, 12);
  doc.autoTable({ html: '#tabel', startY: 18, styles: { fontSize: 8 }, headStyles: { fillColor: [238, 77, 45] } });
  doc.save('juara_belanja.pdf');
}
