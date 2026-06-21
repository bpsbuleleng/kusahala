/* login.js — form masuk admin (Supabase Auth) */
const nextUrl = new URLSearchParams(location.search).get('next') || 'admin-barang.html';

document.addEventListener('DOMContentLoaded', async () => {
  // sudah login? langsung ke tujuan
  const { data: { session } } = await sb.auth.getSession();
  if (session) { location.replace(nextUrl); return; }

  document.getElementById('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-masuk');
    btn.disabled = true; btn.textContent = 'Memproses…';

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      toast('Email atau sandi salah', 'danger');
      btn.disabled = false; btn.textContent = 'Masuk';
      return;
    }
    location.replace(nextUrl);
  });
});
