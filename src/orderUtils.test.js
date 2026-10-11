import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ORDER_EDIT_WINDOW_MS,
  addDaysToDateKey,
  calculateOrderTotals,
  canEditOrder,
  getDailySales,
  getSalesPeriods,
  localDateKey,
  mergeOrderItems,
} from './orderUtils.js'

test('allows editing through the 30-minute boundary and blocks expired, future, or invalid orders', () => {
  const now = Date.parse('2026-10-08T18:00:00.000Z')
  const order = { created_at: new Date(now - ORDER_EDIT_WINDOW_MS).toISOString(), status: 'Pendiente' }
  assert.equal(canEditOrder(order, now), true)
  assert.equal(canEditOrder({ ...order, created_at: new Date(now - ORDER_EDIT_WINDOW_MS - 1).toISOString() }, now), false)
  assert.equal(canEditOrder({ ...order, created_at: new Date(now + 1).toISOString() }, now), false)
  assert.equal(canEditOrder({ ...order, status: 'Rechazado' }, now), true)
  assert.equal(canEditOrder(null, now), false)
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

test('groups sales by Colombia business dates and summarizes today, Monday-to-today week, and month', () => {
  const now = new Date('2026-10-11T17:00:00.000Z')
  const orders = [
    { created_at: '2026-10-11T15:00:00.000Z', total: 12000 },
    { created_at: '2026-10-10T22:30:00.000Z', total: 8000 },
    { created_at: '2026-10-05T15:00:00.000Z', total: 7000 },
    { created_at: '2026-09-30T15:00:00.000Z', total: 99000 },
  ]
  assert.deepEqual(getSalesPeriods(orders, now), {
    day: { count: 1, total: 12000 },
    week: { count: 3, total: 27000 },
    month: { count: 3, total: 27000 },
  })
  assert.equal(localDateKey('2026-10-12T04:59:00.000Z'), '2026-10-11')
  assert.equal(localDateKey('2026-10-12T05:00:00.000Z'), '2026-10-12')
  assert.equal(addDaysToDateKey('2026-10-01', -1), '2026-09-30')
})

test('builds a descending daily sales history with every order for each day', () => {
  const daily = getDailySales([
    { id: 1, created_at: '2026-10-10T18:00:00.000Z', total: 3000 },
    { id: 2, created_at: '2026-10-11T18:00:00.000Z', total: 4000 },
    { id: 3, created_at: '2026-10-10T20:00:00.000Z', total: 5000 },
  ])
  assert.deepEqual(daily.map(({ date, count, total }) => ({ date, count, total })), [
    { date: '2026-10-11', count: 1, total: 4000 },
    { date: '2026-10-10', count: 2, total: 8000 },
  ])
  assert.deepEqual(daily[1].orders.map((order) => order.id), [1, 3])
})
