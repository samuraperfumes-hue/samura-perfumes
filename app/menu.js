import './estilos2.css';
import Link from 'next/link';
import Sair from './painel/sair';
import Alertas from './alertas';
import Dialogos from './dialogo';

export default function Menu({ s }) {
  return (
    <header className='topo'>
      <div className='logo pequena' />
      <nav className='nav'>
        <Link href='/painel'>Início</Link>
        <Link href='/vendas'>Vendas</Link>
        <Link href='/entregas'>Entregas</Link>
        <Link href='/estoque'>Estoque</Link>
        {s.papel === 'admin' && <Link href='/compras'>Compras</Link>}
        {s.papel === 'admin' && <Link href='/custos'>Custos</Link>}
        <Link href='/agenda'>Agenda</Link>
        <Link href='/relatorios'>Resumo</Link>
        <Link href='/comissoes'>Comissões</Link>
        {s.papel === 'admin' && <Link href='/vendedores'>Vendedores</Link>}
        <Link href='/catalogo'>Catálogo</Link>
        <Link href='/clientes'>Clientes</Link>
        {s.papel === 'admin' && <Link href='/importar'>Importar</Link>}
        {s.papel === 'admin' && <Link href='/configuracoes'>Configurações</Link>}
      </nav>
      <div className='quem'><Alertas /><span>{s.nome}</span><Sair /></div>
      <Dialogos />
    </header>
  );
}
