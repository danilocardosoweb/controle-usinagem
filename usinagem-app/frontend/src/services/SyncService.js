// Serviço de sincronização IndexedDB <-> Backend (SQLite)
// Coleções suportadas: 'pedidos', 'apontamentos'

import db from './DatabaseService'

const API_BASE = '/api/sync'

async function pushCollection(store) {
  const changes = await db.getAllChanges(store)
  if (!changes || changes.length === 0) return { pushed: 0 }

  const upserts = []
  const deletes = []
  const idsToClear = []

  for (const ch of changes) {
    if (ch.op === 'upsert') upserts.push(ch.payload)
    else if (ch.op === 'delete') deletes.push(ch.payload?.id)
    idsToClear.push(ch.id)
  }

  const res = await fetch(`${API_BASE}/${store}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upserts, deletes })
  })
  if (!res.ok) throw new Error(`Falha no push de ${store}: ${res.status}`)

  await db.clearChanges(idsToClear)
  return { pushed: upserts.length + deletes.length }
}

async function pullCollection(store) {
  const sinceKey = `last_sync_${store}`
  const since = await db.getSyncMeta(sinceKey)

  const url = new URL(`${API_BASE}/${store}/changes`, window.location.origin)
  if (since) url.searchParams.set('since', since)

  const res = await fetch(url.toString().replace(window.location.origin, ''))
  if (!res.ok) throw new Error(`Falha no pull de ${store}: ${res.status}`)
  const data = await res.json()

  const items = data?.changes || []
  if (items.length > 0) {
    // Aplicar no IndexedDB
    // Estratégia simples: para cada item, put
    for (const it of items) {
      await db.update(store, it)
    }
  }
  if (data?.server_time) await db.setSyncMeta(sinceKey, data.server_time)

  return { pulled: items.length }
}

async function syncAll() {
  const results = {}
  for (const col of ['pedidos', 'apontamentos']) {
    try {
      const p1 = await pushCollection(col)
      const p2 = await pullCollection(col)
      results[col] = { ...p1, ...p2 }
    } catch (e) {
      console.error('Erro de sync', col, e)
      results[col] = { error: String(e) }
    }
  }
  return results
}

export default {
  pushCollection,
  pullCollection,
  syncAll,
}
