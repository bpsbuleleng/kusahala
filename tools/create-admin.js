// Membuat user admin di Supabase Auth langsung via DB (pooler).
// Pakai: CONN=... EMAIL=... PASS=... node tools/create-admin.js
// Password di-hash bcrypt oleh pgcrypto (extensions.crypt), email auto-confirm.
const { Client } = require('pg');
const email = process.env.EMAIL;
const pass = process.env.PASS;
if (!process.env.CONN || !email || !pass) { console.error('Butuh env CONN, EMAIL, PASS'); process.exit(1); }

const sql = `
do $$
declare
  v_uid uuid := gen_random_uuid();
begin
  delete from auth.identities where identity_data->>'email' = $email$${email}$email$;
  delete from auth.users where email = $email$${email}$email$;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    $email$${email}$email$, extensions.crypt($pass$${pass}$pass$, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', $email$${email}$email$, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );
end $$;
`;

(async () => {
  const c = new Client({ connectionString: process.env.CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query(sql);
    console.log('Admin dibuat/diperbarui:', email);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  } finally {
    await c.end();
  }
})();
