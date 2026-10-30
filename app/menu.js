import './estilos2.css';
import Link from 'next/link';
import Sair from './painel/sair';

export default function Menu({ s }) {
  return (
    <header className='topo'>
      <div className='logo pequena' />
      <nav className='nav'>
        <Link href='/painel'>Início</Link>
        <Link href='/vendas'>Vendas</Link>
        <Link href='/entregas'>Entregas</Link>
        <Link href='/estoque'>Estoque</Link>
        <Link href='/agenda'>Agenda</Link>
        <Link href='/comissoes'>Comissões</Link>
        {s.papel === 'admin' && <Link href='/vendedores'>Vendedores</Link>}
        <Link href='/catalogo'>Catálogo</Link>
        <Link href='/clientes'>Clientes</Link>
        {s.papel === 'admin' && <Link href='/importar'>Importar</Link>}
      </nav>
      <div className='quem'><span>{s.nome}</span><Sair /></div>
    </header>
  );
}
