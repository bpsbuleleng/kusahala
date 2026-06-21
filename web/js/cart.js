/* =====================================================================
 *  cart.js — keranjang belanja, SEPENUHNYA di client (localStorage).
 *  Menggantikan $_SESSION['keranjang'] di PHP.
 *
 *  Bentuk data:
 *   {
 *     pegawai_id: 3,
 *     items: { "12": { id:12, nama:"...", harga_jual:10000, jumlah:2, catatan:"" }, ... }
 *   }
 * ===================================================================== */
const Cart = (() => {
  const KEY = 'koperasi_cart_v1';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { pegawai_id: null, items: {} };
    } catch {
      return { pegawai_id: null, items: {} };
    }
  }
  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  return {
    state: load,

    setPegawai(id) {
      const s = load();
      s.pegawai_id = id ? Number(id) : null;
      save(s);
    },
    getPegawai() {
      return load().pegawai_id;
    },

    // Set jumlah barang (jumlah<=0 -> hapus). barang = objek dari DB.
    setItem(barang, jumlah) {
      const s = load();
      const id = String(barang.id);
      jumlah = Number(jumlah) || 0;
      if (jumlah <= 0) {
        delete s.items[id];
      } else {
        const prev = s.items[id] || {};
        s.items[id] = {
          id: barang.id,
          nama: barang.nama,
          harga_jual: barang.harga_jual,
          gambar: barang.gambar ?? prev.gambar ?? null,
          jumlah,
          catatan: prev.catatan ?? ''
        };
      }
      save(s);
      return s;
    },

    setCatatan(id, catatan) {
      const s = load();
      if (s.items[String(id)]) {
        s.items[String(id)].catatan = catatan;
        save(s);
      }
    },

    getQty(id) {
      const it = load().items[String(id)];
      return it ? it.jumlah : 0;
    },

    list() {
      return Object.values(load().items);
    },

    totalQty() {
      return Object.values(load().items).reduce((a, it) => a + it.jumlah, 0);
    },
    grandTotal() {
      return Object.values(load().items).reduce((a, it) => a + it.jumlah * it.harga_jual, 0);
    },

    clearItems() {
      const s = load();
      s.items = {};
      save(s);
    }
  };
})();
