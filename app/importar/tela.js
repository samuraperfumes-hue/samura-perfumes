'use client';
import { useState } from 'react';
import { api, brl } from '../util';

export default function Tela() {
  const [vendas, setVendas] = useState('');
  const [clientes, setClientes] = useState('');
  const [vend, setVend] = useState('');
  const [eu, setEu] = useState('RODRIGO');
  const [semCom, setSemCom] = useState(true);
  const [res, setRes] = useState(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [manut, setManut] = useState('');

  const corpo = (acao, extra) => ({ acao, vendas, clientes, vendedores: vend, eu, semComissaoAdmin: semCom, ...extra });

  async function previa() {
    setErro(''); setOk(''); setBusy(true);
    const r = await api('/api/importar', 'POST', corpo('previa'));
    setBusy(false);
    if (!r.ok) { setErro(r.d.erro || 'Erro'); return; }
    setRes(r.d);
  }

  async function importar() {
    setErro(''); setOk(''); setBusy(true);
    let feitas = 0;
    let restantes = 1;
    while (restantes > 0) {
      let r;
      let d = {};
      try {
        r = await fetch('/api/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo('importar', { limite: 20 })) });
        d = await r.json();
      } catch (e) {
        setErro('A importação foi interrompida' + (r ? ' (código ' + r.status + ')' : '') + '. Vendas importadas até aqui: ' + feitas + '. Clique em Ver prévia e confirme de novo: as já importadas são puladas.');
        setBusy(false);
        return;
      }
      if (!r.ok) { setErro((d.erro || 'Falha') + ' Vendas importadas até aqui: ' + feitas + '.'); setBusy(false); return; }
      feitas += d.importadas;
      restantes = d.restantes;
      setOk('Importando... ' + feitas + ' venda(s) feita(s), ' + restantes + ' restante(s).');
      if (d.importadas === 0) break;
    }
    setOk('Importação concluída: ' + feitas + ' venda(s) importada(s). Confira nas telas Vendas, Agenda e Comissões.');
    setRes(null);
    setBusy(false);
  }

  async function renumerar() {
    if (!confirm('Renumerar os códigos de todas as vendas em ordem de data (VND-0001, VND-0002...)? Os códigos antigos deixam de valer.')) return;
    setManut('');
    const r = await api('/api/vendas/renumerar', 'POST');
    setManut(r.ok ? 'Códigos renumerados: ' + r.d.total + ' venda(s).' : r.d.erro || 'Erro');
  }

  return (
    <>
      <div className='card'>
        <h2>Importar da planilha</h2>
        <p className='aviso'>Na planilha, abra cada aba, selecione tudo (Ctrl + A), copie (Ctrl + C) e cole na caixa correspondente. Primeiro clique em <b>Ver prévia</b>: nada é gravado até você confirmar. Se a importação for repetida, as vendas já importadas são puladas.</p>
        <label>Aba VENDAS (obrigatório)</label>
        <textarea rows={6} value={vendas} onChange={(e) => { setVendas(e.target.value); setRes(null); }} />
        <label>Aba CLIENTES (telefones; opcional)</label>
        <textarea rows={4} value={clientes} onChange={(e) => { setClientes(e.target.value); setRes(null); }} />
        <label>Aba Vendedores (comissões; opcional)</label>
        <textarea rows={3} value={vend} onChange={(e) => { setVend(e.target.value); setRes(null); }} />
        <div className='linha'>
          <div><label>Seu nome na planilha</label><input value={eu} onChange={(e) => { setEu(e.target.value); setRes(null); }} /></div>
          <div><label>&nbsp;</label><label style={{ display: 'inline' }}><input type='checkbox' checked={semCom} onChange={(e) => { setSemCom(e.target.checked); setRes(null); }} style={{ width: 'auto', margin: '0 6px 0 0' }} />Não gerar comissão nas vendas do administrador</label></div>
        </div>
        {erro && <p className='erro'>{erro}</p>}
        {ok && <p className='ok'>{ok}</p>}
        <button className='btn' onClick={previa} disabled={busy || !vendas.trim()}>{busy ? 'Aguarde...' : 'Ver prévia'}</button>
      </div>
      {res && (
        <div className='card'>
          <h2>Prévia</h2>
          <p className='aviso'>Vendas a importar: <b>{res.vendas}</b> · Já importadas antes: <b>{res.jaImportadas}</b> · Clientes novos: <b>{res.clientesNovos}</b></p>
          <p className='aviso'>Total vendido: <b>{brl(res.totais.liquido)}</b> · Já recebido: <b>{brl(res.totais.recebido)}</b> · A receber: <b>{brl(res.totais.aReceber)}</b></p>
          {res.ignoradas.length > 0 && <p className='erro'>Linhas ignoradas (dados incompletos): {res.ignoradas.join(', ')}</p>}
          <div className='tabela'>
            <table>
              <thead><tr><th>Vendedor na planilha</th><th>Vira no sistema</th></tr></thead>
              <tbody>{res.vendedores.map((v) => <tr key={v.planilha}><td>{v.planilha}</td><td>{v.sistema}{v.novo ? ' (novo, criado inativo)' : ''}</td></tr>)}</tbody>
            </table>
          </div>
          <p className='aviso'>Vendedores novos são criados <b>inativos</b>, com senha aleatória: depois defina a senha e ative em Vendedores.</p>
          <button className='btn' onClick={importar} disabled={busy || res.vendas === 0}>{busy ? 'Importando...' : 'Confirmar importação'}</button>
        </div>
      )}
      <div className='card'>
        <h2>Manutenção</h2>
        <p className='aviso'>Renumera os códigos de todas as vendas em ordem de data (VND-0001, VND-0002...). Use antes de os vendedores começarem a usar os códigos. As próximas vendas continuam a sequência.</p>
        <button className='bs' onClick={renumerar}>Renumerar códigos das vendas</button>
        {manut && <p className='ok'>{manut}</p>}
      </div>
    </>
  );
}
