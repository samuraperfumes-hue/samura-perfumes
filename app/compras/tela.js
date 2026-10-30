'use client';
import { useEffect, useState } from 'react';
import { api, brl, dtBR, hojeISO } from '../util';
import { chaveEq } from '../../lib/custos';

const num = (v) => Number(String(v).replace(',', '.'));
const fmtQ = (v, un) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' ' + un;
const custoTxt = (v, un) => (v == null ? '-' : brl(v) + (un === 'ml' ? '/ml' : '/un'));
const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const tamanho = (desc) => { const m = [...String(desc).matchAll(/(\d+(?:[.,]\d+)?)\s*(ml|g)\b/gi)].pop(); return m ? Number(m[1].replace(',', '.')) : null; };
const sugerir = (desc, insumos) => {
  const alvo = new Set(norm(desc).split(/[^a-z0-9]+/).filter(Boolean));
  let melhor = null; let pontos = 0;
  insumos.forEach((i) => {
    const tk = norm(i.nome).split(/[^a-z0-9]+/).filter((x) => x && x !== 'essencia');
    if (!tk.length || !tk.every((x) => alvo.has(x))) return;
    if (alvo.has('gold') && !tk.includes('gold')) return;
    if (tk.length > pontos) { melhor = i; pontos = tk.length; }
  });
  return melhor ? String(melhor.id) : '';
};
const ML = ['essencia', 'fixador', 'veiculo'];
const categoriaDe = (desc) => {
  const t = norm(desc);
  if (/\bfixador\b/.test(t)) return 'fixador';
  if (/\b(veiculo|alcool|base)\b/.test(t)) return 'veiculo';
  if (/\b(valvula)\b/.test(t)) return 'valvula';
  if (/\b(frasco|vidro)\b/.test(t)) return 'vidro';
  if (/\b(rotulo|etiqueta)\b/.test(t)) return 'rotulo';
  if (/\b(sacola)\b/.test(t)) return 'sacola';
  if (/\bessencia\b/.test(t)) return 'essencia';
  return 'outro';
};
const SIGLAS = ['edt', 'edp', 'edc', 'xx', 'vip'];
const titulo = (w) => (SIGLAS.includes(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
const nomeLimpo = (desc, cat) => {
  let t = String(desc).replace(/\((?:m|f|u)\)/gi, ' ').replace(/\(?\d+(?:[.,]\d+)?\s*(?:ml|g)\)?/gi, ' ').replace(/\s+-\s+/g, ' ');
  const gold = /\bgold\b/i.test(t);
  t = t.replace(/\bgold\b/gi, ' ').replace(/^\s*ess[eê]ncia\s+/i, '').replace(/\bperfumaria\b/gi, ' ').replace(/\bfina\b/gi, ' ').replace(/\b[aá]rabe\b/gi, ' ').replace(/\bimportad[ao]\b/gi, ' ');
  const palavras = t.split(/\s+/).filter(Boolean).map(titulo);
  if (gold) palavras.push('Gold');
  const base = palavras.join(' ');
  return cat === 'essencia' ? 'Essência ' + base : base;
};
// Procura a fragrância real do fornecedor na tabela de equivalências (com Gold, ou sem Gold + sufixo).
const resolver = (desc, eq) => {
  const mapa = new Map(eq.map((e) => [e.chave, e]));
  const direto = mapa.get(chaveEq(desc));
  if (direto) return { real: direto.nome_real, origem: direto.origem };
  if (/\bgold\b/i.test(desc)) {
    const sem = mapa.get(chaveEq(desc, true));
    if (sem) return { real: /\bgold\b/i.test(sem.nome_real) ? sem.nome_real : sem.nome_real + ' Gold', origem: sem.origem };
  }
  return null;
};
const tag = (t) => (el, n) => { const x = el.getElementsByTagName(n)[0]; return x ? x.textContent : ''; };

export default function Tela() {
  const [d, setD] = useState({ insumos: [], categorias: [] });
  const [compras, setCompras] = useState([]);
  const [f, setF] = useState({ insumo_id: '', data: hojeISO(), quantidade: '', valor_total: '', fornecedor: '', obs: '' });
  const [n, setN] = useState({ nome: '', categoria: 'essencia', unidade: 'ml' });
  const [xml, setXml] = useState(null);
  const [eq, setEq] = useState([]);
  const [ren, setRen] = useState(null);
  const [ne, setNe] = useState({ origem: '', nome_real: '' });
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [msgX, setMsgX] = useState('');
  const [erroX, setErroX] = useState('');

  async function carregar() {
    const [a, b, c] = await Promise.all([api('/api/insumos', 'GET'), api('/api/compras', 'GET'), api('/api/equivalencias', 'GET')]);
    if (a.ok) setD(a.d);
    if (c.ok) setEq(c.d.equivalencias);
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
  async function sincronizar() {
    setMsg(''); setErro('');
    const r = await api('/api/insumos', 'POST', { acao: 'sincronizar' });
    if (!r.ok) { setErro(r.d.erro || 'Erro'); return; }
    setMsg(r.d.novos ? r.d.novos + ' item(ns) novo(s) cadastrado(s) a partir do catálogo.' : 'Tudo já estava cadastrado.');
    carregar();
  }
  async function excluir(c) {
    if (!confirm('Excluir a compra de ' + c.nome + ' (' + brl(c.valor_total) + ')? O custo médio será recalculado.')) return;
    const r = await api('/api/compras/' + c.id, 'DELETE');
    if (!r.ok) { alert('Erro ao excluir'); return; }
    carregar();
  }
  async function renomear(i) {
    const r = await api('/api/insumos/' + i.id, 'PATCH', { nome: ren.nome });
    if (!r.ok) { alert(r.d.erro || 'Erro ao renomear.'); return; }
    setRen(null);
    carregar();
  }
  async function salvarEq(e) {
    e.preventDefault();
    const r = await api('/api/equivalencias', 'POST', ne);
    if (!r.ok) { alert(r.d.erro || 'Erro'); return; }
    setNe({ origem: '', nome_real: '' });
    carregar();
  }
  async function apagarEq(e) {
    if (!confirm('Remover a equivalência de ' + e.origem + '?')) return;
    await api('/api/equivalencias?chave=' + encodeURIComponent(e.chave), 'DELETE');
    carregar();
  }
  function aplicar(it, insumoId) {
    const ins = d.insumos.find((i) => String(i.id) === String(insumoId));
    const ehMl = insumoId === '__novo__' ? ML.includes(it.cat) : ins && ins.unidade === 'ml';
    const q = ehMl && it.tam ? num(it.qCom) * it.tam : num(it.qCom);
    return { ...it, insumo_id: insumoId, quantidade: String(Math.round(q * 1000) / 1000) };
  }
  async function lerXml(ev) {
    setMsgX(''); setErroX('');
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const doc = new DOMParser().parseFromString(await file.text(), 'application/xml');
    const dets = Array.from(doc.getElementsByTagName('det'));
    if (!dets.length) { setErroX('Não encontrei itens neste XML. Use o XML da nota fiscal eletrônica (NF-e).'); setXml(null); return; }
    const t = tag();
    const emit = doc.getElementsByTagName('emit')[0];
    setXml({
      fornecedor: emit ? t(emit, 'xNome') : '',
      data: (t(doc, 'dhEmi') || t(doc, 'dEmi') || hojeISO()).slice(0, 10),
      itens: dets.map((x) => {
        const desc = t(x, 'xProd');
        const cat = categoriaDe(desc);
        const res = cat === 'essencia' ? resolver(desc, eq) : null;
        const padrao = nomeLimpo(desc, cat);
        const nome = res ? 'Essência ' + res.real : padrao;
        const sug = sugerir(res ? nome : desc, d.insumos);
        return aplicar({ desc, cat, padrao, equiv: res ? res.real : '', novoNome: nome, qCom: t(x, 'qCom'), tam: tamanho(desc), valor_total: t(x, 'vProd'), insumo_id: '', quantidade: t(x, 'qCom') }, sug || '__novo__');
      }),
    });
    ev.target.value = '';
  }
  async function lancarXml() {
    setMsgX(''); setErroX('');
    const linhas = xml.itens.filter((i) => i.insumo_id);
    if (!linhas.length) { setErroX('Escolha o item do sistema em pelo menos uma linha da nota.'); return; }
    const itens = [];
    let criados = 0;
    for (const i of linhas) {
      let id = i.insumo_id;
      if (id === '__novo__') {
        if (!i.novoNome.trim()) { setErroX('Informe o nome do novo item: ' + i.desc); return; }
        const r0 = await api('/api/insumos', 'POST', { nome: i.novoNome.trim(), categoria: i.cat, unidade: ML.includes(i.cat) ? 'ml' : 'un', reaproveitar: true });
        if (!r0.ok) { setErroX(r0.d.erro || 'Erro ao criar item.'); return; }
        id = String(r0.d.id);
        if (!r0.d.existente) criados++;
        // Lembra a equivalência quando o nome foi ajustado à mão (ex.: nome da nota -> fragrância real).
        if (i.cat === 'essencia' && i.novoNome.trim() !== i.padrao && !i.equiv) {
          const real = i.novoNome.trim().replace(/^ess[eê]ncia\s+/i, '');
          if (real && chaveEq(i.desc)) await api('/api/equivalencias', 'POST', { origem: i.desc, nome_real: real });
        }
      }
      itens.push({ insumo_id: id, quantidade: num(i.quantidade), valor_total: num(i.valor_total), obs: i.desc });
    }
    const r = await api('/api/compras', 'POST', { data: xml.data, fornecedor: xml.fornecedor, itens });
    if (!r.ok) { setErroX(r.d.erro || 'Erro'); return; }
    setMsgX(itens.length + ' item(ns) da nota lançados' + (criados ? ', com ' + criados + ' item(ns) novo(s) criado(s)' : '') + '. Veja em Compras recentes, mais abaixo.');
    setXml(null);
    carregar();
  }
  const setLinha = (k, campo, v) => setXml({ ...xml, itens: xml.itens.map((it, j) => (j === k ? (campo === 'insumo_id' ? aplicar(it, v) : { ...it, [campo]: v }) : it)) });
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
        <p className='aviso'>Vidro com válvula: se o vidro já vem com a válvula, lance só o vidro, com o valor total pago. Use o item Válvula apenas quando comprá-la separada.</p>
      </form>

      <div className='card'>
        <h2>Importar nota fiscal (XML)</h2>
        <p className='aviso'>Envie o arquivo XML da NF-e. Os itens, quantidades e valores são lidos sozinhos; você só diz a qual item do sistema cada linha corresponde.</p>
        <input type='file' accept='.xml,text/xml' onChange={lerXml} />
        {xml && (
          <>
            <p className='aviso'>Fornecedor: <b>{xml.fornecedor || '-'}</b> · Data da nota: <b>{dtBR(xml.data)}</b></p>
            <p className='aviso'>Para cada linha, confirme o item do sistema (já sugerimos quando o nome combina). Linhas em "Ignorar" não são lançadas. Quantidades de líquidos são convertidas para ml pelo tamanho do frasco (100 g conta como 100 ml).</p>
            {xml.itens.map((it, k) => {
              const novo = it.insumo_id === '__novo__';
              const ins = novo ? { unidade: ML.includes(it.cat) ? 'ml' : 'un' } : d.insumos.find((i) => String(i.id) === String(it.insumo_id));
              return (
                <div key={k} style={{ borderTop: '1px solid #332A15', paddingTop: 10, marginTop: 10 }}>
                  <p style={{ margin: '0 0 8px' }}><b>{it.desc}</b></p>
                  <label>Item no sistema</label>
                  <select value={it.insumo_id} onChange={(e) => setLinha(k, 'insumo_id', e.target.value)}><option value=''>Ignorar esta linha</option><option value='__novo__'>+ Criar item novo</option>{opcoes}</select>
                  {it.equiv && <p className='aviso'>Equivalência conhecida: esta linha é <b>{it.equiv}</b>.</p>}
                  {novo && <><label>Nome do novo item</label><input value={it.novoNome} onChange={(e) => setLinha(k, 'novoNome', e.target.value)} /></>}
                  <div className='linha'>
                    <div><label>Quantidade{ins ? ' (' + ins.unidade + ')' : ''}</label><input value={it.quantidade} inputMode='decimal' onChange={(e) => setLinha(k, 'quantidade', e.target.value)} /></div>
                    <div><label>Valor pago (R$)</label><input value={it.valor_total} inputMode='decimal' onChange={(e) => setLinha(k, 'valor_total', e.target.value)} /></div>
                  </div>
                  {ins && num(it.quantidade) > 0 && <p className='aviso'>Custo desta linha: {custoTxt(num(it.valor_total) / num(it.quantidade), ins.unidade)}{ins.unidade === 'ml' && it.tam ? ' · nota: ' + it.qCom + ' un × ' + it.tam + ' = ' + (num(it.qCom) * it.tam) : ''}</p>}
                </div>
              );
            })}
            {erroX && <p className='erro'>{erroX}</p>}
            <button type='button' className='btn' onClick={lancarXml}>Lançar itens escolhidos</button>
          </>
        )}
        {!xml && erroX && <p className='erro'>{erroX}</p>}
        {!xml && msgX && <p className='ok'>{msgX}</p>}
      </div>

      <form className='card' onSubmit={novoItem}>
        <h2>Cadastrar item</h2>
        <div className='linha'>
          <div style={{ flex: 2 }}><label>Nome</label><input value={n.nome} placeholder='Ex.: Essência Invictus, Vidro 50 ml, Etiqueta' onChange={(e) => setN({ ...n, nome: e.target.value })} /></div>
          <div><label>Tipo</label>
            <select value={n.categoria} onChange={(e) => setN({ ...n, categoria: e.target.value, unidade: ['essencia', 'fixador', 'veiculo'].includes(e.target.value) ? 'ml' : 'un' })}>
              {d.categorias.map((c) => <option key={c[0]} value={c[0]}>{c[1]}</option>)}
            </select></div>
          <div><label>Medida</label>
            <select value={n.unidade} onChange={(e) => setN({ ...n, unidade: e.target.value })}><option value='ml'>ml</option><option value='un'>unidade</option></select></div>
        </div>
        <button className='btn'>Cadastrar item</button>
        <p><button type='button' className='bs' onClick={sincronizar}>Cadastrar itens do catálogo (essências novas)</button></p>
        <p className='aviso'>Cria uma essência para cada fragrância do catálogo, além de fixador, veículo, rótulo, sacola, válvula (única, serve para todos os volumes) e vidro de 25, 50 e 60 ml. Itens que já existem não são duplicados.</p>
      </form>

      <div className='card'>
        <h2>Custo atual dos itens</h2>
        <div className='tabela'>
          <table>
            <thead><tr><th>Item</th><th>Comprado</th><th>Gasto</th><th>Custo médio</th><th>Última compra</th><th></th></tr></thead>
            <tbody>
              {d.insumos.map((i) => (
                <tr key={i.id}>
                  <td>{i.nome}</td><td>{fmtQ(i.qtd_comprada, i.unidade)}</td><td>{brl(i.gasto)}</td>
                  <td><b>{custoTxt(i.custo_medio, i.unidade)}</b></td>
                  <td>{i.ultima_compra ? dtBR(i.ultima_compra) + ' · ' + custoTxt(i.ultimo_custo, i.unidade) : '-'}</td>
                  <td>{ren && ren.id === i.id
                    ? <><input value={ren.nome} onChange={(e) => setRen({ id: i.id, nome: e.target.value })} /> <button type='button' className='bs' onClick={() => renomear(i)}>Salvar</button> <button type='button' className='bs' onClick={() => setRen(null)}>Cancelar</button></>
                    : <button type='button' className='bs' onClick={() => setRen({ id: i.id, nome: i.nome })}>Renomear</button>}</td>
                </tr>
              ))}
              {d.insumos.length === 0 && <tr><td colSpan={6}>Cadastre os itens que você compra para começar.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className='aviso'>Custo médio = total gasto ÷ total comprado. Cada nova compra atualiza o custo automaticamente.</p>
        <p className='aviso'>Renomear para um nome que já existe junta as compras no item existente (útil para corrigir nomes vindos da nota).</p>
      </div>

      <div className='card'>
        <h2>Equivalência de nomes (fornecedor → fragrância real)</h2>
        <p className='aviso'>Usada na importação do XML: quando a nota traz o nome da loja do fornecedor, o sistema já cria/usa a essência com o nome real. Itens novos que você renomear na importação são lembrados aqui.</p>
        <form onSubmit={salvarEq}>
          <div className='linha'>
            <div><label>Nome do fornecedor (como vem na nota)</label><input value={ne.origem} onChange={(e) => setNe({ ...ne, origem: e.target.value })} /></div>
            <div><label>Fragrância real</label><input value={ne.nome_real} onChange={(e) => setNe({ ...ne, nome_real: e.target.value })} /></div>
          </div>
          <button className='btn'>Salvar equivalência</button>
        </form>
        <div className='tabela'>
          <table>
            <thead><tr><th>Fornecedor</th><th>Fragrância real</th><th></th></tr></thead>
            <tbody>
              {eq.map((e) => (
                <tr key={e.chave}><td>{e.origem}</td><td>{e.nome_real}</td><td><button type='button' className='bs' onClick={() => apagarEq(e)}>Remover</button></td></tr>
              ))}
              {eq.length === 0 && <tr><td colSpan={3}>Nenhuma equivalência cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
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
