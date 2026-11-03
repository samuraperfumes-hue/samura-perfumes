'use client';
import { useEffect, useState } from 'react';
import { api, wa } from '../util';
import { avisar } from '../dialogo';

const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

export default function Tela({ admin }) {
  const [itens, setItens] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [agradecer, setAgradecer] = useState([]);

  async function carregar() {
    const r = await api('/api/entregas', 'GET');
    if (r.ok) setItens(r.d);
  }
  useEffect(() => { carregar(); }, []);
  async function marcar(ids, status) {
    const r = await api('/api/entregas', 'POST', { ids, status });
    if (!r.ok) { avisar(r.d.erro || 'Erro'); return; }
    if (status === 'entregue') {
      const vistos = new Map();
      itens.filter((i) => ids.includes(i.id)).forEach((i) => {
        const k = i.cliente + '|' + (i.telefone || '');
        if (!vistos.has(k)) {
          const primeiro = String(i.cliente).trim().split(' ')[0];
          const texto = saudacao() + ', ' + primeiro + '! Queremos saber como está sendo sua experiência com nosso perfume, seu feedback nos motiva a melhorar sempre! Samura Perfumes';
          vistos.set(k, { nome: i.cliente, url: wa(i.telefone, texto) });
        }
      });
      setAgradecer([...vistos.values()]);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    carregar();
  }

  const grupos = new Map();
  itens.forEach((i) => {
    const g = grupos.get(i.descricao) || { desc: i.descricao, pend: 0, env: 0, itens: [] };
    if (i.status_entrega === 'pendente') g.pend += i.quantidade; else g.env += i.quantidade;
    g.itens.push(i);
    grupos.set(i.descricao, g);
  });
  const lista = [...grupos.values()].sort((a, b) => b.pend - a.pend || a.desc.localeCompare(b.desc));
  const totalPend = lista.reduce((t, g) => t + g.pend, 0);
  const totalEnv = lista.reduce((t, g) => t + g.env, 0);

  return (
    <>
      {agradecer.length > 0 && (
        <div className='card'>
          <h2>Entrega registrada</h2>
          <p className='aviso'>Envie uma mensagem de agradecimento e peça o feedback do cliente:</p>
          {agradecer.map((a) => (
            <p key={a.nome}>{a.url
              ? <a className='bs' href={a.url} target='_blank' rel='noreferrer'>Enviar para {a.nome}</a>
              : <span className='aviso'>{a.nome} não tem WhatsApp cadastrado (cadastre em Clientes).</span>}</p>
          ))}
          <button className='bs' onClick={() => setAgradecer([])}>Fechar</button>
        </div>
      )}
      <div className='card'>
        <h2>Entregas pendentes</h2>
        <p className='aviso'>A envasar: <b>{totalPend}</b> unidade(s) · Envasadas, aguardando entrega: <b>{totalEnv}</b></p>
        <div className='tabela'>
          <table>
            <thead><tr><th>Produto</th><th>A envasar</th><th>Envasado (aguardando entrega)</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map((g) => (
                <>
                  <tr key={g.desc}>
                    <td>{g.desc}</td><td><b>{g.pend}</b></td><td>{g.env}</td>
                    <td>
                      <button className='bs' onClick={() => setAberto(aberto === g.desc ? null : g.desc)}>{aberto === g.desc ? 'Fechar' : 'Ver clientes'}</button>
                      {admin && g.pend > 0 && <button className='bs' onClick={() => marcar(g.itens.filter((i) => i.status_entrega === 'pendente').map((i) => i.id), 'envasado')}>Marcar todos envasados</button>}
                    </td>
                  </tr>
                  {aberto === g.desc && (
                    <tr key={g.desc + '-d'}><td colSpan={4}>
                      <table>
                        <thead><tr><th>Cliente</th><th>Venda</th>{admin && <th>Vendedor</th>}<th>Qtd</th><th>Situação</th><th>Ações</th></tr></thead>
                        <tbody>
                          {g.itens.map((i) => (
                            <tr key={i.id}>
                              <td>{i.cliente}</td><td>{i.codigo}</td>{admin && <td>{i.vendedor}</td>}<td>{i.quantidade}</td>
                              <td>{i.status_entrega === 'pendente' ? 'A envasar' : 'Envasado'}</td>
                              <td>
                                {admin && i.status_entrega === 'pendente' && <button className='bs' onClick={() => marcar([i.id], 'envasado')}>Envasado</button>}
                                {admin && i.status_entrega === 'envasado' && <button className='bs' onClick={() => marcar([i.id], 'pendente')}>Voltar</button>}
                                <button className='bs' onClick={() => marcar([i.id], 'entregue')}>Entregue</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td></tr>
                  )}
                </>
              ))}
              {lista.length === 0 && <tr><td colSpan={4}>Nenhuma entrega pendente.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
