'use client';
import { useEffect, useState } from 'react';

async function api(url, method, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, d };
}

const ORIGENS = ['Indicação', 'Instagram', 'WhatsApp', 'Conhecido', 'Trabalho', 'Evento', 'Outro'];
const LINK_FRAG = 'https://samura-perfumes.vercel.app/fragrancias';
const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dtBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '-');
const diasDesde = (iso) => Math.floor((new Date(hojeISO() + 'T12:00:00') - new Date(String(iso).slice(0, 10) + 'T12:00:00')) / 86400000);
const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
const primeiroNome = (nome) => { const t = String(nome || '').trim().split(/\s+/)[0] || ''; return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''; };
const ola = (nome) => { const pn = primeiroNome(nome); return saudacao() + (pn ? ', ' + pn : '') + '! 😊\n\n'; };
const textoResgate = (nome) => ola(nome) + 'Quanto tempo! Aqui é da Samura Perfumes. Passando para saber como está o seu perfume: você ficou satisfeito? Como está a fixação e o desempenho dele? Seu retorno nos motiva muito a melhorar sempre.\n\nAproveitando, temos fragrâncias que talvez você ainda não conheça, com notas, história e melhor uso: ' + LINK_FRAG + '\n\nSe algum aroma chamar a sua atenção, é só me responder por aqui que eu separo o seu. Será um prazer ter você de volta! 💛\n\nSamura Perfumes';
const textoConvite = (nome, indicou) => ola(nome)
  + (indicou ? 'Aqui é da Samura Perfumes. ' + primeiroNome(indicou) + ' indicou você e achamos que você ia gostar de conhecer nossas fragrâncias, inspiradas nos grandes perfumes. E por ter vindo por indicação, você ganha 5% de desconto na sua primeira compra! 🎁' : 'Aqui é da Samura Perfumes! Queremos te apresentar nossas fragrâncias, inspiradas nos grandes perfumes.')
  + '\n\nMontamos uma página com cada uma delas, com notas, história e o melhor momento de usar: ' + LINK_FRAG
  + '\n\nSe algum aroma chamar a sua atenção, é só me responder por aqui que eu te ajudo a escolher. 💛\n\nSe preferir não receber nossas mensagens, é só avisar.\n\nSamura Perfumes';
const textoIndique = (nome) => (nome ? ola(nome) : 'Oi! 😊\n\n')
  + 'Conhece alguém que vai amar nossos perfumes? Indique um amigo para a Samura Perfumes e ganhe! 🎁\n\n'
  + '✅ Você ganha 10% de desconto na sua próxima compra\n✅ Seu amigo ganha 5% na primeira compra dele\n\n'
  + 'É só cadastrar o nome e o WhatsApp dele aqui: ' + LINK_FRAG + '#indique\n\n'
  + 'O desconto vale depois que o seu amigo fizer a primeira compra, por 90 dias, e não acumula com outras promoções.\n\n'
  + 'Obrigado por fazer parte da Samura! 💛';
const linkZap = (tel, texto) => {
  const d = String(tel || '').replace(/[^0-9]/g, '');
  if (!d) return null;
  return 'https://wa.me/' + (d.startsWith('55') && d.length > 11 ? d : '55' + d) + '?text=' + encodeURIComponent(texto);
};
const telAgenda = (t) => {
  let d = String(t || '').replace(/[^0-9]/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length > 11 && d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 11) return d.slice(0, 2) + ' ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6);
  return d;
};

export default function Tela({ admin, eu, vendedores }) {
  const vazio = { nome: '', telefone: '', observacoes: '', vendedor_id: String(eu), origem: '', indicado_por: '' };
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
    setF({ nome: c.nome, telefone: c.telefone || '', observacoes: c.observacoes || '', vendedor_id: String(c.vendedor_id), origem: c.origem || '', indicado_por: c.indicado_por || '' });
    window.scrollTo(0, 0);
  }
  async function excluir(c) {
    if (!confirm('Excluir ' + c.nome + '?')) return;
    const r = await api('/api/clientes/' + c.id, 'DELETE');
    if (!r.ok) { setErro(r.d.erro || 'Erro ao excluir.'); return; }
    recarregar();
  }
  function marcarConvite(c) {
    api('/api/clientes/' + c.id, 'PATCH', { acao: 'convite' }).then(recarregar);
  }

  const termo = busca.trim().toLowerCase();
  const base = lista.map((c) => ({ ...c, dias: c.ultima_compra ? diasDesde(c.ultima_compra) : null }));
  const aguardando = base.filter((c) => c.origem === 'Indicação' && c.compras === 0 && !c.convite_em).length;
  const vis = base
    .filter((c) => (c.nome + ' ' + (c.telefone || '') + ' ' + (c.indicado_por || '')).toLowerCase().includes(termo))
    .filter((c) => mostrar === 'todos' || (mostrar === 'clientes' ? c.compras > 0 : mostrar === 'potenciais' ? c.compras === 0 : c.origem === 'Indicação'))
    .filter((c) => Number(minDias) === 0 || (c.dias !== null && c.dias >= Number(minDias)))
    .sort((a, b) => {
      if (ordem === 'antigos') return (b.dias === null ? -1 : b.dias) - (a.dias === null ? -1 : a.dias) || a.nome.localeCompare(b.nome, 'pt-BR');
      if (ordem === 'recentes') return (a.dias === null ? 1e9 : a.dias) - (b.dias === null ? 1e9 : b.dias) || a.nome.localeCompare(b.nome, 'pt-BR');
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

  const botao = { display: 'inline-block', whiteSpace: 'nowrap' };
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
          {f.origem === 'Indicação' && <div style={{ flex: 2 }}><label>Indicado por</label><input value={f.indicado_por} placeholder='Nome de quem indicou' onChange={(e) => setF({ ...f, indicado_por: e.target.value })} /></div>}
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
        <p><a className='bs' style={{ display: 'inline-block', whiteSpace: 'nowrap' }} href={'https://wa.me/?text=' + encodeURIComponent(textoIndique(''))} target='_blank' rel='noreferrer'>🎁 Compartilhar Indique e ganhe</a> <span className='aviso'>Abre o WhatsApp para enviar a qualquer contato, grupo ou status.</span></p>
        {aguardando > 0 && <p className='ok'>💛 {aguardando} indicação(ões) nova(s) aguardando convite. <button type='button' className='bs' onClick={() => setMostrar('indicacoes')}>Ver</button></p>}
        <div className='linha'>
          <div style={{ flex: 2 }}><label>Buscar</label><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='Nome ou telefone...' /></div>
          <div><label>Mostrar</label>
            <select value={mostrar} onChange={(e) => setMostrar(e.target.value)}>
              <option value='todos'>Todos</option>
              <option value='clientes'>Já compraram</option>
              <option value='potenciais'>Potenciais (sem compras)</option>
              <option value='indicacoes'>Indicações</option>
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
        <div className='tabela'>
          <table>
            <thead><tr><th>Cliente</th><th>Última compra</th><th>Compras</th><th></th></tr></thead>
            <tbody>
              {vis.map((c) => {
                const potencial = c.compras === 0;
                const zap = linkZap(c.telefone, potencial ? textoConvite(c.nome, c.indicado_por) : textoResgate(c.nome));
                return (
                  <tr key={c.id}>
                    <td>{c.nome}
                      {c.telefone && <div className='aviso'>{c.telefone}</div>}
                      {admin && <div className='aviso'>{c.vendedor}</div>}
                      {c.origem && <div className='aviso'>{c.origem === 'Indicação' && c.indicado_por ? 'Indicação de ' + c.indicado_por + (c.indicado_tel ? ' (' + c.indicado_tel + ')' : '') : 'Origem: ' + c.origem}</div>}
                      {c.observacoes && <div className='aviso'>{c.observacoes}</div>}
                    </td>
                    <td>{c.ultima_compra ? <>{dtBR(c.ultima_compra)}<div className='aviso'>há {c.dias} {c.dias === 1 ? 'dia' : 'dias'}</div></> : <span className='aviso'>potencial{c.convite_em ? <><br />convite em {dtBR(c.convite_em)}</> : ''}</span>}</td>
                    <td>{c.compras}</td>
                    <td>
                      {zap && <div><a className='bs' style={botao} href={zap} target='_blank' rel='noreferrer' onClick={potencial ? () => marcarConvite(c) : undefined}>{potencial ? 'Convite' : 'Resgate'}</a></div>}
                      {!potencial && c.telefone && <div style={{ marginTop: 6 }}><a className='bs' style={botao} href={linkZap(c.telefone, textoIndique(c.nome))} target='_blank' rel='noreferrer'>Indique e ganhe</a></div>}
                      <div style={{ marginTop: zap ? 6 : 0 }}><button type='button' className='bs' onClick={() => editar(c)}>Editar</button></div>
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
