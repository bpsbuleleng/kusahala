/* =====================================================================
 *  index.js — katalog produk + infinite scroll + keranjang
 *  Strategi ringan-di-client:
 *   - daftar barang diambil bertahap (page demi page) pakai .range()
 *     sehingga 200/2000 barang tidak diunduh sekaligus
 *   - pencarian -> server filter (ilike) supaya transfer data kecil
 *   - keranjang sepenuhnya di localStorage (Cart)
 * ===================================================================== */
const PAGE = 24;                 // jumlah barang per "halaman" infinite scroll
let page = 0;
let loading = false;
let done = false;
let keyword = '';

const grid = document.getElementById('grid');
const elMore = document.getElementById('more');
const elEnd = document.getElementById('end');
const elEmpty = document.getElementById('empty');

document.addEventListener('DOMContentLoaded', init);

async function init() {
  renderShell('index');
  bindSearch();
  // delegasi interaksi kartu untuk grid utama + baris rekomendasi
  attachCardHandlers(grid);
  attachCardHandlers(document.getElementById('rec-bestseller-row'));
  attachCardHandlers(document.getElementById('rec-personal-row'));
  await loadPegawai();
  loadRecommendations();
  setupInfiniteScroll();
  resetAndLoad();
}

/* ---------- Rekomendasi ---------- */
async function loadRecommendations() {
  loadBestSeller();
  loadPersonal(Cart.getPegawai());
}

async function loadBestSeller() {
  const { data, error } = await sb.rpc('best_seller', { p_limit: 12 });
  renderRec('rec-bestseller', data, error);
}

async function loadPersonal(pegawaiId) {
  if (!pegawaiId) { document.getElementById('rec-personal').hidden = true; return; }
  const { data, error } = await sb.rpc('rekomendasi_pegawai', { p_pegawai_id: Number(pegawaiId), p_limit: 12 });
  renderRec('rec-personal', data, error);
}

function renderRec(secId, data, error) {
  const sec = document.getElementById(secId);
  const row = document.getElementById(secId + '-row');
  if (error || !data || !data.length) { sec.hidden = true; row.innerHTML = ''; return; }
  row.innerHTML = data.map(cardHtml).join('');
  sec.hidden = false;
}

/* ---------- Pegawai ---------- */
async function loadPegawai() {
  const sel = document.getElementById('pegawai');
  const { data, error } = await sb.from('pegawai').select('id,nama').order('nama');
  if (error) { sel.innerHTML = '<option value="">Gagal memuat pegawai</option>'; return; }
  const saved = Cart.getPegawai();
  sel.innerHTML = '<option value="">-- Pilih Pegawai --</option>' +
    data.map(p => `<option value="${p.id}" ${saved == p.id ? 'selected' : ''}>${esc(p.nama)}</option>`).join('');
  sel.addEventListener('change', () => {
    Cart.setPegawai(sel.value);
    loadPersonal(sel.value);          // perbarui rekomendasi pribadi
  });
}

/* ---------- Pencarian ---------- */
function bindSearch() {
  // header sudah dirender oleh renderShell() sebelum fungsi ini dipanggil
  const input = document.getElementById('global-search');
  if (!input) return;
  input.addEventListener('input', debounce(() => {
    keyword = input.value.trim();
    resetAndLoad();
  }, 350));
}

/* ---------- Infinite scroll ---------- */
function setupInfiniteScroll() {
  const sentinel = document.getElementById('sentinel');
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore();
  }, { rootMargin: '400px' });
  io.observe(sentinel);
}

function resetAndLoad() {
  page = 0; done = false;
  grid.innerHTML = '';
  elEnd.hidden = true; elEmpty.hidden = true;
  showSkeleton();
  loadMore(true);
}

async function loadMore(first = false) {
  if (loading || done) return;
  loading = true;
  elMore.hidden = first;            // saat pertama pakai skeleton, bukan teks

  const from = page * PAGE;
  const to = from + PAGE - 1;

  let q = sb.from('barang')
    .select('id,nama,deskripsi,harga_jual,gambar')
    .order('id', { ascending: false })
    .range(from, to);
  if (keyword) q = q.ilike('nama', `%${keyword}%`);

  const { data, error } = await q;

  if (first) clearSkeleton();
  elMore.hidden = true;

  if (error) { toast('Gagal memuat barang', 'danger'); loading = false; return; }

  if (data.length) {
    const html = data.map(cardHtml).join('');
    grid.insertAdjacentHTML('beforeend', html);
    syncCardStates();
    page++;
  }
  if (data.length < PAGE) {
    done = true;
    elEnd.hidden = grid.children.length === 0;
    elEmpty.hidden = grid.children.length !== 0;
  }
  loading = false;
}

/* ---------- Render kartu ---------- */
function cardHtml(b) {
  const qty = Cart.getQty(b.id);
  return `
  <div class="card ${qty ? 'selected' : ''}" data-id="${b.id}"
       data-nama="${esc(b.nama)}" data-harga="${b.harga_jual || 0}" data-gambar="${esc(b.gambar || '')}">
    <div class="card-thumb">
      <img loading="lazy" src="${imgUrl(b.gambar)}" alt="${esc(b.nama)}"
           onerror="this.src='img/placeholder.svg'">
    </div>
    <div class="card-body">
      <div class="card-name">${esc(b.nama)}</div>
      <div class="card-desc">${esc(b.deskripsi || '')}</div>
      <div class="card-price">${rupiah(b.harga_jual)}</div>
      <div class="card-foot">${footHtml(b.id, qty)}</div>
    </div>
  </div>`;
}

function footHtml(id, qty) {
  if (qty > 0) {
    return `
      <div class="stepper">
        <button data-act="dec">−</button>
        <input type="number" min="0" value="${qty}" data-act="qty">
        <button data-act="inc">+</button>
      </div>
      <textarea class="catatan" rows="1" placeholder="Catatan…" data-act="note">${esc(Cart.list().find(i => i.id == id)?.catatan || '')}</textarea>`;
  }
  return `<button class="btn-add" data-act="add">+ Keranjang</button>`;
}

/* ---------- Interaksi kartu (event delegation, dipakai grid & rekomendasi) ---------- */
function attachCardHandlers(el) {
  if (!el) return;
  el.addEventListener('click', onCardClick);
  el.addEventListener('change', onCardChange);
}

function onCardClick(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  const act = e.target.dataset.act;
  if (!act) return;
  const barang = readCard(card);

  if (act === 'add') { changeQty(card, barang, 1); }
  else if (act === 'inc') { changeQty(card, barang, Cart.getQty(barang.id) + 1); }
  else if (act === 'dec') { changeQty(card, barang, Cart.getQty(barang.id) - 1); }
}

function onCardChange(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  const barang = readCard(card);
  if (e.target.dataset.act === 'qty') {
    changeQty(card, barang, parseInt(e.target.value) || 0);
  } else if (e.target.dataset.act === 'note') {
    Cart.setCatatan(barang.id, e.target.value);
  }
}

function readCard(card) {
  return {
    id: Number(card.dataset.id),
    nama: card.dataset.nama,
    harga_jual: Number(card.dataset.harga),
    gambar: card.dataset.gambar || null
  };
}

function changeQty(card, barang, qty) {
  Cart.setItem(barang, qty);
  // sinkronkan SEMUA kartu ber-id sama (grid + rekomendasi) agar konsisten
  syncCardById(barang.id);
  refreshCartBadge();
  if (qty > 0) toast(`${barang.nama} ×${qty}`, 'success');
}

// Perbarui tampilan semua kartu dengan id produk tertentu di seluruh halaman
function syncCardById(id) {
  const qty = Cart.getQty(id);
  document.querySelectorAll(`.card[data-id="${id}"]`).forEach(card => {
    card.classList.toggle('selected', qty > 0);
    const foot = card.querySelector('.card-foot');
    if (foot) foot.innerHTML = footHtml(id, qty);
  });
}

function syncCardStates() {
  document.querySelectorAll('.card').forEach(card => {
    const id = Number(card.dataset.id);
    card.classList.toggle('selected', Cart.getQty(id) > 0);
  });
}

/* ---------- Skeleton ---------- */
function showSkeleton() {
  let h = '';
  for (let i = 0; i < 8; i++) {
    h += `<div class="card skeleton">
      <div class="card-thumb sk sk-thumb"></div>
      <div class="card-body"><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>
    </div>`;
  }
  grid.innerHTML = h;
}
function clearSkeleton() { grid.innerHTML = ''; }

/* ---------- util ---------- */
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
