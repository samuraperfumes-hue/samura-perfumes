'use client';
import { useState } from 'react';

// Teste "Descubra sua fragrância": perguntas simples, a pontuação usa o perfil de cada fragrância.
const PERGUNTAS = [
  { id: 'para', titulo: 'É para quem?', opcoes: [['masc', '👔', 'Para ele', 'Masculino'], ['fem', '👗', 'Para ela', 'Feminino'], ['tanto', '✨', 'Tanto faz', 'Quero ver todas']] },
  { id: 'quando', titulo: 'Quando você vai usar mais?', opcoes: [['dia', '☀️', 'Dia a dia', 'Trabalho, faculdade, rotina'], ['noite', '🌙', 'Noite e festas', 'Saídas, baladas, eventos'], ['encontro', '💛', 'Encontros', 'Jantar, date, momentos especiais'], ['sempre', '🔄', 'Em todo lugar', 'Um coringa para tudo']] },
  { id: 'cheiro', titulo: 'Qual destes cheiros te atrai mais?', opcoes: [['doce', '🍯', 'Doce', 'Baunilha, caramelo, café'], ['fresco', '🍋', 'Fresco', 'Limão, mar, hortelã'], ['floral', '🌹', 'Floral', 'Rosas, jasmim, flores'], ['amadeirado', '🪵', 'Amadeirado', 'Madeiras, especiarias, couro']] },
  { id: 'forca', titulo: 'Como você gosta do perfume?', opcoes: [['1', '🤍', 'Discreto', 'Só quem chega perto sente'], ['2', '⚖️', 'Equilibrado', 'Presente, sem exagero'], ['3', '🔥', 'Marcante', 'Deixa rastro por onde passa']] },
  { id: 'clima', titulo: 'No dia a dia, você sente mais…', opcoes: [['calor', '🌞', 'Calor', 'Prefiro algo leve'], ['frio', '❄️', 'Frio', 'Gosto de algo que aquece'], ['varia', '🌤️', 'Depende do dia', 'Um pouco de cada']] },
];
const NOME_ESTILO = { doce: 'doce', fresco: 'fresco', floral: 'floral', amadeirado: 'amadeirado' };
const NOME_FORCA = { 1: 'discreto', 2: 'equilibrado', 3: 'marcante' };
const ESTILO_F = { doce: 'doce', fresco: 'fresca', floral: 'floral', amadeirado: 'amadeirada' };
const FORCA_F = { 1: 'discreta', 2: 'equilibrada', 3: 'marcante' };

function pontuar(i, r) {
  if (!i.perfil) return -999;
  if (r.para === 'masc' && i.genero === 'Feminino') return -999;
  if (r.para === 'fem' && i.genero === 'Masculino') return -999;
  let p = 0;
  const m = i.momentos || [];
  const c = i.clima || [];
  const e = i.perfil.estilo;
  if (r.quando === 'dia') p += m.includes('Dia') ? 3 : 0;
  if (r.quando === 'noite') p += m.includes('Noite') ? 3 : 0;
  if (r.quando === 'encontro') p += (m.includes('Noite') ? 2 : 0) + (e.includes('doce') || e.includes('floral') ? 1 : 0);
  if (r.quando === 'sempre') p += m.length > 1 ? 3 : 1;
  if (e[0] === r.cheiro) p += 5; else if (e.includes(r.cheiro)) p += 2.5;
  p += 3 - Math.abs(i.perfil.forca - Number(r.forca)) * 1.5;
  if (r.clima === 'calor') p += c.includes('Quente') ? 2 : i.perfil.forca === 3 ? -1 : 0;
  if (r.clima === 'frio') p += c.includes('Frio') ? 2 : 0;
  if (r.clima === 'varia') p += c.includes('Ameno') ? 1 : 0;
  if (r.para !== 'tanto' && i.genero === 'Unissex') p += 0.5;
  return p;
}

function motivo(i, r) {
  const e = i.perfil ? i.perfil.estilo : [];
  const partes = [];
  if (e.length) partes.push(e.map((x) => ESTILO_F[x]).join(' e '));
  if (i.perfil) partes.push(FORCA_F[i.perfil.forca]);
  const uso = r.quando === 'dia' ? 'para o dia a dia' : r.quando === 'noite' ? 'para a noite' : r.quando === 'encontro' ? 'para encontros' : 'para várias ocasiões';
  return 'Fragrância ' + partes.join(', ') + ', ideal ' + uso + '.';
}

export default function Teste({ itens, zap, fechar, verDetalhes }) {
  const [passo, setPasso] = useState(0);
  const [r, setR] = useState({});
  const [f, setF] = useState({ nome: '', telefone: '', site: '' });
  const [env, setEnv] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const fim = passo >= PERGUNTAS.length;
  const ranking = fim ? itens.map((i) => ({ i, p: pontuar(i, r) })).filter((x) => x.p > -999).sort((a, b) => b.p - a.p).map((x) => x.i) : [];
  const top = ranking[0];
  const alt = ranking.slice(1, 3);
  const pedir = (nome) => 'https://wa.me/' + zap + '?text=' + encodeURIComponent('Olá! Fiz o teste "Descubra sua fragrância" da Samura Perfumes e deu ' + nome + '. Quero saber mais! 😊');

  function escolher(v) {
    const q = PERGUNTAS[passo];
    setR({ ...r, [q.id]: v });
    setPasso(passo + 1);
  }
  function refazer() { setPasso(0); setR({}); setMsg(''); setErro(''); }

  async function enviar(e) {
    e.preventDefault(); setErro(''); setMsg(''); setEnv(true);
    const resumo = top.nome + ' (' + [NOME_ESTILO[r.cheiro], r.quando === 'dia' ? 'dia a dia' : r.quando === 'noite' ? 'noite' : r.quando === 'encontro' ? 'encontros' : 'todo lugar', NOME_FORCA[r.forca]].join(', ') + ')';
    const x = await fetch('/api/teste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, resultado: resumo, alternativas: alt.map((a) => a.nome).join(', ') }) }).catch(() => null);
    const d = x ? await x.json().catch(() => ({})) : {};
    setEnv(false);
    if (!x || !x.ok) { setErro(d.erro || 'Não foi possível enviar agora. Tente de novo.'); return; }
    setF({ nome: '', telefone: '', site: '' });
    setMsg('Recebemos! Em breve a gente te chama para apresentar o ' + top.nome + '. 💛');
  }

  return (
    <section id='teste' className='fr-teste'>
      <div className='fr-teste-topo'>
        <span>Descubra sua fragrância</span>
        <button type='button' className='fr-teste-x' onClick={fechar} aria-label='Fechar teste'>✕</button>
      </div>

      {!fim && (
        <>
          <div className='fr-teste-barra'><div style={{ width: ((passo + 1) / PERGUNTAS.length) * 100 + '%' }} /></div>
          <p className='fr-teste-passo'>Pergunta {passo + 1} de {PERGUNTAS.length}</p>
          <h2>{PERGUNTAS[passo].titulo}</h2>
          <div className='fr-teste-opcoes'>
            {PERGUNTAS[passo].opcoes.map(([v, ic, t, s]) => (
              <button key={v} type='button' className={'fr-teste-op' + (r[PERGUNTAS[passo].id] === v ? ' on' : '')} onClick={() => escolher(v)}>
                <span className='ic'>{ic}</span><b>{t}</b><small>{s}</small>
              </button>
            ))}
          </div>
          {passo > 0 && <button type='button' className='fr-teste-voltar' onClick={() => setPasso(passo - 1)}>← Voltar</button>}
        </>
      )}

      {fim && !top && (
        <>
          <h2>Não encontramos uma combinação</h2>
          <p>Fale com a gente no WhatsApp que a gente te ajuda a escolher.</p>
          <a className='fr-zap' href={'https://wa.me/' + zap} target='_blank' rel='noreferrer'>Falar no WhatsApp</a>
          <button type='button' className='fr-teste-voltar' onClick={refazer}>↺ Refazer o teste</button>
        </>
      )}

      {fim && top && (
        <>
          <p className='fr-teste-passo'>Seu perfume ideal é</p>
          <div className='fr-teste-res'>
            <div className='fr-foto' role='img' aria-label={'Frasco Samura Perfumes ' + top.nome} />
            <div>
              <h2>{top.nome}</h2>
              <small>{[top.genero, top.casa].filter(Boolean).join(' · ')}</small>
              <p>{motivo(top, r)}</p>
              {top.topo && <p className='fr-suave'>Notas: {[top.topo, top.coracao, top.fundo].filter(Boolean).join(' · ')}</p>}
            </div>
          </div>
          <a className='fr-zap' href={pedir(top.nome)} target='_blank' rel='noreferrer'>Pedir {top.nome} no WhatsApp</a>
          <button type='button' className='fr-teste-voltar' onClick={() => verDetalhes(top.nome)}>Ver história e detalhes</button>

          {alt.length > 0 && <>
            <p className='fr-teste-passo' style={{ marginTop: 18 }}>Também combinam com você</p>
            {alt.map((a) => (
              <button key={a.nome} type='button' className='fr-teste-alt' onClick={() => verDetalhes(a.nome)}>
                <span className='fr-mini' aria-hidden='true' />
                <span><b>{a.nome}</b><small>{motivo(a, r)}</small></span>
              </button>
            ))}
          </>}

          <form className='fr-teste-form' onSubmit={enviar}>
            <h3>Gostou do resultado?</h3>
            <p>Deixe seu WhatsApp que a gente te apresenta essa fragrância. 💛</p>
            <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder='Seu nome' maxLength={80} />
            <input value={f.telefone} inputMode='tel' onChange={(e) => setF({ ...f, telefone: e.target.value })} placeholder='WhatsApp com DDD' />
            <input className='fr-oculto' tabIndex={-1} autoComplete='off' value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })} aria-hidden='true' />
            {erro && <p className='fr-erro'>{erro}</p>}
            {msg && <p className='fr-ok'>{msg}</p>}
            <button className='fr-zap' disabled={env}>{env ? 'Enviando...' : 'Quero conhecer'}</button>
          </form>
          <button type='button' className='fr-teste-voltar' onClick={refazer}>↺ Refazer o teste</button>
        </>
      )}
    </section>
  );
}
