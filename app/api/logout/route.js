import { encerrarSessao } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  await encerrarSessao();
  return Response.json({ ok: true });
}
