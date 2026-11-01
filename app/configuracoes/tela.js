'use client';
import { useEffect, useState } from 'react';
import { api } from '../util';

const formata = (z) => {
  const d = String(z || '').replace(/^55/, '');
  return d.length === 11 ? d.slice(0, 2) + ' ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6) : d;
};

export default function Tela() {
  const [f, setF] = useState(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/config', 'GET').then((r) => { if (r.ok) setF({ whatsapp: formata(r.d.whatsapp), pix: r.d.pix }); else setErro(r.d.erro || 'Erro ao carregar.'); });
  }, []);

  async function salvar(e) {
    e.preventDefault(); setErro(''); setMsg('');
    const r = await api('/api/config', 'POST', f);
    if (!r.ok) { setErro(r.d.erro || 'Erro ao salvar.'); return; }
    setF({ whatsapp: formata(r.d.whatsapp), pix: r.d.pix });
    setMsg('Configurações salvas.');
  }

  if (!f) return <div className='card'><p>{erro || 'Carregando...'}</p></div>;
  return (
    <>
      <h1>Configurações</h1>
      <form className='card' onSubmit={salvar}>
        <h2>Contato e Pix</h2>
        <label>WhatsApp da Samura (com DDD)</label>
        <input value={f.whatsapp} inputMode='tel' onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder='21 99999-9999' />
        <p className='aviso'>É o número que recebe os pedidos do botão "Pedir no WhatsApp" da página de fragrâncias.</p>
        <label>Chave Pix</label>
        <input value={f.pix} onChange={(e) => setF({ ...f, pix: e.target.value })} placeholder='Telefone, e-mail, CPF/CNPJ ou chave aleatória' />
        <p className='aviso'>Aparece nas mensagens de cobrança enviadas pelo WhatsApp (botão Cobrança, em Vendas).</p>
        {erro && <p className='erro'>{erro}</p>}
        {msg && <p className='ok'>{msg}</p>}
        <button className='btn'>Salvar</button>
      </form>
    </>
  );
}
