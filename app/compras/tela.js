'use client';
import { useEffect, useState } from 'react';
import { api, brl, dtBR, hojeISO } from '../util';

const num = (v) => Number(String(v).replace(',', '.'));
const fmtQ = (v, un) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' ' + un;
const custoTxt = (v, un) => (v == null ? '-' : brl(v) + (un === 'ml' ? '/ml' : '/un'));
const tag = (t) => (el, n) => { const x = el.getElementsByTagName(n)[0]; return x ? x.textContent : ''; };

export default function Tela() {
  const [d, setD] = useState({ insumos: [], categorias: [] });
  const [compras, setCompras] = useState([]);
  const [f, setF] = useState({ insumo_id: '', data: hojeISO(), quantidade: '', valor_total: '', fornecedor: '', obs: '' });
  const [n, setN] = useState({ nome: '', categoria: 'essencia', unidade: 'ml' });
  const [xml, setXml] = useState(null);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  async function carregar() {
    const [a, b] = await Promise.all([api('/api/insumos', 'GET'), api('/api/compras', 'GET')]);
    if (a.ok) setD(a.d);
    if (b.ok) setCompras(b.d.compras);
  }
  useEffect(() => { carregar(); }, []);

  const sel = d.insumos.find((i) => String(i.id) === String(f.insumo_id));
  const unitPrev = sel && num(f.quantidade) > 0 && num(f.valor_total) >= 0 ? num(f.valor_total) / num(f.quantidade) : null;

  async function lancar(e) {
    e.preventDefault(); setMsg(''); setErro('');
    const r = await api('/api/compras', 'POST', { ...f, quantidade: num(f.quantidade), valor_total: num(f.valor_total) });
    if (!r.ok) { setErro(r.d.erro || 'Erro'); return; }
    setMsg('Compra registrada. O custo médio foi atualizado.');
    setF({ ...f, quantidade: '', valor_total: '', obs: '' });
    carregar();
  }
  async function novoItem(e) {
    e.preventDefault(); setMsg(''); setErro('');
    const r = await api('/api/insumos', 'POST', n);
    if (!r.ok) { setErro(r.d.erro || 'Erro'); return; }
    setMsg('Item cadastrado.');
    setN({ ...n, nome: '' });
    await carregar();
    setF((x) => ({ ...x, insumo_id: String(r.d.id) }));
  }
  async function excluir(c) {
    if (!confirm('Excluir a compra de ' + c.nome + ' (' + brl(c.valor_total) + ')? O custo médio será recalculado.')) return;
    const r = await api('/api/compras/' + c.id, 'DELETE');
    if (!r.ok) { alert('Erro ao excluir'); return; }
    carregar();
  }
  async function lerXml(ev) {
    setMsg(''); setErro('');
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const doc = new DOMParser().parseFromString(await file.text(), 'application/xml');
    const dets = Array.from(doc.getElementsByTagName('det'));
    if (!dets.length) { setErro('Não encontrei itens neste XML. Use o XML da nota fiscal eletrônica (NF-e).'); setXml(null); return; }
    const t = tag();
    const emit = doc.getElementsByTagName('emit')[0];
    setXml({
      fornecedor: emit ? t(emit, 'xNome') : '',
      data: (t(doc, 'dhEmi') || t(doc, 'dEmi') || hojeISO()).slice(0, 10),
      itens: dets.map((x) => ({ desc: t(x, 'xProd'), quantidade: t(x, 'qCom'), valor_total: t(x, 'vProd'), insumo_id: '' })),
    });
    ev.target.value = '';
  }
  async function lancarXml() {
    setMsg(''); setErro('');
    const itens = xml.itens.filter((i) => i.insumo_id).map((i) => ({ insumo_id: i.insumo_id, quantidade: num(i.quantidade), valor_total: num(i.valor_total), obs: i.desc }));
    if (!itens.length) { setErro('Escolha o item do sistema em pelo menos uma linha da nota.'); return; }
    const r = await api('/api/compras', 'POST', { data: xml.data, fornecedor: xml.fornecedor, itens });
    if (!r.ok) { setErro(r.d.erro || 'Erro'); return; }
    setMsg(itens.length + ' item(ns) da nota lançados.');
    setXml(null);
    carregar();
  }
  const setLinha = (k, campo, v) => setXml({ ...xml, itens: xml.itens.map((it, j) => (j === k ? { ...it, [campo]: v } : it)) });
  const opcoes = d.insumos.map((i) => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>);

  return (
    <>
      <form className='card' onSubmit={lancar}>
        <h2>Registrar compra</h2>
        <div className='linha'>
          <div style={{ flex: 2 }}><label>Item comprado</label>
            <select value={f.insumo_id} onChange={(e) => setF({ ...f, insumo_id: e.target.value })}>
              <option value=''>Escolha...</option>{opcoes}
            </select></div>
          <div><label>Data</label><input type='date' value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
          <div><label>Quantidade{sel ? ' (' + sel.unidade + ')' : ''}</label><input value={f.quantidade} inputMode='decimal' onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></div>
          <div><label>Valor pago (R$)</label><input value={f.valor_total} inputMode='decimal' onChange={(e) => setF({ ...f, valor_total: e.target.value })} /></div>
        </div>
        <div className='linha'>
          <div><label>Fornecedor (opcional)</label><input value={f.fornecedor} onChange={(e) => setF({ ...f, fornecedor: e.target.value })} /></div>
          <div><label>Observação (opcional)</label><input value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></div>
        </div>
        {unitPrev != null && <p className='aviso'>Esta compra sai a {custoTxt(unitPrev, sel.unidade)}. Digite o valor total da compra, já com frete se houver.</p>}
        {erro && <p className='erro'>{erro}</p>}
        {msg && <p className='ok'>{msg}</p>}
        <button className='btn'>Registrar compra</button>
        <p className='aviso'>Quantidade em ml para líquidos (1 litro = 1000) e em unidades para vidro, válvula, rótulo e sacola.</p>
      </form>

      <div className='card'>
        <h2>Importar nota fiscal (XML)</h2>
        <p className='aviso'>Envie o arquivo XML da NF-e. Os itens, quantidades e valores são lidos sozinhos; você só diz a qual item do sistema cada linha corresponde.</p>
        <input type='file' accept='.xml,text/xml' onChange={lerXml} />
        {xml && (
          <>
            <p className='aviso'>Fornecedor: <b>{xml.fornecedor || '-'}</b> · Data da nota: <b>{dtBR(xml.data)}</b></p>
            <div className='tabela'>
              <table>
                <thead><tr><th>Item da nota</th><th>Qtd</th><th>Valor (R$)</th><th>Item no sistema</th></tr></thead>
                <tbody>
                  {xml.itens.map((it, k) => (
                    <tr key={k}>
                      <td>{it.desc}</td>
                      <td><input value={it.quantidade} onChange={(e) => setLinha(k, 'quantidade', e.target.value)} /></td>
                      <td><input value={it.valor_total} onChange={(e) => setLinha(k, 'valor_total', e.target.value)} /></td>
                      <td><select value={it.insumo_id} onChange={(e) => setLinha(k, 'insumo_id', e.target.value)}><option value=''>Ignorar</option>{opcoes}</select></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type='button' className='btn' onClick={lancarXml}>Lançar itens escolhidos</button>
          </>
        )}
      </div>

      <form className='card' onSubmit={novoItem}>
        <h2>Cadastrar item</h2>
        <div className='linha'>
          <div style={{ flex: 2 }}><label>Nome</label><input value={n.nome} placeholder='Ex.: Essência Invictus, Vidro 50 ml, Válvula 50 ml' onChange={(e) => setN({ ...n, nome: e.target.value })} /></div>
          <div><label>Tipo</label>
            <select value={n.categoria} onChange={(e) => setN({ ...n, categoria: e.target.value, unidade: ['essencia', 'fixador', 'veiculo'].includes(e.target.value) ? 'ml' : 'un' })}>
              {d.categorias.map((c) => <option key={c[0]} value={c[0]}>{c[1]}</option>)}
            </select></div>
          <div><label>Medida</label>
            <select value={n.unidade} onChange={(e) => setN({ ...n, unidade: e.target.value })}><option value='ml'>ml</option><option value='un'>unidade</option></select></div>
        </div>
        <button className='btn'>Cadastrar item</button>
      </form>

      <div className='card'>
        <h2>Custo atual dos itens</h2>
        <div className='tabela'>
          <table>
            <thead><tr><th>Item</th><th>Comprado</th><th>Gasto</th><th>Custo médio</th><th>Última compra</th></tr></thead>
            <tbody>
              {d.insumos.map((i) => (
                <tr key={i.id}>
                  <td>{i.nome}</td><td>{fmtQ(i.qtd_comprada, i.unidade)}</td><td>{brl(i.gasto)}</td>
                  <td><b>{custoTxt(i.custo_medio, i.unidade)}</b></td>
                  <td>{i.ultima_compra ? dtBR(i.ultima_compra) + ' · ' + custoTxt(i.ultimo_custo, i.unidade) : '-'}</td>
                </tr>
              ))}
              {d.insumos.length === 0 && <tr><td colSpan={5}>Cadastre os itens que você compra para começar.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className='aviso'>Custo médio = total gasto ÷ total comprado. Cada nova compra atualiza o custo automaticamente.</p>
      </div>

      <div className='card'>
        <h2>Compras recentes</h2>
        <div className='tabela'>
          <table>
            <thead><tr><th>Data</th><th>Item</th><th>Qtd</th><th>Valor</th><th>Custo</th><th>Fornecedor</th><th></th></tr></thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id}>
                  <td>{dtBR(c.data)}</td><td>{c.nome}</td><td>{fmtQ(c.quantidade, c.unidade)}</td><td>{brl(c.valor_total)}</td>
                  <td>{custoTxt(c.custo_unit, c.unidade)}</td><td>{c.fornecedor || ''}</td>
                  <td><button type='button' className='bs' onClick={() => excluir(c)}>Excluir</button></td>
                </tr>
              ))}
              {compras.length === 0 && <tr><td colSpan={7}>Nenhuma compra registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
