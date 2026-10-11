export const ORDER_EDIT_WINDOW_MS = 30 * 60 * 1000
export const BUSINESS_TIME_ZONE = 'America/Bogota'

export function canEditOrder(order, now = Date.now()) {
  if (!order) return false
  const createdAt = Date.parse(order.created_at)
  const elapsed = now - createdAt
  return Number.isFinite(createdAt) && elapsed >= 0 && elapsed <= ORDER_EDIT_WINDOW_MS
}

export function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${values.year}-${values.month}-${values.day}`
}

export function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-')
}

function summarizeOrders(orders) {
  return { count: orders.length, total: orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0) }
}

export function getSalesPeriods(orders = [], now = new Date()) {
  const today = localDateKey(now)
  const [year, month, day] = today.split('-').map(Number)
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7
  const weekStart = addDaysToDateKey(today, -daysSinceMonday)
  const monthStart = `${today.slice(0, 7)}-01`
  const keyedOrders = orders.map((order) => ({ order, date: localDateKey(order.created_at) }))
  return {
    day: summarizeOrders(keyedOrders.filter(({ date }) => date === today).map(({ order }) => order)),
    week: summarizeOrders(keyedOrders.filter(({ date }) => date >= weekStart && date <= today).map(({ order }) => order)),
    month: summarizeOrders(keyedOrders.filter(({ date }) => date >= monthStart && date <= today).map(({ order }) => order)),
  }
}

export function getDailySales(orders = []) {
  const byDate = new Map()
  for (const order of orders) {
    const date = localDateKey(order.created_at)
    if (!date) continue
    const day = byDate.get(date) || { date, orders: [], total: 0 }
    day.orders.push(order)
    day.total += Number(order.total) || 0
    byDate.set(date, day)
  }
  return [...byDate.values()]
    .map((day) => ({ ...day, count: day.orders.length }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function mergeOrderItems(existingItems = [], addedItems = []) {
  const itemsByKey = new Map()
  for (const item of [...existingItems, ...addedItems]) {
    const qty = Number(item.qty) || 0
    if (qty <= 0) continue
    const normalizedName = String(item.name || '').trim().toLocaleLowerCase()
    const key = item.id != null ? `id:${item.id}` : `name:${normalizedName}`
    const current = itemsByKey.get(key)
    itemsByKey.set(key, current ? { ...current, qty: current.qty + qty } : { ...item, qty })
  }
  return [...itemsByKey.values()]
}

export function calculateOrderTotals(items = [], deliveryFee = 0) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0)
  const fee = Number(deliveryFee) || 0
  return { subtotal, total: subtotal + fee }
}
