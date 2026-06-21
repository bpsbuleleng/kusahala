# Koperasi — versi statis (GitHub Pages + Supabase)

Migrasi aplikasi koperasi dari **PHP + MySQL (InfinityFree)** menjadi
**HTML + JavaScript (GitHub Pages) + Supabase (PostgreSQL + Storage)**.

Tidak ada lagi kode server (PHP). Semua logika ringan jalan di browser;
agregasi berat (ranking, laporan, simpan pesanan) dikerjakan Supabase lewat
fungsi RPC supaya transfer data tetap kecil.

---

## Struktur folder

```
web/                 ← INI situsnya (yang di-deploy ke GitHub Pages)
  index.html         Katalog belanja (ala Shopee, infinite scroll)
  keranjang.html     Keranjang + checkout
  struk.html         Struk (bisa dicetak / simpan PDF)
  pesanan.html       Juara Belanja (ranking)
  admin-barang.html  Admin: kelola barang + upload gambar
  admin-pegawai.html Admin: kelola pegawai
  laporan.html       Admin: laporan bulanan + export Excel
  css/ js/ img/

supabase/
  schema.sql         Struktur tabel + Row Level Security (jalankan #1)
  functions.sql      Fungsi RPC (jalankan #2)
  seed.sql           Data hasil konversi dari MySQL (jalankan #3)

tools/
  convert-data.js    Mengubah dump MySQL → seed.sql (sudah dijalankan)
  upload-images.js   Upload folder uploads/ ke Supabase Storage
```

---

## Langkah setup (sekali saja)

### 1. Buat proyek Supabase
1. Daftar di https://supabase.com → **New project**.
2. Catat dari **Project Settings → API**:
   - **Project URL** (mis. `https://abcd.supabase.co`)
   - **anon public** key
   - **service_role** key (RAHASIA — hanya untuk skrip upload gambar)

### 2. Buat database
Buka **SQL Editor → New query**, lalu jalankan berurutan:
1. isi `supabase/schema.sql`  → Run
2. isi `supabase/functions.sql` → Run
3. isi `supabase/seed.sql`  → Run  (memuat 41 pegawai, 194 barang, 600 pesanan, dst.)

### 3. Buat Storage untuk gambar
1. **Storage → New bucket** → nama: **`barang`** → centang **Public bucket** → Create.
2. Upload gambar lama. Dua cara:
   - **Cara mudah:** buka bucket `barang`, drag-and-drop semua file dari folder `uploads/`.
   - **Cara skrip** (PowerShell, butuh Node 18+):
     ```powershell
     $env:SUPABASE_URL = "https://abcd.supabase.co"
     $env:SERVICE_KEY  = "service_role-key-anda"
     node tools/upload-images.js
     ```

### 4. Hubungkan web ke Supabase
Edit `web/js/config.js`, isi:
```js
const SUPABASE_URL = 'https://abcd.supabase.co';
const SUPABASE_ANON_KEY = 'anon-public-key-anda';
```

### 5. Coba lokal
```powershell
cd web
python -m http.server 8000
```
Buka http://localhost:8000 . (Tidak bisa dibuka via `file://` karena modul JS & CORS.)

---

## Deploy ke GitHub Pages

Repo ini sudah berisi GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
yang otomatis men-deploy folder `web/` setiap kali ada push ke branch `main`.

1. Push proyek ini ke repo GitHub (lihat di bawah).
2. Di GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Setiap `git push` berikutnya, situs otomatis ter-deploy. Lihat progres di tab **Actions**.
4. Situs aktif di `https://<user>.github.io/<repo>/`.

> File `.nojekyll` sudah disertakan agar GitHub Pages tidak memproses ulang aset.

### Push pertama kali

```powershell
git init
git add .
git commit -m "Migrasi koperasi ke statis + Supabase"
git branch -M main
git remote add origin https://github.com/bpsbuleleng/kusahala.git
git push -u origin main
```

> `uploads/`, `if0_38786425_kusahala.sql`, dan `supabase/seed.sql` sengaja
> di-`.gitignore` (berisi data pegawai/transaksi & 40MB gambar) — disimpan lokal saja.

---

## ⚠️ Keamanan (WAJIB dibaca)

Karena tidak ada server, **anon key tampil di browser** — itu normal. Yang
melindungi data adalah **Row Level Security (RLS)**.

`schema.sql` saat ini memakai **mode terbuka** (siapa pun boleh baca & tulis),
meniru aplikasi PHP lama yang tanpa login. Ini oke untuk uji coba / internal.

**Untuk produksi**, sebaiknya kunci akses tulis. Contoh: izinkan *baca* untuk
publik tapi *insert/update/delete* hanya untuk admin yang login (Supabase Auth).
Hapus policy `*_insert/_update/_delete` yang `using (true)` dan ganti dengan
`using (auth.role() = 'authenticated')`, lalu pasang login di halaman admin.

Jangan pernah menaruh **service_role** key di folder `web/`.

---

## Pemetaan dari PHP lama

| PHP lama | Pengganti baru |
|---|---|
| `db.php` (PDO MySQL) | `web/js/config.js` (supabase-js) |
| `$_SESSION['keranjang']` | `web/js/cart.js` (localStorage) |
| `index.php`, `load_barang.php` | `index.html` + `js/index.js` (infinite scroll) |
| `tambah_keranjang.php`, `checkout.php` | `keranjang.html` (di client) |
| `kirim_pesanan.php` | RPC `buat_pesanan()` |
| `struk.php` | `struk.html` |
| `monitor.php` | `pesanan.html` + RPC `juara_belanja()` |
| `daftar_barang.php` + upload | `admin-barang.html` (+ Supabase Storage) |
| `daftar_pegawai.php` | `admin-pegawai.html` |
| `laporan.php` / `generate_laporan.php` | `laporan.html` + RPC `generate_laporan()` |
| Export PhpSpreadsheet | SheetJS (XLSX) di browser |
| folder `uploads/` | Supabase Storage bucket `barang` |
```
