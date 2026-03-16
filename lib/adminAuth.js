import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_KEY || 'dev-admin-key';
const COOKIE_NAME = 'pp_admin';

function sign(value) {
  return crypto
    .createHmac('sha256', ADMIN_PASSWORD)
    .update(value)
    .digest('hex');
}

export async function isAdminAuthenticated() {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const [token, signature] = raw.split('.');
  if (!token || !signature) return false;

  const expected = sign(token);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

