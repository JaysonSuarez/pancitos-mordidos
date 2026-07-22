import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './empty.css'
import './components.css'
import {
  supabase, fetchProducts, fetchSettings, saveDeliveryFee,
  saveProduct, deleteProduct, fetchSupplies, saveSupply, deleteSupply,
  fetchOrders, createOrder, updateOrderStatus, deleteOrder,
  pushSupported, isSubscribed, subscribeAdmin, notifyAdmins,
} from './supabase.js'

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (value) => money.format(Number(value) || 0)

/* ---------------- Iconos ---------------- */
function Icon({ name, size = 20 }) {
  const shapes = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    cart: <><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L20 8H7"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></>,
    receipt: <><path d="M5 3h14v18l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5L5 21z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    wallet: <><path d="M4 7a3 3 0 0 1 3-3h11v16H7a3 3 0 0 1-3-3z"/><path d="M4 7h15v8h-4a2 2 0 0 1 0-4h4"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    box: <><path d="M3 8l9-4 9 4v8l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v8"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
    bell: <><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check: <path d="M4 12l5 5L20 6"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>,
    phone: <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>,
    pin: <><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></>,
    edit: <><path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M14 6l4 4"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>
}

/* ---------------- Toasts ---------------- */
const ToastCtx = createContext(() => {})
const useToast = () => useContext(ToastCtx)

function Toasts({ list }) {
  return <div className="toast-wrap">{list.map((t) => <div key={t.id} className={`toast ${t.kind}`}><span>{t.icon}</span>{t.msg}</div>)}</div>
}

/* ---------------- Marca ---------------- */
function Brand({ small = false }) {
  return <div className={`brand ${small ? 'brand-small' : ''}`}><span>PANCITOS</span><strong>mordi</strong><i>2</i></div>
}

/* ---------------- Sonido ---------------- */
function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[880, 1174].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      o.start(t); o.stop(t + 0.5)
    })
  } catch (_) {}
}

/* ---------------- Navegación ---------------- */
function Sidebar({ page, setPage }) {
  const items = [['dashboard', 'grid', 'Resumen'], ['pos', 'cart', 'Nueva venta'], ['orders', 'receipt', 'Pedidos'], ['cash', 'wallet', 'Caja'], ['reports', 'chart', 'Reportes'], ['products', 'box', 'Productos']]
  return (
    <aside className="sidebar">
      <Brand/>
      <nav>{items.map(([id, icon, label]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon name={icon}/><span>{label}</span></button>)}</nav>
      <div className="side-bottom">
        <div className="profile"><span>AM</span><div><strong>Ana María</strong><small>Administradora</small></div></div>
      </div>
    </aside>
  )
}

function Topbar({ title, onOpenMenu, pending, onBell }) {
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onOpenMenu}><Icon name="menu"/></button>
      <div><p>Hoy · operación en vivo</p><h1>{title}</h1></div>
      <div className="top-actions">
        <button className="bell" onClick={onBell}><Icon name="bell"/>{pending > 0 && <em/>}</button>
        <div className="avatar">AM</div>
      </div>
    </header>
  )
}

/* ---------------- Modal genérico ---------------- */
function Modal({ children, onClose }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div></div>
}

/* ---------------- Modal de pedido entrante ---------------- */
function IncomingOrderModal({ order, onAccept, onReject }) {
  const count = (order.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0)
  return (
    <Modal onClose={() => {}}>
      <div className="modal-head alert">
        <span className="ring"><Icon name="bell" size={24}/></span>
        <div><h3>¡Nuevo pedido!</h3><small>Recibido hace un momento · pedido web</small></div>
      </div>
      <div className="modal-body">
        <div className="info-row"><span className="ico"><Icon name="user" size={17}/></span><div><b>Cliente</b><span>{order.customer_name || 'Sin nombre'}</span></div></div>
        <div className="info-row"><span className="ico"><Icon name="phone" size={17}/></span><div><b>Teléfono</b><span>{order.customer_phone || '—'}</span></div></div>
        <div className="info-row"><span className="ico"><Icon name="pin" size={17}/></span><div><b>Dirección</b><span>{order.address || '—'}</span></div></div>
        {order.note ? <div className="info-row"><span className="ico"><Icon name="edit" size={16}/></span><div><b>Observaciones</b><span>{order.note}</span></div></div> : null}

        <div className="order-lines">{(order.items || []).map((it, i) => <div className="order-line" key={i}><span><b>{it.qty}×</b> {it.name}</span><span>{fmt(it.price * it.qty)}</span></div>)}</div>

        <div className="totals">
          <div className="row"><span>Subtotal ({count} prod.)</span><span>{fmt(order.subtotal)}</span></div>
          <div className="row"><span>Domicilio</span><span>{fmt(order.delivery_fee)}</span></div>
          <div className="row"><span>Pago</span><span>{order.payment_method}</span></div>
          <div className="row grand"><span>Total</span><span>{fmt(order.total)}</span></div>
        </div>

        <div className="modal-actions">
          <button className="btn-reject" onClick={onReject}><Icon name="close" size={17}/> Rechazar</button>
          <button className="btn-accept" onClick={onAccept}><Icon name="check" size={18}/> Aceptar pedido</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Panel de notificaciones ---------------- */
function NotifPanel({ orders, pushOn, onEnable, onClose }) {
  const recent = orders.slice(0, 15)
  return (
    <div className="notif-panel">
      <header>
        <h3>Notificaciones</h3>
        {!pushOn && <button onClick={onEnable}>Activar</button>}
      </header>
      <div className="notif-list">
        {recent.length === 0
          ? <div className="notif-empty"><span>🔔</span><p>Aún no hay pedidos. Cuando llegue uno lo verás aquí al instante.</p></div>
          : recent.map((o) => (
            <div key={o.id} className={`notif-item ${o.status === 'Solicitado' ? 'new' : ''}`}>
              <span className="dot">{o.source === 'public' ? '🛵' : '🥪'}</span>
              <div>
                <b>{o.customer_name || (o.source === 'pos' ? 'Venta mostrador' : 'Cliente')}</b>
                <small>{o.status} · {new Date(o.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</small>
              </div>
              <span className="amount">{fmt(o.total)}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ---------------- Banner de permisos ---------------- */
function NotifBanner({ onEnable }) {
  if (!pushSupported()) return null
  return (
    <div className="notif-banner">
      <span className="ico">🔔</span>
      <div><b>Activa las notificaciones</b><p>Recibe los pedidos al instante, aunque tengas la app cerrada.</p></div>
      <button onClick={onEnable}>Activar ahora</button>
    </div>
  )
}

/* ---------------- Dashboard ---------------- */
function Metric({ label, value, note, color }) {
  return <article className={`metric ${color}`}><div><small>{label}</small><h2>{value}</h2><p>{note}</p></div><span className="metric-mark">{color === 'blue' ? '↗' : color === 'orange' ? '↓' : color === 'pink' ? '✦' : '◷'}</span></article>
}

function Dashboard({ setPage, orders }) {
  const today = new Date().toDateString()
  const todays = orders.filter((o) => new Date(o.created_at).toDateString() === today && o.status !== 'Rechazado' && o.status !== 'Solicitado')
  const salesToday = todays.reduce((s, o) => s + o.total, 0)
  const pending = orders.filter((o) => ['Pendiente', 'Preparando', 'Listo'].includes(o.status)).length
  const requests = orders.filter((o) => o.status === 'Solicitado').length
  return (
    <>
      <div className="dashboard-head">
        <div><span className="eyebrow">Así va tu día</span><h2>¡Buen día, Ana! <span>✦</span></h2><p>Tu operación está lista para comenzar.</p></div>
        <button className="primary" onClick={() => setPage('pos')}><Icon name="plus"/> Nueva venta</button>
      </div>
      <section className="metric-grid">
        <Metric label="Ventas de hoy" value={fmt(salesToday)} note={`${todays.length} pedidos hoy`} color="blue"/>
        <Metric label="Pedidos por confirmar" value={String(requests)} note={requests ? 'Revisa las notificaciones' : 'Todo al día'} color="orange"/>
        <Metric label="Pedidos activos" value={String(pending)} note="En cocina y entrega" color="pink"/>
        <Metric label="Total registrado" value={String(orders.length)} note="Pedidos históricos" color="mint"/>
      </section>
      <section className="quick">
        <button onClick={() => setPage('pos')}><span className="quick-icon blue"><Icon name="cart"/></span><b>Registrar venta</b><small>Cobrar en segundos</small></button>
        <button onClick={() => setPage('orders')}><span className="quick-icon pink"><Icon name="receipt"/></span><b>Ver pedidos</b><small>{pending} activos</small></button>
        <button onClick={() => setPage('products')}><span className="quick-icon orange"><Icon name="box"/></span><b>Productos e insumos</b><small>Administra tu menú</small></button>
      </section>
    </>
  )
}

/* ---------------- POS ---------------- */
function POS({ products, addOrder }) {
  const [category, setCategory] = useState('Todos')
  const [cart, setCart] = useState([])
  const [payment, setPayment] = useState('Efectivo')
  const [search, setSearch] = useState('')
  const [note, setNote] = useState('')
  const toast = useToast()
  const shown = products.filter((p) => (category === 'Todos' || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase()))
  const quantity = (id) => cart.find((item) => item.id === id)?.qty || 0
  const change = (product, value) => setCart((current) => {
    const found = current.find((item) => item.id === product.id)
    if (value <= 0) return current.filter((item) => item.id !== product.id)
    return found ? current.map((item) => item.id === product.id ? { ...item, qty: value } : item) : [...current, { id: product.id, name: product.name, price: product.price, qty: value }]
  })
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const complete = async () => {
    if (!cart.length) return
    try {
      await addOrder({ items: cart, subtotal: total, delivery_fee: 0, total, payment_method: payment, note, status: 'Pendiente', source: 'pos' })
      setCart([]); setNote('')
      toast('¡Venta registrada! El pedido está en cocina.', 'ok', '✅')
    } catch (e) { toast('No se pudo registrar la venta.', 'err', '⚠️') }
  }
  return (
    <div className="pos-layout">
      <section className="pos-menu">
        <div className="pos-intro">
          <div><span className="eyebrow">Punto de venta</span><h2>¿Qué va a llevar?</h2></div>
          <label className="search"><Icon name="search"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto"/></label>
        </div>
        <div className="categories">{['Todos', 'Pancitos', 'Bebidas'].map((item) => <button key={item} className={item === category ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="product-grid">{shown.map((product) => (
          <article className="product" key={product.id}>
            <div className={`product-art art-${product.category}`}><span>{product.category === 'Pancitos' ? '🥪' : '🥤'}</span></div>
            <small>{product.tag}</small><h3>{product.name}</h3><strong>{fmt(product.price)}</strong>
            {quantity(product.id) ? <div className="stepper"><button onClick={() => change(product, quantity(product.id) - 1)}>−</button><b>{quantity(product.id)}</b><button onClick={() => change(product, quantity(product.id) + 1)}>+</button></div> : <button className="add" onClick={() => change(product, 1)}><Icon name="plus" size={17}/> Agregar</button>}
          </article>
        ))}</div>
      </section>
      <aside className="order-card">
        <div className="order-title"><div><span className="eyebrow">Pedido actual</span><h2>{cart.length ? 'Nueva orden' : 'Nuevo pedido'}</h2></div><span className="order-count">{cart.reduce((s, i) => s + i.qty, 0)}</span></div>
        {cart.length ? <div className="cart-items">{cart.map((item) => <div className="cart-row" key={item.id}><div><b>{item.qty}×</b><span>{item.name}</span></div><strong>{fmt(item.price * item.qty)}</strong></div>)}</div> : <div className="empty-cart"><span>🥪</span><b>Tu pedido está vacío</b><small>Agrega productos del menú.</small></div>}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observaciones (opcional)"/>
        <div className="pay-label"><span>Forma de pago</span></div>
        <div className="payments">{['Efectivo', 'Nequi', 'Transferencia'].map((m) => <button key={m} onClick={() => setPayment(m)} className={payment === m ? 'pay-selected' : ''}>{m === 'Efectivo' ? '💵' : m === 'Nequi' ? 'N' : '↗'}<small>{m}</small></button>)}</div>
        <div className="total"><span>Total a cobrar</span><strong>{fmt(total)}</strong></div>
        <button className="checkout" disabled={!cart.length} onClick={complete}><span>Registrar venta</span><b>{fmt(total)}</b><Icon name="arrow"/></button>
      </aside>
    </div>
  )
}

/* ---------------- Pedidos ---------------- */
function Confirm({ title, message, confirmLabel = 'Borrar', onConfirm, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-head alert"><span className="ring"><Icon name="trash" size={22}/></span><div><h3>{title}</h3><small>Esta acción no se puede deshacer</small></div></div>
      <div className="modal-body">
        <p style={{ fontFamily: 'var(--legible)', textTransform: 'none', fontSize: 14 }}>{message}</p>
        <div className="modal-actions">
          <button className="btn-reject" onClick={onClose}>Cancelar</button>
          <button className="btn-accept" style={{ background: 'var(--pink)', color: '#fff' }} onClick={onConfirm}><Icon name="trash" size={17}/> {confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}

function Orders({ orders, onAdvance, onDelete }) {
  const statuses = ['Pendiente', 'Preparando', 'Listo', 'Entregado']
  const board = orders.filter((o) => statuses.includes(o.status))
  const [toDelete, setToDelete] = useState(null)
  const confirm = async () => {
    if (!toDelete) return
    await onDelete(toDelete)
    setToDelete(null)
  }
  return (
    <>
      <div className="section-head">
        <div><span className="eyebrow">Cocina y entregas</span><h2>Pedidos de hoy</h2><p>{board.length} pedidos en tablero · {board.filter((o) => o.status !== 'Entregado').length} activos</p></div>
      </div>
      <div className="order-board">{statuses.map((status) => (
        <div className="order-column" key={status}>
          <h3>{status}<span>{board.filter((o) => o.status === status).length}</span></h3>
          {board.filter((o) => o.status === status).map((order) => (
            <article className="ticket" key={order.id}>
              <div><b>#{String(order.id).slice(-4)}</b><small>{new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {order.payment_method}</small></div>
              {order.customer_name ? <p style={{ fontStyle: 'normal', fontWeight: 700 }}>{order.source === 'public' ? '🛵 ' : ''}{order.customer_name}</p> : null}
              <ul>{(order.items || []).map((it, i) => <li key={i}>{it.qty}× {it.name}</li>)}</ul>
              {order.note ? <p>“{order.note}”</p> : null}
              <strong>{fmt(order.total)}</strong>
              <div className="ticket-actions">
                {status !== 'Entregado' && <button onClick={() => onAdvance(order)}>{status === 'Listo' ? 'Marcar entregado' : `Pasar a ${statuses[statuses.indexOf(status) + 1]}`} <Icon name="arrow" size={15}/></button>}
                <button className="del-btn" onClick={() => setToDelete(order)} title="Borrar pedido"><Icon name="trash" size={15}/></button>
              </div>
            </article>
          ))}
        </div>
      ))}</div>
      {toDelete && <Confirm title="¿Borrar pedido?" message={`Se eliminará el pedido #${String(toDelete.id).slice(-4)} de ${toDelete.customer_name || 'mostrador'} ($${fmt(toDelete.total)}).`} onConfirm={confirm} onClose={() => setToDelete(null)}/>}
    </>
  )
}

/* ---------------- Caja ---------------- */
function Cash({ orders }) {
  const today = new Date().toDateString()
  const todays = orders.filter((o) => new Date(o.created_at).toDateString() === today && o.status !== 'Rechazado' && o.status !== 'Solicitado')
  const total = todays.reduce((s, o) => s + o.total, 0)
  const byMethod = ['Efectivo', 'Nequi', 'Transferencia'].map((m) => {
    const sum = todays.filter((o) => o.payment_method === m).reduce((s, o) => s + o.total, 0)
    return [m, sum]
  })
  const icons = { Efectivo: '💵', Nequi: 'N', Transferencia: '↗' }
  return (
    <>
      <div className="section-head"><div><span className="eyebrow">Control diario</span><h2>Caja de hoy</h2><p>{todays.length} transacciones registradas.</p></div></div>
      <div className="cash-hero">
        <div><small>VENTAS REGISTRADAS</small><h2>{fmt(total)}</h2><p>{todays.length} transacciones hoy</p></div>
        <div><small>PEDIDOS WEB</small><h2>{todays.filter((o) => o.source === 'public').length}</h2><p>Recibidos por el link</p></div>
        <div className="cash-profit"><small>TICKET PROMEDIO</small><h2>{fmt(todays.length ? total / todays.length : 0)}</h2><p>Por pedido</p></div>
      </div>
      <div className="cash-grid">
        <section className="panel">
          <div className="panel-title"><div><span className="eyebrow">Desglose</span><h3>Por método de pago</h3></div></div>
          {byMethod.map(([m, sum]) => <div className="payment-row" key={m}><b>{icons[m]}</b><span>{m}</span><strong>{fmt(sum)}</strong><small>{total ? Math.round((sum / total) * 100) : 0}%</small></div>)}
        </section>
        <section className="panel">
          <div className="panel-title"><div><span className="eyebrow">Últimos movimientos</span><h3>Actividad reciente</h3></div></div>
          {todays.length === 0 ? <div className="empty-report compact"><span>◷</span><b>Aún no hay movimientos</b><small>Las ventas aparecerán aquí.</small></div>
            : todays.slice(0, 6).map((o) => <div className="movement" key={o.id}><span><Icon name="check" size={15}/></span><div><strong style={{ marginLeft: 0 }}>{o.customer_name || 'Venta mostrador'}</strong><small>{o.payment_method} · {new Date(o.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</small></div><strong>{fmt(o.total)}</strong></div>)}
        </section>
      </div>
    </>
  )
}

/* ---------------- Reportes ---------------- */
function Reports({ orders }) {
  const valid = orders.filter((o) => o.status !== 'Rechazado' && o.status !== 'Solicitado')
  const income = valid.reduce((s, o) => s + o.total, 0)
  const top = {}
  valid.forEach((o) => (o.items || []).forEach((it) => { top[it.name] = (top[it.name] || 0) + it.qty }))
  const ranking = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5)
  return (
    <>
      <div className="section-head"><div><span className="eyebrow">Analítica simple</span><h2>Reportes</h2><p>Los números importantes de tu negocio.</p></div></div>
      <div className="report-cards">
        <Metric label="Ingresos totales" value={fmt(income)} note={`${valid.length} pedidos`} color="blue"/>
        <Metric label="Pedidos web" value={String(valid.filter((o) => o.source === 'public').length)} note="Recibidos por el link" color="orange"/>
        <Metric label="Ventas mostrador" value={String(valid.filter((o) => o.source === 'pos').length)} note="Punto de venta" color="pink"/>
      </div>
      <section className="panel" style={{ marginTop: 22 }}>
        <div className="panel-title"><div><span className="eyebrow">En el top</span><h3>Más vendidos</h3></div></div>
        {ranking.length === 0 ? <div className="empty-report"><span>📈</span><b>Aún no hay datos</b><small>Cuando registres ventas verás el ranking aquí.</small></div>
          : ranking.map(([name, qty], i) => <div className="payment-row" key={name}><b>{i + 1}</b><span>{name}</span><strong>{qty} und</strong></div>)}
      </section>
    </>
  )
}

/* ---------------- Productos / Insumos ---------------- */
function ProductForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { name: '', price: '', category: 'Pancitos', tag: 'Sencillo' })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const submit = () => { if (!f.name.trim()) return; onSave({ ...f, price: Number(f.price) || 0 }) }
  return (
    <Modal onClose={onClose}>
      <div className="modal-head"><span className="ring"><Icon name="box" size={22}/></span><div><h3>{initial ? 'Editar producto' : 'Nuevo producto'}</h3><small>Se guarda en tu menú al instante</small></div></div>
      <div className="modal-body">
        <div className="field"><label>Nombre</label><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Tocino - Pollo"/></div>
        <div className="field"><label>Precio</label><input type="number" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="3500"/></div>
        <div className="field"><label>Categoría</label><select value={f.category} onChange={(e) => set('category', e.target.value)}><option>Pancitos</option><option>Bebidas</option></select></div>
        <div className="field"><label>Etiqueta</label><input value={f.tag} onChange={(e) => set('tag', e.target.value)} placeholder="Sencillo / Especial / Fría"/></div>
        <div className="modal-actions"><button className="btn-reject" onClick={onClose}>Cancelar</button><button className="btn-accept" onClick={submit}><Icon name="check" size={17}/> Guardar</button></div>
      </div>
    </Modal>
  )
}

function SupplyForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { name: '', unit: 'und', stock: '', min_stock: '', cost: '' })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const submit = () => { if (!f.name.trim()) return; onSave({ ...f, stock: Number(f.stock) || 0, min_stock: Number(f.min_stock) || 0, cost: Number(f.cost) || 0 }) }
  return (
    <Modal onClose={onClose}>
      <div className="modal-head"><span className="ring"><Icon name="box" size={22}/></span><div><h3>{initial ? 'Editar insumo' : 'Nuevo insumo'}</h3><small>Controla tu inventario</small></div></div>
      <div className="modal-body">
        <div className="field"><label>Nombre</label><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Pan artesanal"/></div>
        <div className="field"><label>Unidad</label><select value={f.unit} onChange={(e) => set('unit', e.target.value)}><option>und</option><option>kg</option><option>g</option><option>L</option><option>ml</option><option>paquete</option></select></div>
        <div className="field"><label>Stock actual</label><input type="number" value={f.stock} onChange={(e) => set('stock', e.target.value)} placeholder="0"/></div>
        <div className="field"><label>Stock mínimo (alerta)</label><input type="number" value={f.min_stock} onChange={(e) => set('min_stock', e.target.value)} placeholder="0"/></div>
        <div className="field"><label>Costo por unidad</label><input type="number" value={f.cost} onChange={(e) => set('cost', e.target.value)} placeholder="0"/></div>
        <div className="modal-actions"><button className="btn-reject" onClick={onClose}>Cancelar</button><button className="btn-accept" onClick={submit}><Icon name="check" size={17}/> Guardar</button></div>
      </div>
    </Modal>
  )
}

function Products({ products, reloadProducts, settings, reloadSettings }) {
  const [tab, setTab] = useState('productos')
  const [supplies, setSupplies] = useState([])
  const [editing, setEditing] = useState(null)  // {type, item?}
  const [fee, setFee] = useState(settings.delivery_fee)
  const toast = useToast()

  useEffect(() => { setFee(settings.delivery_fee) }, [settings.delivery_fee])
  useEffect(() => { if (tab === 'insumos') fetchSupplies().then(setSupplies) }, [tab])

  const onSaveProduct = async (p) => { await saveProduct(p); setEditing(null); await reloadProducts(); toast('Producto guardado.', 'ok', '✅') }
  const onDelProduct = async (id) => { await deleteProduct(id); await reloadProducts(); toast('Producto eliminado.', 'ok', '🗑️') }
  const onSaveSupply = async (s) => { await saveSupply(s); setEditing(null); setSupplies(await fetchSupplies()); toast('Insumo guardado.', 'ok', '✅') }
  const onDelSupply = async (id) => { await deleteSupply(id); setSupplies(await fetchSupplies()); toast('Insumo eliminado.', 'ok', '🗑️') }
  const saveFee = async () => { await saveDeliveryFee(Number(fee) || 0); await reloadSettings(); toast('Valor del domicilio actualizado.', 'ok', '🛵') }

  return (
    <>
      <div className="section-head"><div><span className="eyebrow">Administración</span><h2>Productos e insumos</h2><p>Gestiona tu menú, tu inventario y el domicilio.</p></div></div>

      <div className="config-strip">
        <span style={{ fontSize: 26 }}>🛵</span>
        <div><b>Valor del domicilio</b><p>Se suma automáticamente a los pedidos del link.</p></div>
        <div className="cfg-field"><input type="number" value={fee} onChange={(e) => setFee(e.target.value)}/><button onClick={saveFee}>Guardar</button></div>
      </div>

      <div className="tabs">
        <button className={tab === 'productos' ? 'on' : ''} onClick={() => setTab('productos')}>Productos ({products.length})</button>
        <button className={tab === 'insumos' ? 'on' : ''} onClick={() => setTab('insumos')}>Insumos ({supplies.length})</button>
      </div>

      {tab === 'productos' ? (
        <div className="data-grid">
          {products.map((p) => (
            <div className="data-card" key={p.id}>
              <span className="tag-chip">{p.tag || p.category}</span>
              <h4>{p.name}</h4>
              <div className="price">{fmt(p.price)}</div>
              <div className="meta">{p.category}</div>
              <div className="card-actions">
                <button className="btn-edit" onClick={() => setEditing({ type: 'product', item: p })}><Icon name="edit" size={14}/> Editar</button>
                <button className="btn-del" onClick={() => onDelProduct(p.id)}><Icon name="trash" size={14}/> Eliminar</button>
              </div>
            </div>
          ))}
          <button className="add-card" onClick={() => setEditing({ type: 'product' })}><span>＋</span>Agregar producto</button>
        </div>
      ) : (
        <div className="data-grid">
          {supplies.map((s) => (
            <div className="data-card" key={s.id}>
              <span className="tag-chip">Insumo</span>
              <h4>{s.name}</h4>
              <div className="price">{Number(s.stock)} {s.unit}</div>
              <div className="meta">Mínimo: {Number(s.min_stock)} {s.unit} · Costo: {fmt(s.cost)}{Number(s.stock) <= Number(s.min_stock) ? <span className="stock-low"> · ¡Bajo!</span> : ''}</div>
              <div className="card-actions">
                <button className="btn-edit" onClick={() => setEditing({ type: 'supply', item: s })}><Icon name="edit" size={14}/> Editar</button>
                <button className="btn-del" onClick={() => onDelSupply(s.id)}><Icon name="trash" size={14}/> Eliminar</button>
              </div>
            </div>
          ))}
          <button className="add-card" onClick={() => setEditing({ type: 'supply' })}><span>＋</span>Agregar insumo</button>
        </div>
      )}

      {editing?.type === 'product' && <ProductForm initial={editing.item} onSave={onSaveProduct} onClose={() => setEditing(null)}/>}
      {editing?.type === 'supply' && <SupplyForm initial={editing.item} onSave={onSaveSupply} onClose={() => setEditing(null)}/>}
    </>
  )
}

/* ---------------- Menú público (link de pedido) ---------------- */
function PublicMenu() {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({ delivery_fee: 2000, phone: '3103922891' })
  const [cart, setCart] = useState([])
  const [checkout, setCheckout] = useState(false)
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', payment: 'Efectivo', note: '' })

  useEffect(() => { fetchProducts().then(setProducts); fetchSettings().then(setSettings) }, [])

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const deliveryFee = settings.delivery_fee || 0
  const total = subtotal + (cart.length ? deliveryFee : 0)
  const count = cart.reduce((s, i) => s + i.qty, 0)
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }))
  const add = (p) => setCart((c) => { const f = c.find((i) => i.id === p.id); return f ? c.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }] })
  const dec = (p) => setCart((c) => c.map((i) => i.id === p.id ? { ...i, qty: i.qty - 1 } : i).filter((i) => i.qty > 0))
  const qty = (id) => cart.find((i) => i.id === id)?.qty || 0

  const send = async () => {
    if (!form.name.trim() || !form.address.trim() || !cart.length) return
    setSending(true)
    try {
      const order = {
        customer_name: form.name, customer_phone: form.phone, address: form.address,
        items: cart, subtotal, delivery_fee: deliveryFee, total,
        payment_method: form.payment, note: form.note, status: 'Solicitado', source: 'public',
      }
      const saved = await createOrder(order)
      await notifyAdmins(saved)
      setDone(true); setCart([])
    } catch (e) { alert('No se pudo enviar el pedido. Intenta de nuevo.') }
    finally { setSending(false) }
  }

  if (done) return (
    <main className="public-menu">
      <header><Brand small/><a className="wa" href={`https://wa.me/57${settings.phone}`} target="_blank" rel="noreferrer">WhatsApp</a></header>
      <section className="public-products"><div className="order-success">
        <div className="check"><Icon name="check" size={44}/></div>
        <h3>¡Pedido enviado!</h3>
        <p>El local ya recibió tu pedido y lo está confirmando. Pronto te contactan para la entrega. ¡Gracias! ✌️</p>
        <button className="primary" style={{ margin: '22px auto 0' }} onClick={() => { setDone(false); setCheckout(false) }}>Hacer otro pedido</button>
      </div></section>
    </main>
  )

  return (
    <main className="public-menu">
      <header><Brand small/><a href="#menu">Ver menú</a><a className="wa" href={`https://wa.me/57${settings.phone}`} target="_blank" rel="noreferrer">WhatsApp</a></header>
      <section className="public-hero">
        <p>Hechos con mucho sabor</p>
        <h1>Pancitos que<br/><i>enamoran.</i></h1>
        <span>El antojo que siempre cae bien. Pide desde aquí, sin llamadas.</span>
        <a href="#menu">Pedir ahora <Icon name="arrow"/></a>
      </section>

      {checkout ? (
        <section className="public-products">
          <div><span className="eyebrow">Último paso</span><h2>Confirma tu pedido</h2></div>
          <div className="pos-layout" style={{ marginTop: 24 }}>
            <section className="panel">
              <div className="field"><label>Tu nombre *</label><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="¿Cómo te llamas?"/></div>
              <div className="field"><label>Teléfono / WhatsApp</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="300 000 0000"/></div>
              <div className="field"><label>Dirección de entrega *</label><textarea value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Barrio, calle, casa/apto, indicaciones"/></div>
              <div className="field"><label>Forma de pago</label><select value={form.payment} onChange={(e) => set('payment', e.target.value)}><option>Efectivo</option><option>Nequi</option><option>Transferencia</option></select></div>
              <div className="field"><label>Observaciones</label><textarea value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Sin cebolla, extra salsa, etc."/></div>
            </section>
            <aside className="order-card">
              <div className="order-title"><div><span className="eyebrow">Tu pedido</span><h2>Resumen</h2></div><span className="order-count">{count}</span></div>
              <div className="cart-items">{cart.map((i) => <div className="cart-row" key={i.id}><div><b>{i.qty}×</b><span>{i.name}</span></div><strong>{fmt(i.price * i.qty)}</strong></div>)}</div>
              <div className="totals">
                <div className="row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="row"><span>Domicilio</span><span>{fmt(deliveryFee)}</span></div>
                <div className="row grand"><span>Total</span><span>{fmt(total)}</span></div>
              </div>
              <button className="checkout" disabled={sending || !form.name.trim() || !form.address.trim()} onClick={send}><span>{sending ? 'Enviando…' : 'Enviar pedido'}</span><b>{fmt(total)}</b><Icon name="arrow"/></button>
              <button className="btn-reject" style={{ marginTop: 10, boxShadow: 'none' }} onClick={() => setCheckout(false)}>Volver al menú</button>
            </aside>
          </div>
        </section>
      ) : (
        <section id="menu" className="public-products">
          <div><span className="eyebrow">Nuestro menú</span><h2>Elige tus favoritos</h2></div>
          <div className="public-grid">{products.map((p) => (
            <article key={p.id}>
              <div className={`product-art art-${p.category}`}><span>{p.category === 'Bebidas' ? '🥤' : '🥪'}</span></div>
              <small>{p.tag}</small><h3>{p.name}</h3><strong>{fmt(p.price)}</strong>
              {qty(p.id) ? <div className="stepper" style={{ position: 'static', float: 'right', marginTop: 4 }}><button onClick={() => dec(p)}>−</button><b>{qty(p.id)}</b><button onClick={() => add(p)}>+</button></div> : <button onClick={() => add(p)}>+ Agregar</button>}
            </article>
          ))}</div>
        </section>
      )}

      {cart.length > 0 && !checkout && <button className="floating-order" onClick={() => setCheckout(true)}><span>🛒 {count} productos</span><b>Continuar · {fmt(subtotal + deliveryFee)}</b></button>}
    </main>
  )
}

/* ---------------- App ---------------- */
function App() {
  const [page, setPage] = useState(location.hash === '#menu' || location.hash === '#pedir' ? 'public' : 'dashboard')
  const [mobile, setMobile] = useState(false)
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({ delivery_fee: 2000, business_name: 'Pancitos Mordi2', phone: '3103922891' })
  const [orders, setOrders] = useState([])
  const [pushOn, setPushOn] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)
  const [toasts, setToasts] = useState([])
  const knownIds = useRef(new Set())

  const pushToast = useCallback((msg, kind = '', icon = '') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, kind, icon }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const reloadProducts = useCallback(async () => setProducts(await fetchProducts()), [])
  const reloadSettings = useCallback(async () => setSettings(await fetchSettings()), [])

  const isPublic = page === 'public'

  // Carga inicial + realtime (solo modo admin)
  useEffect(() => {
    if (isPublic) return
    reloadProducts(); reloadSettings()
    fetchOrders().then((data) => { data.forEach((o) => knownIds.current.add(o.id)); setOrders(data) })
    isSubscribed().then(setPushOn)

    const channel = supabase.channel('pm_orders_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pm_orders' }, (payload) => {
        const row = payload.new
        setOrders((prev) => prev.some((o) => o.id === row.id) ? prev : [row, ...prev])
        if (!knownIds.current.has(row.id) && row.status === 'Solicitado') {
          knownIds.current.add(row.id); playDing(); pushToast('¡Nuevo pedido recibido!', 'ok', '🔔')
        }
        knownIds.current.add(row.id)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pm_orders' }, (payload) => {
        setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new : o))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [isPublic, reloadProducts, reloadSettings, pushToast])

  const incoming = orders.find((o) => o.status === 'Solicitado')
  const pendingCount = orders.filter((o) => o.status === 'Solicitado').length

  const addOrder = async (order) => { await createOrder(order) }
  const removeOrder = async (order) => {
    try {
      await deleteOrder(order.id)
      setOrders((prev) => prev.filter((o) => o.id !== order.id))
      if (incoming && incoming.id === order.id) {
        // El modal de pedido entrante se cierra al desaparecer `incoming`
      }
      pushToast('Pedido borrado.', 'ok', '🗑️')
    } catch (e) {
      pushToast('No se pudo borrar el pedido.', 'err', '⚠️')
    }
  }
  const advance = async (order) => {
    const flow = ['Pendiente', 'Preparando', 'Listo', 'Entregado']
    const next = flow[Math.min(flow.indexOf(order.status) + 1, 3)]
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: next } : o))
    await updateOrderStatus(order.id, next)
  }
  const acceptIncoming = async () => {
    if (!incoming) return
    setOrders((prev) => prev.map((o) => o.id === incoming.id ? { ...o, status: 'Pendiente' } : o))
    await updateOrderStatus(incoming.id, 'Pendiente')
    pushToast('Pedido aceptado y en cocina.', 'ok', '✅')
  }
  const rejectIncoming = async () => {
    if (!incoming) return
    setOrders((prev) => prev.map((o) => o.id === incoming.id ? { ...o, status: 'Rechazado' } : o))
    await updateOrderStatus(incoming.id, 'Rechazado')
    pushToast('Pedido rechazado.', 'err', '✖️')
  }
  const enablePush = async () => {
    try { await subscribeAdmin(); setPushOn(true); pushToast('¡Notificaciones activadas!', 'ok', '🔔') }
    catch (e) { pushToast(e.message || 'No se pudieron activar.', 'err', '⚠️') }
  }

  if (isPublic) return <ToastCtx.Provider value={pushToast}><PublicMenu/><Toasts list={toasts}/></ToastCtx.Provider>

  const titles = { dashboard: 'Resumen', pos: 'Nueva venta', orders: 'Pedidos', cash: 'Caja', reports: 'Reportes', products: 'Productos' }
  const showBanner = pushSupported() && !pushOn && !dismissedBanner

  return (
    <ToastCtx.Provider value={pushToast}>
      <div className="app-shell">
        <Sidebar page={page} setPage={setPage}/>
        <main className="main">
          <Topbar title={titles[page]} onOpenMenu={() => setMobile(!mobile)} pending={pendingCount} onBell={() => setNotifOpen((v) => !v)}/>
          {mobile && <div className="mobile-nav"><button onClick={() => setMobile(false)}><Icon name="close"/></button>{[['dashboard', 'Resumen'], ['pos', 'Nueva venta'], ['orders', 'Pedidos'], ['cash', 'Caja'], ['reports', 'Reportes'], ['products', 'Productos']].map(([id, label]) => <a key={id} onClick={() => { setPage(id); setMobile(false) }}>{label}</a>)}</div>}
          {notifOpen && <NotifPanel orders={orders} pushOn={pushOn} onEnable={enablePush} onClose={() => setNotifOpen(false)}/>}
          <div className="page-content">
            {showBanner && <NotifBanner onEnable={enablePush}/>}
            {page === 'dashboard' && <Dashboard setPage={setPage} orders={orders}/>}
            {page === 'pos' && <POS products={products} addOrder={addOrder}/>}
            {page === 'orders' && <Orders orders={orders} onAdvance={advance} onDelete={removeOrder}/>}
            {page === 'cash' && <Cash orders={orders}/>}
            {page === 'reports' && <Reports orders={orders}/>}
            {page === 'products' && <Products products={products} reloadProducts={reloadProducts} settings={settings} reloadSettings={reloadSettings}/>}
          </div>
        </main>
      </div>
      {incoming && <IncomingOrderModal order={incoming} onAccept={acceptIncoming} onReject={rejectIncoming}/>}
      <Toasts list={toasts}/>
    </ToastCtx.Provider>
  )
}

createRoot(document.getElementById('root')).render(<App/>)

/* Service worker: registramos siempre para habilitar las notificaciones push. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
