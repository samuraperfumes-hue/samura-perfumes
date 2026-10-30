export async function api(url, method, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, d };
}
export const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
export const dtBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '-');
export const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export function lerData(txt) {
  const t = String(txt || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : null;
}
const saudacaoHora = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
export function textoCobranca(nome) {
  const t = String(nome || '').trim().split(/\s+/)[0] || '';
  const pn = t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
  return saudacaoHora() + (pn ? ', ' + pn : '') + '! \u{1F60A}\n\nEsperamos que esteja aproveitando sua compra! Passando só para confirmar se deu tudo certo e nos colocar à disposição para qualquer dúvida ou novas aquisições.\n\nPara facilitar futuros contatos ou acertos, segue meu número (que também é minha chave Pix): 21 964147761.\n\nSe preferir pagar no cartão, é só acessar: https://mpago.li/1o3MyQE\n\nConte conosco! \u{1F49B}';
}
export function wa(tel, texto) {
  const m = /^Olá (.+?), lembrete da venda/.exec(String(texto || ''));
  if (m) texto = textoCobranca(m[1]);
  const d = String(tel || '').replace(/[^0-9]/g, '');
  return d ? 'https://wa.me/55' + d + '?text=' + encodeURIComponent(texto) : null;
}
