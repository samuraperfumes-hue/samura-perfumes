import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, q } from '../../../lib/db';
import { exigir } from '../../../lib/guard';
import { proximoCodigo } from '../../../lib/codigo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const linhas = (txt) => String(txt || '').split(/\r?\n/).map((l) => l.split('\t').map((c) => c.trim())).filter((r) => r.some(Boolean));
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/\s+/g, ' ');
const toks = (s) => norm(s).split(/[^A-Z]+/).filter((t) => t.length >= 3);
const money = (s) => {
  const t = String(s || '').replace(/[^0-9,.-]/g, '');
  if (!t) return 0;
  return Number(t.replace(/\./g, '').replace(',', '.')) || 0;
};
const c2 = (v) => Math.round(Number(v) * 100) / 100;
function data(s) {
  const t = String(s || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : null;
}
const ck = (u, nome) => (u.id !== null && u.id !== undefined ? u.id : 'n:' + u.nome) + '|' + norm(nome);

function itensDe(txt, bruto, entregue, cat) {
  const out = [];
  String(txt || '').split(';').map((x) => x.trim()).filter(Boolean).forEach((p) => {
    const m = p.match(/^(\d+)x (.+?) \((.+?)\)(?: - Status: (\w+))?$/);
    if (!m) return;
    const a = cat.get(norm(m[2]) + '|' + norm(m[3]));
    out.push({ qtd: parseInt(m[1], 10), desc: m[2] + ' ' + m[3], apr: a ? a.id : null, preco: a ? Number(a.preco) : 0, ent: norm(m[4]).startsWith('ENTREG') });
  });
  if (!out.length) return [{ qtd: 1, desc: 'Itens nao detalhados (planilha)', apr: null, preco: bruto, ent: entregue }];
  if (!(out.reduce((t, i) => t + i.qtd * i.preco, 0) > 0)) {
    const n = out.reduce((t, i) => t + i.qtd, 0);
    out.forEach((i) => { i.preco = c2(bruto / n); });
  }
  return out;
}

async function montar(b, s) {
  const users = (await q('select id, nome, login, papel, comissao_tipo, comissao_valor from usuarios')).rows;
  const admin = users.find((u) => u.id === s.id);
  const cat = new Map((await q('select a.id, a.tipo, f.nome, a.volume, a.preco from apresentacoes a join fragrancias f on f.id = a.fragrancia_id')).rows.map((a) => [norm(a.tipo + ' ' + a.nome) + '|' + norm(a.volume), a]));
  const exist = new Map((await q('select id, vendedor_id, nome from clientes')).rows.map((c) => [c.vendedor_id + '|' + norm(c.nome), c.id]));
  const comis = linhas(b.vendedores).filter((r) => norm(r[0]) !== 'NOME').map((r) => ({ t: toks(r[0]), taxa: money(r[1]) }));
  const eu = toks(b.eu || 'RODRIGO');
  const refs = new Map();
  const taxaAba = (nome) => {
    const t = toks(nome);
    const c = comis.find((x) => x.t.some((y) => t.includes(y)));
    return c ? c.taxa : null;
  };
  const resolver = (nome) => {
    const k = norm(nome);
    if (refs.has(k)) return refs.get(k);
    const t = toks(nome);
    let u = null;
    if (t.some((x) => eu.includes(x))) u = admin;
    else {
      let pts = 0;
      for (const x of users) {
        const ut = [...toks(x.nome), ...toks(x.login)];
        const n = t.filter((y) => ut.includes(y)).length;
        if (n > pts) { pts = n; u = x; }
      }
    }
    if (!u) {
      const ta = taxaAba(nome);
      u = { id: null, nome: k, login: k.toLowerCase().replace(/[^a-z]/g, '').slice(0, 20) || 'vendedor', papel: 'vendedor', comissao_valor: ta === null ? 20 : ta, novo: true };
      users.push(u);
    }
    refs.set(k, u);
    return u;
  };
  const taxaDe = (nome, u) => {
    if (b.semComissaoAdmin && u.papel === 'admin') return 0;
    const ta = taxaAba(nome);
    return ta === null ? Number(u.comissao_valor) : ta;
  };
  const ja = new Set((await q(`select observacoes from vendas where observacoes like 'Importado da planilha (%'`)).rows.map((r) => (/\((.+?)\)/.exec(r.observacoes) || [])[1]));
  const vendas = [];
  const ignoradas = [];
  let jaN = 0;
  linhas(b.vendas).forEach((r, idx) => {
    if (norm(r[0]) === 'ID') return;
    const [id, dt, cliente, vend, stPag, dtAg, stEnt, forma, , desc, bruto, liq, itensTxt] = r;
    const d = data(dt);
    const dsc = money(desc);
    let l = money(liq);
    let br = money(bruto);
    if (!(l > 0) && br > 0) l = c2(br - dsc);
    if (!(br > 0)) br = c2(l + dsc);
    if (!id || !cliente || !vend || !d || !(l > 0)) { ignoradas.push(id || 'linha ' + (idx + 1)); return; }
    if (ja.has(id)) { jaN++; return; }
    const u = resolver(vend);
    const taxa = taxaDe(vend, u);
    const ent = norm(stEnt).startsWith('ENTREG');
    vendas.push({ id, d, cliente: cliente.trim(), u, desc: dsc, bruto: br, liq: l, forma: forma || 'PIX', pago: norm(stPag).startsWith('PAG'), prev: data(dtAg), itens: itensDe(itensTxt, br, ent, cat), taxa, com: c2((l * taxa) / 100), i: idx });
  });
  vendas.sort((x, y) => x.d.localeCompare(y.d) || x.i - y.i);
  const fones = new Map();
  const nomesTab = [];
  linhas(b.clientes).filter((r) => norm(r[0]) !== 'NOME').forEach((r) => {
    const k = norm(r[0]);
    if (!fones.has(k) || (!fones.get(k) && r[1])) fones.set(k, r[1] || '');
    nomesTab.push(r[0].trim());
  });
  const comVenda = new Set(vendas.map((v) => norm(v.cliente)));
  const extras = [...new Set(nomesTab.filter((n) => !comVenda.has(norm(n))))];
  return { users, refs, vendas, ignoradas, jaN, fones, extras, exist, admin };
}

function resumo(p) {
  const novos = new Set();
  p.vendas.forEach((v) => { const k = ck(v.u, v.cliente); if (!p.exist.has(k)) novos.add(k); });
  p.extras.forEach((n) => { const k = ck(p.admin, n); if (!p.exist.has(k)) novos.add(k); });
  const soma = (f) => c2(p.vendas.filter(f).reduce((t, v) => t + v.liq, 0));
  return {
    vendas: p.vendas.length, jaImportadas: p.jaN, ignoradas: p.ignoradas, clientesNovos: novos.size,
    vendedores: [...p.refs.entries()].map(([k, u]) => ({ planilha: k, sistema: u.nome, novo: !!u.novo })),
    totais: { liquido: soma(() => true), recebido: soma((v) => v.pago), aReceber: soma((v) => !v.pago) },
  };
}

async function executar(p, s) {
  const cx = await pool.connect();
  try {
    await cx.query('begin');
    for (const u of p.users.filter((x) => x.novo)) {
      let login = u.login;
      for (let n = 1; (await cx.query('select 1 from usuarios where login = $1', [login])).rowCount; n++) login = u.login + n;
      const hash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      u.id = (await cx.query(`insert into usuarios (nome, login, senha_hash, papel, ativo, comissao_tipo, comissao_valor) values ($1, $2, $3, 'vendedor', false, 'percentual', $4) returning id`, [u.nome, login, hash, u.comissao_valor])).rows[0].id;
    }
    const ids = new Map(p.exist);
    const cli = async (u, nome) => {
      const k = ck(u, nome);
      if (ids.has(k)) return ids.get(k);
      const r = await cx.query('insert into clientes (vendedor_id, nome, telefone, criado_por) values ($1, $2, $3, $4) returning id', [u.id, nome, p.fones.get(norm(nome)) || null, s.id]);
      ids.set(k, r.rows[0].id);
      return r.rows[0].id;
    };
    for (const v of p.vendas) {
      const cid = await cli(v.u, v.cliente);
      const id = (await cx.query(`select nextval(pg_get_serial_sequence('vendas', 'id')) as id`)).rows[0].id;
      const codigo = await proximoCodigo(cx);
      await cx.query('insert into vendas (id, codigo, cliente_id, vendedor_id, lancada_por, responsavel_cobranca_id, data_venda, forma_pagamento, observacoes, desconto, total_bruto, total_liquido, comissao_tipo, comissao_taxa, comissao_valor) values ($1, $2, $3, $4, $5, $4, $6, $7, $8, $9, $10, $11, $12, $13, $14)', [id, codigo, cid, v.u.id, s.id, v.d, v.forma, 'Importado da planilha (' + v.id + ')', v.desc, v.bruto, v.liq, 'percentual', v.taxa, v.com]);
      for (const i of v.itens) await cx.query('insert into venda_itens (venda_id, apresentacao_id, descricao, quantidade, preco_unit, status_entrega) values ($1, $2, $3, $4, $5, $6)', [id, i.apr, i.desc, i.qtd, i.preco, i.ent ? 'entregue' : 'pendente']);
      if (v.pago) await cx.query(`insert into pagamentos (venda_id, valor, data_prevista, data_original, data_recebimento, situacao, validado_por, validado_em) values ($1, $2, $3, $3, $3, 'recebido', $4, now())`, [id, v.liq, v.d, s.id]);
      else await cx.query(`insert into pagamentos (venda_id, valor, data_prevista, data_original, situacao) values ($1, $2, $3, $3, 'agendado')`, [id, v.liq, v.prev]);
    }
    for (const n of p.extras) await cli(p.admin, n);
    await cx.query('commit');
    return { ok: true, importadas: p.vendas.length };
  } catch (e) {
    await cx.query('rollback');
    throw e;
  } finally {
    cx.release();
  }
}

export async function POST(req) {
  const g = await exigir(true);
  if (g.erro) return g.erro;
  const b = await req.json();
  try {
    const plano = await montar(b, g.s);
    if (b.acao !== 'importar') return Response.json(resumo(plano));
    const total = plano.vendas.length;
    const lim = Number(b.limite) > 0 ? Number(b.limite) : total;
    const parte = plano.vendas.slice(0, lim);
    const ultimo = parte.length >= total;
    const r = await executar({ ...plano, vendas: parte, extras: ultimo ? plano.extras : [] }, g.s);
    return Response.json({ ok: true, importadas: r.importadas, restantes: total - parte.length });
  } catch (e) {
    return Response.json({ erro: e.message }, { status: 400 });
  }
}
