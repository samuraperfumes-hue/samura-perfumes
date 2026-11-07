'use client';
import { useEffect, useState } from 'react';
import Teste from './teste';
import { fotoClasse } from '../../lib/perfis';

const link = (zap, nome) => 'https://wa.me/' + zap + '?text=' + encodeURIComponent('Olá! Vi a fragrância ' + nome + ' no catálogo da Samura Perfumes e quero fazer meu pedido.');

function Frasco({ item, mini }) {
  const nome = item.nome;
  if (mini) return <span className={'fr-mini' + fotoClasse(item)} aria-hidden='true' />;
  return (
    <figure className='fr-foto-box'>
      <div className={'fr-foto' + fotoClasse(item)} role='img' aria-label={'Frasco Samura Perfumes ' + nome} />
      <figcaption>{nome}</figcaption>
    </figure>
  );
}

function Indicar() {
  const vazio = { quem: '', quem_tel: '', nome: '', telefone: '', aviso: false, site: '' };
  const [f, setF] = useState(vazio);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [env, setEnv] = useState(false);
  const set = (k, v) => setF({ ...f, [k]: v });
  async function enviar(e) {
    e.preventDefault();
    setErro(''); setMsg(''); setEnv(true);
    const r = await fetch('/api/indicacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setEnv(false);
    if (!r || !r.ok) { setErro(d.erro || 'Não foi possível enviar agora. Tente de novo.'); return; }
    setF(vazio);
    setMsg('Obrigado pela indicação! Vamos entrar em contato com o seu amigo. 💛');
  }
  return (
    <form id='indique' className='fr-indica' onSubmit={enviar}>
      <h2>Conhece alguém que vai amar?</h2>
      <p>Indique um amigo e a gente apresenta nossas fragrâncias para ele. Quando ele fizer a primeira compra, <b>você ganha 10% de desconto</b> na sua próxima, e <b>ele ganha 5%</b> na primeira compra dele. 🎁</p>
      <label>Seu nome</label>
      <input value={f.quem} onChange={(e) => set('quem', e.target.value)} maxLength={80} />
      <label>Seu WhatsApp (com DDD)</label>
      <input value={f.quem_tel} inputMode='tel' placeholder='21 99999-9999' onChange={(e) => set('quem_tel', e.target.value)} />
      <label>Nome do amigo</label>
      <input value={f.nome} onChange={(e) => set('nome', e.target.value)} maxLength={80} />
      <label>WhatsApp do amigo (com DDD)</label>
      <input value={f.telefone} inputMode='tel' placeholder='21 99999-9999' onChange={(e) => set('telefone', e.target.value)} />
      <input className='fr-oculto' tabIndex={-1} autoComplete='off' value={f.site} onChange={(e) => set('site', e.target.value)} aria-hidden='true' />
      <label className='fr-check'><input type='checkbox' checked={f.aviso} onChange={(e) => set('aviso', e.target.checked)} /> Avisei meu amigo que a Samura Perfumes vai entrar em contato.</label>
      {erro && <p className='fr-erro'>{erro}</p>}
      {msg && <p className='fr-ok'>{msg}</p>}
      <p className='fr-regra'>O desconto de quem indica vale por 90 dias após a compra do amigo e não acumula com outras promoções.</p>
      <button className='fr-zap' disabled={env}>{env ? 'Enviando...' : 'Indicar amigo'}</button>
    </form>
  );
}

export default function Lista({ itens, zap }) {
  const [filtro, setFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);
  const [teste, setTeste] = useState(false);
  useEffect(() => { if (typeof window !== 'undefined' && window.location.hash === '#teste') setTeste(true); }, []);
  function verDetalhes(nome) {
    setTeste(false); setFiltro('Todos'); setBusca(''); setAberto(nome);
    setTimeout(() => { const el = document.getElementById('fr-' + nome); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
  }

  const filtros = ['Todos', 'Masculino', 'Feminino'];
  if (itens.some((i) => i.genero === 'Unissex')) filtros.push('Unissex');
  if (itens.some((i) => i.linha === 'Árabe')) filtros.push('Árabe');
  const t = busca.trim().toLowerCase();
  const ver = itens.filter((i) => (filtro === 'Todos' || i.genero === filtro || i.linha === filtro) && (!t || i.nome.toLowerCase().includes(t) || i.casa.toLowerCase().includes(t)));

  return (
    <div className='fr'>
      <header className='fr-topo'>
        <div className='logo pequena' />
        <h1>Nossas fragrâncias</h1>
        <p>Toque em uma fragrância para ver as notas, a história e quando usar.</p>
      </header>

      {teste ? <Teste itens={itens} zap={zap} fechar={() => setTeste(false)} verDetalhes={verDetalhes} /> : (
        <button type='button' className='fr-teste-chama' onClick={() => { setTeste(true); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 30); }}>
          <span>✨</span><b>Na dúvida? Descubra sua fragrância</b><small>5 perguntas rápidas e a gente indica o perfume ideal para você</small>
        </button>
      )}

      <input className='fr-busca' value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='Buscar fragrância...' />
      <div className='fr-chips'>
        {filtros.map((f) => <button key={f} type='button' className={'fr-chip' + (filtro === f ? ' on' : '')} onClick={() => setFiltro(f)}>{f === 'Árabe' ? 'Árabes' : f === 'Masculino' ? 'Masculinas' : f === 'Feminino' ? 'Femininas' : f}</button>)}
      </div>

      {ver.length === 0 && <p className='fr-vazio'>Nenhuma fragrância encontrada.</p>}
      {ver.map((i) => {
        const on = aberto === i.nome;
        return (
          <article key={i.nome} id={'fr-' + i.nome} className={'fr-card' + (on ? ' on' : '')}>
            <button type='button' className='fr-cab' onClick={() => setAberto(on ? null : i.nome)} aria-expanded={on}>
              <Frasco item={i} mini />
              <span className='fr-tit'>
                <b>{i.nome}</b>
                <small>{[i.genero, i.linha === 'Árabe' ? 'Árabe' : '', i.casa].filter(Boolean).join(' · ')}</small>
              </span>
              <span className='fr-seta'>{on ? '−' : '+'}</span>
            </button>
            {on && (
              <div className='fr-corpo'>
                <Frasco item={i} />
                {i.familia && <p><span className='fr-rot'>Família olfativa</span>{i.familia}</p>}
                {i.inspiracao && <p><span className='fr-rot'>Também lembra</span>{i.inspiracao}</p>}
                {(i.topo || i.coracao || i.fundo) ? (
                  <div className='fr-notas'>
                    {i.topo && <div><span className='fr-rot'>Notas de saída</span>{i.topo}</div>}
                    {i.coracao && <div><span className='fr-rot'>Notas de coração</span>{i.coracao}</div>}
                    {i.fundo && <div><span className='fr-rot'>Notas de fundo</span>{i.fundo}</div>}
                  </div>
                ) : <p className='fr-suave'>Notas olfativas em atualização.</p>}
                {i.historia && <p><span className='fr-rot'>História</span>{i.historia}</p>}
                {i.uso && (
                  <p><span className='fr-rot'>Melhor uso</span>
                    {[...i.momentos, ...i.clima.map((c) => 'Clima ' + c.toLowerCase())].map((m) => <span key={m} className='fr-tag'>{m}</span>)}
                    <br />{i.uso}</p>
                )}
                <a className='fr-zap' href={link(zap, i.nome)} target='_blank' rel='noreferrer'>Pedir no WhatsApp</a>
              </div>
            )}
          </article>
        );
      })}

      <Indicar />

      <footer className='fr-rodape'>
        <p>Samura Perfumes · Fragrâncias inspiradas. As marcas citadas pertencem aos seus respectivos donos e servem apenas como referência olfativa; não temos vínculo com elas.</p>
      </footer>
    </div>
  );
}
