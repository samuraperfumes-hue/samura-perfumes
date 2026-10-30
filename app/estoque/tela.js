'use client';
import { useEffect, useState } from 'react';
import { api, dtBR } from '../util';

const rot = { envase: 'Envase', transferencia: 'Transferência', devolucao: 'Devolução', ajuste: 'Ajuste', venda: 'Venda', cancelamento: 'Cancelamento' };
const nomeProd = (a) => a.fragrancia + ' · ' + a.tipo + ' ' + a.volume;

export default function Tela({ admin, eu, vendedores }) {
  const [d, setD] = useState({ saldos: [], movimentos: [] });
  const [cat, setCat] = useState([]);
  const [f, setF] = useState({ acao: 'envase', apresentacao_id: '', vendedor_id: '', quantidade: '', obs: '' });
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('');

  async function carregar() {
    const [a, b] = await Promise.all([api('/api/estoque', 'GET'), api('/api/catalogo', 'GET')]);
    if (a.ok) setD(a.d);
    if (b.ok) setCat(b.d.filter((x) => x.ativa));
  }
  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault();
    setMsg(''); setErro('');
    const body = { ...f };
    if (f.acao === 'ajuste') body.local_id = f.vendedor_id || eu;
    const r = await api('/api/estoque', 'POST', body);
    if (!r.ok) { setErro(r.d.erro || 'Erro'); return; }
    setMsg('Movimentação registrada.');
    setF({ ...f, quantidade: '', obs: '' });
    carregar();
  }
  async function ajustar(s, delta) {
    const r = await api('/api/estoque', 'POST', { acao: 'ajuste', apresentacao_id: s.apresentacao_id, local_id: s.local_id, quantidade: delta, obs: 'Ajuste rápido' });
    if (!r.ok) { alert(r.d.erro || 'Erro'); return; }
    carregar();
  }
  function definir(s) {
    const v = prompt('Quantidade correta de ' + nomeProd(s) + ' em ' + s.local + ':', String(s.saldo));
    if (v === null) return;
    const novo = parseInt(v, 10);
    if (isNaN(novo) || novo < 0) { alert('Informe um número válido.'); return; }
    const dif = novo - s.saldo;
    if (dif !== 0) ajustar(s, dif);
  }
  const nomeFiltro = filtro ? ((vendedores.find((v) => String(v.id) === filtro) || {}).nome || '') : '';
  const saldosV = d.saldos.filter((s) => !filtro || String(s.local_id) === filtro);
  const movsV = d.movimentos.filter((m) => !filtro || m.local === nomeFiltro);
  const precisaVend = ['transferir', 'devolver', 'ajuste'].includes(f.acao);
  const lista = f.acao === 'ajuste' ? vendedores : vendedores.filter((v) => v.id !== eu);

  return (
    <>
      {admin && (
        <form className='card' onSubmit={salvar}>
          <h2>Registrar movimento</h2>
          <div className='linha'>
            <div><label>Operação</label>
              <select value={f.acao} onChange={(e) => setF({ ...f, acao: e.target.value, vendedor_id: '' })}>
                <option value='envase'>Envase (entra no meu estoque)</option>
                <option value='transferir'>Entregar a um vendedor</option>
                <option value='devolver'>Devolução de um vendedor</option>
                <option value='ajuste'>Ajuste de contagem</option>
              </select></div>
            <div style={{ flex: 2 }}><label>Produto</label>
              <select value={f.apresentacao_id} onChange={(e) => setF({ ...f, apresentacao_id: e.target.value })}>
                <option value=''>Escolha...</option>
                {cat.map((a) => <option key={a.id} value={a.id}>{nomeProd(a)}</option>)}
              </select></div>
            {precisaVend && (
              <div><label>{f.acao === 'ajuste' ? 'Estoque de' : 'Vendedor'}</label>
                <select value={f.vendedor_id} onChange={(e) => setF({ ...f, vendedor_id: e.target.value })}>
                  <option value=''>{f.acao === 'ajuste' ? 'Meu estoque (central)' : 'Escolha...'}</option>
                  {lista.filter((v) => f.acao !== 'ajuste' || v.id !== eu).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select></div>
            )}
            <div style={{ maxWidth: 120 }}><label>Quantidade{f.acao === 'ajuste' ? ' (+ ou -)' : ''}</label><input value={f.quantidade} inputMode='numeric' onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></div>
          </div>
          <label>Observação (opcional)</label>
          <input value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} />
          {erro && <p className='erro'>{erro}</p>}
          {msg && <p className='ok'>{msg}</p>}
          <button className='btn'>Registrar</button>
          <p className='aviso'>Seu estoque central é o que você envasou e ainda não entregou. Para produtos que já estão na lista abaixo, use os botões − e + ao lado da quantidade.</p>
        </form>
      )}
      <div className='card'>
        <h2>{admin ? 'Estoque atual' : 'Meu estoque'}</h2>
        {admin && (
          <div className='linha'>
            <div style={{ maxWidth: 260 }}><label>Ver estoque de</label>
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value=''>Todos</option>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.id === eu ? v.nome + ' (central)' : v.nome}</option>)}
              </select></div>
          </div>
        )}
        <div className='tabela'>
          <table>
            <thead><tr>{admin && <th>Local</th>}<th>Produto</th><th>Quantidade</th>{admin && <th>Ajustar</th>}</tr></thead>
            <tbody>
              {saldosV.map((s) => (
                <tr key={s.local_id + '-' + s.apresentacao_id} style={s.saldo <= 1 ? { color: '#d4707f' } : undefined}>
                  {admin && <td>{s.local_id === eu ? s.local + ' (central)' : s.local}</td>}<td>{nomeProd(s)}</td><td><b>{s.saldo}</b></td>
                  {admin && <td><button className='bs' onClick={() => ajustar(s, -1)}>−</button><button className='bs' onClick={() => ajustar(s, 1)}>+</button><button className='bs' onClick={() => definir(s)}>Definir</button></td>}
                </tr>
              ))}
              {saldosV.length === 0 && <tr><td colSpan={admin ? 4 : 2}>Nenhum estoque registrado.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className='aviso'>Quantidades em vinho: 1 unidade ou menos (hora de repor). Cada ajuste fica registrado no histórico abaixo.</p>
      </div>
      <div className='card'>
        <h2>Movimentações recentes</h2>
        <div className='tabela'>
          <table>
            <thead><tr><th>Data</th>{admin && <th>Local</th>}<th>Produto</th><th>Qtd</th><th>Tipo</th><th>Observação</th></tr></thead>
            <tbody>
              {movsV.map((m) => (
                <tr key={m.id}><td>{dtBR(m.criado_em)}</td>{admin && <td>{m.local}</td>}<td>{nomeProd({ tipo: m.ptipo, fragrancia: m.fragrancia, volume: m.volume })}</td><td>{m.quantidade > 0 ? '+' + m.quantidade : m.quantidade}</td><td>{rot[m.tipo] || m.tipo}</td><td>{m.obs || ''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
