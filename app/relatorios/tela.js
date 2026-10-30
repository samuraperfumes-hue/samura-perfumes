'use client';
import { useEffect, useState } from 'react';
import { api, brl, hojeISO } from '../util';

const dia = (k) => new Date(Date.now() - new Date().getTimezoneOffset() * 60000 - k * 86400000).toISOString().slice(0, 10);
const nomeMes = (m) => { const [a, n] = m.split('-'); return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(n) - 1] + '/' + a.slice(2); };

function Barras({ dados, valor, rotulo, fmt }) {
  const max = Math.max(1, ...dados.map(valor));
  return (
    <div>
      {dados.map((d, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
            <span>{rotulo(d)}</span><b>{fmt(d)}</b>
          </div>
          <div style={{ background: '#1f1f1f', borderRadius: 3, height: 8 }}>
            <div style={{ width: Math.max(2, (valor(d) / max) * 100) + '%', height: 8, borderRadius: 3, background: 'linear-gradient(90deg, #AA7C11, #D4AF37)' }} />
          </div>
        </div>
      ))}
      {dados.length === 0 && <p className='aviso'>Sem vendas no período.</p>}
    </div>
  );
}

export default function Tela({ admin }) {
  const [de, setDe] = useState(dia(89));
  const [ate, setAte] = useState(hojeISO());
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar(a, b) {
    setErro('');
    const r = await api('/api/relatorios?de=' + a + '&ate=' + b, 'GET');
    if (!r.ok) { setErro(r.d.erro || 'Erro ao carregar.'); return; }
    setD(r.d);
  }
  useEffect(() => { carregar(de, ate); }, []);
  function atalho(a, b) { setDe(a); setAte(b); carregar(a, b); }

  const t = d && d.totais;
  const ticket = t && t.vendas ? t.faturamento / t.vendas : 0;
  const maxMes = d ? Math.max(1, ...d.meses.map((m) => m.faturamento)) : 1;

  return (
    <>
      <div className='card'>
        <h2>{admin ? 'Resumo das vendas' : 'Resumo das minhas vendas'}</h2>
        <div className='linha'>
          <div><label>De</label><input type='date' value={de} onChange={(e) => setDe(e.target.value)} /></div>
          <div><label>Até</label><input type='date' value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          <div style={{ flex: 0 }}><label>&nbsp;</label><button type='button' className='bs' onClick={() => carregar(de, ate)}>Atualizar</button></div>
        </div>
        <p>
          <button type='button' className='bs' onClick={() => atalho(dia(29), hojeISO())}>30 dias</button>
          <button type='button' className='bs' onClick={() => atalho(dia(89), hojeISO())}>90 dias</button>
          <button type='button' className='bs' onClick={() => atalho(hojeISO().slice(0, 4) + '-01-01', hojeISO())}>Este ano</button>
          <button type='button' className='bs' onClick={() => atalho('2000-01-01', '2999-12-31')}>Tudo</button>
        </p>
        {erro && <p className='erro'>{erro}</p>}
        {t && (
          <div className='linha'>
            <div><label>Faturamento</label><p style={{ fontSize: 22, margin: 0, color: '#D4AF37' }}><b>{brl(t.faturamento)}</b></p></div>
            <div><label>Vendas</label><p style={{ fontSize: 22, margin: 0 }}><b>{t.vendas}</b></p></div>
            <div><label>Unidades</label><p style={{ fontSize: 22, margin: 0 }}><b>{t.itens}</b></p></div>
            <div><label>Ticket médio</label><p style={{ fontSize: 22, margin: 0 }}><b>{brl(ticket)}</b></p></div>
            <div><label>A receber</label><p style={{ fontSize: 22, margin: 0, color: '#d4707f' }}><b>{brl(t.a_receber)}</b></p></div>
          </div>
        )}
        <p className='aviso'>Vendas canceladas não entram. O faturamento é o valor líquido das vendas (já com desconto); "A receber" é o saldo ainda não pago dessas vendas.</p>
      </div>

      {d && (
        <>
          <div className='card'>
            <h2>Fragrâncias mais vendidas</h2>
            <Barras dados={d.fragrancias} valor={(x) => x.qtd} rotulo={(x) => x.nome} fmt={(x) => x.qtd + ' un · ' + brl(x.receita)} />
            <p className='aviso'>Receita por fragrância = quantidade × preço de cada item, antes do desconto da venda.</p>
          </div>

          {admin && (
            <div className='card'>
              <h2>Vendas por vendedor</h2>
              <Barras dados={d.vendedores} valor={(x) => x.faturamento} rotulo={(x) => x.nome} fmt={(x) => brl(x.faturamento) + ' · ' + x.vendas + ' venda(s)'} />
            </div>
          )}

          <div className='card'>
            <h2>Faturamento por mês</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 170, overflowX: 'auto' }}>
              {d.meses.map((m) => (
                <div key={m.mes} style={{ flex: '1 0 44px', textAlign: 'center', fontSize: 11 }}>
                  <div style={{ color: '#c5a059' }}>{brl(m.faturamento).replace('R$ ', '')}</div>
                  <div style={{ height: Math.max(3, (m.faturamento / maxMes) * 120), background: 'linear-gradient(180deg, #D4AF37, #AA7C11)', borderRadius: '3px 3px 0 0', marginTop: 2 }} />
                  <div style={{ marginTop: 4 }}>{nomeMes(m.mes)}</div>
                </div>
              ))}
              {d.meses.length === 0 && <p className='aviso'>Sem vendas no período.</p>}
            </div>
          </div>

          <div className='card'>
            <h2>Volumes e tipos mais vendidos</h2>
            <Barras dados={d.volumes} valor={(x) => x.qtd} rotulo={(x) => x.nome} fmt={(x) => x.qtd + ' un'} />
          </div>

          <div className='card'>
            <h2>Melhores clientes</h2>
            <Barras dados={d.clientes} valor={(x) => x.faturamento} rotulo={(x) => x.nome} fmt={(x) => brl(x.faturamento) + ' · ' + x.vendas + ' compra(s)'} />
          </div>
        </>
      )}
    </>
  );
}
