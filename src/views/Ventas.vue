<template>
  <div class="ventas-container">
    <header class="header">
      <div class="logo-area">
        <Icon icon="solar:shop-bold-duotone" class="header-logo-icon" />
        <h1>Gestión de Ventas</h1>
      </div>
      
      <!-- Indicador de Red (Sin botón manual) -->
      <div class="header-actions-right">
        <div class="sync-status" :class="isOnline ? 'online' : 'offline'">
          <span class="dot"></span>
          {{ isOnline ? (syncing ? 'Sincronizando...' : 'En línea') : 'Sin conexión' }}
        </div>
      </div>
    </header>

    <!-- FILTROS -->
    <div class="filtros-card">
      <div class="tipo-buttons">
        <button :class="{ active: filtroPago === '' }" @click="filtroPago = ''">Todos</button>
        <button :class="{ active: filtroPago === 'CONTADO' }" @click="filtroPago = 'CONTADO'">Contado</button>
        <button :class="{ active: filtroPago === 'CREDITO' }" @click="filtroPago = 'CREDITO'">Crédito</button>
      </div>
      
      <div class="filtros-inputs">
        <div class="input-group">
          <Icon icon="solar:user-bold-duotone" />
          <select v-model="filtroCliente">
            <option value="">Todos los clientes</option>
            <option v-for="c in listaClientes" :key="c.id || c.nombre || c" :value="c.nombre || c">
              {{ c.nombre || c }}
            </option>
          </select>
        </div>

        <div class="input-group">
          <Icon icon="solar:calendar-bold-duotone" />
          <select v-model="filtroMes">
            <option value="">Meses</option>
            <option v-for="(m, n) in meses" :key="n" :value="n + 1">{{ m }}</option>
          </select>
        </div>

        <div class="input-group search-box">
          <Icon icon="solar:magnifer-linear" />
          <input type="text" v-model="filtroGeneral" placeholder="Buscar general..." />
        </div>
      </div>
    </div>

    <!-- Totales -->
    <div class="totales-grid">
      <div class="total-card">
        <Icon icon="solar:wallet-money-bold-duotone" class="total-icon monto" />
        <div class="total-info">
          <span class="total-label">Total Recarga</span>
          <h3>C$ {{ totalRecarga.toLocaleString() }}</h3>
        </div>
      </div>

      <div class="total-card">
        <Icon icon="solar:chart-square-bold-duotone" class="total-icon ganancia" />
        <div class="total-info">
          <span class="total-label">Ganancia Total</span>
          <h3>C$ {{ totalGanancia.toLocaleString() }}</h3>
        </div>
      </div>
    </div>

    <button class="add-btn" @click="openModal()">
      <Icon icon="solar:add-circle-bold" /> <span class="btn-text">Agregar Venta</span>
    </button>

    <!-- LISTADO DE TARJETAS -->
    <div class="cards" v-if="ventasPaginadas.length > 0">
      <div v-for="venta in ventasPaginadas" :key="venta.id" 
           class="card" 
           :class="{ 
             'credito-card': venta.tipo_pago === 'CREDITO' && !esCancelado(venta), 
             'cancelada-card': esCancelado(venta) 
           }">
        <div class="card-body" @click="openModal(venta)">
          <span class="card-date-badge"><Icon icon="solar:calendar-linear" /> {{ venta.fecha }}</span>
          <div class="card-header-info">
            <span class="cliente"><Icon icon="solar:user-bold" /> {{ venta.cliente }}</span>
            <span class="badge" :class="getBadgeClass(venta)">
              {{ getBadgeText(venta) }}
            </span>
          </div>

          <div class="card-details">
            <div class="detail-row">
              <span class="label">Recarga:</span>
              <span class="value">C$ {{ venta.recarga }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Monto:</span>
              <span class="value">C$ {{ venta.monto }}</span>
            </div>
            
            <template v-if="venta.tipo_pago === 'CREDITO'">
              <div class="detail-row">
                <span class="label">Abonado:</span>
                <span class="value abonado-text">C$ {{ venta.abonado || 0 }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Pendiente:</span>
                <span class="value" :class="esCancelado(venta) ? 'saldado-text' : 'pendiente-text'">
                  C$ {{ (Number(venta.recarga) - Number(venta.abonado || 0)).toFixed(2) }}
                </span>
              </div>
            </template>

            <div class="detail-row highlight-ganancia">
              <span class="label">Ganancia:</span>
              <span class="value ganancia-text">C$ {{ venta.ganancia }}</span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button class="edit" @click.stop="openModal(venta)" title="Editar">
            <Icon icon="solar:pen-new-square-bold" /> Editar
          </button>
          <button class="delete" @click.stop="confirmDelete(venta)" title="Eliminar">
            <Icon icon="solar:trash-bin-trash-bold" /> Eliminar
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <Icon icon="solar:document-text-bold-duotone" class="empty-icon" />
      <p>No se encontraron registros de ventas.</p>
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

    <!-- MODAL DE CREAR / EDITAR -->
    <transition name="modal">
      <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ form.id ? 'Editar Venta' : 'Nueva Venta' }}</h3>
            <button class="close-modal-btn" @click="closeModal">
              <Icon icon="solar:close-circle-bold" />
            </button>
          </div>

          <form @submit.prevent="saveVenta" class="modal-form">
            <!-- FECHA ARRIBA -->
            <div class="form-group">
              <label>Fecha de Venta</label>
              <input type="date" v-model="form.fecha" required class="form-control" />
            </div>

            <div class="form-group">
              <label>Cliente</label>
              <div class="client-select-wrapper">
                <select v-model="form.cliente" required class="form-control">
                  <option disabled value="">Seleccione un cliente...</option>
                  <option v-for="c in clientesFiltrados" :key="c.id || c.nombre || c" :value="c.nombre || c">
                    {{ c.nombre || c }}
                  </option>
                </select>
                <input 
                  type="text" 
                  v-model="busquedaClienteModal" 
                  placeholder="Filtrar clientes..." 
                  class="form-control-sub"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Recarga (C$)</label>
                <input type="number" step="any" v-model.number="form.recarga" @input="calcularGananciaAutomatica" required class="form-control" />
              </div>
              <div class="form-group">
                <label>Monto (C$)</label>
                <input type="number" step="any" v-model.number="form.monto" @input="calcularGananciaAutomatica" required class="form-control" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Tipo de Pago</label>
                <div class="tipo-buttons modal-tipo">
                  <button type="button" :class="{ active: form.tipo_pago === 'CONTADO' }" @click="form.tipo_pago = 'CONTADO'">Contado</button>
                  <button type="button" :class="{ active: form.tipo_pago === 'CREDITO' }" @click="form.tipo_pago = 'CREDITO'">Crédito</button>
                </div>
              </div>
              <div class="form-group">
                <label>Ganancia (C$)</label>
                <input type="number" step="any" v-model.number="form.ganancia" readonly class="form-control ganancia-input" />
              </div>
            </div>

            <div class="form-group" v-if="form.tipo_pago === 'CREDITO'">
              <label>Abonado Inicial (C$)</label>
              <input type="number" step="any" v-model.number="form.abonado" class="form-control" placeholder="0" />
            </div>

            <div class="modal-actions">
              <button type="submit" class="save-btn">Guardar</button>
              <button type="button" class="cancel-btn" @click="closeModal">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- MODAL DE ELIMINAR -->
    <transition name="modal">
      <div v-if="confirmOpen" class="modal-overlay">
        <div class="modal confirm-modal">
          <Icon icon="solar:danger-triangle-bold-duotone" class="warn-icon" />
          <h3>¿Eliminar venta?</h3>
          <p>Esta acción eliminará el registro localmente y se sincronizará.</p>
          <div class="modal-actions">
            <button class="delete-confirm-btn" @click="deleteVenta">Eliminar</button>
            <button class="cancel-btn" @click="confirmOpen = false">Cancelar</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { supabase } from '../supabase/supabase.js'

const listaClientes = ref([])
const ventas = ref([])
const modalOpen = ref(false)
const confirmOpen = ref(false)
const ventaEliminar = ref(null)

const isOnline = ref(navigator.onLine)
const syncing = ref(false)

const filtroPago = ref('')
const filtroCliente = ref('')
const filtroMes = ref('')
const filtroGeneral = ref('')
const busquedaClienteModal = ref('')

const paginaActual = ref(1)
const elementosPorPagina = 6

const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const emptyForm = {
  id: null,
  cliente: '',
  recarga: null,
  monto: null,
  tipo_pago: 'CONTADO',
  abonado: 0,
  ganancia: 0,
  fecha: new Date().toISOString().slice(0, 10)
}
const form = ref({ ...emptyForm })

async function cargarClientesLocales() {
  const storedClientes = localStorage.getItem('valle_clientes')
  if (storedClientes) {
    try {
      const parsed = JSON.parse(storedClientes)
      listaClientes.value = Array.isArray(parsed) ? parsed : []
    } catch (e) {
      listaClientes.value = []
    }
  }

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase.from('clientes').select('*')
      if (!error && data) {
        listaClientes.value = data
        localStorage.setItem('valle_clientes', JSON.stringify(data))
      }
    } catch (e) {
      console.error('No se pudieron descargar los clientes de Supabase:', e)
    }
  }
}

const clientesFiltrados = computed(() => {
  if (!busquedaClienteModal.value) return listaClientes.value
  const busqueda = busquedaClienteModal.value.toLowerCase()
  return listaClientes.value.filter(c => {
    const nombreStr = typeof c === 'string' ? c : (c.nombre || '')
    return nombreStr.toLowerCase().includes(busqueda)
  })
})

onMounted(async () => {
  await cargarClientesLocales()

  const stored = localStorage.getItem('valle_ventas_xochil')
  if (stored) {
    try {
      ventas.value = JSON.parse(stored)
    } catch (e) {
      ventas.value = []
    }
  }

  window.addEventListener('online', handleOnlineStatus)
  window.addEventListener('offline', () => { isOnline.value = false })
  window.addEventListener('storage', handleStorageChange)

  if (isOnline.value) {
    await sincronizarConSupabase()
  }
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
  if (event.key === 'valle_clientes') {
    cargarClientesLocales()
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
    const colaClientes = JSON.parse(localStorage.getItem('valle_clientes_cola') || '[]')
    if (colaClientes.length > 0) {
      for (const clienteItem of colaClientes) {
        if (clienteItem._accion === 'delete') {
          await supabase.from('clientes').delete().eq('id', clienteItem.id)
        } else {
          const payloadCliente = {
            id: clienteItem.id,
            nombre: clienteItem.nombre,
            telefono: clienteItem.telefono
          }
          await supabase.from('clientes').upsert(payloadCliente)
        }
      }
      localStorage.removeItem('valle_clientes_cola')
    }

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

    const { data: dataClientes, error: errorClientes } = await supabase
      .from('clientes')
      .select('*')

    if (!errorClientes && dataClientes) {
      listaClientes.value = dataClientes
      localStorage.setItem('valle_clientes', JSON.stringify(dataClientes))
    }

    const { data: dataVentas, error: errorVentas } = await supabase
      .from('ventas_xochil')
      .select('*')
      .order('fecha', { ascending: false })

    if (!errorVentas && dataVentas) {
      ventas.value = dataVentas
      guardarLocalStorage()
    }
  } catch (e) {
    console.error('Error al sincronizar:', e)
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

function calcularGananciaAutomatica() {
  const recarga = Number(form.value.recarga) || 0
  const monto = Number(form.value.monto) || 0
  form.value.ganancia = Number((recarga - monto).toFixed(2))
}

function esCancelado(venta) {
  if (venta.tipo_pago !== 'CREDITO') return false
  const monto = Number(venta.monto || 0)
  const abonado = Number(venta.abonado || 0)
  return abonado >= monto
}

function getBadgeClass(venta) {
  if (venta.tipo_pago === 'CONTADO') return 'contado'
  if (esCancelado(venta)) return 'badge-cancelada'
  return 'credito'
}

function getBadgeText(venta) {
  if (venta.tipo_pago === 'CONTADO') return 'Cont.'
  if (esCancelado(venta)) return 'CANCELADA'
  return 'Créd.'
}

function openModal(venta = null) {
  cargarClientesLocales()
  form.value = venta ? { ...venta } : { ...emptyForm, fecha: new Date().toISOString().slice(0, 10) }
  busquedaClienteModal.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  form.value = { ...emptyForm }
}

function confirmDelete(venta) {
  ventaEliminar.value = venta
  confirmOpen.value = true
}

async function deleteVenta() {
  const idAEliminar = ventaEliminar.value.id
  ventas.value = ventas.value.filter(v => v.id !== idAEliminar)
  guardarLocalStorage()

  if (navigator.onLine) {
    const { error } = await supabase.from('ventas_xochil').delete().eq('id', idAEliminar)
    if (error) registrarEnCola({ id: idAEliminar }, 'delete')
  } else {
    registrarEnCola({ id: idAEliminar }, 'delete')
  }

  confirmOpen.value = false
  ventaEliminar.value = null
}

async function saveVenta() {
  if (form.value.tipo_pago !== 'CREDITO') {
    form.value.abonado = 0
  }

  if (!form.value.id) {
    form.value.id = 'v_' + Date.now() + Math.random().toString(36).substring(2, 7)
    ventas.value.unshift({ ...form.value })
  } else {
    const index = ventas.value.findIndex(v => v.id === form.value.id)
    if (index !== -1) {
      ventas.value[index] = { ...form.value }
    }
  }

  guardarLocalStorage()
  
  const payloadLimpio = limpiarObjetoParaSupabase(form.value)

  if (navigator.onLine) {
    const { error } = await supabase.from('ventas_xochil').upsert(payloadLimpio)
    if (error) {
      registrarEnCola(form.value)
    }
  } else {
    registrarEnCola(form.value)
  }

  closeModal()
}

const ventasFiltradas = computed(() => {
  return ventas.value.filter(v => {
    if (filtroPago.value && v.tipo_pago !== filtroPago.value) return false
    if (filtroCliente.value && v.cliente !== filtroCliente.value) return false

    if (filtroMes.value) {
      const mesVenta = new Date(v.fecha + 'T00:00:00').getMonth() + 1
      if (mesVenta !== Number(filtroMes.value)) return false
    }
    if (filtroGeneral.value) {
      const texto = filtroGeneral.value.toLowerCase()
      if (!v.cliente.toLowerCase().includes(texto)) return false
    }
    return true
  })
})

const totalRecarga = computed(() => ventasFiltradas.value.reduce((sum, v) => sum + Number(v.recarga || 0), 0))
const totalGanancia = computed(() => ventasFiltradas.value.reduce((sum, v) => sum + Number(v.ganancia || 0), 0))

const totalPaginas = computed(() => Math.ceil(ventasFiltradas.value.length / elementosPorPagina) || 1)

const ventasPaginadas = computed(() => {
  const inicio = (paginaActual.value - 1) * elementosPorPagina
  const fin = inicio + elementosPorPagina
  return ventasFiltradas.value.slice(inicio, fin)
})

watch([filtroPago, filtroCliente, filtroMes, filtroGeneral], () => {
  paginaActual.value = 1
})
</script>

<style scoped>
.ventas-container {
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
  color: #3b82f6;
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

.add-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 0.5rem 0.8rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 10px;
  margin-left: auto;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.filtros-card {
  background: #ffffff;
  padding: 0.75rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.tipo-buttons {
  display: flex;
  gap: 0.3rem;
  background: #f8fafc;
  padding: 3px;
  border-radius: 8px;
}

.tipo-buttons button {
  flex: 1;
  padding: 0.4rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.75rem;
  color: #64748b;
  cursor: pointer;
}

.tipo-buttons button.active {
  background: #ffffff;
  color: #3b82f6;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.filtros-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

.total-icon.monto { background: #eff6ff; color: #3b82f6; }
.total-icon.ganancia { background: #f0fdf4; color: #10b981; }

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

.badge.contado { background: #dcfce7; color: #15803d; }
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
.ganancia-text { color: #10b981 !important; }

.highlight-ganancia {
  background: #f8fafc;
  padding: 3px 6px;
  border-radius: 6px;
  margin-top: 2px;
}

.card-actions {
  display: flex;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}

.card-actions button {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: transparent;
  font-size: 0.78rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.edit { color: #3b82f6; }
.edit:hover { background: #eff6ff; }
.delete { color: #ef4444; }
.delete:hover { background: #fef2f2; }

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  font-size: 0.85rem;
}

.empty-icon { font-size: 36px; margin-bottom: 0.3rem; }

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
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.modal-header h3 { font-size: 1.05rem; font-weight: 700; }

.close-modal-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.form-control {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 0.85rem;
  outline: none;
  background: #f8fafc;
}

.client-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-control-sub {
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px dashed #cbd5e1;
  font-size: 0.75rem;
  background: #ffffff;
  outline: none;
}

.form-row {
  dirplay: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.modal-tipo { margin-top: 2px; }

.ganancia-input {
  background: #f0fdf4 !important;
  color: #10b981;
  font-weight: 700;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.save-btn {
  flex: 1;
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 0.6rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.cancel-btn {
  flex: 1;
  background: #f1f5f9;
  color: #475569;
  border: none;
  padding: 0.6rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.confirm-modal { text-align: center; max-width: 320px; }
.warn-icon { font-size: 40px; color: #f59e0b; margin-bottom: 0.3rem; }

.delete-confirm-btn {
  flex: 1;
  background: #ef4444;
  color: #fff;
  border: none;
  padding: 0.6rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

@media(min-width: 640px) {
  .cards { grid-template-columns: repeat(3, 1fr); }
  .ventas-container { padding: 1.5rem; }
  .header h1 { font-size: 1.5rem; }
  .add-btn { padding: 0.6rem 1.2rem; font-size: 0.95rem; }
}

@media(min-width: 1024px) {
  .cards { grid-template-columns: repeat(4, 1fr); }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>