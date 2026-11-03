'use client';
import { useEffect, useState } from 'react';
import { linkZap, registrar, textoCobranca, textoDesconto, textoConvite } from './mensagens';

const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
const dtBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '-');
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const atraso = (d) => Math.max(0, Math.floor((new Date(hoje() + 'T12:00:00') - new Date(String(d).slice(0, 10) + 'T12:00:00')) / 86400000));
const CHAVE = 'samura-avisos-vistos';

const fundo = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 900, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' };
const caixa = { width: '100%', maxWidth: 520, margin: 0, boxShadow: '0 10px 30px rgba(0,0,0,0.9)' };
const linha = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #2a2a2a' };
const botao = { display: 'inline-block', whiteSpace: 'nowrap', textDecoration: 'none' };

// Pop-up de avisos: pagamentos vencidos, descontos para avisar e indicações aguardando convite.
// Abre sozinho uma vez por dia; o sino reabre quando quiser.
export default function Alertas() {
  const [d, setD] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [pix, setPix] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/alertas').then((r) => (r.ok ? r.json() : null)), fetch('/api/config').then((r) => (r.ok ? r.json() : {}))])
      .then(([a, c]) => {
        if (!a) return;
        setD(a);
        setPix((c && c.pix) || '');
        const total = a.vencidos.length + a.descontos.length + a.indicacoes.length;
        let visto = '';
        try { visto = localStorage.getItem(CHAVE) || ''; } catch {}
        if (total > 0 && visto !== hoje()) setAberto(true);
      })
      .catch(() => {});
  }, []);

  if (!d) return null;
  const total = d.vencidos.length + d.descontos.length + d.indicacoes.length;
  if (!total) return null;
  const fechar = () => { setAberto(false); try { localStorage.setItem(CHAVE, hoje()); } catch {} };
  const tirar = (lista, chave, valor) => setD((x) => ({ ...x, [lista]: x[lista].filter((i) => i[chave] !== valor) }));

  return (
    <>
      <button type='button' className='bs' title='Avisos' onClick={() => setAberto(true)} style={{ margin: 0 }}>🔔 {total}</button>
      {aberto && (
        <div style={fundo} onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
          <div className='card' style={caixa} role='dialog' aria-modal='true'>
            <h2 style={{ fontSize: 19, marginBottom: 6 }}>Avisos de hoje</h2>
            <p className='aviso' style={{ marginTop: 0 }}>Quem recebeu mensagem nos últimos 7 dias não aparece aqui, para você não repetir o envio.</p>

            {d.vencidos.length > 0 && <>
              <h3 style={{ color: '#D4AF37', fontSize: 14, margin: '16px 0 4px' }}>💰 Pagamentos vencidos ({d.vencidos.length})</h3>
              {d.vencidos.map((p) => {
                const zap = linkZap(p.telefone, textoCobranca(p.cliente, pix));
                const dias = atraso(p.data_prevista);
                return (
                  <div key={p.id} style={linha}>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <b style={{ color: '#fff' }}>{p.cliente}</b> · {brl(p.valor)}
                      <div className='aviso' style={{ fontSize: 12 }}>{p.codigo} · venceu {dtBR(p.data_prevista)}{dias ? ' (há ' + dias + (dias === 1 ? ' dia)' : ' dias)') : ' (hoje)'}{p.vendedor ? ' · ' + p.vendedor : ''}</div>
                    </div>
                    {zap ? <a className='bs' style={botao} href={zap} target='_blank' rel='noreferrer' onClick={() => { registrar(p.cliente_id, 'cobranca', p.venda_id); tirar('vencidos', 'cliente_id', p.cliente_id); }}>Cobrar</a> : <span className='aviso' style={{ fontSize: 12 }}>sem WhatsApp</span>}
                  </div>
                );
              })}
            </>}

            {d.descontos.length > 0 && <>
              <h3 style={{ color: '#D4AF37', fontSize: 14, margin: '16px 0 4px' }}>🎁 Descontos para avisar ({d.descontos.length})</h3>
              {d.descontos.map((k) => {
                const zap = linkZap(k.telefone, textoDesconto(k.cliente, k.pct, k.validade, k.origem_nome));
                return (
                  <div key={k.id} style={linha}>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <b style={{ color: '#fff' }}>{k.cliente}</b> · {Number(k.pct)}%
                      <div className='aviso' style={{ fontSize: 12 }}>Indicou {k.origem_nome || 'um amigo'}{k.validade ? ' · vale até ' + dtBR(k.validade) : ''}</div>
                    </div>
                    {zap ? <a className='bs' style={botao} href={zap} target='_blank' rel='noreferrer' onClick={() => { registrar(k.cliente_id, 'desconto'); tirar('descontos', 'id', k.id); }}>Avisar</a> : <span className='aviso' style={{ fontSize: 12 }}>sem WhatsApp</span>}
                  </div>
                );
              })}
            </>}

            {d.indicacoes.length > 0 && <>
              <h3 style={{ color: '#D4AF37', fontSize: 14, margin: '16px 0 4px' }}>💛 Indicações aguardando convite ({d.indicacoes.length})</h3>
              {d.indicacoes.map((c) => {
                const zap = linkZap(c.telefone, textoConvite(c.cliente, c.indicado_por));
                return (
                  <div key={c.cliente_id} style={linha}>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <b style={{ color: '#fff' }}>{c.cliente}</b>
                      <div className='aviso' style={{ fontSize: 12 }}>Indicação de {c.indicado_por || '—'}</div>
                    </div>
                    {zap ? <a className='bs' style={botao} href={zap} target='_blank' rel='noreferrer' onClick={() => { registrar(c.cliente_id, 'convite'); tirar('indicacoes', 'cliente_id', c.cliente_id); }}>Convite</a> : <span className='aviso' style={{ fontSize: 12 }}>sem WhatsApp</span>}
                  </div>
                );
              })}
            </>}

            <button type='button' className='btn' style={{ marginTop: 18 }} onClick={fechar}>Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}
