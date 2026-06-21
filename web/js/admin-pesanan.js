/* =====================================================================
 *  admin-pesanan.js — daftar & EDIT pesanan pegawai
 *  Pengurus dapat:
 *   - ubah tanggal pesan (pindah periode laporan) & ganti pegawai
 *   - tambah / hapus item, ubah kuantitas, hapus seluruh pesanan
 *   - buat pesanan baru
 *  Harga beli/jual diambil langsung dari tabel barang; rekap = jumlah
 *  seluruh pesanan yang sedang tampil.
 *  Semua tulis ke pesanan/detail_pesanan dibatasi admin login (RLS).
 * ===================================================================== */
let BARANG = new Map();   // id -> { nama, hb, hj }
let BARANG_LIST = [];     // untuk dropdown tambah item
let PEGAWAI = [];         // { id, nama }
let ORDERS = [];          // { id, pegawai_id, tanggal, items:[{id,barang_id,kuantitas}] }

document.addEventListener('DOMContentLoaded', async () => {
  if (!await guardAdmin()) return;
  renderShell('admin');
  renderAdminBar();
  setDefaultDates();
  await loadRefs();
  bindUI();
  load();
});

/* ---------- util tanggal ---------- */
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function plusDays(s, n) { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); }

function setDefaultDates() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0); // tgl terakhir bulan ini
  document.getElementById('dari').value = ymd(first);
  document.getElementById('sampai').value = ymd(last);
  document.getElementById('np-tgl').value = ymd(now);
}

/* ---------- referensi (barang & pegawai) ---------- */
async function loadRefs() {
  const [bs, ps] = await Promise.all([
    sb.from('barang').select('id,nama,harga_beli,harga_jual').order('nama'),
    sb.from('pegawai').select('id,nama').order('nama')
  ]);
  BARANG_LIST = bs.data || [];
  BARANG = new Map(BARANG_LIST.map(b => [b.id, { nama: b.nama, hb: b.harga_beli || 0, hj: b.harga_jual || 0 }]));
  PEGAWAI = ps.data || [];
}

function bindUI() {
  document.getElementById('btn-tampil').onclick = load;
  document.getElementById('btn-add-order').onclick = addOrder;
  document.getElementById('np-pegawai').innerHTML = pegawaiOptions(null);
}

/* ---------- muat pesanan dalam rentang ---------- */
async function load() {
  const dari = document.getElementById('dari').value;
  const sampai = document.getElementById('sampai').value;
  if (!dari || !sampai) { toast('Isi rentang tanggal', 'danger'); return; }
  document.getElementById('orders').innerHTML = `<div class="section text-center text-muted">Memuat…</div>`;

  const { data, error } = await sb
    .from('pesanan')
    .select('id,tanggal,pegawai_id,detail_pesanan(id,barang_id,kuantitas)')
    .gte('tanggal', dari)
    .lt('tanggal', plusDays(sampai, 1))
    .order('tanggal', { ascending: true });

  if (error) { document.getElementById('orders').innerHTML = `<div class="section text-center text-danger">Gagal memuat</div>`; return; }

  ORDERS = (data || []).map(p => ({
    id: p.id, pegawai_id: p.pegawai_id, tanggal: String(p.tanggal).slice(0, 10),
    items: (p.detail_pesanan || []).map(d => ({ id: d.id, barang_id: d.barang_id, kuantitas: d.kuantitas }))
  }));
  renderAll();
}

/* ---------- hitung ---------- */
function itemCalc(it) {
  const b = BARANG.get(it.barang_id) || { nama: '(barang dihapus)', hb: 0, hj: 0 };
  const tb = b.hb * it.kuantitas, tj = b.hj * it.kuantitas;
  return { nama: b.nama, hb: b.hb, hj: b.hj, tb, tj, untung: tj - tb };
}
function orderTotals(o) {
  let tb = 0, tj = 0;
  for (const it of o.items) { const c = itemCalc(it); tb += c.tb; tj += c.tj; }
  return { tb, tj, untung: tj - tb };
}

/* ---------- render ---------- */
function pegawaiOptions(sel) {
  return ['<option value="">— pilih pegawai —</option>']
    .concat(PEGAWAI.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nama)}</option>`))
    .join('');
}
function barangOptions() {
  return ['<option value="">— pilih barang —</option>']
    .concat(BARANG_LIST.map(b => `<option value="${b.id}">${esc(b.nama)}</option>`))
    .join('');
}

function renderCard(o) {
  const rows = o.items.map(it => {
    const c = itemCalc(it);
    return `<tr data-item="${it.id}">
      <td>${esc(c.nama)}</td>
      <td><input type="number" class="ed-qty" min="1" value="${it.kuantitas}" style="width:60px"></td>
      <td style="text-align:right">${rupiah(c.hb)}</td>
      <td style="text-align:right">${rupiah(c.hj)}</td>
      <td style="text-align:right">${rupiah(c.tb)}</td>
      <td style="text-align:right">${rupiah(c.tj)}</td>
      <td style="text-align:right">${rupiah(c.untung)}</td>
      <td><button class="btn btn-danger btn-del-item" style="padding:2px 8px">🗑️</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" class="text-center text-muted">Belum ada item.</td></tr>`;

  const t = orderTotals(o);
  return `<div class="section" data-order="${o.id}" style="margin-bottom:14px">
    <div class="toolbar" style="margin-bottom:8px">
      <input type="date" class="ed-tgl" value="${o.tanggal}" style="width:150px">
      <select class="ed-pegawai" style="min-width:180px">${pegawaiOptions(o.pegawai_id)}</select>
      <span class="text-muted" style="font-size:12px;align-self:center">#${o.id}</span>
      <button class="btn btn-danger btn-del-order" style="margin-left:auto;padding:4px 10px">Hapus Pesanan</button>
    </div>
    <div class="table-wrap">
      <table class="tbl">
        <thead><tr>
          <th>Barang</th><th>Qty</th>
          <th style="text-align:right">H.Beli</th><th style="text-align:right">H.Jual</th>
          <th style="text-align:right">Tot.Beli</th><th style="text-align:right">Tot.Jual</th>
          <th style="text-align:right">Untung</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="font-weight:700">
          <td colspan="4" style="text-align:right">Subtotal</td>
          <td style="text-align:right">${rupiah(t.tb)}</td>
          <td style="text-align:right">${rupiah(t.tj)}</td>
          <td style="text-align:right">${rupiah(t.untung)}</td><td></td>
        </tr></tfoot>
      </table>
    </div>
    <div class="add-area toolbar" style="margin-top:8px">
      <button class="btn btn-green btn-show-add" style="padding:4px 10px">+ Item</button>
    </div>
  </div>`;
}

function renderAll() {
  const cont = document.getElementById('orders');
  cont.innerHTML = ORDERS.length
    ? ORDERS.map(renderCard).join('')
    : `<div class="section text-center text-muted">Tidak ada pesanan pada rentang ini.</div>`;
  renderRekap();
  updateInfo();
}
function updateCard(o) { const el = document.querySelector(`[data-order="${o.id}"]`); if (el) el.outerHTML = renderCard(o); }
function updateInfo() { document.getElementById('info').textContent = `${ORDERS.length} pesanan`; }

function renderRekap() {
  let tb = 0, tj = 0;
  for (const o of ORDERS) { const t = orderTotals(o); tb += t.tb; tj += t.tj; }
  document.getElementById('rk-beli').textContent = rupiah(tb);
  document.getElementById('rk-jual').textContent = rupiah(tj);
  document.getElementById('rk-untung').textContent = rupiah(tj - tb);
  document.getElementById('rk-count').textContent = `${ORDERS.length} pesanan`;
}

/* ---------- tambah pesanan baru ---------- */
async function addOrder() {
  const pid = Number(document.getElementById('np-pegawai').value) || null;
  const tgl = document.getElementById('np-tgl').value;
  if (!pid) { toast('Pilih pegawai dulu', 'danger'); return; }
  if (!tgl) { toast('Pilih tanggal', 'danger'); return; }
  const { data, error } = await sb.from('pesanan').insert({ pegawai_id: pid, tanggal: tgl }).select('id').single();
  if (error) { toast('Gagal membuat pesanan', 'danger'); return; }
  ORDERS.unshift({ id: data.id, pegawai_id: pid, tanggal: tgl, items: [] });
  renderAll();
  toast('Pesanan baru dibuat — tambahkan itemnya', 'success');
}

/* ---------- interaksi kartu (event delegation) ---------- */
const cont = document.getElementById('orders');

cont.addEventListener('change', async (e) => {
  const card = e.target.closest('[data-order]'); if (!card) return;
  const o = ORDERS.find(x => x.id === Number(card.dataset.order)); if (!o) return;

  if (e.target.classList.contains('ed-tgl')) {
    const v = e.target.value; if (!v) return;
    const { error } = await sb.from('pesanan').update({ tanggal: v }).eq('id', o.id);
    if (error) return toast('Gagal ubah tanggal', 'danger');
    o.tanggal = v; toast('Tanggal diperbarui', 'success');

  } else if (e.target.classList.contains('ed-pegawai')) {
    const v = e.target.value ? Number(e.target.value) : null;
    const { error } = await sb.from('pesanan').update({ pegawai_id: v }).eq('id', o.id);
    if (error) return toast('Gagal ubah pegawai', 'danger');
    o.pegawai_id = v; toast('Pegawai diperbarui', 'success');

  } else if (e.target.classList.contains('ed-qty')) {
    const iid = Number(e.target.closest('[data-item]').dataset.item);
    let q = parseInt(e.target.value) || 1; if (q < 1) q = 1;
    const { error } = await sb.from('detail_pesanan').update({ kuantitas: q }).eq('id', iid);
    if (error) return toast('Gagal ubah qty', 'danger');
    o.items.find(i => i.id === iid).kuantitas = q;
    updateCard(o); renderRekap(); toast('Qty diperbarui', 'success');
  }
});

cont.addEventListener('click', async (e) => {
  const card = e.target.closest('[data-order]'); if (!card) return;
  const o = ORDERS.find(x => x.id === Number(card.dataset.order)); if (!o) return;

  if (e.target.closest('.btn-del-item')) {
    const iid = Number(e.target.closest('[data-item]').dataset.item);
    const { error } = await sb.from('detail_pesanan').delete().eq('id', iid);
    if (error) return toast('Gagal hapus item', 'danger');
    o.items = o.items.filter(i => i.id !== iid);
    updateCard(o); renderRekap(); toast('Item dihapus', 'success');

  } else if (e.target.closest('.btn-del-order')) {
    if (!confirm('Hapus seluruh pesanan ini?')) return;
    const { error } = await sb.from('pesanan').delete().eq('id', o.id);
    if (error) return toast('Gagal hapus pesanan', 'danger');
    ORDERS = ORDERS.filter(x => x.id !== o.id);
    card.remove(); renderRekap(); updateInfo(); toast('Pesanan dihapus', 'success');

  } else if (e.target.closest('.btn-show-add')) {
    card.querySelector('.add-area').innerHTML =
      `<select class="add-barang" style="min-width:180px">${barangOptions()}</select>
       <input type="number" class="add-qty" min="1" value="1" style="width:60px">
       <button class="btn btn-green btn-add-item" style="padding:4px 10px">Tambah</button>`;

  } else if (e.target.closest('.btn-add-item')) {
    const bid = Number(card.querySelector('.add-barang').value) || null;
    let q = parseInt(card.querySelector('.add-qty').value) || 1; if (q < 1) q = 1;
    if (!bid) return toast('Pilih barang dulu', 'danger');
    const { data, error } = await sb.from('detail_pesanan')
      .insert({ pesanan_id: o.id, barang_id: bid, kuantitas: q }).select('id').single();
    if (error) return toast('Gagal tambah item', 'danger');
    o.items.push({ id: data.id, barang_id: bid, kuantitas: q });
    updateCard(o); renderRekap(); toast('Item ditambah', 'success');
  }
});
