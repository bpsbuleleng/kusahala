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
const SUPABASE_URL = 'https://bebtuqrxdhjfgtchyswe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYnR1cXJ4ZGhqZmd0Y2h5c3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzY4MTMsImV4cCI6MjA5NzYxMjgxM30.z4pfUxUPE3rzRM6Ld7LOSsgiZ_c4bTYS9_tZ_-R5v28';

// Nama bucket Storage untuk gambar barang (buat di Supabase > Storage)
const BUCKET = 'barang';

// Buat client global (library di-load via <script> di tiap halaman)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
