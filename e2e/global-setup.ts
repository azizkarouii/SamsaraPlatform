/**
 * Before any test: wait for the backend to answer, then make one sign-up so its first slow requests
 * (password hashing, first queries, classes loaded on first use) do not fall inside a test.
 */
export default async function globalSetup(): Promise<void> {
  const api = `http://localhost:${process.env.BACKEND_PORT ?? 3099}/api`;
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      const res = await fetch(`${api}/auth/profile`);
      if (res.status === 401) break;
    } catch {
      // Not listening yet
    }
    if (Date.now() > deadline) throw new Error(`No backend on ${api}: start it first (see the README)`);
    await new Promise(r => setTimeout(r, 1000));
  }
  await fetch(`${api}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Warm Up', email: `warmup.${Date.now()}@e2e.tn`, password: 'secret123', phone: '20111111', role: 'PROPRIETAIRE', language: 'fr' }),
  });
}
