'use client';
import { useEffect, useState } from 'react';

async function api(url, method, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, d };
}

const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dtBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '-');
const diasDesde = (iso) => Math.floor((new Date(hojeISO() + 'T12:00:00') - new Date(String(iso).slice(0, 10) + 'T12:00:00')) / 86400000);
const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
const primeiroNome = (nome) => { const t = String(nome || '').trim().split(/\s+/)[0] || ''; return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''; };
const textoResgate = (nome) => {
  const pn = primeiroNome(nome);
  return saudacao() + (pn ? ', ' + pn : '') + '! 😊\n\nQuanto tempo! Aqui é da Samura Perfumes. Passando para saber como está o seu perfume: você ficou satisfeito? Como está a fixação e o desempenho dele? Seu retorno nos motiva muito a melhorar sempre.\n\nAproveitando, temos fragrâncias que talvez você ainda não conheça, com notas, história e melhor uso: https://samura-perfumes.vercel.app/fragrancias\n\nSe algum aroma chamar a sua atenção, é só me responder por aqui que eu separo o seu. Será um prazer ter você de volta! 💛\n\nSamura Perfumes';
};
const linkZap = (tel, texto) => {
  const d = String(tel || '').replace(/[^0-9]/g, '');
  if (!d) return null;
  return 'https://wa.me/' + (d.startsWith('55') && d.length > 11 ? d : '55' + d) + '?text=' + encodeURIComponent(texto);
};

export default function Tela({ admin, eu, vendedores }) {
  const vazio = { nome: '', telefone: '', observacoes: '', vendedor_id: String(eu) };
  const [lista, setLista] = useState([]);
  const [f, setF] = useState(vazio);
  const [edit, setEdit] = useState(null);
  const [erro, setErro] = useState('');
  const [dup, setDup] = useState(false);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('alfa');
  const [minDias, setMinDias] = useState('0');
  async function recarregar() {
    const r = await api('/api/clientes', 'GET');
    if (r.ok) setLista(r.d);
  }
  useEffect(() => { recarregar(); }, []);
  async function salvar(forcar) {
    setErro('');
    const r = edit
      ? await api('/api/clientes/' + edit, 'PATCH', f)
      : await api('/api/clientes', 'POST', { ...f, forcar });
    if (!r.ok) { setErro(r.d.erro || 'Erro ao salvar.'); setDup(!!r.d.duplicado); return; }
    setF(vazio); setEdit(null); setDup(false);
    recarregar();
  }
  function editar(c) {
    setEdit(c.id);
    setF({ nome: c.nome, telefone: c.telefone || '', observacoes: c.observacoes || '', vendedor_id: String(c.vendedor_id) });
    window.scrollTo(0, 0);
  }
  const termo = busca.trim().toLowerCase();
  const vis = lista
    .map((c) => ({ ...c, dias: c.ultima_compra ? diasDesde(c.ultima_compra) : null }))
    .filter((c) => (c.nome + ' ' + (c.telefone || '')).toLowerCase().includes(termo))
    .filter((c) => Number(minDias) === 0 || (c.dias !== null && c.dias >= Number(minDias)))
    .sort((a, b) => {
      if (ordem === 'antigos') return (b.dias === null ? -1 : b.dias) - (a.dias === null ? -1 : a.dias) || a.nome.localeCompare(b.nome, 'pt-BR');
      if (ordem === 'recentes') return (a.dias === null ? 1e9 : a.dias) - (b.dias === null ? 1e9 : b.dias) || a.nome.localeCompare(b.nome, 'pt-BR');
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

  return (
    <>
      <div className='card'>
        <h2>{edit ? 'Editar cliente' : 'Novo cliente'}</h2>
        <div className='linha'>
          <div style={{ flex: 2 }}><label>Nome</label><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div><label>WhatsApp</label><input value={f.telefone} inputMode='tel' placeholder='21 99999-9999' onChange={(e) => setF({ ...f, telefone: e.target.value })} /></div>
          {admin && (
            <div><label>Vendedor</label>
              <select value={f.vendedor_id} onChange={(e) => setF({ ...f, vendedor_id: e.target.value })}>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select></div>
          )}
        </div>
        <label>Observações</label>
        <input value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
        {erro && <p className='erro'>{erro}</p>}
        <p>
          <button type='button' className='btn' onClick={() => salvar(false)}>{edit ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
          {dup && <button type='button' className='bs' onClick={() => salvar(true)}>Cadastrar mesmo assim</button>}
          {edit && <button type='button' className='bs' onClick={() => { setEdit(null); setF(vazio); setErro(''); setDup(false); }}>Cancelar</button>}
        </p>
      </div>
      <div className='card'>
        <h2>Clientes ({vis.length})</h2>
        <div className='linha'>
          <div style={{ flex: 2 }}><label>Buscar</label><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='Nome ou telefone...' /></div>
          <div><label>Ordenar por</label>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
              <option value='alfa'>Ordem alfabética</option>
              <option value='antigos'>Mais tempo sem comprar</option>
              <option value='recentes'>Compraram recentemente</option>
            </select></div>
          <div><label>Sem comprar há</label>
            <select value={minDias} onChange={(e) => setMinDias(e.target.value)}>
              <option value='0'>Todos</option>
              <option value='30'>30 dias ou mais</option>
              <option value='60'>60 dias ou mais</option>
              <option value='90'>90 dias ou mais</option>
              <option value='180'>180 dias ou mais</option>
            </select></div>
        </div>
        <div className='tabela'>
          <table>
            <thead><tr><th>Cliente</th><th>Última compra</th><th>Compras</th><th></th></tr></thead>
            <tbody>
              {vis.map((c) => {
                const zap = c.compras > 0 ? linkZap(c.telefone, textoResgate(c.nome)) : null;
                return (
                  <tr key={c.id}>
                    <td>{c.nome}{c.telefone && <div className='aviso'>{c.telefone}</div>}{admin && <div className='aviso'>{c.vendedor}</div>}{c.observacoes && <div className='aviso'>{c.observacoes}</div>}</td>
                    <td>{c.ultima_compra ? <>{dtBR(c.ultima_compra)}<div className='aviso'>há {c.dias} {c.dias === 1 ? 'dia' : 'dias'}</div></> : <span className='aviso'>sem compras</span>}</td>
                    <td>{c.compras}</td>
                    <td>
                      {zap && <div><a className='bs' style={{ display: 'inline-block', whiteSpace: 'nowrap' }} href={zap} target='_blank' rel='noreferrer'>Resgate</a></div>}
                      <div style={{ marginTop: zap ? 6 : 0 }}><button type='button' className='bs' onClick={() => editar(c)}>Editar</button></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
