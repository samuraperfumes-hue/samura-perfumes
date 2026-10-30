import { redirect } from 'next/navigation';
import { sessao } from '../../lib/session';
import { q } from '../../lib/db';
import Menu from '../menu';
import Tela from './tela';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await sessao();
  if (!s) redirect('/');
  const admin = s.papel === 'admin';
  const vend = admin ? (await q('select id, nome from usuarios where ativo order by nome')).rows : [];
  return (
    <>
      <Menu s={s} />
      <main className='conteudo'><Tela admin={admin} eu={s.id} vendedores={vend} /></main>
    </>
  );
}
