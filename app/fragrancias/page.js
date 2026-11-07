import './fragrancias.css';
import { q } from '../../lib/db';
import { pool } from '../../lib/db';
import { acharFicha } from '../../lib/fichas';
import { PERFIS } from '../../lib/perfis';
import { lerConfigGeral } from '../../lib/config';
import Lista from './lista';

export const dynamic = 'force-dynamic';
const DESC = 'Conheça as fragrâncias da Samura Perfumes: notas olfativas, história e melhor uso. Peça a sua pelo WhatsApp.';
export const metadata = {
  metadataBase: new URL('https://samura-perfumes.vercel.app'),
  title: 'Fragrâncias | Samura Perfumes',
  description: DESC,
  robots: { index: true, follow: true },
  openGraph: { title: 'Nossas fragrâncias | Samura Perfumes', description: DESC, url: '/fragrancias', siteName: 'Samura Perfumes', locale: 'pt_BR', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Nossas fragrâncias | Samura Perfumes', description: DESC },
};

export default async function Pagina() {
  const r = await q("select distinct f.nome from fragrancias f join apresentacoes a on a.fragrancia_id = f.id where a.ativa and a.tipo = 'Perfume' order by f.nome");
  const cfg = await lerConfigGeral(pool);
  const vistos = new Set();
  const itens = [];
  r.rows.forEach((x) => {
    const f = acharFicha(x.nome);
    const titulo = f ? (/\bgold\b/i.test(x.nome) && !/\bgold\b/i.test(f.nome) ? x.nome : f.nome) : x.nome;
    if (vistos.has(titulo)) return;
    vistos.add(titulo);
    itens.push({
      nome: titulo,
      casa: f ? f.casa : '', genero: f ? f.genero : '', linha: f ? f.linha : '', familia: f ? f.familia : '', inspiracao: f ? f.inspiracao || '' : '',
      topo: f ? f.topo : '', coracao: f ? f.coracao : '', fundo: f ? f.fundo : '',
      historia: f ? f.historia : '', momentos: f ? f.momentos : [], clima: f ? f.clima : [], uso: f ? f.uso : '',
      perfil: (f && PERFIS[f.nome]) || null,
    });
  });
  itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return <Lista itens={itens} zap={cfg.whatsapp} />;
}
