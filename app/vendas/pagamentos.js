'use client';
import { useEffect, useState } from 'react';
import { api, brl, dtBR, lerData, hojeISO } from '../util';
import { avisar, confirmar, perguntar } from '../dialogo';

const rotulo = { agendado: 'Agendado', informado: 'Informado (aguardando repasse)', recebido: 'Recebido' };

export default function Pagamentos({ vendaId, admin, onChange, dataVenda }) {
  const [d, setD] = useState(null);
  const [n, setN] = useState('2');
  const [primeira, setPrimeira] = useState(hojeISO());
  const [dias, setDias] = useState('30');
  const [erro, setErro] = useState('');
  const [dv, setDv] = useState(String(dataVenda || '').slice(0, 10));
  const [msgData, setMsgData] = useState('');

  async function carregar() {
    const r = await api('/api/vendas/' + vendaId + '/pagamentos', 'GET');
    if (r.ok) setD(r.d);
  }
  useEffect(() => { carregar(); }, []);
  async function acao(id, corpo) {
    const r = await api('/api/pagamentos/' + id, 'PATCH', corpo);
    if (!r.ok) avisar(r.d.erro || 'Erro');
    carregar(); onChange();
  }
  async function receber(p) {
    const v = await perguntar('Valor recebido (R$):', String(p.valor));
    if (!v) return;
    const dt = lerData(await perguntar('Data do recebimento (dd/mm/aaaa):', dtBR(p.data_recebimento || hojeISO()))) || hojeISO();
    acao(p.id, { acao: 'receber', valor: v, data: dt });
  }
  async function informar(p) {
    const dt = lerData(await perguntar('Data em que o cliente pagou (dd/mm/aaaa):', dtBR(hojeISO()))) || hojeISO();
    const v = await perguntar('Valor pago pelo cliente (R$):', String(p.valor));
    if (!v) return;
    acao(p.id, { acao: 'informar', valor: v, data: dt });
  }
  async function reagendar(p) {
    const dt = lerData(await perguntar('Nova data prevista (dd/mm/aaaa):', dtBR(p.data_prevista)));
    if (dt) acao(p.id, { acao: 'reagendar', data: dt });
  }
  async function contestar(p) {
    const m = await perguntar('Motivo (o vendedor verá):');
    if (m !== null) acao(p.id, { acao: 'contestar', motivo: m });
  }
  async function salvarData(valor) {
    setMsgData('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || '')) { setMsgData('Erro: escolha uma data válida.'); return; }
    const r = await api('/api/vendas/' + vendaId, 'PATCH', { data_venda: valor });
    if (!r.ok) { setMsgData('Erro: ' + (r.d.erro || 'não foi possível alterar a data.')); return; }
    setDv(valor);
    setMsgData('Data da venda alterada para ' + dtBR(valor) + '.');
    onChange();
  }
  async function cancelarVenda() {
    const m = await perguntar('Motivo do cancelamento da venda:');
    if (m === null) return;
    if (!await confirmar('Cancelar esta venda? Ela sairá das listas, da agenda, das comissões e das entregas.')) return;
    const r = await api('/api/vendas/' + vendaId + '/cancelar', 'POST', { motivo: m });
    if (!r.ok) { avisar(r.d.erro || 'Erro'); return; }
    if (Number(r.d.comissaoPaga) > 0) avisar('Atenção: a comissão desta venda já tinha sido paga (' + brl(r.d.comissaoPaga) + '). Desconte esse valor no próximo acerto do vendedor.');
    onChange();
  }
  async function excluirVenda() {
    if (!await confirmar('Excluir DEFINITIVAMENTE esta venda? Isso apaga a venda, os itens e os pagamentos e não pode ser desfeito.')) return;
    const r = await api('/api/vendas/' + vendaId, 'DELETE');
    if (!r.ok) { avisar(r.d.erro || 'Erro'); return; }
    onChange();
  }
  async function criar(corpo) {
    setErro('');
    const r = await api('/api/vendas/' + vendaId + '/pagamentos', 'POST', { ...corpo, data: hojeISO() });
    if (!r.ok) { setErro(r.d.erro || 'Erro'); return; }
    carregar(); onChange();
  }
  if (!d) return <p className='aviso'>Carregando...</p>;
  const total = Number(d.total);
  const soma = d.pagamentos.reduce((t, p) => t + Number(p.valor), 0);
  const livre = Math.round((total - soma) * 100) / 100;
  function parcelar() {
    const k = parseInt(n, 10);
    if (!(k > 0) || livre <= 0) { setErro('Nada a parcelar.'); return; }
    const base = Math.floor((livre / k) * 100) / 100;
    const ini = new Date(primeira + 'T12:00:00');
    const ps = [];
    for (let i = 0; i < k; i++) {
      const dd = new Date(ini.getTime() + i * Number(dias) * 86400000);
      ps.push({ valor: i === k - 1 ? Math.round((livre - base * (k - 1)) * 100) / 100 : base, data_prevista: dd.toISOString().slice(0, 10) });
    }
    criar({ parcelas: ps });
  }
  return (
    <div style={{ padding: 8 }}>
      <p className='aviso'>Total da venda: <b>{brl(total)}</b>{livre > 0 ? ' · Falta agendar: ' : ''}{livre > 0 && <b>{brl(livre)}</b>}</p>
      <div className='tabela'>
        <table>
          <thead><tr><th>Valor</th><th>Prevista</th><th>Recebimento</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>
            {d.pagamentos.map((p) => (
              <tr key={p.id}>
                <td>{brl(p.valor)}</td><td>{dtBR(p.data_prevista)}</td><td>{p.data_recebimento ? dtBR(p.data_recebimento) : '-'}</td>
                <td>{rotulo[p.situacao]}{p.motivo_contestacao ? ' — ' + p.motivo_contestacao : ''}</td>
                <td>
                  {p.situacao === 'agendado' && (admin ? <button className='bs' onClick={() => receber(p)}>Receber</button> : <button className='bs' onClick={() => informar(p)}>Cliente pagou</button>)}
                  {p.situacao === 'informado' && admin && <><button className='bs' onClick={() => receber(p)}>Validar</button><button className='bs' onClick={() => contestar(p)}>Contestar</button></>}
                  {p.situacao !== 'recebido' && <button className='bs' onClick={() => reagendar(p)}>Reagendar</button>}
                  {p.situacao === 'recebido' && admin && <button className='bs' onClick={async () => { if (await confirmar('Estornar este recebimento?')) acao(p.id, { acao: 'estornar' }); }}>Estornar</button>}
                  {p.situacao === 'agendado' && admin && <button className='bs' onClick={async () => { if (await confirmar('Excluir esta parcela?')) acao(p.id, { acao: 'excluir' }); }}>Excluir</button>}
                </td>
              </tr>
            ))}
            {d.pagamentos.length === 0 && <tr><td colSpan={5}>Nenhum pagamento lançado.</td></tr>}
          </tbody>
        </table>
      </div>
      {livre > 0 && (
        <>
          <p><button className='bs' onClick={() => criar({ avista: true })}>{admin ? 'Pago à vista (recebido hoje)' : 'Cliente pagou tudo hoje'}</button></p>
          <div className='linha' style={{ alignItems: 'flex-end' }}>
            <div><label>Parcelas</label><input value={n} onChange={(e) => setN(e.target.value)} inputMode='numeric' /></div>
            <div><label>1ª data</label><input type='date' value={primeira} onChange={(e) => setPrimeira(e.target.value)} /></div>
            <div><label>Intervalo (dias)</label><input value={dias} onChange={(e) => setDias(e.target.value)} inputMode='numeric' /></div>
            <div><button className='bs' onClick={parcelar}>Agendar parcelas</button></div>
          </div>
        </>
      )}
      {erro && <p className='erro'>{erro}</p>}
      {admin && (
        <div className='linha' style={{ alignItems: 'flex-end' }}>
          <div><label>Data da venda</label><input type='date' value={dv} onChange={(e) => setDv(e.target.value)} /></div>
          <div><button className='bs' onClick={() => salvarData(dv)}>Salvar data</button><button className='bs' onClick={() => salvarData(hojeISO())}>Hoje</button></div>
        </div>
      )}
      {msgData && <p className={msgData.startsWith('Erro') ? 'erro' : 'ok'}>{msgData}</p>}
      {admin && <p style={{ textAlign: 'right' }}><button className='bs' onClick={cancelarVenda} style={{ borderColor: '#d4707f', color: '#d4707f' }}>Cancelar venda</button><button className='bs' onClick={excluirVenda} style={{ borderColor: '#d4707f', color: '#d4707f' }}>Excluir definitivamente</button></p>}
    </div>
  );
}
