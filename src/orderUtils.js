export const ORDER_EDIT_WINDOW_MS = 30 * 60 * 1000

export function canEditOrder(order, now = Date.now()) {
  if (!order || order.status === 'Rechazado') return false
  const createdAt = Date.parse(order.created_at)
  const elapsed = now - createdAt
  return Number.isFinite(createdAt) && elapsed >= 0 && elapsed <= ORDER_EDIT_WINDOW_MS
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
