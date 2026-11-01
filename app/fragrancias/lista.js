'use client';
import { useState } from 'react';

const link = (zap, nome) => 'https://wa.me/' + zap + '?text=' + encodeURIComponent('Olá! Vi a fragrância ' + nome + ' no catálogo da Samura Perfumes e quero fazer meu pedido.');

export default function Lista({ itens, zap }) {
  const [filtro, setFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);

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

      <input className='fr-busca' value={busca} onChange={(e) => setBusca(e.target.value)} placeholder='Buscar fragrância...' />
      <div className='fr-chips'>
        {filtros.map((f) => <button key={f} type='button' className={'fr-chip' + (filtro === f ? ' on' : '')} onClick={() => setFiltro(f)}>{f === 'Árabe' ? 'Árabes' : f === 'Masculino' ? 'Masculinas' : f === 'Feminino' ? 'Femininas' : f}</button>)}
      </div>

      {ver.length === 0 && <p className='fr-vazio'>Nenhuma fragrância encontrada.</p>}
      {ver.map((i) => {
        const on = aberto === i.nome;
        return (
          <article key={i.nome} className={'fr-card' + (on ? ' on' : '')}>
            <button type='button' className='fr-cab' onClick={() => setAberto(on ? null : i.nome)} aria-expanded={on}>
              <span>
                <b>{i.nome}</b>
                <small>{[i.genero, i.linha === 'Árabe' ? 'Árabe' : '', i.casa].filter(Boolean).join(' · ')}</small>
              </span>
              <span className='fr-seta'>{on ? '−' : '+'}</span>
            </button>
            {on && (
              <div className='fr-corpo'>
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

      <footer className='fr-rodape'>
        <p>Samura Perfumes · Fragrâncias inspiradas. As marcas citadas pertencem aos seus respectivos donos e servem apenas como referência olfativa; não temos vínculo com elas.</p>
      </footer>
    </div>
  );
}
