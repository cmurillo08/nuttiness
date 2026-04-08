const COOKIE_NAME = 'nuttiness_session';

export async function POST() {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : [])
  ].join('; ');

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie
    }
  });
}
