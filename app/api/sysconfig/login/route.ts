import { NextRequest, NextResponse } from 'next/server';

const USERNAME      = 'storee';
const PASSWORD      = '5tore3.10!';
const SESSION_TOKEN = 'sysconfig_authed_v1';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (username !== USERNAME || password !== PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('__sysconfig', SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
  return res;
}
