import { garantir } from './estoque';

export async function remover(cx, id) {
  await garantir(cx);
  const ref = (await cx.query('select (exists (select 1 from venda_itens where apresentacao_id = $1) or exists (select 1 from movimentos_estoque where apresentacao_id = $1)) as r', [id])).rows[0].r;
  if (ref) {
    await cx.query('update apresentacoes set ativa = false where id = $1', [id]);
    return 'desativado';
  }
  const f = (await cx.query('delete from apresentacoes where id = $1 returning fragrancia_id', [id])).rows[0];
  if (f) await cx.query('delete from fragrancias fr where fr.id = $1 and not exists (select 1 from apresentacoes x where x.fragrancia_id = fr.id)', [f.fragrancia_id]);
  return 'excluido';
}
