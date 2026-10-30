import { gerarIcone } from '../../lib/icone';

export const dynamic = 'force-static';

export async function GET() {
  const png = await gerarIcone(512);
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
}
