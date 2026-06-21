/* =====================================================================
 *  keranjang.js — tinjau keranjang & kirim pesanan
 *  Kirim pesanan = 1 panggilan RPC buat_pesanan (atomik di DB).
 * ===================================================================== */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  renderShell('keranjang');
  await loadPegawai();
  render();
  document.getElementById('btn-kirim').onclick = kirim;
}

async function loadPegawai() {
  const sel = document.getElementById('pegawai');
  const { data, error } = await sb.from('pegawai').select('id,nama').order('nama');
  if (error) { sel.innerHTML = '<option value="">Gagal memuat</option>'; return; }
  const saved = Cart.getPegawai();
  sel.innerHTML = '<option value="">-- Pilih Pegawai --</option>' +
    data.map(p => `<option value="${p.id}" ${saved == p.id ? 'selected' : ''}>${esc(p.nama)}</option>`).join('');
  sel.onchange = () => Cart.setPegawai(sel.value);
}

function render() {
  const items = Cart.list();
  const wrap = document.getElementById('items');
  const empty = document.getElementById('empty');
  const bar = document.getElementById('checkout-bar');

  if (!items.length) {
    wrap.innerHTML = '';
    empty.hidden = false;
    bar.hidden = true;
    document.getElementById('pegawai-box').hidden = true;
    return;
  }
  empty.hidden = true;
  bar.hidden = false;

  wrap.innerHTML = items.map(it => `
    <div class="cart-item" data-id="${it.id}">
      <img src="${imgUrl(it.gambar)}" onerror="this.src='img/placeholder.svg'" alt="">
      <div class="info">
        <div class="nm">${esc(it.nama)}</div>
        <div class="pr">${rupiah(it.harga_jual)}</div>
        <div class="stepper mt-2" style="max-width:140px">
          <button data-act="dec">−</button>
          <input type="number" min="0" value="${it.jumlah}" data-act="qty">
          <button data-act="inc">+</button>
        </div>
        <textarea class="catatan" rows="1" placeholder="Catatan…" data-act="note">${esc(it.catatan || '')}</textarea>
      </div>
      <div class="text-center">
        <div class="pr">${rupiah(it.harga_jual * it.jumlah)}</div>
        <button class="btn btn-outline mt-2" data-act="del" style="padding:4px 8px;font-size:12px">🗑️</button>
      </div>
    </div>`).join('');

  document.getElementById('cb-qty').textContent = Cart.totalQty();
  document.getElementById('cb-total').textContent = rupiah(Cart.grandTotal());
  refreshCartBadge();
}

document.getElementById('items').addEventListener('click', (e) => {
  const row = e.target.closest('.cart-item'); if (!row) return;
  const id = Number(row.dataset.id);
  const it = Cart.list().find(i => i.id === id); if (!it) return;
  const act = e.target.dataset.act;
  if (act === 'inc') Cart.setItem(it, it.jumlah + 1);
  else if (act === 'dec') Cart.setItem(it, it.jumlah - 1);
  else if (act === 'del') Cart.setItem(it, 0);
  else return;
  render();
});

document.getElementById('items').addEventListener('change', (e) => {
  const row = e.target.closest('.cart-item'); if (!row) return;
  const id = Number(row.dataset.id);
  const it = Cart.list().find(i => i.id === id); if (!it) return;
  if (e.target.dataset.act === 'qty') { Cart.setItem(it, parseInt(e.target.value) || 0); render(); }
  else if (e.target.dataset.act === 'note') { Cart.setCatatan(id, e.target.value); }
});

async function kirim() {
  const pegawai_id = Cart.getPegawai();
  const items = Cart.list();
  if (!pegawai_id) { toast('Pilih pegawai dulu', 'danger'); return; }
  if (!items.length) { toast('Keranjang kosong', 'danger'); return; }

  const btn = document.getElementById('btn-kirim');
  btn.disabled = true; btn.textContent = 'Mengirim…';

  const payload = items.map(i => ({ id: i.id, jumlah: i.jumlah, catatan: i.catatan || '' }));
  const { data: pesananId, error } = await sb.rpc('buat_pesanan', {
    p_pegawai_id: Number(pegawai_id),
    p_items: payload
  });

  if (error) {
    console.error(error);
    toast('Gagal menyimpan pesanan', 'danger');
    btn.disabled = false; btn.textContent = 'Kirim Pesanan';
    return;
  }

  // simpan struk untuk halaman berikutnya, lalu kosongkan keranjang
  sessionStorage.setItem('struk', JSON.stringify({
    pegawai_id: Number(pegawai_id),
    pesanan_id: pesananId,
    items
  }));
  Cart.clearItems();
  location.href = 'struk.html';
}
