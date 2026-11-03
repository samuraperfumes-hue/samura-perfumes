'use client';
import { useEffect, useState } from 'react';
import { textoResgate, textoConvite, textoIndique, linkZap, registrar, haQuanto, recente } from '../mensagens';
import { confirmar } from '../dialogo';

async function api(url, method, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, d };
}

const ORIGENS = ['Indicação', 'Instagram', 'WhatsApp', 'Conhecido', 'Trabalho', 'Evento', 'Outro'];
const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dtBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '-');
const diasDesde = (iso) => Math.floor((new Date(hojeISO() + 'T12:00:00') - new Date(String(iso).slice(0, 10) + 'T12:00:00')) / 86400000);
const telAgenda = (t) => {
  let d = String(t || '').replace(/[^0-9]/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length > 11 && d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 11) return d.slice(0, 2) + ' ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6);
  return d;
};
const descTxt = (k) => (k ? '🎁 ' + Number(k.pct) + '% ' + (k.tipo === 'boas_vindas' ? 'na 1ª compra' : 'de desconto' + (k.validade ? ' até ' + dtBR(k.validade) : '')) : '');

export default function Tela({ admin, eu, vendedores }) {
  const vazio = { nome: '', telefone: '', observacoes: '', vendedor_id: String(eu), origem: '', indicado_por: '', indicado_tel: '' };
  const [lista, setLista] = useState([]);
  const [f, setF] = useState(vazio);
  const [edit, setEdit] = useState(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [dup, setDup] = useState(false);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('alfa');
  const [minDias, setMinDias] = useState('0');
  const [mostrar, setMostrar] = useState('todos');
  const [agenda, setAgenda] = useState(false);

  async function recarregar() {
    const r = await api('/api/clientes', 'GET');
    if (r.ok) setLista(r.d);
  }
  useEffect(() => {
    recarregar();
    setAgenda(typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in navigator.contacts);
  }, []);

  async function salvar(forcar) {
    setErro(''); setOk('');
    const r = edit
      ? await api('/api/clientes/' + edit, 'PATCH', f)
      : await api('/api/clientes', 'POST', { ...f, forcar });
    if (!r.ok) { setErro(r.d.erro || 'Erro ao salvar.'); setDup(!!r.d.duplicado); return; }
    setF(vazio); setEdit(null); setDup(false);
    recarregar();
  }

  async function puxarAgenda() {
    setErro(''); setOk('');
    let cs;
    try { cs = await navigator.contacts.select(['name', 'tel'], { multiple: true }); } catch { return; }
    if (!cs || !cs.length) return;
    const pega = (c) => ({ nome: String((c.name || [])[0] || '').trim(), telefone: telAgenda((c.tel || [])[0]) });
    if (cs.length === 1) {
      const c = pega(cs[0]);
      setF({ ...f, nome: c.nome || f.nome, telefone: c.telefone || f.telefone });
      return;
    }
    let novos = 0; let jaTinha = 0; let semDados = 0;
    for (const x of cs) {
      const c = pega(x);
      if (!c.nome || !c.telefone) { semDados++; continue; }
      const r = await api('/api/clientes', 'POST', { ...f, nome: c.nome, telefone: c.telefone });
      if (r.ok) novos++; else jaTinha++;
    }
    setOk(novos + ' cadastrado(s)' + (jaTinha ? ', ' + jaTinha + ' já existia(m)' : '') + (semDados ? ', ' + semDados + ' sem nome ou número' : '') + '.');
    recarregar();
  }

  function editar(c) {
    setEdit(c.id); setErro(''); setOk('');
    setF({ nome: c.nome, telefone: c.telefone || '', observacoes: c.observacoes || '', vendedor_id: String(c.vendedor_id), origem: c.origem || '', indicado_por: c.indicado_por || '', indicado_tel: c.indicado_tel || '' });
    window.scrollTo(0, 0);
  }
  async function excluir(c) {
    if (!(await confirmar('Excluir ' + c.nome + '?', { titulo: 'Excluir cliente', ok: 'Excluir', perigo: true }))) return;
    const r = await api('/api/clientes/' + c.id, 'DELETE');
    if (!r.ok) { setErro(r.d.erro || 'Erro ao excluir.'); return; }
    recarregar();
  }
  function enviado(c, tipo) {
    registrar(c.id, tipo).then(() => setTimeout(recarregar, 300));
  }

  const termo = busca.trim().toLowerCase();
  const base = lista.map((c) => ({ ...c, dias: c.ultima_compra ? diasDesde(c.ultima_compra) : null, msgs: c.msgs || {} }));
  const aguardando = base.filter((c) => c.origem === 'Indicação' && c.compras === 0 && !c.convite_em).length;
  const comDesconto = base.filter((c) => c.desconto).length;
  const vis = base
    .filter((c) => (c.nome + ' ' + (c.telefone || '') + ' ' + (c.indicado_por || '')).toLowerCase().includes(termo))
    .filter((c) => mostrar === 'todos' || (mostrar === 'clientes' ? c.compras > 0 : mostrar === 'potenciais' ? c.compras === 0 : mostrar === 'descontos' ? !!c.desconto : c.origem === 'Indicação'))
    .filter((c) => Number(minDias) === 0 || (c.dias !== null && c.dias >= Number(minDias)))
    .sort((a, b) => {
      if (ordem === 'antigos') return (b.dias === null ? -1 : b.dias) - (a.dias === null ? -1 : a.dias) || a.nome.localeCompare(b.nome, 'pt-BR');
      if (ordem === 'recentes') return (a.dias === null ? 1e9 : a.dias) - (b.dias === null ? 1e9 : b.dias) || a.nome.localeCompare(b.nome, 'pt-BR');
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

  const botao = { display: 'inline-block', whiteSpace: 'nowrap' };
  const quando = (iso) => iso && <div className='aviso' style={{ fontSize: 11, color: recente(iso) ? '#ff9f43' : undefined }}>enviado {haQuanto(iso)}</div>;
  return (
    <>
      <div className='card'>
        <h2>{edit ? 'Editar cliente' : 'Novo cliente'}</h2>
        {agenda && !edit && <p><button type='button' className='bs' onClick={puxarAgenda}>📱 Puxar da agenda</button> <span className='aviso'>Escolha um contato para preencher, ou vários para cadastrar de uma vez.</span></p>}
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
        <div className='linha'>
          <div><label>Origem do contato</label>
            <select value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })}>
              <option value=''>Não informada</option>
              {ORIGENS.map((o) => <option key={o}>{o}</option>)}
            </select></div>
          {f.origem === 'Indicação' && <div><label>Indicado por</label><input value={f.indicado_por} placeholder='Nome de quem indicou' onChange={(e) => setF({ ...f, indicado_por: e.target.value })} /></div>}
          {f.origem === 'Indicação' && <div><label>WhatsApp de quem indicou</label><input value={f.indicado_tel} inputMode='tel' placeholder='para gerar os 10% dele' onChange={(e) => setF({ ...f, indicado_tel: e.target.value })} /></div>}
        </div>
        <label>Observações</label>
        <input value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
        {erro && <p className='erro'>{erro}</p>}
        {ok && <p className='ok'>{ok}</p>}
        <p>
          <button type='button' className='btn' onClick={() => salvar(false)}>{edit ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
          {dup && <button type='button' className='bs' onClick={() => salvar(true)}>Cadastrar mesmo assim</button>}
          {edit && <button type='button' className='bs' onClick={() => { setEdit(null); setF(vazio); setErro(''); setDup(false); }}>Cancelar</button>}
        </p>
      </div>
      <div className='card'>
        <h2>Clientes ({vis.length})</h2>
        <p><a className='bs' style={botao} href={'https://wa.me/?text=' + encodeURIComponent(textoIndique(''))} target='_blank' rel='noreferrer'>🎁 Compartilhar Indique e ganhe</a> <span className='aviso'>Abre o WhatsApp para enviar a qualquer contato, grupo ou status.</span></p>
        {aguardando > 0 && <p className='ok'>💛 {aguardando} indicação(ões) nova(s) aguardando convite. <button type='button' className='bs' onClick={() => setMostrar('indicacoes')}>Ver</button></p>}
        {comDesconto > 0 && <p className='ok'>🎁 {comDesconto} cliente(s) com desconto disponível. <button type='button' className='bs' onClick={() => setMostrar('descontos')}>Ver</button></p>}
        <div className='linha'>
          <div style={{ flex: 2 }}><label>Buscar</label><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='Nome ou telefone...' /></div>
          <div><label>Mostrar</label>
            <select value={mostrar} onChange={(e) => setMostrar(e.target.value)}>
              <option value='todos'>Todos</option>
              <option value='clientes'>Já compraram</option>
              <option value='potenciais'>Potenciais (sem compras)</option>
              <option value='indicacoes'>Indicações</option>
              <option value='descontos'>Com desconto disponível</option>
            </select></div>
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
        <p className='aviso' style={{ fontSize: 12 }}>Embaixo de cada botão aparece quando a mensagem foi enviada. Em laranja: enviada nos últimos 7 dias.</p>
        <div className='tabela'>
          <table>
            <thead><tr><th>Cliente</th><th>Última compra</th><th>Compras</th><th></th></tr></thead>
            <tbody>
              {vis.map((c) => {
                const potencial = c.compras === 0;
                const zap = potencial ? linkZap(c.telefone, textoConvite(c.nome, c.indicado_por)) : linkZap(c.telefone, textoResgate(c.nome, c.desconto));
                const tipo = potencial ? 'convite' : 'resgate';
                return (
                  <tr key={c.id}>
                    <td>{c.nome}
                      {c.telefone && <div className='aviso'>{c.telefone}</div>}
                      {admin && <div className='aviso'>{c.vendedor}</div>}
                      {c.origem && <div className='aviso'>{c.origem === 'Indicação' && c.indicado_por ? 'Indicação de ' + c.indicado_por + (c.indicado_tel ? ' (' + c.indicado_tel + ')' : '') : 'Origem: ' + c.origem}</div>}
                      {c.desconto && <div className='ok' style={{ fontSize: 12 }}>{descTxt(c.desconto)}</div>}
                      {c.observacoes && <div className='aviso'>{c.observacoes}</div>}
                    </td>
                    <td>{c.ultima_compra ? <>{dtBR(c.ultima_compra)}<div className='aviso'>há {c.dias} {c.dias === 1 ? 'dia' : 'dias'}</div></> : <span className='aviso'>potencial</span>}</td>
                    <td>{c.compras}</td>
                    <td>
                      {zap && <div><a className='bs' style={botao} href={zap} target='_blank' rel='noreferrer' onClick={() => enviado(c, tipo)}>{potencial ? 'Convite' : 'Resgate'}</a>{quando(potencial ? (c.msgs.convite || c.convite_em) : c.msgs.resgate)}</div>}
                      {!potencial && c.telefone && <div style={{ marginTop: 6 }}><a className='bs' style={botao} href={linkZap(c.telefone, textoIndique(c.nome))} target='_blank' rel='noreferrer' onClick={() => enviado(c, 'indique')}>Indique e ganhe</a>{quando(c.msgs.indique)}</div>}
                      <div style={{ marginTop: 6 }}><button type='button' className='bs' onClick={() => editar(c)}>Editar</button></div>
                      {potencial && <div style={{ marginTop: 6 }}><button type='button' className='bs' style={{ borderColor: '#d4707f', color: '#d4707f' }} onClick={() => excluir(c)}>Excluir</button></div>}
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
