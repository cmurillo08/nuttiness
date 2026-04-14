import crypto from 'crypto';
import { NextResponse } from 'next/server';
import errors from '../../../../lib/errors';

const COOKIE_NAME = 'nuttiness_session';
const TOKEN_PAYLOAD = 'authenticated';

function safeString(value) {
  return typeof value === 'string' ? value : '';
}

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  const maxLength = Math.max(leftBuffer.length, rightBuffer.length, 1);

  const leftPadded = Buffer.alloc(maxLength);
  const rightPadded = Buffer.alloc(maxLength);

  leftBuffer.copy(leftPadded);
  rightBuffer.copy(rightPadded);

  const sameBytes = crypto.timingSafeEqual(leftPadded, rightPadded);
  return sameBytes && leftBuffer.length === rightBuffer.length;
}

function buildSessionToken(secret) {
  const hmac = crypto.createHmac('sha256', secret).update(TOKEN_PAYLOAD).digest('hex');
  return `${TOKEN_PAYLOAD}.${hmac}`;
}

export async function POST(req) {
  let body;

  try {
    body = await req.json();
  } catch {
    return errors.badRequest([{ message: 'Invalid JSON body' }]);
  }

  const username = safeString(body?.username).trim();
  const password = safeString(body?.password);

  if (!username || !password) {
    return errors.badRequest([{ message: 'username and password are required' }]);
  }

  const expectedUsername = safeString(process.env.APP_USERNAME);
  const expectedPassword = safeString(process.env.APP_PASSWORD);
  const sessionSecret = safeString(process.env.SESSION_SECRET);

  const usernameMatches = timingSafeEqualString(username, expectedUsername);
  const passwordMatches = timingSafeEqualString(password, expectedPassword);
  const isMatch = usernameMatches && passwordMatches;

  if (!isMatch) {
    return errors.json({ error: 'Invalid credentials' }, 401);
  }

  if (!sessionSecret) {
    return errors.serverError('SESSION_SECRET is not configured');
  }

  const token = buildSessionToken(sessionSecret);
  const secure = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
  });
  return response;
}
