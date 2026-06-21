/* =====================================================================
 *  config.js — koneksi ke Supabase
 *  Ganti 2 nilai di bawah dengan milik proyek Anda:
 *    Supabase Dashboard > Project Settings > API
 *      - Project URL          -> SUPABASE_URL
 *      - Project API keys: anon public -> SUPABASE_ANON_KEY
 *
 *  Catatan keamanan: anon key MEMANG boleh tampil di sini (publik).
 *  Yang melindungi data Anda adalah Row Level Security (lihat schema.sql
 *  & README). Jangan pernah menaruh "service_role" key di sini.
 * ===================================================================== */
const SUPABASE_URL = 'https://GANTI-PROJECT-ANDA.supabase.co';
const SUPABASE_ANON_KEY = 'GANTI_DENGAN_ANON_KEY_ANDA';

// Nama bucket Storage untuk gambar barang (buat di Supabase > Storage)
const BUCKET = 'barang';

// Buat client global (library di-load via <script> di tiap halaman)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
