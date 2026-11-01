// Fichas das fragrâncias (página pública /fragrancias).
// Notas conforme a planilha "LISTAGEM DE FRAGRÂNCIAS" da Samura. Texto de história e uso: sugestões gerais.
// aliases: nomes pelos quais a fragrância pode estar cadastrada no catálogo.

export const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const FICHAS = [
  {
    nome: 'La Vie Est Belle Elixir', casa: 'Lancôme', genero: 'Feminino', linha: 'Grife', familia: 'Floral frutal gourmand',
    aliases: ['vida bela elixir', 'la vie est bele elixir', 'la vie est belle elixir', 'vie est belle elixir'],
    topo: 'Framboesa, licor e bergamota', coracao: 'Folha de violeta e rosa', fundo: 'Couro, baunilha, patchouli e manteiga de cacau',
    historia: 'A linha La Vie Est Belle, da Lancôme, nasceu em 2012 com a ideia de que a vida é bela. A versão Elixir é uma leitura mais intensa e envolvente, com doçura marcante e rastro longo.',
    momentos: ['Noite'], clima: ['Frio', 'Ameno'], uso: 'Perfeita para jantares, encontros e ocasiões especiais. Boa fixação e projeção forte.',
  },
  {
    nome: 'Malbec Gold', casa: 'O Boticário', genero: 'Masculino', linha: 'Grife', familia: 'Amadeirada aromática',
    aliases: ['gold wine', 'malbec gold', 'malbec'],
    topo: 'Maçã, mandarina, pimenta-preta, noz-moscada, gengibre, limão e artemísia', coracao: 'Canela, flor de laranjeira e couro', fundo: 'Âmbar, patchouli, almíscar, musgo, estoraque e notas amadeiradas',
    historia: 'O Malbec é um dos perfumes masculinos mais conhecidos do Brasil, criado pelo Boticário. A versão Gold é mais quente e sofisticada, com especiarias e couro.',
    momentos: ['Noite'], clima: ['Frio', 'Ameno'], uso: 'Ótima para a noite e para ocasiões em que você quer ser lembrado. Deixa um rastro elegante.',
  },
  {
    nome: 'Sabah Al Ward Valentine', casa: 'Al Wataniah', genero: 'Feminino', linha: 'Árabe', familia: 'Floral gourmand', inspiracao: 'La Nuit Trésor (Lancôme)',
    aliases: ['arabe morning valentine', 'sabah al ward valentine', 'sabah al ward'],
    topo: 'Pimenta-rosa e mandarina', coracao: 'Flor de laranjeira, vagem de cacau e jasmim sambac', fundo: 'Baunilha, fava-tonka e patchouli',
    historia: 'Sabah Al Ward quer dizer "manhã de rosas" em árabe. É um perfume da casa árabe Al Wataniah, doce e floral, que lembra o estilo do La Nuit Trésor, da Lancôme.',
    momentos: ['Noite'], clima: ['Frio', 'Ameno'], uso: 'Doce e sedutor, vai bem em encontros e noites mais frescas.',
  },
  {
    nome: 'La Vie Est Belle Rose Extraordinaire', casa: 'Lancôme', genero: 'Feminino', linha: 'Grife', familia: 'Floral frutal',
    aliases: ['extaordinary rose', 'extraordinary rose', 'la vie est belle rose', 'la vie est belle rose extraordinaire'],
    topo: 'Frutas vermelhas, bergamota e pimenta-rosa', coracao: 'Rosa damascena, rosa centifólia e lírio-do-vale', fundo: 'Almíscar, patchouli, sândalo e íris',
    historia: 'Uma versão floral da linha La Vie Est Belle, da Lancôme, com as rosas no centro da composição e um toque frutado delicado.',
    momentos: ['Dia'], clima: ['Ameno', 'Quente'], uso: 'Feminina e luminosa, funciona bem para o trabalho, passeios e encontros durante o dia.',
  },
  {
    nome: 'Scandal', casa: 'Jean Paul Gaultier', genero: 'Feminino', linha: 'Grife', familia: 'Floral gourmand',
    aliases: ['moulin rouge', 'scandal'],
    topo: 'Laranja-sanguínea e mandarina', coracao: 'Mel, gardênia, flor de laranjeira, jasmim e pêssego', fundo: 'Cera de abelha, caramelo, patchouli e alcaçuz',
    historia: 'Lançado em 2017 pela Jean Paul Gaultier, o Scandal ficou conhecido pelo mel e pelo caráter ousado. É um perfume que chama atenção.',
    momentos: ['Noite'], clima: ['Frio', 'Ameno'], uso: 'Para quem gosta de marcar presença: festas, jantares e noites especiais.',
  },
  {
    nome: '212 VIP Black', casa: 'Carolina Herrera', genero: 'Masculino', linha: 'Grife', familia: 'Aromática especiada',
    aliases: ['private man black', '212 vip black', '212 vip men black'],
    topo: 'Absinto, anis e funcho', coracao: 'Lavanda', fundo: 'Baunilha negra e almíscar',
    historia: 'Faz parte da linha 212 VIP, da Carolina Herrera, pensada para a vida noturna e as festas. É marcante e masculino.',
    momentos: ['Noite'], clima: ['Frio', 'Ameno'], uso: 'Feito para a noite: baladas, eventos e jantares.',
  },
  {
    nome: 'Sauvage', casa: 'Dior', genero: 'Masculino', linha: 'Grife', familia: 'Fresca aromática especiada',
    aliases: ['sauvage'],
    topo: 'Pimenta de Sichuan e bergamota da Calábria', coracao: 'Gerânio, lavanda, pimenta de Sichuan, elemi, pimenta-rosa, vetiver e patchouli', fundo: 'Cedro, ládano e ambroxan',
    historia: 'Criado em 2015 pela Dior, o Sauvage virou um dos perfumes masculinos mais vendidos do mundo. Fresco, picante e muito versátil.',
    momentos: ['Dia', 'Noite'], clima: ['Ameno', 'Quente'], uso: 'Coringa do guarda-roupa: serve para o trabalho, o dia a dia e a noite.',
  },
  {
    nome: 'Khamrah Qahwa', casa: 'Lattafa', genero: 'Masculino', linha: 'Árabe', familia: 'Oriental gourmand', inspiracao: "Angels' Share (By Kilian)",
    aliases: ['arabe vin brun', 'khamrah qahwa', 'khamrah'],
    topo: 'Canela, cardamomo e gengibre', coracao: 'Praliné, frutas cristalizadas e flores brancas', fundo: 'Baunilha, café, fava-tonka, benjoim e almíscar',
    historia: 'Da casa árabe Lattafa, o Khamrah Qahwa trouxe o café para o centro da composição, com doçura de especiarias e baunilha. Tem estilo parecido com o Angels\' Share, da Kilian.',
    momentos: ['Noite'], clima: ['Frio'], uso: 'Aconchegante e doce, é ideal para dias frios e noites. Tem fixação longa.',
  },
  {
    nome: 'Allure Chanel', casa: 'Chanel', genero: 'Feminino', linha: 'Grife', familia: 'Floral frutal amadeirada',
    aliases: ['etude alure', 'allure chanel', 'allure', 'chanel allure'],
    topo: 'Limão, bergamota, mandarina, pêssego e maracujá', coracao: 'Madressilva, jasmim, magnólia, frésia, nenúfar, rosa-de-maio e peônia', fundo: 'Baunilha, sândalo, âmbar, vetiver e patchouli',
    historia: 'O Allure foi lançado pela Chanel em 1996 e é um clássico feminino, elegante e sofisticado, que atravessa gerações.',
    momentos: ['Dia'], clima: ['Ameno'], uso: 'Elegante e discreto, combina com trabalho, reuniões e eventos durante o dia.',
  },
  {
    nome: 'Bad Boy Cobalt', casa: 'Carolina Herrera', genero: 'Masculino', linha: 'Grife', familia: 'Aromática amadeirada',
    aliases: ['bad man blue', 'bad boy cobalt', 'bad boy'],
    topo: 'Pimenta-rosa e lavanda', coracao: 'Sálvia negra e gerânio', fundo: 'Trufa, vetiver, cedro e carvalho',
    historia: 'Da linha Bad Boy, da Carolina Herrera, o Cobalt tem visual azul elétrico e um perfil mais aromático e amadeirado, moderno e jovem.',
    momentos: ['Noite'], clima: ['Ameno', 'Frio'], uso: 'Moderno e marcante, vai bem em saídas, festas e encontros.',
  },
  {
    nome: "Bade'e Al Oud For Glory", casa: 'Lattafa', genero: 'Masculino', linha: 'Árabe', familia: 'Oriental amadeirada (oud)', inspiracao: 'Oud for Greatness (Initio Parfums Privés)',
    aliases: ['arabe oud glory', 'badee al oud for glory', 'bade e aloud for glory', 'bade e al oud for glory', 'oud for glory'],
    topo: 'Açafrão, noz-moscada e lavanda', coracao: 'Agarwood (oud) e patchouli', fundo: 'Agarwood, patchouli e almíscar',
    historia: 'Da casa árabe Lattafa, o Bade\'e Al Oud For Glory é um perfume de oud, madeira nobre muito valorizada no Oriente Médio. Lembra o estilo do Oud for Greatness, da Initio.',
    momentos: ['Noite'], clima: ['Frio'], uso: 'Intenso e sofisticado, para noites e ocasiões em que você quer deixar rastro. Pouca quantidade já rende.',
  },
  {
    nome: 'Good Girl Blush', casa: 'Carolina Herrera', genero: 'Feminino', linha: 'Grife', familia: 'Floral oriental gourmand',
    aliases: ['girl blush', 'good girl blush'],
    topo: 'Bergamota e amêndoa amarga', coracao: 'Peônia e ylang-ylang', fundo: 'Baunilha e cumaru (fava-tonka)',
    historia: 'Da linha Good Girl, da Carolina Herrera, a versão Blush é mais suave e rosada, com amêndoa e baunilha delicadas.',
    momentos: ['Dia', 'Noite'], clima: ['Ameno'], uso: 'Doce e confortável, combina com encontros, passeios e saídas à noite.',
  },
  {
    nome: 'Yara Elixir', casa: 'Lattafa', genero: 'Feminino', linha: 'Árabe', familia: 'Floral frutal gourmand',
    aliases: ['arabe mermaid elixir', 'yara elixir', 'yara'],
    topo: 'Framboesa, mirtilo e frutas vermelhas', coracao: 'Baunilha, coco e flor de laranjeira', fundo: 'Almíscar, sândalo e notas cremosas',
    historia: 'Da casa árabe Lattafa, a linha Yara é famosa pelo perfil doce, cremoso e fácil de gostar. A versão Elixir é mais intensa e duradoura.',
    momentos: ['Dia', 'Noite'], clima: ['Ameno'], uso: 'Doce e cremosa, agrada em quase todas as ocasiões.',
  },
  {
    nome: 'Lady Million', casa: 'Paco Rabanne', genero: 'Feminino', linha: 'Grife', familia: 'Floral frutal',
    aliases: ['lady gold', 'lady million'],
    topo: 'Framboesa, neroli e limão-siciliano', coracao: 'Jasmim, flor de laranjeira e gardênia', fundo: 'Mel branco, patchouli e âmbar',
    historia: 'Lançado em 2010 pela Paco Rabanne, o Lady Million tem o brilho do luxo: frutado, floral e com um fundo de mel e âmbar.',
    momentos: ['Noite'], clima: ['Ameno', 'Quente'], uso: 'Glamouroso, para festas, eventos e saídas à noite.',
  },
  {
    nome: 'Asad Elixir', casa: 'Lattafa', genero: 'Masculino', linha: 'Árabe', familia: 'Amadeirada especiada', inspiracao: 'Sauvage Elixir (Dior)',
    aliases: ['arabe desert elixir', 'asad elixir', 'asad'],
    topo: '', coracao: '', fundo: '',
    historia: 'Da casa árabe Lattafa, o Asad Elixir é uma fragrância masculina intensa e quente, com estilo parecido com o do Sauvage Elixir, da Dior.',
    momentos: ['Noite'], clima: ['Frio'], uso: 'Intenso e envolvente, para noites e dias frios.',
  },
  {
    nome: 'Baccarat Rouge 540', casa: 'Maison Francis Kurkdjian', genero: 'Feminino', linha: 'Árabe', familia: 'Âmbar floral amadeirada',
    aliases: ['arabe rouge 540', 'baccarat rouge 540', 'rouge 540', 'baccarat rouge'],
    topo: 'Jasmim e açafrão', coracao: 'Madeira de âmbar e âmbar cinzento', fundo: 'Resina de abeto e cedro',
    historia: 'Criado em 2015 por Francis Kurkdjian, o Baccarat Rouge 540 virou fenômeno mundial pelo aroma único, que mistura açafrão, âmbar e um toque adocicado.',
    momentos: ['Dia', 'Noite'], clima: ['Ameno', 'Frio'], uso: 'Sofisticado e fácil de reconhecer, vai bem em quase todas as ocasiões.',
  },
  {
    nome: 'Bleu de Chanel', casa: 'Chanel', genero: 'Masculino', linha: 'Grife', familia: 'Aromática amadeirada',
    aliases: ['bleu top', 'bleu de chanel', 'bleu'],
    topo: 'Toranja, limão, hortelã e pimenta-rosa', coracao: 'Gengibre, noz-moscada, jasmim e Iso E Super', fundo: 'Incenso, vetiver, cedro e sândalo',
    historia: 'Lançado em 2010 pela Chanel, o Bleu de Chanel é um dos masculinos mais elegantes e versáteis. Combina frescor cítrico com madeiras e incenso.',
    momentos: ['Dia', 'Noite'], clima: ['Ameno'], uso: 'Elegante para trabalho, reuniões e eventos, e discreto o bastante para o dia a dia.',
  },
  {
    nome: '212 VIP Rosé', casa: 'Carolina Herrera', genero: 'Feminino', linha: 'Grife', familia: 'Floral frutal',
    aliases: ['private rose', '212 vip rose', '212 vip rose'],
    topo: 'Champanhe e frutas', coracao: 'Flor de pêssego', fundo: 'Almíscar branco, notas amadeiradas e âmbar',
    historia: 'Da linha 212 VIP, da Carolina Herrera, o Rosé tem o clima das festas e do champanhe: alegre, frutado e feminino.',
    momentos: ['Noite'], clima: ['Quente', 'Ameno'], uso: 'Leve e festivo, ótimo para saídas, festas e dias quentes.',
  },
  {
    nome: 'Invictus', casa: 'Paco Rabanne', genero: 'Masculino', linha: 'Grife', familia: 'Aquática amadeirada',
    aliases: ['apolo', 'invictus'],
    topo: 'Notas oceânicas, toranja e mandarina', coracao: 'Folha de louro e jasmim', fundo: 'Âmbar cinzento, patchouli, musgo de carvalho e guaiaco',
    historia: 'Lançado em 2013 pela Paco Rabanne, o Invictus tem a energia dos vencedores: fresco, aquático e esportivo.',
    momentos: ['Dia'], clima: ['Quente', 'Ameno'], uso: 'Fresco e animado, é uma boa pedida para o calor, a academia e o dia a dia.',
  },
];

const MAPA = new Map();
FICHAS.forEach((f) => [f.nome, ...f.aliases].forEach((a) => MAPA.set(norm(a), f)));

// Encontra a ficha de uma fragrância do catálogo pelo nome (ignora "Gold" no fim, se não achar direto).
export function acharFicha(nome) {
  const n = norm(nome);
  return MAPA.get(n) || MAPA.get(n.replace(/\bgold\b/g, '').trim()) || null;
}
