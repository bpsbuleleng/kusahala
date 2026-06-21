/* =====================================================================
 *  laporan.js — laporan bulanan (snapshot generate_ke terakhir)
 *  Generate = RPC generate_laporan (agregasi & insert di DB).
 * ===================================================================== */
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
               'Agustus','September','Oktober','November','Desember'];

document.addEventListener('DOMContentLoaded', async () => {
  if (!await guardAdmin()) return;
  renderShell('admin');
  renderAdminBar();
  initFilter();
  document.getElementById('btn-tampil').onclick = muat;
  document.getElementById('btn-generate').onclick = generate;
  document.getElementById('btn-xlsx').onclick = unduhExcel;
  muat();
});

function initFilter() {
  const now = new Date();
  document.getElementById('bulan').innerHTML = BULAN.map((n, i) =>
    `<option value="${i + 1}" ${i === now.getMonth() ? 'selected' : ''}>${n}</option>`).join('');
  let h = '';
  for (let y = 2023; y <= now.getFullYear(); y++)
    h += `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`;
  document.getElementById('tahun').innerHTML = h;
}

const getB = () => Number(document.getElementById('bulan').value);
const getT = () => Number(document.getElementById('tahun').value);

async function muat() {
  const bulan = getB(), tahun = getT();

  // generate_ke terakhir
  const { data: maxRows } = await sb.from('laporan')
    .select('generate_ke').eq('bulan', bulan).eq('tahun', tahun)
    .order('generate_ke', { ascending: false }).limit(1);
  const generateKe = maxRows?.[0]?.generate_ke;

  const show = (ids, on) => ids.forEach(id => document.getElementById(id).hidden = !on);

  if (!generateKe) {
    document.getElementById('kosong').hidden = false;
    show(['ringkasan', 'h-detail', 'wrap-detail', 'h-rekap', 'wrap-rekap'], false);
    return;
  }
  document.getElementById('kosong').hidden = true;

  const { data: rows } = await sb.from('laporan').select('*')
    .eq('bulan', bulan).eq('tahun', tahun).eq('generate_ke', generateKe);

  let tBeli = 0, tJual = 0, tUntung = 0;
  const tbDetail = document.querySelector('#t-detail tbody');
  tbDetail.innerHTML = rows.map(r => {
    const jumlah = r.harga_jual > 0 ? Math.round(r.total_harga_jual / r.harga_jual) : 0;
    const untung = r.total_harga_jual - r.total_harga_beli;
    tBeli += r.total_harga_beli; tJual += r.total_harga_jual; tUntung += untung;
    return `<tr><td>${esc(r.nama_pegawai)}</td><td>${esc(r.nama_barang)}</td><td>${jumlah}</td>
      <td>${rupiah(r.harga_beli)}</td><td>${rupiah(r.harga_jual)}</td>
      <td>${rupiah(r.total_harga_beli)}</td><td>${rupiah(r.total_harga_jual)}</td>
      <td>${rupiah(untung)}</td></tr>`;
  }).join('');

  // rekap per barang (agregasi ringan di client dari data yang sudah kecil)
  const rekap = {};
  for (const r of rows) {
    const k = r.nama_barang;
    const jumlah = r.harga_jual > 0 ? Math.round(r.total_harga_jual / r.harga_jual) : 0;
    rekap[k] ??= { jumlah: 0, harga_beli: r.harga_beli, harga_jual: r.harga_jual, tb: 0, tj: 0 };
    rekap[k].jumlah += jumlah;
    rekap[k].tb += r.total_harga_beli;
    rekap[k].tj += r.total_harga_jual;
  }
  document.querySelector('#t-rekap tbody').innerHTML = Object.entries(rekap).map(([nama, d]) =>
    `<tr><td>${esc(nama)}</td><td>${d.jumlah}</td><td>${rupiah(d.harga_beli)}</td>
      <td>${rupiah(d.harga_jual)}</td><td>${rupiah(d.tb)}</td><td>${rupiah(d.tj)}</td>
      <td>${rupiah(d.tj - d.tb)}</td></tr>`).join('');

  document.getElementById('s-beli').textContent = rupiah(tBeli);
  document.getElementById('s-jual').textContent = rupiah(tJual);
  document.getElementById('s-untung').textContent = rupiah(tUntung);
  show(['ringkasan', 'h-detail', 'wrap-detail', 'h-rekap', 'wrap-rekap'], true);
}

async function generate() {
  if (!confirm('Generate laporan untuk bulan ini? (membuat snapshot baru)')) return;
  const { error } = await sb.rpc('generate_laporan', { p_bulan: getB(), p_tahun: getT() });
  if (error) { toast('Gagal generate', 'danger'); return; }
  toast('Laporan dibuat', 'success');
  muat();
}

function unduhExcel() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById('t-detail')), 'Detail');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById('t-rekap')), 'Rekap');
  XLSX.writeFile(wb, `laporan_${getB()}_${getT()}.xlsx`);
}
