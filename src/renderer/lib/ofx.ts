export interface OFXTransacao {
  fitid: string
  data: string
  valor: number
  tipo: 'receita' | 'despesa'
  descricao: string
}

function parseOfxDate(raw: string): string {
  const digits = raw.replace(/[^0-9].*$/, '')
  const y = digits.substring(0, 4)
  const m = digits.substring(4, 6)
  const d = digits.substring(6, 8)
  if (!y || !m || !d) return new Date().toISOString().slice(0, 10)
  return `${y}-${m}-${d}`
}

function getField(block: string, tag: string): string {
  const xmlRe = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i')
  const xmlM = block.match(xmlRe)
  if (xmlM) return xmlM[1].trim()

  const sgmlRe = new RegExp(`<${tag}>([^\r\n<]+)`, 'i')
  const sgmlM = block.match(sgmlRe)
  if (sgmlM) return sgmlM[1].trim()

  return ''
}

function parseBlock(block: string): OFXTransacao | null {
  const fitid = getField(block, 'FITID')
  const dtPosted = getField(block, 'DTPOSTED')
  const trnamtStr = getField(block, 'TRNAMT')
  const descricao =
    getField(block, 'MEMO') || getField(block, 'NAME') || getField(block, 'TRNTYPE') || 'Transação OFX'

  if (!fitid || !dtPosted || !trnamtStr) return null

  const trnamt = parseFloat(trnamtStr.replace(',', '.'))
  if (isNaN(trnamt)) return null

  return {
    fitid,
    data: parseOfxDate(dtPosted),
    valor: Math.abs(trnamt),
    tipo: trnamt >= 0 ? 'receita' : 'despesa',
    descricao: descricao.slice(0, 200),
  }
}

export function parseOFX(content: string): OFXTransacao[] {
  const transactions: OFXTransacao[] = []

  // Try XML-style closed tags first
  const xmlRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  const xmlMatches = [...content.matchAll(xmlRe)]

  if (xmlMatches.length > 0) {
    for (const m of xmlMatches) {
      const t = parseBlock(m[1])
      if (t) transactions.push(t)
    }
    return transactions
  }

  // SGML format: blocks separated by <STMTTRN> without closing tags
  const sgmlParts = content.split(/<STMTTRN>/i).slice(1)
  for (const part of sgmlParts) {
    const endIdx = part.search(/<\/STMTTRN>|<STMTTRN>/i)
    const block = endIdx >= 0 ? part.substring(0, endIdx) : part
    const t = parseBlock(block)
    if (t) transactions.push(t)
  }

  return transactions
}
