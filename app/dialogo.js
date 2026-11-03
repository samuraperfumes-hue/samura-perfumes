'use client';
import { useEffect, useRef, useState } from 'react';

// Caixas de diálogo no visual do sistema (substituem alert/confirm/prompt do navegador).
let abrir = null;
let alertaNativo = null;

function pedir(item) {
  return new Promise((resolve) => {
    if (abrir) { abrir({ ...item, resolve }); return; }
    if (item.tipo === 'aviso') { (alertaNativo || window.alert).call(window, item.msg); resolve(true); }
    else if (item.tipo === 'confirma') resolve(window.confirm(item.msg));
    else resolve(window.prompt(item.msg, item.inicial));
  });
}
export const avisar = (msg, o = {}) => pedir({ tipo: 'aviso', msg: String(msg || ''), ...o });
export const confirmar = (msg, o = {}) => pedir({ tipo: 'confirma', msg: String(msg || ''), ...o });
export const perguntar = (msg, inicial = '', o = {}) => pedir({ tipo: 'pergunta', msg: String(msg || ''), inicial: inicial == null ? '' : String(inicial), ...o });

const fundo = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const caixa = { width: '100%', maxWidth: 420, margin: 0, boxShadow: '0 10px 30px rgba(0,0,0,0.9)' };

export default function Dialogos() {
  const [fila, setFila] = useState([]);
  const [valor, setValor] = useState('');
  const campo = useRef(null);
  const atual = fila[0];

  useEffect(() => {
    abrir = (item) => setFila((f) => [...f, item]);
    // Telas que ainda usam o alert() do navegador passam a mostrar o aviso no visual do sistema.
    alertaNativo = window.alert;
    window.alert = (m) => { avisar(m); };
    return () => { abrir = null; if (alertaNativo) window.alert = alertaNativo; alertaNativo = null; };
  }, []);
  useEffect(() => {
    if (!atual) return;
    setValor(atual.inicial || '');
    setTimeout(() => campo.current && campo.current.focus(), 30);
  }, [atual]);

  if (!atual) return null;
  const fechar = (res) => { atual.resolve(res); setFila((f) => f.slice(1)); };
  const ok = () => fechar(atual.tipo === 'pergunta' ? valor : true);
  const cancelar = () => fechar(atual.tipo === 'pergunta' ? null : false);
  const tecla = (e) => { if (e.key === 'Escape') cancelar(); if (e.key === 'Enter' && atual.tipo === 'pergunta') ok(); };
  const titulo = atual.titulo || (atual.tipo === 'aviso' ? 'Aviso' : atual.tipo === 'confirma' ? 'Confirmar' : 'Informe');

  return (
    <div style={fundo} onKeyDown={tecla} onClick={(e) => { if (e.target === e.currentTarget && atual.tipo !== 'aviso') cancelar(); }}>
      <div className='card' style={caixa} role='dialog' aria-modal='true'>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>{titulo}</h2>
        <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 16px', lineHeight: 1.5 }}>{atual.msg}</p>
        {atual.tipo === 'pergunta' && <input ref={campo} value={valor} inputMode={atual.numero ? 'decimal' : undefined} onChange={(e) => setValor(e.target.value)} />}
        <div style={{ display: 'flex', gap: 10 }}>
          {atual.tipo !== 'aviso' && <button type='button' className='bs' style={{ flex: 1, padding: 12, fontSize: 13, margin: 0 }} onClick={cancelar}>{atual.cancelar || 'Cancelar'}</button>}
          <button type='button' ref={atual.tipo === 'pergunta' ? undefined : campo} className='btn' style={{ flex: 1, ...(atual.perigo ? { background: '#d4707f', color: '#fff' } : {}) }} onClick={ok}>{atual.ok || (atual.tipo === 'aviso' ? 'Entendi' : 'OK')}</button>
        </div>
      </div>
    </div>
  );
}
