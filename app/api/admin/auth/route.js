import { NextResponse } from 'next/server';
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

export async function POST(request) {
  try {
    const body = await request.json();
    const password = body?.password || '';
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = `${Date.now()}`;
    const signature = sign(token);
    const cookieValue = `${token}.${signature}`;

    const jar = await cookies();
    jar.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 14, // 14 days
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin auth failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return NextResponse.json({ success: true });
}

