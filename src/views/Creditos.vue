<template>
  <div class="creditos-container">
    <header class="header">
      <div class="logo-area">
        <Icon icon="solar:card-send-bold-duotone" class="header-logo-icon" />
        <h1>Gestión de Créditos</h1>
      </div>

      <!-- Indicador de Red Automático -->
      <div class="header-actions-right">
        <div class="sync-status" :class="isOnline ? 'online' : 'offline'">
          <span class="dot"></span>
          {{ isOnline ? (syncing ? 'Sincronizando...' : 'En línea') : 'Sin conexión' }}
        </div>
      </div>
    </header>

    <!-- FILTROS -->
    <div class="filtros-card">
      <div class="filtros-inputs">
        <div class="input-group">
          <Icon icon="solar:user-bold-duotone" />
          <select v-model="filtroCliente">
            <option value="">Todos los clientes con crédito</option>
            <option v-for="c in clientesConCredito" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="input-group search-box">
          <Icon icon="solar:magnifer-linear" />
          <input type="text" v-model="filtroGeneral" placeholder="Buscar en créditos..." />
        </div>
      </div>
    </div>


    <!-- RESUMEN DE CRÉDITOS (Con barra de porcentaje idéntica a Ventas) -->
    <section class="credito-resumen" v-if="resumenCredito.cantidad > 0">
      <h2 class="resumen-title">
        <Icon icon="solar:bill-list-bold-duotone" /> Resumen de créditos
      </h2>

      <div class="resumen-grid">
        <div class="resumen-card">
          <span class="total-label">Total a crédito</span>
          <h3>C$ {{ fmt(resumenCredito.total) }}</h3>
          <small>{{ resumenCredito.cantidad }} {{ resumenCredito.cantidad === 1 ? 'crédito' : 'créditos' }}</small>
        </div>

        <div class="resumen-card cancelado">
          <span class="total-label">Ya cancelado</span>
          <h3>C$ {{ totalAbonadoGeneral.toLocaleString() }}</h3>
          <small>{{ resumenCredito.canceladas }} {{ resumenCredito.canceladas === 1 ? 'cancelada' : 'canceladas' }}</small>
        </div>

        <div class="resumen-card pendiente">
          <span class="total-label">Pendiente de pagar</span>
          <h3>C$ {{ fmt(resumenCredito.pendiente) }}</h3>
          <small>{{ resumenCredito.pendientes }} con saldo</small>
        </div>
      </div>

      <div class="progreso">
        <div class="progreso-info">
          <span>Cobrado: <strong>C$ {{ fmt(resumenCredito.cobrado) }}</strong></span>
          <span>{{ resumenCredito.porcentaje }}%</span>
        </div>
        <div class="progreso-barra">
          <div class="progreso-relleno" :style="{ width: resumenCredito.porcentaje + '%' }"></div>
        </div>
        <small class="progreso-nota" v-if="resumenCredito.parcial > 0">
          Incluye C$ {{ fmt(resumenCredito.parcial) }} en abonos parciales de créditos aún pendientes.
        </small>
      </div>
    </section>

    <!-- LISTADO DE TARJETAS (Diseño idéntico a Ventas) -->
    <div class="cards" v-if="creditosPaginados.length > 0">
      <div v-for="credito in creditosPaginados" :key="credito.id" 
           class="card" 
           :class="{ 
             'credito-card': !esCancelado(credito), 
             'cancelada-card': esCancelado(credito) 
           }">
        <div class="card-body" @click="!esCancelado(credito) && openAbonoModal(credito)">
          <span class="card-date-badge"><Icon icon="solar:calendar-linear" /> {{ credito.fecha }}</span>
          <div class="card-header-info">
            <span class="cliente"><Icon icon="solar:user-bold" /> {{ credito.cliente }}</span>
            <span class="badge" :class="esCancelado(credito) ? 'badge-cancelada' : 'credito'">
              {{ esCancelado(credito) ? 'CANCELADA' : 'Créd.' }}
            </span>
          </div>

          <div class="card-details">
            <div class="detail-row">
              <span class="label">Total Crédito:</span>
              <span class="value">C$ {{ credito.recarga }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Abonado:</span>
              <span class="value abonado-text">C$ {{ credito.abonado || 0 }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Pendiente:</span>
              <span class="value" :class="esCancelado(credito) ? 'saldado-text' : 'pendiente-text'">
                C$ {{ (Number(credito.recarga) - Number(credito.abonado || 0)).toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button 
            class="abonar-btn" 
            @click.stop="openAbonoModal(credito)" 
            :disabled="esCancelado(credito)"
            :title="esCancelado(credito) ? 'Crédito ya cancelado' : 'Registrar Abono / Pago'"
          >
            <Icon :icon="esCancelado(credito) ? 'solar:check-read-bold' : 'solar:wallet-add-bold'" /> 
            {{ esCancelado(credito) ? 'Saldado' : 'Abonar / Pagar' }}
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <Icon icon="solar:document-text-bold-duotone" class="empty-icon" />
      <p>No hay créditos registrados.</p>
    </div>

    <!-- PAGINACIÓN -->
    <div class="pagination" v-if="totalPaginas > 1">
      <button :disabled="paginaActual === 1" @click="paginaActual--">
        <Icon icon="solar:alt-arrow-left-bold" />
      </button>
      <span>{{ paginaActual }} / {{ totalPaginas }}</span>
      <button :disabled="paginaActual === totalPaginas" @click="paginaActual++">
        <Icon icon="solar:alt-arrow-right-bold" />
      </button>
    </div>

    <!-- MODAL DE ABONO / PAGO -->
    <transition name="modal">
      <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h3>Registrar Abono o Pago</h3>
            <button class="close-modal-btn" @click="closeModal">
              <Icon icon="solar:close-circle-bold" />
            </button>
          </div>

          <form @submit.prevent="saveAbono" class="modal-form">
            <div class="form-group info-credito-modal">
              <p>Cliente: <strong>{{ form.cliente }}</strong></p>
              <p>Deuda Actual: <span class="text-danger">C$ {{ deudaPendienteActual.toFixed(2) }}</span></p>
            </div>

            <div class="form-group">
              <label>Monto a Abonar (C$)</label>
              <input 
                type="number" 
                step="any" 
                v-model.number="montoAbono" 
                placeholder="Ingrese cantidad..." 
                required 
                class="form-control" 
              />
              <small v-if="montoAbono > deudaPendienteActual" class="error-text">
                El abono no puede ser mayor a la deuda pendiente.
              </small>
            </div>

            <div class="modal-actions">
              <button type="submit" class="save-btn" :disabled="!montoAbono || montoAbono <= 0 || montoAbono > deudaPendienteActual">Aplicar Abono</button>
              <button type="button" class="cancel-btn" @click="closeModal">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { supabase } from '../supabase/supabase.js'

const ventas = ref([])
const modalOpen = ref(false)
const creditoSeleccionado = ref(null)
const montoAbono = ref('')

const isOnline = ref(navigator.onLine)
const syncing = ref(false)

const filtroCliente = ref('')
const filtroGeneral = ref('')

const paginaActual = ref(1)
const elementosPorPagina = 6

const form = ref({
  id: null,
  cliente: '',
  recarga: 0,
  abonado: 0
})

async function cargarVentas() {
  const stored = localStorage.getItem('valle_ventas_xochil')
  if (stored) {
    try {
      ventas.value = JSON.parse(stored)
    } catch (e) {
      ventas.value = []
    }
  }

  if (navigator.onLine) {
    await sincronizarConSupabase()
  }
}

onMounted(async () => {
  await cargarVentas()

  window.addEventListener('online', handleOnlineStatus)
  window.addEventListener('offline', () => { isOnline.value = false })
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatus)
  window.removeEventListener('offline', () => { isOnline.value = false })
  window.removeEventListener('storage', handleStorageChange)
})

function handleOnlineStatus() {
  isOnline.value = true
  sincronizarConSupabase()
}

function handleStorageChange(event) {
  if (event.key === 'valle_ventas_xochil') {
    cargarVentas()
  }
}

function guardarLocalStorage() {
  localStorage.setItem('valle_ventas_xochil', JSON.stringify(ventas.value))
}

function limpiarObjetoParaSupabase(venta) {
  return {
    id: venta.id,
    cliente: venta.cliente,
    recarga: Number(venta.recarga) || 0,
    monto: Number(venta.monto) || 0,
    tipo_pago: venta.tipo_pago,
    abonado: Number(venta.abonado) || 0,
    ganancia: Number(venta.ganancia) || 0,
    fecha: venta.fecha
  }
}

async function sincronizarConSupabase() {
  if (syncing.value) return
  isOnline.value = navigator.onLine
  if (!isOnline.value) return

  syncing.value = true

  try {
    const colaPendiente = JSON.parse(localStorage.getItem('valle_ventas_cola') || '[]')
    if (colaPendiente.length > 0) {
      for (const item of colaPendiente) {
        if (item._accion === 'delete') {
          await supabase.from('ventas_xochil').delete().eq('id', item.id)
        } else {
          const payloadLimpio = limpiarObjetoParaSupabase(item)
          await supabase.from('ventas_xochil').upsert(payloadLimpio)
        }
      }
      localStorage.removeItem('valle_ventas_cola')
    }

    const { data, error } = await supabase
      .from('ventas_xochil')
      .select('*')
      .order('fecha', { ascending: false })

    if (!error && data) {
      ventas.value = data
      guardarLocalStorage()
    }
  } catch (e) {
    console.error('Error al sincronizar créditos:', e)
  } finally {
    syncing.value = false
  }
}

function registrarEnCola(venta, accion = 'upsert') {
  const cola = JSON.parse(localStorage.getItem('valle_ventas_cola') || '[]')
  const index = cola.findIndex(item => item.id === venta.id)
  if (index !== -1) {
    cola[index] = { ...venta, _accion: accion }
  } else {
    cola.push({ ...venta, _accion: accion })
  }
  localStorage.setItem('valle_ventas_cola', JSON.stringify(cola))
}

function fmt(n) {
  return Number(n || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function montoCobrado(credito) {
  const recarga = Number(credito.recarga) || 0
  const abonado = Number(credito.abonado) || 0
  return Math.min(abonado, recarga)
}

function saldoPendiente(credito) {
  return (Number(credito.recarga) || 0) - montoCobrado(credito)
}

function esCancelado(credito) {
  const recarga = Number(credito.recarga || 0)
  const abonado = Number(credito.abonado || 0)
  return recarga > 0 && abonado >= recarga
}

const listaCreditos = computed(() => {
  return ventas.value.filter(v => v.tipo_pago === 'CREDITO')
})

const clientesConCredito = computed(() => {
  const unicos = new Set(
    listaCreditos.value
      .map(c => c.cliente ? c.cliente.trim() : '')
      .filter(cliente => cliente !== '') // Ignora valores vacíos o nulos
  )
  return Array.from(unicos)
})

const creditosFiltrados = computed(() => {
  return listaCreditos.value.filter(c => {
    const nombreCliente = (c.cliente || '').trim()

    // Si seleccionó un cliente específico
    if (filtroCliente.value && nombreCliente !== filtroCliente.value) return false

    // Buscador general
    if (filtroGeneral.value) {
      const texto = filtroGeneral.value.toLowerCase()
      if (!nombreCliente.toLowerCase().includes(texto)) return false
    }
    return true
  })
})

const totalPendiente = computed(() => {
  return creditosFiltrados.value.reduce((sum, c) => {
    const recarga = Number(c.recarga || 0)
    const abonado = Number(c.abonado || 0)
    return sum + Math.max(0, recarga - abonado)
  }, 0)
})

const totalAbonadoGeneral = computed(() => {
  return creditosFiltrados.value.reduce((sum, c) => sum + Number(c.abonado || 0), 0)
})

// Resumen de créditos con barra de porcentaje (exactamente igual a Ventas.vue)
const resumenCredito = computed(() => {
  const r = {
    cantidad: 0,
    total: 0,
    cobrado: 0,
    pendiente: 0,
    canceladas: 0,
    canceladoMonto: 0,
    pendientes: 0
  }

  for (const c of creditosFiltrados.value) {
    const recarga = Number(c.recarga) || 0

    r.cantidad++
    r.total += recarga
    r.cobrado += montoCobrado(c)

    if (esCancelado(c)) {
      r.canceladas++
      r.canceladoMonto += recarga
    } else {
      r.pendientes++
      r.pendiente += saldoPendiente(c)
    }
  }

  r.parcial = r.cobrado - r.canceladoMonto
  r.porcentaje = r.total ? Math.round((r.cobrado / r.total) * 100) : 0
  return r
})

const totalPaginas = computed(() => Math.ceil(creditosFiltrados.value.length / elementosPorPagina) || 1)

const creditosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * elementosPorPagina
  const fin = inicio + elementosPorPagina
  return creditosFiltrados.value.slice(inicio, fin)
})

const deudaPendienteActual = computed(() => {
  if (!form.value.recarga) return 0
  const recarga = Number(form.value.recarga || 0)
  const abonado = Number(form.value.abonado || 0)
  return Math.max(0, recarga - abonado)
})

function openAbonoModal(credito) {
  if (esCancelado(credito)) return
  creditoSeleccionado.value = credito
  form.value = { ...credito }
  montoAbono.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  creditoSeleccionado.value = null
  montoAbono.value = ''
}

async function saveAbono() {
  const abonoNum = Number(montoAbono.value) || 0
  if (abonoNum <= 0) return

  if (abonoNum > deudaPendienteActual.value) {
    return
  }

  const index = ventas.value.findIndex(v => v.id === form.value.id)
  if (index !== -1) {
    const actualAbonado = Number(ventas.value[index].abonado || 0)
    const nuevoAbonado = actualAbonado + abonoNum
    
    ventas.value[index].abonado = Number(nuevoAbonado.toFixed(2))

    guardarLocalStorage()

    const ventaActualizada = ventas.value[index]
    const payloadLimpio = limpiarObjetoParaSupabase(ventaActualizada)

    if (navigator.onLine) {
      const { error } = await supabase.from('ventas_xochil').upsert(payloadLimpio)
      if (error) {
        registrarEnCola(ventaActualizada)
      }
    } else {
      registrarEnCola(ventaActualizada)
    }
  }
  closeModal()
}

watch([filtroCliente, filtroGeneral], () => {
  paginaActual.value = 1
})
</script>

<style scoped>
.creditos-container {
  padding: 0.75rem;
  max-width: 1200px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, sans-serif;
  color: #1e293b;
  padding-bottom: 90px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-logo-icon {
  font-size: 26px;
  color: #f59e0b;
}

.header h1 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
}

.header-actions-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
}
.sync-status.online { background: #dcfce7; color: #15803d; }
.sync-status.offline { background: #fee2e2; color: #b91c1c; }
.sync-status .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.filtros-card {
  background: #ffffff;
  padding: 0.75rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  border: 1px solid #f1f5f9;
  margin-bottom: 1rem;
}

.filtros-inputs {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.5rem;
}

@media(max-width: 768px) {
  .filtros-inputs {
    grid-template-columns: 1fr;
  }
}

.input-group {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 0.5rem;
  gap: 0.3rem;
  color: #64748b;
  font-size: 0.8rem;
}

.input-group select, .input-group input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.5rem 0;
  font-size: 0.8rem;
  color: #1e293b;
  outline: none;
}

.totales-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.total-card { 
  background: #ffffff;
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.total-icon {
  font-size: 28px;
  padding: 6px;
  border-radius: 8px;
}

.total-icon.deuda {
  background: #fef3c7;
  color: #d97706;
}

.total-icon.abonado {
  background: #f0fdf4;
  color: #10b981;
}

.total-label {
  font-size: 0.65rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  display: block;
}

.total-card h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

/* Estilos de Resumen / Barra de Porcentaje idénticos a Ventas.vue */
.credito-resumen {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
}

.resumen-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.6rem;
}

.resumen-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.resumen-card {
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.6rem;
  border-left: 4px solid #3b82f6;
}

.resumen-card.cancelado { border-left-color: #10b981; background: #f0fdf4; }
.resumen-card.pendiente { border-left-color: #f59e0b; background: #fffbeb; }

.resumen-card h3 {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0.15rem 0;
}

.resumen-card.cancelado h3 { color: #047857; }
.resumen-card.pendiente h3 { color: #b45309; }

.resumen-card small {
  font-size: 0.65rem;
  color: #64748b;
}

.progreso { margin-top: 0.7rem; }

.progreso-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #475569;
  margin-bottom: 0.3rem;
}

.progreso-barra {
  height: 8px;
  background: #fef3c7;
  border-radius: 9999px;
  overflow: hidden;
}

.progreso-relleno {
  height: 100%;
  background: #10b981;
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.progreso-nota {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.65rem;
  color: #94a3b8;
}

@media(max-width: 480px) {
  .resumen-grid { grid-template-columns: 1fr; }
}

.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.credito-card { border-left: 4px solid #f59e0b; }
.cancelada-card { border-left: 4px solid #10b981; background: #fcfdfd; }

.card-body {
  padding: 0.85rem;
  cursor: pointer;
  position: relative;
}

.card-date-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 500;
  background: #f8fafc;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
}

.card-header-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.6rem;
  margin-top: 20px;
}

.cliente {
  font-weight: 700;
  font-size: 0.9rem;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  width: fit-content;
  letter-spacing: 0.3px;
}

.badge.credito { background: #fef3c7; color: #b45309; }
.badge-cancelada { background: #ecfdf5; color: #047857; }

.card-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border-top: 1px solid #f1f5f9;
  padding-top: 0.5rem;
  margin-top: 0.2rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
}

.detail-row .label { color: #64748b; font-weight: 500; }
.detail-row .value { color: #1e293b; font-weight: 600; }

.abonado-text { color: #10b981 !important; }
.pendiente-text { color: #d97706 !important; }
.saldado-text { color: #047857 !important; }

.card-actions {
  display: flex;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}

.abonar-btn {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0.5rem;
  color: #d97706;
  font-weight: 600;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  cursor: pointer;
  transition: background 0.15s ease;
}
.abonar-btn:hover:not(:disabled) {
  background: #fef3c7;
}
.abonar-btn:disabled {
  color: #94a3b8;
  cursor: not-allowed;
  background: #f1f5f9;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  font-size: 0.85rem;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 0.3rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.pagination button {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination span { font-size: 0.8rem; font-weight: 600; color: #64748b; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 0.75rem;
}

.modal {
  background: #ffffff;
  padding: 1.25rem;
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.modal-header h3 { font-size: 1.05rem; font-weight: 700; }
.close-modal-btn { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; }

.modal-form { display: flex; flex-direction: column; gap: 0.75rem; }
.info-credito-modal { font-size: 0.85rem; background: #f8fafc; padding: 0.5rem; border-radius: 8px; }
.text-danger { color: #d97706; font-weight: bold; }

.form-group label { font-size: 0.75rem; font-weight: 600; color: #475569; display: block; margin-bottom: 0.2rem; }
.form-control { padding: 0.5rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem; outline: none; background: #f8fafc; width: 100%; box-sizing: border-box; }

.error-text {
  color: #ef4444;
  font-size: 0.65rem;
  font-weight: 600;
  margin-top: 0.25rem;
  display: block;
}

.modal-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.save-btn { flex: 1; background: #f59e0b; color: #fff; border: none; padding: 0.6rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cancel-btn { flex: 1; background: #f1f5f9; color: #475569; border: none; padding: 0.6rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }

@media(min-width: 640px) {
  .cards { grid-template-columns: repeat(3, 1fr); }
  .creditos-container { padding: 1.5rem; }
  .header h1 { font-size: 1.5rem; }
}
@media(min-width: 1024px) {
  .cards { grid-template-columns: repeat(4, 1fr); }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>