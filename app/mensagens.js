// Textos padrão das mensagens de WhatsApp da Samura e o registro de envio.
export const LINK_FRAG = 'https://samura-perfumes.vercel.app/fragrancias';
export const LINK_CARTAO = 'https://mpago.li/1o3MyQE';

export const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
export const primeiroNome = (nome) => { const t = String(nome || '').trim().split(/\s+/)[0] || ''; return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''; };
export const ola = (nome) => { const pn = primeiroNome(nome); return saudacao() + (pn ? ', ' + pn : '') + '! 😊\n\n'; };
const dm = (d) => (d ? String(d).slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '');
const pctTxt = (p) => Number(p).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';

export const textoPosVenda = (nome) => ola(nome) + 'Muito obrigado pela sua compra! Queremos saber como está sendo sua experiência com o perfume, seu feedback nos motiva a melhorar sempre.\n\nSe puder, responda com uma nota de 0 a 10 para o perfume. Sua opinião é muito importante para nós! ⭐\n\nE conheça as nossas outras fragrâncias, com notas, história e melhor uso: ' + LINK_FRAG + '\n\nSamura Perfumes 💛';

export const textoCobranca = (nome, pix) => ola(nome) + 'Esperamos que esteja aproveitando sua compra! Passando só para confirmar se deu tudo certo e nos colocar à disposição para qualquer dúvida ou novas aquisições.\n\nPara facilitar futuros contatos ou acertos, segue minha chave Pix: ' + pix + '.\n\nSe preferir pagar no cartão, é só acessar: ' + LINK_CARTAO + '\n\nConte conosco! 💛';

// desconto: { pct, validade } ou nada
export const textoResgate = (nome, desconto) => ola(nome) + 'Quanto tempo! Aqui é da Samura Perfumes. Passando para saber como está o seu perfume: você ficou satisfeito? Como está a fixação e o desempenho dele? Seu retorno nos motiva muito a melhorar sempre.\n\n'
  + (desconto ? '🎁 E tem novidade: você tem ' + pctTxt(desconto.pct) + ' de desconto guardado para a sua próxima compra' + (desconto.validade ? ', válido até ' + dm(desconto.validade) : '') + '!\n\n' : '')
  + 'Aproveitando, temos fragrâncias que talvez você ainda não conheça, com notas, história e melhor uso: ' + LINK_FRAG + '\n\nSe algum aroma chamar a sua atenção, é só me responder por aqui que eu separo o seu. Será um prazer ter você de volta! 💛\n\nSamura Perfumes';

export const textoConvite = (nome, indicou) => ola(nome)
  + (indicou ? 'Aqui é da Samura Perfumes. ' + primeiroNome(indicou) + ' indicou você e achamos que você ia gostar de conhecer nossas fragrâncias, inspiradas nos grandes perfumes. E por ter vindo por indicação, você ganha 5% de desconto na sua primeira compra! 🎁' : 'Aqui é da Samura Perfumes! Queremos te apresentar nossas fragrâncias, inspiradas nos grandes perfumes.')
  + '\n\nMontamos uma página com cada uma delas, com notas, história e o melhor momento de usar: ' + LINK_FRAG
  + '\n\nSe algum aroma chamar a sua atenção, é só me responder por aqui que eu te ajudo a escolher. 💛\n\nSe preferir não receber nossas mensagens, é só avisar.\n\nSamura Perfumes';

export const textoIndique = (nome) => (nome ? ola(nome) : 'Oi! 😊\n\n')
  + 'Conhece alguém que vai amar nossos perfumes? Indique um amigo para a Samura Perfumes e ganhe! 🎁\n\n'
  + '✅ Você ganha 10% de desconto na sua próxima compra\n✅ Seu amigo ganha 5% na primeira compra dele\n\n'
  + 'É só cadastrar o nome e o WhatsApp dele aqui: ' + LINK_FRAG + '#indique\n\n'
  + 'O desconto vale depois que o seu amigo fizer a primeira compra, por 90 dias, e não acumula com outras promoções.\n\n'
  + 'Obrigado por fazer parte da Samura! 💛';

export const textoDesconto = (nome, pct, validade, indicado) => ola(nome)
  + 'Passando para te contar uma novidade boa: ' + (indicado ? primeiroNome(indicado) + ', que você indicou, fez a primeira compra, e ' : '') + 'você ganhou ' + pctTxt(pct) + ' de desconto na sua próxima compra, como agradecimento pela indicação! 🎁'
  + (validade ? '\n\nO desconto vale até ' + dm(validade) + '.' : '')
  + '\n\nDá uma olhada nas nossas fragrâncias: ' + LINK_FRAG + '\n\nÉ só me responder por aqui que eu separo o seu. 💛\n\nSamura Perfumes';

export const linkZap = (tel, texto) => {
  const d = String(tel || '').replace(/[^0-9]/g, '');
  if (!d) return null;
  return 'https://wa.me/' + (d.startsWith('55') && d.length > 11 ? d : '55' + d) + '?text=' + encodeURIComponent(texto);
};

// Registra o envio (não bloqueia a abertura do WhatsApp).
export function registrar(cliente_id, tipo, venda_id) {
  if (!cliente_id) return Promise.resolve();
  return fetch('/api/mensagens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id, tipo, venda_id }), keepalive: true }).catch(() => {});
}

// "hoje", "ontem", "há 3 dias"
export function haQuanto(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : 'há ' + d + ' dias';
}
export const recente = (iso) => !!iso && Date.now() - new Date(iso).getTime() < 7 * 86400000;
