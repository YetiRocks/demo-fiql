import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import { syntaxHighlight } from '../utils.ts'

hljs.registerLanguage('json', json)

// Register FIQL language for highlight.js
hljs.registerLanguage('fiql', () => ({
  name: 'FIQL',
  contains: [
    { className: 'keyword', begin: '\\b(select|sort|limit|offset|explain|pagination|stream)\\b' },
    { className: 'attr', begin: '[a-zA-Z_][a-zA-Z0-9_.]*(?=\\s*[=(])' },
    { className: 'symbol', begin: '=(?:gt|ge|lt|le|ne|ct|sw|ew|ft|in|out|gele|~)=' },
    { className: 'symbol', begin: '===|==' },
    { className: 'string', begin: '(?<==)[^&|()!]+' },
    { className: 'punctuation', begin: '[&|()!,]' },
  ],
}))

const BASE_URL = window.location.origin + '/demo-fiql'

interface QueryExample {
  label: string
  description: string
  path: string
}

const QUERIES: QueryExample[] = [
  // ── Basics ──
  {
    label: 'List all products',
    description: 'GET /Products/ — every record in the table',
    path: '/Products/',
  },
  {
    label: 'List all brands',
    description: 'GET /Brand/ — every record in the Brand table',
    path: '/Brand/',
  },
  {
    label: 'Get by ID',
    description: 'GET /Products/prod-001/ — fetch a single record by primary key',
    path: '/Products/prod-001/',
  },

  // ── Equality & Comparison ──
  {
    label: 'Equals (==)',
    description: 'category==electronics — exact match on a field',
    path: '/Products/?category==electronics',
  },
  {
    label: 'Not equal (=ne=)',
    description: 'category=ne=books — everything except books',
    path: '/Products/?category=ne=books',
  },
  {
    label: 'Greater than (=gt=)',
    description: 'price=gt=200 — products over $200',
    path: '/Products/?price=gt=200',
  },
  {
    label: 'Less than or equal (=le=)',
    description: 'price=le=35 — budget-friendly ($35 and under)',
    path: '/Products/?price=le=35',
  },
  {
    label: 'Strict equals (===)',
    description: 'id===prod-001 — exact match, no type coercion',
    path: '/Products/?id===prod-001',
  },
  {
    label: 'Range (=gele=)',
    description: 'price=gele=50,150 — between $50 and $150 inclusive',
    path: '/Products/?price=gele=50,150',
  },
  {
    label: 'Chained range',
    description: 'price=gt=50&lt=200 — inherited attribute chaining',
    path: '/Products/?price=gt=50&lt=200',
  },

  // ── String Matching ──
  {
    label: 'Contains (=ct=)',
    description: 'name=ct=Pro — products with "Pro" in the name',
    path: '/Products/?name=ct=Pro',
  },
  {
    label: 'Starts with (=sw=)',
    description: 'name=sw=Ultra — names starting with "Ultra"',
    path: '/Products/?name=sw=Ultra',
  },
  {
    label: 'Ends with (=ew=)',
    description: 'description=ew=kit — descriptions ending with "kit"',
    path: '/Products/?description=ew=kit',
  },
  {
    label: 'Wildcard prefix',
    description: 'name==Ultra* — wildcard at end of value',
    path: '/Products/?name==Ultra*',
  },
  {
    label: 'Wildcard contains',
    description: 'name==*Pro* — wildcard on both sides',
    path: '/Products/?name==*Pro*',
  },
  {
    label: 'Regex (=~=)',
    description: 'name=~=^Ultra.* — regex pattern match',
    path: '/Products/?name=~=^Ultra.*',
  },
  {
    label: 'Regex case-insensitive',
    description: 'name=~=(?i)pro — case-insensitive regex',
    path: '/Products/?name=~=(?i)pro',
  },

  // ── Full-Text Search ──
  {
    label: 'Full-text single term',
    description: 'description=ft=programming — search indexed text',
    path: '/Products/?description=ft=programming',
  },
  {
    label: 'Full-text multi-term',
    description: 'name=ft=ultra monitor — all terms must match (AND)',
    path: '/Products/?name=ft=ultra%20monitor',
  },

  // ── Set Membership ──
  {
    label: 'In set (=in=)',
    description: 'category=in=electronics,books — match any value in set',
    path: '/Products/?category=in=electronics,books',
  },
  {
    label: 'Not in set (=out=)',
    description: 'category=out=clothing,furniture — exclude values',
    path: '/Products/?category=out=clothing,furniture',
  },

  // ── Type Coercion ──
  {
    label: 'Type prefix: number',
    description: 'price==number:499.99 — force numeric comparison',
    path: '/Products/?price==number:499.99',
  },
  {
    label: 'Type prefix: string',
    description: 'inStock==string:true — match literal string "true"',
    path: '/Products/?inStock==string:true',
  },

  // ── Nested & Array Data ──
  {
    label: 'Nested object field',
    description: 'manufacturer.country==JP — dot-path into nested object',
    path: '/Products/?manufacturer.country==JP',
  },
  {
    label: 'Array element match',
    description: 'tags==popular — match any element in array field',
    path: '/Products/?tags==popular',
  },

  // ── Logical Operators ──
  {
    label: 'AND (&)',
    description: 'category==electronics&inStock==true — both must match',
    path: '/Products/?category==electronics&inStock==true',
  },
  {
    label: 'AND with comparison',
    description: 'category==electronics&price=gt=200 — combine equality + range',
    path: '/Products/?category==electronics&price=gt=200',
  },
  {
    label: 'OR (|)',
    description: 'category==electronics|price=le=25 — either condition',
    path: '/Products/?category==electronics|price=le=25',
  },
  {
    label: 'OR variant',
    description: 'inStock==false|price=gt=500 — out-of-stock or premium',
    path: '/Products/?inStock==false|price=gt=500',
  },
  {
    label: 'NOT condition',
    description: '!(price=gt=100) — negate a single condition',
    path: '/Products/?!(price=gt=100)',
  },
  {
    label: 'NOT group',
    description: '!(category==books&inStock==false) — negate a condition group',
    path: '/Products/?!(category==books&inStock==false)',
  },
  {
    label: 'Grouped OR + AND',
    description: '(category==electronics&price=gt=100)|inStock==false — mixed operators',
    path: '/Products/?(category==electronics&price=gt=100)|inStock==false',
  },

  // ── Field Selection ──
  {
    label: 'Select fields',
    description: 'select=name,price — return only specific fields',
    path: '/Products/?select=name,price',
  },
  {
    label: 'Select + filter',
    description: 'category==sports&select=name,price — filter then project',
    path: '/Products/?category==sports&select=name,price',
  },
  {
    label: 'Select nested fields',
    description: 'select=name,price,manufacturer{name,country} — include nested object fields',
    path: '/Products/?select=name,price,manufacturer{name,country}',
  },

  // ── Sorting ──
  {
    label: 'Sort ascending',
    description: 'sort=name — alphabetical by name',
    path: '/Products/?sort=name',
  },
  {
    label: 'Sort descending',
    description: 'sort=-price — most expensive first',
    path: '/Products/?sort=-price',
  },
  {
    label: 'Sort multi-level',
    description: 'sort=category,-price — category asc, then price desc',
    path: '/Products/?sort=category,-price',
  },
  {
    label: 'Sort + filter',
    description: 'category==books&sort=-price — books, most expensive first',
    path: '/Products/?category==books&sort=-price',
  },

  // ── Pagination ──
  {
    label: 'Pagination: page 1',
    description: 'limit=5&offset=0 — first 5 records',
    path: '/Products/?limit=5&offset=0',
  },
  {
    label: 'Pagination: page 2',
    description: 'limit=5&offset=5 — next 5 records',
    path: '/Products/?limit=5&offset=5',
  },
  {
    label: 'Pagination with total',
    description: 'pagination=true&limit=5 — includes total count in response',
    path: '/Products/?pagination=true&limit=5',
  },

  // ── Function Syntax ──
  {
    label: 'Function: select()',
    description: 'select(name,price) — alternative function-style syntax',
    path: '/Products/?select(name,price)',
  },
  {
    label: 'Function: sort()',
    description: 'sort(-price) — function-style sorting',
    path: '/Products/?sort(-price)',
  },
  {
    label: 'Function: limit()',
    description: 'limit(5,10) — function-style offset and limit',
    path: '/Products/?limit(5,10)',
  },

  // ── Joins & Relationships ──
  {
    label: 'Join: filter by related',
    description: 'brand.name==ViewTech — filter via relationship (semi-join)',
    path: '/Products/?brand.name==ViewTech&stream=false',
  },
  {
    label: 'Join: include related',
    description: 'select=name,price,brand{name,country} — project related fields',
    path: '/Products/?select=name,price,brand{name,country}&limit=5&stream=false',
  },
  {
    label: 'Join: filter + include',
    description: 'brand.country==JP&select=name,brand{name} — filter and project',
    path: '/Products/?brand.country==JP&select=name,brand{name}&stream=false',
  },
  {
    label: 'Reverse join',
    description: 'products.price=gt=500 — query Brand via reverse relationship',
    path: '/Brand/?products.price=gt=500&stream=false',
  },

  // ── Query Introspection ──
  {
    label: 'Explain: query plan',
    description: 'explain=true — view index strategy and estimated cost',
    path: '/Products/?category==electronics&explain=true&stream=false',
  },
  {
    label: 'Explain: composite index',
    description: 'Composite index on (category, price) — shows index optimization',
    path: '/Products/?category==electronics&price=gt=100&explain=true&stream=false',
  },
]

// Known FIQL operators (longest first to avoid partial matches)
const FIQL_OPS = [
  '=gele=', '=out=', '=ne=', '=gt=', '=ge=', '=lt=', '=le=',
  '=ct=', '=sw=', '=ew=', '=ft=', '=in=', '=~=', '===', '==',
]


function buildFiqlUrl(query: QueryExample): string {
  return query.path
}

function tryNumeric(val: string): string | number | boolean {
  if (val === 'true') return true as unknown as number
  if (val === 'false') return false as unknown as number
  const n = Number(val)
  if (!isNaN(n) && val.trim() !== '') return n
  return val
}

interface Condition {
  field: string
  op: string
  value: string | number | boolean | (string | number | boolean)[]
  negate?: boolean
}

interface ResourceQuery {
  table: string
  id?: string
  conditions?: Condition[]
  or?: Condition[][]
  select?: string[]
  sort?: { field: string; descending: boolean }[]
  limit?: number
  offset?: number
  explain?: boolean
  pagination?: boolean
}

function parseConditionString(raw: string, negate?: boolean): Condition[] {
  const conditions: Condition[] = []
  // Split on & for AND conditions, but not inside ()
  const parts = raw.split('&')
  let lastField = ''

  for (const part of parts) {
    if (!part) continue

    // Try each FIQL operator
    let matched = false
    for (const op of FIQL_OPS) {
      const idx = part.indexOf(op)
      if (idx >= 0) {
        let field = part.substring(0, idx)
        const value = decodeURIComponent(part.substring(idx + op.length))

        // Chained attribute: if no field, inherit from previous
        if (!field && lastField) {
          field = lastField
        }
        lastField = field

        const cond: Condition = { field, op: op.replace(/^=|=$/g, '') || '==', value: '' }
        if (negate) cond.negate = true

        // Parse value
        if (op === '=in=' || op === '=out=') {
          cond.value = value.split(',').map(v => tryNumeric(v))
        } else if (op === '=gele=') {
          cond.value = value.split(',').map(v => tryNumeric(v))
        } else {
          cond.value = tryNumeric(value)
        }

        // Clean up == display
        if (op === '==') cond.op = '=='
        if (op === '===') cond.op = '==='

        conditions.push(cond)
        matched = true
        break
      }
    }

    // If no FIQL operator found, might be a chained comparison like "lt=200"
    if (!matched) {
      const chainMatch = part.match(/^(gt|ge|lt|le|ne|ct|sw|ew|ft|in|out)=(.+)$/)
      if (chainMatch && lastField) {
        const [, op, value] = chainMatch
        const cond: Condition = { field: lastField, op, value: tryNumeric(value) }
        if (negate) cond.negate = true
        conditions.push(cond)
      }
    }
  }

  return conditions
}

function parseFiqlToResourceJson(query: QueryExample): string {
  const path = query.path
  // Extract table name and optional ID from path
  const pathPart = path.split('?')[0]
  const segments = pathPart.split('/').filter(Boolean)
  const table = segments[0] || 'Unknown'
  const recordId = segments[1] || null

  // Simple GET by ID
  if (recordId && !path.includes('?')) {
    const result: ResourceQuery = { table, id: recordId }
    return JSON.stringify(result, null, 2)
  }

  // List all (no query params)
  if (!path.includes('?')) {
    const result: ResourceQuery = { table }
    return JSON.stringify(result, null, 2)
  }

  const queryString = path.split('?')[1] || ''
  const result: ResourceQuery = { table }

  // Separate control params from FIQL conditions
  // First handle function syntax: select(...), sort(...), limit(...)
  let remaining = queryString

  // Extract function-style params
  const selectFnMatch = remaining.match(/select\(([^)]+)\)/)
  if (selectFnMatch) {
    result.select = selectFnMatch[1].split(',').map(s => s.trim())
    remaining = remaining.replace(selectFnMatch[0], '').replace(/^&|&$/g, '')
  }

  const sortFnMatch = remaining.match(/sort\(([^)]+)\)/)
  if (sortFnMatch) {
    result.sort = sortFnMatch[1].split(',').map(s => {
      const trimmed = s.trim()
      if (trimmed.startsWith('-')) return { field: trimmed.slice(1), descending: true }
      return { field: trimmed, descending: false }
    })
    remaining = remaining.replace(sortFnMatch[0], '').replace(/^&|&$/g, '')
  }

  const limitFnMatch = remaining.match(/limit\(([^)]+)\)/)
  if (limitFnMatch) {
    const args = limitFnMatch[1].split(',').map(s => parseInt(s.trim()))
    if (args.length === 2) {
      result.offset = args[0]
      result.limit = args[1]
    } else if (args.length === 1) {
      result.limit = args[0]
    }
    remaining = remaining.replace(limitFnMatch[0], '').replace(/^&|&$/g, '')
  }

  // Now parse remaining as key=value control params and FIQL conditions
  // Split on & but preserve FIQL expressions
  const tokens = remaining.split('&').filter(Boolean)
  const fiqlParts: string[] = []

  for (const token of tokens) {
    // Check for control params: select=, sort=, limit=, offset=, explain=, stream=, pagination=
    const eqIdx = token.indexOf('=')
    if (eqIdx > 0) {
      const key = token.substring(0, eqIdx)
      const val = token.substring(eqIdx + 1)

      if (key === 'select' && !result.select) {
        result.select = val.split(',').map(s => s.trim())
        continue
      }
      if (key === 'sort' && !result.sort) {
        result.sort = val.split(',').map(s => {
          const trimmed = s.trim()
          if (trimmed.startsWith('-')) return { field: trimmed.slice(1), descending: true }
          return { field: trimmed, descending: false }
        })
        continue
      }
      if (key === 'limit' && result.limit === undefined) {
        result.limit = parseInt(val)
        continue
      }
      if (key === 'offset' && result.offset === undefined) {
        result.offset = parseInt(val)
        continue
      }
      if (key === 'explain') {
        if (val === 'true') result.explain = true
        continue
      }
      if (key === 'stream') continue // stream is transport-level, skip
      if (key === 'pagination') {
        if (val === 'true') result.pagination = true
        continue
      }
    }

    // Not a control param — it's a FIQL condition
    fiqlParts.push(token)
  }

  // Rejoin FIQL parts and parse conditions
  const fiqlStr = fiqlParts.join('&')
  if (fiqlStr) {
    // Check for OR unions (|)
    if (fiqlStr.includes('|')) {
      // Handle groups: could have (...)| patterns
      const orGroups = fiqlStr.split('|')
      const allGroups: Condition[][] = []
      for (const group of orGroups) {
        const cleaned = group.replace(/^\(|\)$/g, '')
        const conds = parseConditionString(cleaned)
        if (conds.length > 0) allGroups.push(conds)
      }
      if (allGroups.length > 1) {
        result.or = allGroups
      } else if (allGroups.length === 1) {
        result.conditions = allGroups[0]
      }
    } else {
      // Check for NOT: !(...)
      const notMatch = fiqlStr.match(/^!\((.+)\)$/)
      if (notMatch) {
        result.conditions = parseConditionString(notMatch[1], true)
      } else {
        // Check for leading group: (...)
        const cleaned = fiqlStr.replace(/^\(|\)$/g, '')
        const conditions = parseConditionString(cleaned)
        if (conditions.length > 0) result.conditions = conditions
      }
    }
  }

  return JSON.stringify(result, null, 2)
}

// Highlighted code pane (read-only, fills its section)
function CodePane({ language, children }: { language: string; children: string }) {
  const codeRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted')
      hljs.highlightElement(codeRef.current)
    }
  }, [children])
  return (
    <pre className="code-pane"><code ref={codeRef} className={`language-${language}`}>{children}</code></pre>
  )
}

export function FiqlPage() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusBadge, setStatusBadge] = useState<{ text: string; type: 'idle' | 'success' | 'error' }>({ text: 'Ready', type: 'idle' })

  const selectedQuery = selectedIndex !== null ? QUERIES[selectedIndex] : null

  const fiqlUrl = useMemo(() => selectedQuery ? buildFiqlUrl(selectedQuery) : '', [selectedQuery])
  const resourceJson = useMemo(() => selectedQuery ? parseFiqlToResourceJson(selectedQuery) : '', [selectedQuery])

  const selectQuery = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const executeQuery = useCallback(async () => {
    if (selectedIndex === null) return
    const query = QUERIES[selectedIndex]

    setLoading(true)
    setStatusBadge({ text: 'Running...', type: 'idle' })

    try {
      const url = `${BASE_URL}${query.path}`
      const response = await fetch(url, { method: 'GET' })
      const text = await response.text()

      let formatted: string
      try {
        const json = JSON.parse(text)
        formatted = JSON.stringify(json, null, 2)
      } catch {
        formatted = text
      }

      setResult(formatted)
      setStatusBadge({
        text: `${response.status} ${response.statusText}`,
        type: response.ok ? 'success' : 'error',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setResult(message)
      setStatusBadge({ text: 'Error', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [selectedIndex])

  return (
    <>
      {/* Column 1: Query list */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Queries</span>
          <span className="panel-badge">{QUERIES.length}</span>
        </div>
        <div className="panel-body query-list">
          {QUERIES.map((q, i) => (
            <div
              key={i}
              className={`query-item ${selectedIndex === i ? 'active' : ''}`}
              onClick={() => selectQuery(i)}
            >
              <div className="query-item-content">
                <span className="query-item-label">{q.label}</span>
                <div className="query-item-desc">{q.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: FIQL URL + Resource JSON */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">FIQL URL</span>
          <button
            className="btn btn-primary btn-run"
            onClick={executeQuery}
            disabled={loading || selectedIndex === null}
          >
            {loading ? 'Running...' : 'Execute'}
          </button>
        </div>
        <CodePane language="fiql">{fiqlUrl || 'Select a query from the left'}</CodePane>
        <div className="panel-header">
          <span className="panel-title">Resource JSON</span>
          <span className="panel-badge">Parsed</span>
        </div>
        <CodePane language="json">{resourceJson || '{ }'}</CodePane>
      </div>

      {/* Column 3: Results */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Results</span>
          <span className={`panel-badge ${statusBadge.type === 'success' ? 'success' : statusBadge.type === 'error' ? 'error' : ''}`}>
            {statusBadge.text}
          </span>
        </div>
        <div className="panel-body results-body">
          {result ? (
            <pre
              className="results-pre"
              dangerouslySetInnerHTML={{ __html: syntaxHighlight(result) }}
            />
          ) : (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Execute a query to see results</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
