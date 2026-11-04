'use client';
import { useEffect, useState } from 'react';
import { api } from '../util';

const PRAZOS = [
  ['cobranca_atraso', 'Cobrança aparece no aviso depois de quantos dias de atraso', '0 = no próprio dia do vencimento.'],
  ['pausa_cobranca', 'Depois de cobrar, esperar quantos dias para avisar de novo', 'Enquanto isso, o cliente some da lista de vencidos.'],
  ['resgate_dias', 'Cliente entra no resgate depois de quantos dias sem comprar', '0 = não mostrar resgate no aviso.'],
  ['pausa_resgate', 'Depois do resgate ou aviso de desconto, esperar quantos dias', 'Vale para as mensagens de resgate e de desconto.'],
];
const soPrazos = (d) => Object.fromEntries(PRAZOS.map(([k]) => [k, String(d[k] ?? '')]));

const formata = (z) => {
  const d = String(z || '').replace(/^55/, '');
  return d.length === 11 ? d.slice(0, 2) + ' ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6) : d;
};

export default function Tela() {
  const [f, setF] = useState(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [msgP, setMsgP] = useState('');
  const [erroP, setErroP] = useState('');

  useEffect(() => {
    api('/api/config', 'GET').then((r) => { if (r.ok) setF({ whatsapp: formata(r.d.whatsapp), pix: r.d.pix, ...soPrazos(r.d) }); else setErro(r.d.erro || 'Erro ao carregar.'); });
  }, []);

  async function salvar(e) {
    e.preventDefault(); setErro(''); setMsg('');
    const r = await api('/api/config', 'POST', f);
    if (!r.ok) { setErro(r.d.erro || 'Erro ao salvar.'); return; }
    setF({ whatsapp: formata(r.d.whatsapp), pix: r.d.pix, ...soPrazos(r.d) });
    setMsg('Configurações salvas.');
  }

  async function salvarPrazos(e) {
    e.preventDefault(); setErroP(''); setMsgP('');
    const r = await api('/api/config', 'POST', f);
    if (!r.ok) { setErroP(r.d.erro || 'Erro ao salvar.'); return; }
    setF({ whatsapp: formata(r.d.whatsapp), pix: r.d.pix, ...soPrazos(r.d) });
    setMsgP('Prazos salvos. Valem a partir do próximo aviso.');
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
      <form className='card' onSubmit={salvarPrazos}>
        <h2>Prazos dos avisos (em dias)</h2>
        <p className='aviso'>Controlam o que aparece no 🔔 e no aviso que abre uma vez por dia.</p>
        {PRAZOS.map(([k, rot, dica]) => (
          <div key={k}>
            <label>{rot}</label>
            <input value={f[k]} inputMode='numeric' style={{ maxWidth: 120 }} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} />
            <p className='aviso'>{dica}</p>
          </div>
        ))}
        {erroP && <p className='erro'>{erroP}</p>}
        {msgP && <p className='ok'>{msgP}</p>}
        <button className='btn'>Salvar prazos</button>
      </form>
      <div className='card'>
        <h2>Cópia de segurança</h2>
        <p>Baixa um arquivo com todos os dados do sistema: vendas, clientes, estoque, pagamentos, comissões e catálogo.</p>
        <p><a className='btn' style={{ display: 'inline-block', textDecoration: 'none' }} href='/api/backup'>Baixar backup</a></p>
        <p className='aviso'>Faça uma vez por semana e guarde o arquivo no Google Drive ou no e-mail. Ele tem os dados e telefones dos clientes, então não compartilhe.</p>
      </div>
    </>
  );
}
