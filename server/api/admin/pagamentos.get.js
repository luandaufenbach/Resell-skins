// GET /api/admin/pagamentos?mes=AAAA-MM  ou  ?loja=<id>
// Pagamentos de um mês (padrão: o mês atual, no horário de Brasília) ou todos os de uma loja, do
// mais novo ao mais antigo. `total` é a soma das mesmas linhas da lista, em reais.
const LOTE = 1000
// O Brasil não tem horário de verão desde 2019: o mês vai da meia-noite em -03:00 à seguinte.
const BRASILIA = '-03:00'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  let filter
  let month = null
  if (query.loja != null) {
    if (!isStoreId(query.loja)) throw invalid('INVALID_FIELD')
    filter = { loja_id: `eq.${query.loja}` }
  } else {
    month = query.mes == null ? currentMonth() : String(query.mes)
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month)
    if (!match) throw invalid('INVALID_FIELD')
    const [year, number] = [Number(match[1]), Number(match[2])]
    const next = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
    filter = { and: `(pago_em.gte.${month}-01T00:00:00${BRASILIA},pago_em.lt.${next}-01T00:00:00${BRASILIA})` }
  }

  const rows = []
  try {
    for (let offset = 0; ; offset += LOTE) {
      const page = await supabase('/rest/v1/pagamentos', {
        query: {
          ...filter,
          select: 'id,valor,meses,pago_em,pago_ate,observacao,registrado_por,loja_id,lojas(slug,nome_loja,nome)',
          order: 'pago_em.desc,id.desc',
          limit: LOTE,
          offset,
        },
      })
      rows.push(...page)
      if (page.length < LOTE) break
    }
  } catch (error) {
    throw unavailable('admin', error)
  }

  const payments = rows.map((row) => ({
    id: row.id,
    value: Number(row.valor),
    months: row.meses,
    paidAt: row.pago_em,
    paidUntil: row.pago_ate,
    note: row.observacao ?? '',
    by: row.registrado_por ?? null,
    store: row.lojas ? { id: row.loja_id, slug: row.lojas.slug, name: storeName(row.lojas) } : null,
  }))
  // Em centavos, para a soma não acumular erro de ponto flutuante.
  const cents = payments.reduce((sum, p) => sum + Math.round(p.value * 100), 0)
  return { month, payments, total: cents / 100 }
})

function currentMonth() {
  const [{ value: year }, , { value: month }] = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).formatToParts(new Date())
  return `${year}-${month}`
}
