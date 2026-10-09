import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ORDER_EDIT_WINDOW_MS,
  calculateOrderTotals,
  canEditOrder,
  mergeOrderItems,
} from './orderUtils.js'

test('allows editing through the 30-minute boundary and blocks expired, future, or rejected orders', () => {
  const now = Date.parse('2026-10-08T18:00:00.000Z')
  const order = { created_at: new Date(now - ORDER_EDIT_WINDOW_MS).toISOString(), status: 'Pendiente' }
  assert.equal(canEditOrder(order, now), true)
  assert.equal(canEditOrder({ ...order, created_at: new Date(now - ORDER_EDIT_WINDOW_MS - 1).toISOString() }, now), false)
  assert.equal(canEditOrder({ ...order, created_at: new Date(now + 1).toISOString() }, now), false)
  assert.equal(canEditOrder({ ...order, status: 'Rechazado' }, now), false)
  assert.equal(canEditOrder({ ...order, created_at: 'invalid' }, now), false)
})

test('merges added quantities into an existing product without changing its captured price', () => {
  const items = mergeOrderItems(
    [{ id: 1, name: 'Suizo', price: 3500, qty: 4 }],
    [{ id: 1, name: 'Suizo', price: 4000, qty: 2 }, { id: 13, name: 'Gaseosa', price: 2000, qty: 1 }],
  )
  assert.deepEqual(items, [
    { id: 1, name: 'Suizo', price: 3500, qty: 6 },
    { id: 13, name: 'Gaseosa', price: 2000, qty: 1 },
  ])
  assert.deepEqual(calculateOrderTotals(items, 2000), { subtotal: 23000, total: 25000 })
})
