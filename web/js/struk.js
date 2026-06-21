/* struk.js — tampilkan struk dari sessionStorage, bisa dicetak (window.print) */
document.addEventListener('DOMContentLoaded', async () => {
  renderShell('keranjang');

  const raw = sessionStorage.getItem('struk');
  if (!raw) {
    document.getElementById('struk-area').innerHTML =
      '<p class="text-center text-muted">Struk tidak tersedia.</p>';
    return;
  }
  const struk = JSON.parse(raw);

  // ambil nama pegawai (sekali) agar struk lebih informatif
  let namaPegawai = '#' + struk.pegawai_id;
  const { data } = await sb.from('pegawai').select('nama').eq('id', struk.pegawai_id).single();
  if (data) namaPegawai = data.nama;

  document.getElementById('meta').innerHTML =
    `<div><b>Pegawai:</b> ${esc(namaPegawai)}</div>
     <div><b>No. Pesanan:</b> ${struk.pesanan_id}</div>
     <div><b>Tanggal:</b> ${new Date().toLocaleString('id-ID')}</div>`;

  let grand = 0;
  const tbody = document.querySelector('#tbl-struk tbody');
  tbody.innerHTML = struk.items.map(it => {
    const total = it.jumlah * it.harga_jual;
    grand += total;
    return `<tr>
      <td>${esc(it.nama)}${it.catatan ? `<br><small class="text-muted">📝 ${esc(it.catatan)}</small>` : ''}</td>
      <td>${it.jumlah}</td>
      <td>${rupiah(it.harga_jual)}</td>
      <td>${rupiah(total)}</td></tr>`;
  }).join('');
  document.getElementById('grand').textContent = rupiah(grand);

  // struk hanya sekali pakai
  sessionStorage.removeItem('struk');
});
