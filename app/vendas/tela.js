'use client';
import { useEffect, useState } from 'react';
import { api, brl, dtBR, hojeISO, wa } from '../util';
import Pagamentos from './pagamentos';

const LINK = 'https://mpago.li/1o3MyQE';
const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
const primeiroNome = (nome) => { const t = String(nome || '').trim().split(/\s+/)[0] || ''; return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''; };
const textoPosVenda = (nome) => { const pn = primeiroNome(nome); return saudacao() + (pn ? ', ' + pn : '') + '! 😊\n\nMuito obrigado pela sua compra! Queremos saber como está sendo sua experiência com o perfume, seu feedback nos motiva a melhorar sempre.\n\nSe puder, responda com uma nota de 0 a 10 para o perfume. Sua opinião é muito importante para nós! ⭐\n\nE conheça as nossas outras fragrâncias, com notas, história e melhor uso: https://samura-perfumes.vercel.app/fragrancias\n\nSamura Perfumes 💛'; };
const textoCobranca = (nome, pix) => { const pn = primeiroNome(nome); return saudacao() + (pn ? ', ' + pn : '') + '! 😊\n\nEsperamos que esteja aproveitando sua compra! Passando só para confirmar se deu tudo certo e nos colocar à disposição para qualquer dúvida ou novas aquisições.\n\nPara facilitar futuros contatos ou acertos, segue minha chave Pix: ' + pix + '.\n\nSe preferir pagar no cartão, é só acessar: ' + LINK + '\n\nConte conosco! 💛'; };

const n = (v) => Number(String(v || '0').replace(',', '.')) || 0;
const novoItem = () => ({ tipo: 'Perfume', frag: '', volume: '50 ml', qtd: '1', preco: '', manual: false, entrega: '' });
const maisDias = (d, k) => new Date(new Date(d + 'T12:00:00').getTime() + k * 86400000).toISOString().slice(0, 10);

export default function Tela({ admin, eu, vendedores }) {
  const [cat, setCat] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [est, setEst] = useState([]);
  const [vend, setVend] = useState(String(eu));
  const [cliente, setCliente] = useState('');
  const [itens, setItens] = useState([novoItem()]);
  const [desconto, setDesconto] = useState('0');
  const [data, setData] = useState(hojeISO());
  const [obs, setObs] = useState('');
  const [cTipo, setCTipo] = useState('');
  const [cTaxa, setCTaxa] = useState('');
  const [verCom, setVerCom] = useState(false);
  const [aberta, setAberta] = useState(null);
  const [modo, setModo] = useState('pendente');
  const [dataPrev, setDataPrev] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [dataRest, setDataRest] = useState(maisDias(hojeISO(), 30));
  const [nPar, setNPar] = useState('2');
  const [primeira, setPrimeira] = useState(maisDias(hojeISO(), 30));
  const [dias, setDias] = useState('30');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [agrad, setAgrad] = useState(null);
  const [todas, setTodas] = useState(false);
  const [busca, setBusca] = useState('');
  const [pix, setPix] = useState('21 964147761');

  async function carregar() {
    const [a, b, c, e, cf] = await Promise.all([api('/api/catalogo', 'GET'), api('/api/clientes', 'GET'), api('/api/vendas', 'GET'), api('/api/estoque', 'GET'), api('/api/config', 'GET')]);
    if (cf.ok && cf.d.pix) setPix(cf.d.pix);
    if (a.ok) setCat(a.d);
    if (b.ok) setClientes(b.d);
    if (c.ok) setVendas(c.d);
    if (e.ok) setEst(e.d.saldos);
  }
  useEffect(() => { carregar(); }, []);

  const ativos = cat.filter((a) => a.ativa);
  const tipos = [...new Set(['Perfume', ...ativos.map((a) => a.tipo)])];
  const carteira = clientes.filter((c) => String(c.vendedor_id) === vend);
  const sel = vendedores.find((v) => String(v.id) === vend);
  const achar = (it) => ativos.find((a) => a.tipo === it.tipo && a.fragrancia.toLowerCase() === it.frag.trim().toLowerCase() && a.volume === it.volume);
  const volumes = (it) => ativos.filter((a) => a.tipo === it.tipo && a.fragrancia.toLowerCase() === it.frag.trim().toLowerCase()).map((a) => a.volume);
  const dispo = (it) => {
    const a = achar(it);
    if (!a) return 0;
    const r = est.find((x) => String(x.local_id) === vend && x.apresentacao_id === a.id);
    return r ? r.saldo : 0;
  };
  const ef = (it) => {
    const e = it.entrega || (dispo(it) > 0 ? 'estoque' : 'envasar');
    return e === 'estoque' && dispo(it) <= 0 ? 'envasar' : e;
  };
  const frags = (tipo) => {
    const m = new Map();
    ativos.filter((a) => a.tipo === tipo).forEach((a) => m.set(a.fragrancia, (m.get(a.fragrancia) || 0) + Number(a.vendidos || 0)));
    return [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map((e) => e[0]);
  };

  function mudar(i, campos) {
    setItens(itens.map((it, k) => {
      if (k !== i) return it;
      const m = { ...it, ...campos };
      const vols = volumes(m);
      if (vols.length && !vols.includes(m.volume)) m.volume = vols.includes('50 ml') ? '50 ml' : vols[0];
      const a = achar(m);
      if (a && !m.manual) m.preco = String(a.preco);
      return m;
    }));
  }

  const bruto = itens.reduce((t, it) => t + n(it.qtd) * n(it.preco), 0);
  const desc = Math.min(Math.max(n(desconto), 0), bruto);
  const liquido = Math.round((bruto - desc) * 100) / 100;
  const tipoC = cTipo || (sel && sel.comissao_tipo) || 'percentual';
  const taxa = cTaxa !== '' ? n(cTaxa) : sel ? Number(sel.comissao_valor) : 0;
  const valorC = tipoC === 'fixo' ? taxa : (liquido * taxa) / 100;

  function gerarParcelas() {
    const k = parseInt(nPar, 10);
    if (!(k > 0) || !(liquido > 0)) return [];
    const base = Math.floor((liquido / k) * 100) / 100;
    const ps = [];
    for (let i = 0; i < k; i++) ps.push({ valor: i === k - 1 ? Math.round((liquido - base * (k - 1)) * 100) / 100 : base, data_prevista: maisDias(primeira, i * (Number(dias) || 30)) });
    return ps;
  }

  async function novoCliente() {
    const nome = prompt('Nome do cliente:');
    if (!nome) return;
    const tel = prompt('WhatsApp (opcional):') || '';
    let r = await api('/api/clientes', 'POST', { nome, telefone: tel, vendedor_id: vend });
    if (!r.ok && r.d.duplicado && confirm(r.d.erro + ' Cadastrar mesmo assim?')) r = await api('/api/clientes', 'POST', { nome, telefone: tel, vendedor_id: vend, forcar: true });
    if (!r.ok) { alert(r.d.erro || 'Erro ao cadastrar.'); return; }
    await carregar();
    setCliente(nome.trim());
  }

  async function salvar(e) {
    e.preventDefault();
    setErro(''); setOk('');
    const cli = carteira.find((c) => c.nome.toLowerCase() === cliente.trim().toLowerCase());
    if (!cli) return setErro('Escolha um cliente da lista ou cadastre em Novo cliente.');
    const lista = [];
    for (const it of itens) {
      const a = achar(it);
      if (!a) return setErro('Escolha a fragrância de cada produto na lista.');
      const dd = dispo(it);
      const entrega = ef(it);
      if (entrega === 'estoque' && n(it.qtd) > dd) return setErro('Estoque insuficiente de ' + it.frag + ' ' + it.volume + ': disponível ' + dd + '. Diminua a quantidade ou escolha outra opção de entrega.');
      lista.push({ apresentacao_id: a.id, quantidade: it.qtd, preco_unit: it.preco, entrega });
    }
    const pagamento = { modo, data: hojeISO() };
    if (modo === 'pendente' && dataPrev) pagamento.data_prevista = dataPrev;
    if (modo === 'parcial') { pagamento.valor_pago = valorPago; pagamento.data_restante = dataRest; }
    if (modo === 'parcelado') pagamento.parcelas = gerarParcelas();
    const body = { cliente_id: cli.id, vendedor_id: vend, itens: lista, desconto, data_venda: data, observacoes: obs, pagamento };
    if (admin && cTaxa !== '') { body.comissao_tipo = tipoC; body.comissao_taxa = cTaxa; }
    const r = await api('/api/vendas', 'POST', body);
    if (!r.ok) return setErro(r.d.erro || 'Erro ao salvar.');
    setOk('Venda ' + r.d.codigo + ' salva.');
    if (lista.some((l) => l.entrega === 'entregue')) {
      const pn = String(cli.nome).trim().split(' ')[0];
      const h = new Date().getHours();
      const texto = (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + ', ' + pn + '! Queremos saber como está sendo sua experiência com nosso perfume, seu feedback nos motiva a melhorar sempre! Samura Perfumes';
      setAgrad({ nome: cli.nome, url: wa(cli.telefone, texto) });
    } else setAgrad(null);
    setItens([novoItem()]); setCliente(''); setDesconto('0'); setObs(''); setCTipo(''); setCTaxa(''); setModo('pendente'); setValorPago(''); setDataPrev(''); setData(hojeISO());
    carregar();
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = todas ? vendas.filter((v) => !termo || [v.codigo, v.cliente, v.vendedor].some((x) => String(x || '').toLowerCase().includes(termo))) : vendas.slice(0, 3);
  const colunas = 8 + (admin ? 1 : 0) + (admin && verCom ? 1 : 0);
  return (
    <>
      <form className='card' onSubmit={salvar}>
        <h2>Nova venda</h2>
        <div className='linha'>
          {admin && (
            <div><label>Vendedor</label>
              <select value={vend} onChange={(e) => { setVend(e.target.value); setCliente(''); setCTipo(''); setCTaxa(''); }}>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select></div>
          )}
          <div style={{ flex: 2 }}><label>Cliente</label>
            <input list='dl-clientes' value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder='Digite para buscar...' />
            <datalist id='dl-clientes'>{carteira.map((c) => <option key={c.id} value={c.nome} />)}</datalist>
            <button type='button' className='bs' onClick={novoCliente}>+ Novo cliente</button></div>
          <div><label>Data da venda</label><input type='date' value={data} onChange={(e) => setData(e.target.value)} /><button type='button' className='bs' onClick={() => setData(hojeISO())}>Hoje</button></div>
        </div>
        <label>Produtos</label>
        {itens.map((it, i) => (
          <div className='linha' key={i} style={{ alignItems: 'flex-end' }}>
            <div><select value={it.tipo} onChange={(e) => mudar(i, { tipo: e.target.value, manual: false })}>{tipos.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div style={{ flex: 2 }}>
              <input list={'dl' + i} value={it.frag} placeholder='Fragrância...' onChange={(e) => mudar(i, { frag: e.target.value, manual: false })} />
              <datalist id={'dl' + i}>{frags(it.tipo).map((f) => <option key={f} value={f} />)}</datalist></div>
            <div><select value={it.volume} onChange={(e) => mudar(i, { volume: e.target.value, manual: false })}>
              {[...new Set([it.volume, ...volumes(it)])].map((v) => <option key={v}>{v}</option>)}</select></div>
            <div style={{ maxWidth: 80 }}><input value={it.qtd} inputMode='numeric' onChange={(e) => mudar(i, { qtd: e.target.value })} /></div>
            <div style={{ maxWidth: 110 }}><input value={it.preco} inputMode='decimal' placeholder='Preço' onChange={(e) => mudar(i, { preco: e.target.value, manual: true })} /></div>
            <div><select value={ef(it)} onChange={(e) => mudar(i, { entrega: e.target.value })}>
              <option value='envasar'>Entrega: a envasar</option>
              {dispo(it) > 0 && <option value='estoque'>Entrega: sai do estoque ({dispo(it)})</option>}
              <option value='entregue'>Entrega: já entregue</option></select></div>
            {itens.length > 1 && <div style={{ flex: 0 }}><button type='button' className='bs' onClick={() => setItens(itens.filter((_, k) => k !== i))}>X</button></div>}
          </div>
        ))}
        <p><button type='button' className='bs' onClick={() => setItens([...itens, novoItem()])}>+ Adicionar produto</button></p>
        <div className='linha'>
          <div><label>Desconto total (R$)</label><input value={desconto} inputMode='decimal' onChange={(e) => setDesconto(e.target.value)} /></div>
          <div><label>Observações</label><input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        {admin && sel && verCom && (
          <div className='linha'>
            <div><label>Comissão desta venda</label>
              <select value={tipoC} onChange={(e) => setCTipo(e.target.value)}><option value='percentual'>Percentual (%)</option><option value='fixo'>Valor fixo (R$)</option></select></div>
            <div><label>Valor (padrão: {sel.comissao_tipo === 'fixo' ? brl(sel.comissao_valor) : sel.comissao_valor + '%'})</label>
              <input value={cTaxa} placeholder='vazio = padrão' onChange={(e) => setCTaxa(e.target.value)} /></div>
            <div><label>Comissão calculada</label><p className='aviso'><b>{brl(valorC)}</b></p></div>
          </div>
        )}
        <p style={{ fontSize: 18, fontWeight: 'bold', color: '#FFD700' }}>Total: {brl(liquido)}</p>
        <label>Pagamento</label>
        <p className='aviso'>A data de cima é a data da <b>venda</b>. Se o cliente vai pagar em outro dia ou mês, escolha a forma abaixo e informe a data do pagamento.</p>
        <div className='linha'>
          <div><select value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value='pendente'>Pendente (a combinar ou com previsão)</option>
            <option value='avista'>Pago à vista (hoje)</option>
            <option value='parcial'>Parcial (paga uma parte agora)</option>
            <option value='parcelado'>Parcelado (datas agendadas)</option></select></div>
          {modo === 'pendente' && <div><label>Previsão de pagamento (opcional)</label><input type='date' value={dataPrev} onChange={(e) => setDataPrev(e.target.value)} /></div>}
          {modo === 'parcial' && <><div><label>Pago agora (R$)</label><input value={valorPago} inputMode='decimal' onChange={(e) => setValorPago(e.target.value)} /></div><div><label>Restante em</label><input type='date' value={dataRest} onChange={(e) => setDataRest(e.target.value)} /></div></>}
          {modo === 'parcelado' && <><div><label>Parcelas</label><input value={nPar} inputMode='numeric' onChange={(e) => setNPar(e.target.value)} /></div><div><label>1ª data</label><input type='date' value={primeira} onChange={(e) => setPrimeira(e.target.value)} /></div><div><label>Intervalo (dias)</label><input value={dias} inputMode='numeric' onChange={(e) => setDias(e.target.value)} /></div></>}
        </div>
        {modo === 'avista' && <p className='aviso'>{admin ? 'Será lançado como recebido hoje.' : 'Será lançado como informado, aguardando a validação do repasse.'}</p>}
        {modo === 'parcelado' && gerarParcelas().length > 0 && <p className='aviso'>{gerarParcelas().map((p) => brl(p.valor) + ' em ' + dtBR(p.data_prevista)).join(' · ')}</p>}
        {erro && <p className='erro'>{erro}</p>}
        {ok && <p className='ok'>{ok}</p>}
        {agrad && (agrad.url
          ? <p><a className='bs' href={agrad.url} target='_blank' rel='noreferrer'>Enviar agradecimento para {agrad.nome}</a> <button type='button' className='bs' onClick={() => setAgrad(null)}>Fechar</button></p>
          : <p className='aviso'>{agrad.nome} não tem WhatsApp cadastrado (cadastre em Clientes).</p>)}
        <button className='btn'>Finalizar e salvar venda</button>
        {admin && <p style={{ textAlign: 'right', margin: '8px 0 0' }}><button type='button' className='bs' onClick={() => setVerCom(!verCom)} style={{ opacity: 0.5 }}>{verCom ? 'Ocultar comissão' : 'Comissão'}</button></p>}
      </form>
      <div className='card'>
        <h2>{todas ? 'Histórico de vendas' : 'Últimas vendas'}</h2>
        {todas && <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='Buscar por cliente, vendedor ou código...' />}
        <div className='tabela'>
          <table>
            <thead><tr><th>Código</th><th>Data da venda</th><th>Cliente</th>{admin && <th>Vendedor</th>}<th>Itens</th><th>Total</th><th>Pagamento</th><th>Entrega</th>{admin && verCom && <th>Comissão</th>}<th></th></tr></thead>
            <tbody>
              {visiveis.map((v) => (
                <>
                  <tr key={v.id}>
                    <td>{v.codigo}</td><td>{dtBR(v.data_venda)}</td><td>{v.cliente}</td>{admin && <td>{v.vendedor}</td>}
                    <td>{v.itens}</td><td>{brl(v.total_liquido)}</td>
                    <td>{v.situacao}{Number(v.saldo_devedor) > 0 && Number(v.saldo_devedor) < Number(v.total_liquido) ? ' (falta ' + brl(v.saldo_devedor) + ')' : ''}{v.situacao !== 'Paga' && (v.telefone ? <> <a className='bs' href={wa(v.telefone, textoCobranca(v.cliente, pix))} target='_blank' rel='noreferrer'>Cobrança</a></> : <span className='aviso'> (sem WhatsApp)</span>)}</td>
                    <td>{v.entregue ? 'Entregue' : 'Pendente'}{v.entregue && v.telefone && <> <a className='bs' href={wa(v.telefone, textoPosVenda(v.cliente))} target='_blank' rel='noreferrer'>Pós-venda</a></>}</td>{admin && verCom && <td>{brl(v.comissao_valor)}</td>}
                    <td><button className='bs' onClick={() => setAberta(aberta === v.id ? null : v.id)}>Pagamentos</button></td>
                  </tr>
                  {aberta === v.id && <tr key={'p' + v.id}><td colSpan={colunas}><Pagamentos vendaId={v.id} admin={admin} dataVenda={String(v.data_venda).slice(0, 10)} onChange={carregar} /></td></tr>}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ textAlign: 'center', margin: '12px 0 0' }}><button type='button' className='bs' onClick={() => { setTodas(!todas); setBusca(''); setAberta(null); }}>{todas ? 'Mostrar só as 3 últimas' : 'Ver histórico completo (' + vendas.length + ')'}</button></p>
      </div>
    </>
  );
}
