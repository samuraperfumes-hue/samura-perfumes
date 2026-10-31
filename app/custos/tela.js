'use client';
import { useEffect, useState } from 'react';
import { api, brl } from '../util';

const num = (v) => Number(String(v).replace(',', '.'));
const pct = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + '%';

export default function Tela() {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [ed, setEd] = useState(null); // { fid, itens: [{insumo_id, pct}] }
  const [cfg, setCfg] = useState(null);

  async function carregar() {
    const r = await api('/api/custos', 'GET');
    if (!r.ok) { setErro(r.d.erro || 'Erro ao carregar.'); return; }
    setD(r.d);
    setCfg({ valvula_separada: r.d.config.valvula_separada, rotulo_padrao: String(r.d.config.rotulo_padrao), sacola_padrao: String(r.d.config.sacola_padrao) });
  }
  useEffect(() => { carregar(); }, []);

  async function salvarReceita() {
    setErro(''); setMsg('');
    const r = await api('/api/custos', 'POST', { acao: 'receita', fragrancia_id: ed.fid, itens: ed.itens.filter((x) => x.insumo_id) });
    if (!r.ok) { setErro(r.d.erro || 'Erro ao salvar.'); return; }
    setEd(null); setMsg('Receita salva.'); carregar();
  }
  async function salvarCfg() {
    setErro(''); setMsg('');
    const r = await api('/api/custos', 'POST', { acao: 'config', ...cfg });
    if (!r.ok) { setErro(r.d.erro || 'Erro ao salvar.'); return; }
    setMsg('Configuração salva.'); carregar();
  }

  if (!d) return <div className='card'><p>{erro || 'Carregando...'}</p></div>;
  const soma = ed ? ed.itens.reduce((t, x) => t + (num(x.ml) || 0), 0) : 0;
  const mudar = (i, campo, v) => setEd({ ...ed, itens: ed.itens.map((x, k) => (k === i ? { ...x, [campo]: v } : x)) });

  return (
    <>
      <h1>Custos e margem</h1>
      {erro && <p className='erro'>{erro}</p>}
      {msg && <p className='ok'>{msg}</p>}

      <div className='card'>
        <h2>Configuração</h2>
        <div className='linha'>
          <div><label>Rótulo (R$, se não houver compra)</label><input value={cfg.rotulo_padrao} inputMode='decimal' onChange={(e) => setCfg({ ...cfg, rotulo_padrao: e.target.value })} /></div>
          <div><label>Sacola (R$, se não houver compra)</label><input value={cfg.sacola_padrao} inputMode='decimal' onChange={(e) => setCfg({ ...cfg, sacola_padrao: e.target.value })} /></div>
          <div><label>Válvula comprada separada?</label>
            <select value={cfg.valvula_separada ? '1' : '0'} onChange={(e) => setCfg({ ...cfg, valvula_separada: e.target.value === '1' })}>
              <option value='0'>Não (vem com o vidro)</option><option value='1'>Sim (somar o custo)</option>
            </select></div>
        </div>
        <button type='button' className='btn' onClick={salvarCfg}>Salvar configuração</button>
        <p className='aviso'>Se você lançou compras de Rótulo ou Sacola em Compras, o custo médio delas é usado no lugar destes valores.</p>
      </div>

      {d.fragrancias.length === 0 && <div className='card'><p>Cadastre fragrâncias no catálogo e as compras de insumos para ver os custos.</p></div>}

      {d.fragrancias.map((f) => (
        <div className='card' key={f.id}>
          <h2>{f.nome}</h2>
          {ed && ed.fid === f.id ? (
            <>
              {ed.itens.map((x, i) => (
                <div className='linha' key={i}>
                  <div style={{ flex: 3 }}><label>Essência / fixador / veículo</label>
                    <select value={x.insumo_id} onChange={(e) => mudar(i, 'insumo_id', e.target.value)}>
                      <option value=''>Escolha...</option>
                      {d.insumos.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select></div>
                  <div><label>ml no lote</label><input value={x.ml} inputMode='decimal' onChange={(e) => mudar(i, 'ml', e.target.value)} /></div>
                  <div><button type='button' className='bs' onClick={() => setEd({ ...ed, itens: ed.itens.filter((_, k) => k !== i) })}>Remover</button></div>
                </div>
              ))}
              <p><button type='button' className='bs' onClick={() => setEd({ ...ed, itens: [...ed.itens, { insumo_id: '', ml: '' }] })}>+ Adicionar item</button></p>
              <p className='aviso'>Lote total: {Number(soma).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ml. Informe as quantidades de um lote qualquer (ex.: 300 ml); o sistema usa só a proporção, então vale para qualquer tamanho de lote.</p>
              <button type='button' className='btn' onClick={salvarReceita}>Salvar receita</button>{' '}
              <button type='button' className='bs' onClick={() => setEd(null)}>Cancelar</button>
            </>
          ) : (
            <>
              <p>{f.itens.length
                ? f.itens.map((x) => x.nome + ' ' + Number(x.ml ?? x.pct).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' ml (' + pct(x.pct) + ')').join(' + ') + (f.pct_veiculo ? ' + Veículo (restante) ' + pct(f.pct_veiculo) : '')
                : 'Receita ainda não definida.'}</p>
              <button type='button' className='bs' onClick={() => setEd({ fid: f.id, itens: f.itens.length ? f.itens.map((x) => ({ insumo_id: String(x.insumo_id), ml: String(x.ml ?? x.pct) })) : [{ insumo_id: '', ml: '' }] })}>Editar receita</button>
            </>
          )}
          {f.apresentacoes.length > 0 && (
            <div className='tabela'>
              <table>
                <thead><tr><th>Frasco</th><th>Líquido</th><th>Vidro</th><th>Válvula</th><th>Rótulo</th><th>Sacola</th><th>Custo</th><th>Preço</th><th>Lucro</th><th>Margem</th></tr></thead>
                <tbody>
                  {f.apresentacoes.map((a) => (
                    <tr key={a.id}>
                      <td>{a.volume}</td><td>{brl(a.custo.liquido)}</td><td>{brl(a.custo.vidro)}</td><td>{brl(a.custo.valvula)}</td><td>{brl(a.custo.rotulo)}</td><td>{brl(a.custo.sacola)}</td>
                      <td><b>{brl(a.custo.total)}</b></td><td>{brl(a.preco)}</td>
                      <td>{a.completo ? <b>{brl(a.lucro)}</b> : <span title={a.falta.join(', ')}>~{brl(a.lucro)}</span>}</td>
                      <td>{a.margem == null ? '-' : a.margem + '%'}{!a.completo && ' ⚠'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {f.apresentacoes.some((a) => !a.completo) && <p className='aviso'>⚠ Valores aproximados. Falta: {[...new Set(f.apresentacoes.flatMap((a) => a.falta))].join(', ')}.</p>}
            </div>
          )}
        </div>
      ))}
      <p className='aviso'>Custo do frasco = volume × custo por ml do lote (soma dos ml de cada item × custo médio ÷ ml total do lote) + vidro + válvula (se separada) + rótulo + sacola. O custo vem das compras lançadas em Compras.</p>
    </>
  );
}
