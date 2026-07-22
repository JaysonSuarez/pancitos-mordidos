import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL || 'https://qyvnuibggfjlaulmmljf.supabase.co'
const ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dm51aWJnZ2ZqbGF1bG1tbGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjIzNDQsImV4cCI6MjA5MTMzODM0NH0.F3Ckkbcfw5OvI8eQpclB1nxs9fR-VaDjsEyLyg8OsIg'

export const supabase = createClient(URL, ANON)

/* ---------- Datos ---------- */
export async function fetchProducts() {
  const { data } = await supabase.from('pm_products').select('*').order('sort')
  return data || []
}
export async function fetchSettings() {
  const { data } = await supabase.from('pm_settings').select('*').eq('id', 1).single()
  return data || { delivery_fee: 2000, business_name: 'Pancitos Mordi2', phone: '3103922891' }
}
export async function saveDeliveryFee(fee) {
  return supabase.from('pm_settings').update({ delivery_fee: fee }).eq('id', 1)
}
export async function saveProduct(product) {
  const row = { name: product.name, price: product.price, category: product.category, tag: product.tag }
  if (product.id) return supabase.from('pm_products').update(row).eq('id', product.id)
  return supabase.from('pm_products').insert(row)
}
export async function deleteProduct(id) {
  return supabase.from('pm_products').delete().eq('id', id)
}
export async function fetchSupplies() {
  const { data } = await supabase.from('pm_supplies').select('*').order('name')
  return data || []
}
export async function saveSupply(supply) {
  const row = { name: supply.name, unit: supply.unit, stock: supply.stock, min_stock: supply.min_stock, cost: supply.cost }
  if (supply.id) return supabase.from('pm_supplies').update(row).eq('id', supply.id)
  return supabase.from('pm_supplies').insert(row)
}
export async function deleteSupply(id) {
  return supabase.from('pm_supplies').delete().eq('id', id)
}
export async function fetchOrders() {
  const { data } = await supabase.from('pm_orders').select('*').order('created_at', { ascending: false }).limit(200)
  return data || []
}
export async function createOrder(order) {
  const { data, error } = await supabase.from('pm_orders').insert(order).select().single()
  if (error) throw error
  return data
}
export async function updateOrderStatus(id, status) {
  return supabase.from('pm_orders').update({ status }).eq('id', id)
}
export async function deleteOrder(id) {
  return supabase.from('pm_orders').delete().eq('id', id)
}

/* ---------- Push web ---------- */
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function isSubscribed() {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub && Notification.permission === 'granted'
  } catch {
    return false
  }
}

export async function subscribeAdmin() {
  if (!pushSupported()) throw new Error('Este navegador no soporta notificaciones push.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Debes permitir las notificaciones en el navegador.')
  const reg = await navigator.serviceWorker.ready
  const { data } = await supabase.from('pm_settings').select('vapid_public_key').eq('id', 1).single()
  if (!data?.vapid_public_key) throw new Error('No hay llave de notificaciones configurada.')
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(data.vapid_public_key),
    })
  }
  const json = sub.toJSON()
  await supabase
    .from('pm_push_subscriptions')
    .upsert({ endpoint: json.endpoint, subscription_data: json, label: (navigator.userAgent || '').slice(0, 80) }, { onConflict: 'endpoint' })
  return true
}

export async function notifyAdmins(order) {
  try {
    return await supabase.functions.invoke('pm-notify-order', { body: { order } })
  } catch (e) {
    console.warn('notifyAdmins fallo (no crítico):', e)
    return null
  }
}
