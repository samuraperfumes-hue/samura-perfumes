'use client';
import { useEffect, useState } from 'react';
import { api, brl } from '../util';

const pct = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
const mlTxt = (v) => (v == null ? '-' : brl(v) + '/ml');

export default function Tela() {
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');

  async function carregar() {
    const r = await api('/api/custos', 'GET');
    if (!r.ok) { setErro(r.d.erro || 'Erro ao carregar.'); return; }
    setD(r.d);
    const c = r.d.config;
    setF({ partes_essencia: String(c.partes_essencia), partes_veiculo: String(c.partes_veiculo), fixador_pct: String(c.fixador_pct), comissao_pct: String(c.comissao_pct), essencia_ref: String(c.essencia_ref), rotulo_padrao: String(c.rotulo_padrao), sacola_padrao: String(c.sacola_padrao), valvula_separada: c.valvula_separada });
  }
  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault(); setErro(''); setMsg('');
    const r = await api('/api/custos', 'POST', { acao: 'config', ...f });
    if (!r.ok) { setErro(r.d.erro || 'Erro ao salvar.'); return; }
    setMsg('Receita padrão salva.'); carregar();
  }

  if (!d || !f) return <div className='card'><p>{erro || 'Carregando...'}</p></div>;
  const set = (k, v) => setF({ ...f, [k]: v });
  const todasFaltas = [...d.falta, ...d.volumes.flatMap((v) => v.falta)];

  return (
    <>
      <h1>Custos e lucro</h1>
      {erro && <p className='erro'>{erro}</p>}
      {msg && <p className='ok'>{msg}</p>}

      <div className='card'>
        <h2>Por volume (receita padrão, comissão de {pct(d.config.comissao_pct)})</h2>
        {d.volumes.length === 0 && <p>Cadastre apresentações de perfume no catálogo para ver os valores.</p>}
        <div className='linha'>
          {d.volumes.map((v) => (
            <div key={v.ml} className='card' style={{ flex: 1, minWidth: 180, margin: 0 }}>
              <h3 style={{ margin: '0 0 8px' }}>{v.ml} ml</h3>
              <p style={{ margin: '2px 0' }}>Preço de venda: <b>{brl(v.preco)}</b>{v.preco_min !== v.preco_max ? ' (varia de ' + brl(v.preco_min) + ' a ' + brl(v.preco_max) + ')' : ''}</p>
              <p style={{ margin: '2px 0' }}>Custo do frasco: <b>{brl(v.custo)}</b></p>
              <p style={{ margin: '2px 0' }}>Comissão: <b>{brl(v.comissao)}</b></p>
              <p style={{ margin: '8px 0 2px', fontSize: '1.15em' }}>Lucro: <b>{brl(v.lucro)}</b></p>
              <p style={{ margin: '2px 0' }}>Margem: <b>{v.margem == null ? '-' : pct(v.margem)}</b></p>
            </div>
          ))}
        </div>
        {todasFaltas.length > 0 && <p className='aviso'>⚠ Valores aproximados. Falta: {[...new Set(todasFaltas)].join(', ')}.</p>}
      </div>

      <div className='card'>
        <h2>Composição do custo</h2>
        <div className='tabela'>
          <table>
            <thead><tr><th>Frasco</th><th>Líquido</th><th>Vidro</th><th>Válvula</th><th>Rótulo</th><th>Sacola</th><th>Custo</th><th>Preço</th><th>Comissão</th><th>Lucro</th></tr></thead>
            <tbody>
              {d.volumes.map((v) => (
                <tr key={v.ml}>
                  <td>{v.ml} ml</td><td>{brl(v.liquido)}</td><td>{brl(v.vidro)}</td><td>{brl(v.valvula)}</td><td>{brl(v.rotulo)}</td><td>{brl(v.sacola)}</td>
                  <td><b>{brl(v.custo)}</b></td><td>{brl(v.preco)}</td><td>{brl(v.comissao)}</td><td><b>{brl(v.lucro)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className='aviso'>Mistura: essência {pct(d.pct.essencia)} ({mlTxt(d.custo_ml.essencia)}) + veículo {pct(d.pct.veiculo)} ({mlTxt(d.custo_ml.veiculo)}) + fixador {pct(d.pct.fixador)} ({mlTxt(d.custo_ml.fixador)}) = {brl(d.custo_ml.mistura)} por ml.</p>
      </div>

      <form className='card' onSubmit={salvar}>
        <h2>Receita padrão</h2>
        <div className='linha'>
          <div><label>Partes de essência</label><input value={f.partes_essencia} inputMode='decimal' onChange={(e) => set('partes_essencia', e.target.value)} /></div>
          <div><label>Partes de veículo</label><input value={f.partes_veiculo} inputMode='decimal' onChange={(e) => set('partes_veiculo', e.target.value)} /></div>
          <div><label>Fixador (% do total)</label><input value={f.fixador_pct} inputMode='decimal' onChange={(e) => set('fixador_pct', e.target.value)} /></div>
          <div><label>Comissão (%)</label><input value={f.comissao_pct} inputMode='decimal' onChange={(e) => set('comissao_pct', e.target.value)} /></div>
        </div>
        <div className='linha'>
          <div style={{ flex: 2 }}><label>Custo da essência usado</label>
            <select value={f.essencia_ref} onChange={(e) => set('essencia_ref', e.target.value)}>
              <option value='media'>Média de todas as essências compradas</option>
              {d.essencias.filter((x) => x.custo != null).map((x) => <option key={x.id} value={x.id}>{x.nome} ({mlTxt(x.custo)})</option>)}
            </select></div>
          <div><label>Rótulo (R$, sem compra)</label><input value={f.rotulo_padrao} inputMode='decimal' onChange={(e) => set('rotulo_padrao', e.target.value)} /></div>
          <div><label>Sacola (R$, sem compra)</label><input value={f.sacola_padrao} inputMode='decimal' onChange={(e) => set('sacola_padrao', e.target.value)} /></div>
          <div><label>Válvula comprada separada?</label>
            <select value={f.valvula_separada ? '1' : '0'} onChange={(e) => set('valvula_separada', e.target.value === '1')}>
              <option value='0'>Não (vem com o vidro)</option><option value='1'>Sim (somar o custo)</option>
            </select></div>
        </div>
        <button className='btn'>Salvar</button>
        <p className='aviso'>Exemplo: 1 parte de essência, 2 de veículo e 2% de fixador = fixador 2%, essência {pct(98 / 3)} e veículo {pct((98 * 2) / 3)} do frasco. Para ver uma essência mais cara (como Gold), escolha-a em "Custo da essência usado".</p>
        <p className='aviso'>Veículo e fixador usam o custo médio de todos os itens dessa categoria lançados em Compras. Vidro, rótulo e sacola também.</p>
      </form>
    </>
  );
}
