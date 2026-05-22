import { openDB } from 'idb'

const DB_NAME = 'repogps-offline'
const DB_VERSION = 1
const STORE_NAME = 'sync-queue'

const getDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    },
  })

/**
 * Añade un item a la cola de sincronización
 * @param {object} item
 * @param {'form'|'file'} item.type - Tipo de operación
 * @param {number} item.expediente_id - ID del expediente
 * @param {string} item.url - Endpoint API para el sync
 * @param {string} [item.method] - Método HTTP (default: POST)
 * @param {object} [item.body] - Cuerpo de la request (para forms)
 * @param {string} [item.nombre] - Nombre del archivo (para files)
 * @param {ArrayBuffer} [item.archivo_blob] - Contenido del archivo (para files)
 * @param {string} [item.mime_type] - Tipo MIME (para files)
 * @returns {Promise<number>} ID del item creado
 */
export async function enqueue(item) {
  const db = await getDB()
  const entry = {
    type: item.type,
    expediente_id: item.expediente_id,
    url: item.url,
    method: item.method || 'POST',
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    ...(item.body && { body: item.body }),
    ...(item.nombre && { nombre: item.nombre }),
    ...(item.archivo_blob && { archivo_blob: item.archivo_blob }),
    ...(item.mime_type && { mime_type: item.mime_type }),
  }
  const id = await db.add(STORE_NAME, entry)
  return id
}

/**
 * Obtiene todos los items pendientes, ordenados FIFO
 * @returns {Promise<Array>}
 */
export async function getPending() {
  const db = await getDB()
  const items = await db.getAllFromIndex(STORE_NAME, 'status', 'pending')
  return items.sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  )
}

/**
 * Obtiene todos los items fallidos
 * @returns {Promise<Array>}
 */
export async function getFailed() {
  const db = await getDB()
  return db.getAllFromIndex(STORE_NAME, 'status', 'failed')
}

/**
 * Marca un item como sincronizado
 * @param {number} id
 */
export async function markSynced(id) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.store.put({ id, status: 'synced' })
  await tx.done
}

/**
 * Marca un item como fallido permanentemente
 * @param {number} id
 */
export async function markFailed(id) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const item = await tx.store.get(id)
  if (item) {
    item.status = 'failed'
    await tx.store.put(item)
  }
  await tx.done
}

/**
 * Incrementa el contador de reintentos (sin marcar como failed)
 * @param {number} id
 */
export async function incrementRetry(id) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const item = await tx.store.get(id)
  if (item) {
    item.retryCount = (item.retryCount || 0) + 1
    await tx.store.put(item)
  }
  await tx.done
}

/**
 * Obtiene conteo de items pendientes y fallidos
 * @returns {Promise<{pending: number, failed: number}>}
 */
export async function getCount() {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  const pending = all.filter((i) => i.status === 'pending').length
  const failed = all.filter((i) => i.status === 'failed').length
  return { pending, failed }
}

/**
 * Limpia items ya sincronizados (mayores a 7 días)
 */
export async function cleanOldSynced() {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const tx = db.transaction(STORE_NAME, 'readwrite')
  for (const item of all) {
    if (
      item.status === 'synced' &&
      new Date(item.createdAt).getTime() < sevenDaysAgo
    ) {
      await tx.store.delete(item.id)
    }
  }
  await tx.done
}
