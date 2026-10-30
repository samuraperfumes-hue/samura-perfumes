'use client';
import { useEffect, useState } from 'react';
import { api } from '../util';

const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
const chave = (a) => (a.fragrancia + '|' + a.tipo + '|' + a.volume).toLowerCase().replace(/[^a-z0-9|]/g, '');

export default function Tela({ admin }) {
  const [lista, setLista] = useState([]);
  const [f, setF] = useState({ fragrancia: '', tipo: 'Perfume', volume: '50 ml', preco: '' });
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState('');
  const [busca, setBusca] = useState('');
  const [inativos, setInativos] = useState(false);
  const [soDup, setSoDup] = useState(false);
  const [tipoF, setTipoF] = useState('');
  const [sel, setSel] = useState({});

  async function recarregar() {
    const r = await api('/api/catalogo', 'GET');
    if (r.ok) setLista(r.d);
  }
  useEffect(() => { recarregar(); }, []);

  async function salvar(itens) {
    const r = await api('/api/catalogo', 'POST', { itens });
    setMsg(r.ok ? r.d.salvos + ' item(ns) salvo(s)' + (r.d.erros.length ? '. Com erro: ' + r.d.erros.join(', ') : '.') : r.d.erro || 'Erro');
    recarregar();
  }
  async function novo(e) {
    e.preventDefault();
    await salvar([f]);
    setF({ ...f, fragrancia: '', preco: '' });
  }
  async function importar() {
    const itens = texto.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const p = l.split(/[;\t]/).map((x) => x.trim());
      return p.length >= 4 ? { fragrancia: p[0], tipo: p[1], volume: p[2], preco: p[3] } : { fragrancia: p[0], preco: p[1] };
    });
    await salvar(itens);
    setTexto('');
  }
  async function preco(a) {
    const p = prompt('Novo preço de ' + a.fragrancia + ' ' + a.volume + ':', String(a.preco));
    if (!p) return;
    const r = await api('/api/catalogo/' + a.id, 'PATCH', { preco: p });
    if (!r.ok) alert(r.d.erro);
    recarregar();
  }
  async function editar(a) {
    const fr = prompt('Fragrância:', a.fragrancia);
    if (fr === null) return;
    const ti = prompt('Tipo (ex.: Perfume, Sabonete, Pós Barba):', a.tipo);
    if (ti === null) return;
    const vo = prompt('Volume (ex.: 50 ml):', a.volume);
    if (vo === null) return;
    const pr = prompt('Preço:', String(a.preco));
    if (pr === null) return;
    const r = await api('/api/catalogo/' + a.id, 'PATCH', { fragrancia: fr, tipo: ti, volume: vo, preco: pr });
    setMsg(r.ok ? 'Produto atualizado.' : r.d.erro || 'Erro');
    recarregar();
  }
  async function alternar(a) {
    await api('/api/catalogo/' + a.id, 'PATCH', { ativa: !a.ativa });
    recarregar();
  }
  async function excluir(a) {
    if (!confirm('Excluir ' + a.tipo + ' ' + a.fragrancia + ' ' + a.volume + '? Se já foi usado em vendas ou estoque, ele será apenas desativado.')) return;
    const r = await api('/api/catalogo/' + a.id, 'DELETE');
    setMsg(r.ok ? (r.d.resultado === 'excluido' ? 'Produto excluído.' : 'Produto já usado em vendas ou estoque: foi desativado.') : r.d.erro || 'Erro');
    recarregar();
  }
  async function excluirSel() {
    const ids = Object.keys(sel).filter((k) => sel[k]).map(Number);
    if (!ids.length) return;
    if (!confirm('Excluir ' + ids.length + ' produto(s) selecionado(s)? Os que já foram usados em vendas ou estoque serão apenas desativados.')) return;
    const r = await api('/api/catalogo', 'POST', { acao: 'excluir', ids });
    setMsg(r.ok ? r.d.excluidos + ' excluído(s); ' + r.d.desativados + ' desativado(s) por já terem sido usados.' : r.d.erro || 'Erro');
    setSel({});
    recarregar();
  }

  const contagem = new Map();
  lista.forEach((a) => contagem.set(chave(a), (contagem.get(chave(a)) || 0) + 1));
  const tipos = [...new Set(lista.map((a) => a.tipo))];
  const vis = lista.filter((a) =>
    (inativos || a.ativa) &&
    (!tipoF || a.tipo === tipoF) &&
    (!soDup || contagem.get(chave(a)) > 1) &&
    a.fragrancia.toLowerCase().includes(busca.toLowerCase()));
  const marcados = vis.filter((a) => sel[a.id]).length;
  function marcarTodos(on) {
    const s = { ...sel };
    vis.forEach((a) => { s[a.id] = on; });
    setSel(s);
  }

  return (
    <>
      {admin && (
        <>
          <form className='card' onSubmit={novo}>
            <h2>Novo produto</h2>
            <div className='linha'>
              <div><label>Fragrância</label><input value={f.fragrancia} onChange={(e) => setF({ ...f, fragrancia: e.target.value })} /></div>
              <div><label>Tipo</label><input value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} /></div>
              <div><label>Volume</label><input value={f.volume} onChange={(e) => setF({ ...f, volume: e.target.value })} /></div>
              <div><label>Preço (R$)</label><input value={f.preco} onChange={(e) => setF({ ...f, preco: e.target.value })} /></div>
            </div>
            <button className='btn'>Salvar produto</button>
          </form>
          <div className='card'>
            <h2>Importar lista</h2>
            <p className='aviso'>Cole uma linha por produto, no formato <b>Fragrância; Tipo; Volume; Preço</b> (ex.: Sauvage; Perfume; 50 ml; 69,99) ou só <b>Fragrância; Preço</b> (assume perfume de 50 ml). Se o produto já existir, o preço é atualizado.</p>
            <textarea rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button className='btn' type='button' onClick={importar}>Importar</button>
          </div>
        </>
      )}
      <div className='card'>
        <h2>Catálogo</h2>
        {msg && <p className='ok'>{msg}</p>}
        <div className='linha'>
          <div style={{ flex: 2 }}><input placeholder='Buscar fragrância...' value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <div><select value={tipoF} onChange={(e) => setTipoF(e.target.value)}><option value=''>Todos os tipos</option>{tipos.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <p>
          <label style={{ display: 'inline', textTransform: 'none', marginRight: 16 }}><input type='checkbox' checked={inativos} onChange={(e) => setInativos(e.target.checked)} style={{ width: 'auto', margin: '0 6px 0 0' }} />Mostrar inativos</label>
          <label style={{ display: 'inline', textTransform: 'none' }}><input type='checkbox' checked={soDup} onChange={(e) => setSoDup(e.target.checked)} style={{ width: 'auto', margin: '0 6px 0 0' }} />Só possíveis duplicados</label>
        </p>
        {admin && <p><button className='bs' onClick={() => marcarTodos(true)}>Marcar todos da lista</button><button className='bs' onClick={() => marcarTodos(false)}>Desmarcar</button><button className='bs' onClick={excluirSel} disabled={!marcados} style={{ borderColor: '#d4707f', color: '#d4707f' }}>Excluir selecionados ({marcados})</button></p>}
        <div className='tabela'>
          <table>
            <thead><tr>{admin && <th></th>}<th>Fragrância</th><th>Tipo</th><th>Volume</th><th>Preço</th>{admin && <th>Ações</th>}</tr></thead>
            <tbody>
              {vis.map((a) => (
                <tr key={a.id} className={a.ativa ? '' : 'inativo'}>
                  {admin && <td><input type='checkbox' checked={!!sel[a.id]} onChange={(e) => setSel({ ...sel, [a.id]: e.target.checked })} /></td>}
                  <td>{a.fragrancia}{contagem.get(chave(a)) > 1 && <span className='tag'>duplicado?</span>}</td><td>{a.tipo}</td><td>{a.volume}</td><td>{brl(a.preco)}</td>
                  {admin && <td><button className='bs' onClick={() => editar(a)}>Editar</button><button className='bs' onClick={() => preco(a)}>Preço</button><button className='bs' onClick={() => alternar(a)}>{a.ativa ? 'Desativar' : 'Ativar'}</button><button className='bs' onClick={() => excluir(a)}>Excluir</button></td>}
                </tr>
              ))}
              {vis.length === 0 && <tr><td colSpan={admin ? 6 : 4}>Nenhum produto.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
