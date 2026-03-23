function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function badRequest(errors) {
  return json({ errors }, 400);
}

export function notFound(message = 'Not found') {
  return json({ error: message }, 404);
}

export function conflict(message = 'Conflict') {
  return json({ error: message }, 409);
}

export function serverError(err) {
  return json({ error: 'Internal Server Error', detail: String(err) }, 500);
}

export default { json, badRequest, notFound, conflict, serverError };
