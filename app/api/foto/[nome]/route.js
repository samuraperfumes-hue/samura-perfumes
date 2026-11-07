import { pool } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// Fotos da página de fragrâncias. Na primeira vez cada foto é copiada da origem fixa (commit
// imutável no GitHub) para o banco; depois disso é sempre servida do banco, sem depender da origem.
const ORIGEM = 'https://raw.githubusercontent.com/samuraperfumes-hue/samura-perfumes/';
const FOTOS = {
  'masc-doce-1': 'abd352f3cb12441139d8ca8f78d9d3d21bbbb79b/fotos/masc-doce.webp',
  'masc-fresco-1': 'abd352f3cb12441139d8ca8f78d9d3d21bbbb79b/fotos/masc-fresco.webp',
  'masc-floral-1': 'abd352f3cb12441139d8ca8f78d9d3d21bbbb79b/fotos/masc-floral.webp',
  'masc-amadeirado-1': 'abd352f3cb12441139d8ca8f78d9d3d21bbbb79b/fotos/masc-amadeirado.webp',
  'fem-doce-1': 'abd352f3cb12441139d8ca8f78d9d3d21bbbb79b/fotos/fem-doce.webp',
  'fem-fresco-1': 'abd352f3cb12441139d8ca8f78d9d3d21bbbb79b/fotos/fem-fresco.webp',
  'fem-floral-1': 'abd352f3cb12441139d8ca8f78d9d3d21bbbb79b/fotos/fem-floral.webp',
  'fem-amadeirado-1': 'abd352f3cb12441139d8ca8f78d9d3d21bbbb79b/fotos/fem-amadeirado.webp',
};

let pronto = false;
async function garantir() {
  if (pronto) return;
  await pool.query('create table if not exists fotos_site (nome text primary key, dados bytea not null, criado_em timestamptz not null default now())');
  pronto = true;
}

const servir = (buf) => new Response(new Uint8Array(buf), {
  headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
});

export async function GET(_req, { params }) {
  const { nome } = await params;
  const caminho = FOTOS[nome];
  if (!caminho) return new Response('Não encontrada', { status: 404 });
  await garantir();
  const r = (await pool.query('select dados from fotos_site where nome = $1', [nome])).rows[0];
  if (r) return servir(r.dados);
  const x = await fetch(ORIGEM + caminho, { cache: 'no-store' }).catch(() => null);
  if (!x || !x.ok) return new Response('Indisponível', { status: 503 });
  const buf = Buffer.from(await x.arrayBuffer());
  if (buf.length > 300000 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return new Response('Inválida', { status: 502 });
  await pool.query('insert into fotos_site (nome, dados) values ($1, $2) on conflict (nome) do nothing', [nome, buf]);
  return servir(buf);
}
