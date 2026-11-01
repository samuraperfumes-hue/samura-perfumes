import { redirect } from 'next/navigation';
import { sessao } from '../../lib/session';
import Menu from '../menu';
import Tela from './tela';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await sessao();
  if (!s) redirect('/');
  if (s.papel !== 'admin') redirect('/painel');
  return (
    <>
      <Menu s={s} />
      <main className='conteudo'><Tela /></main>
    </>
  );
}
