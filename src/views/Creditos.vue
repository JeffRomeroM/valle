<template>
  <div class="creditos-container">
    <header class="header">
      <div class="logo-area">
        <Icon icon="solar:card-send-bold-duotone" class="header-logo-icon" />
        <h1>Gestión de Créditos</h1>
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

    <!-- TOTALES DE CRÉDITO -->
    <div class="totales-grid">
      <div class="total-card">
        <Icon icon="solar:wallet-money-bold-duotone" class="total-icon deuda" />
        <div class="total-info">
          <span class="total-label">Deuda Total Pendiente</span>
          <h3>C$ {{ totalPendiente.toLocaleString() }}</h3>
        </div>
      </div>
      <div class="total-card">
        <Icon icon="solar:check-read-bold-duotone" class="total-icon abonado" />
        <div class="total-info">
          <span class="total-label">Total Abonado</span>
          <h3>C$ {{ totalAbonadoGeneral.toLocaleString() }}</h3>
        </div>
      </div>
    </div>

    <!-- LISTADO DE CRÉDITOS -->
    <div class="cards" v-if="creditosPaginados.length > 0">
      <div v-for="credito in creditosPaginados" :key="credito.id" class="card credito-card" :class="{ 'cancelada-card': esCancelado(credito) }">
        <div class="card-body">
          <div class="card-header-info">
            <span class="cliente"><Icon icon="solar:user-bold" /> {{ credito.cliente }}</span>
            <span class="badge" :class="esCancelado(credito) ? 'badge-cancelada' : 'credito'">
              {{ esCancelado(credito) ? 'CANCELADA' : 'CRÉDITO' }}
            </span>
          </div>
          <div class="card-details">
            <p><Icon icon="solar:card-send-bold-duotone" /> Total Crédito: <strong>C$ {{ credito.recarga }}</strong></p>
            <p class="abonado-text"><Icon icon="solar:hand-money-bold-duotone" /> Abonado: <strong>C$ {{ credito.abonado || 0 }}</strong></p>
            <p :class="esCancelado(credito) ? 'saldado-text' : 'pendiente-text'">
              <Icon :icon="esCancelado(credito) ? 'solar:check-circle-bold' : 'solar:danger-circle-bold-duotone'" /> 
              Pendiente: <strong>C$ {{ (Number(credito.recarga) - Number(credito.abonado || 0)).toFixed(2) }}</strong>
            </p>
            <small><Icon icon="solar:calendar-linear" /> Fecha: {{ credito.fecha }}</small>
          </div>
        </div>

        <div class="card-actions">
          <button 
            class="abonar-btn" 
            @click="openAbonoModal(credito)" 
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
              <button type="submit" class="save-btn" :disabled="montoAbono > deudaPendienteActual">Aplicar Abono</button>
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

const ventas = ref([])
const modalOpen = ref(false)
const creditoSeleccionado = ref(null)
const montoAbono = ref(0)

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

function cargarVentas() {
  const stored = localStorage.getItem('valle_ventas')
  if (stored) {
    try {
      ventas.value = JSON.parse(stored)
    } catch (e) {
      ventas.value = []
    }
  }
}

onMounted(() => {
  cargarVentas()
  window.addEventListener('storage', handleStorageChange)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})

function handleStorageChange(event) {
  if (event.key === 'valle_ventas') {
    cargarVentas()
  }
}

function guardarLocalStorage() {
  localStorage.setItem('valle_ventas', JSON.stringify(ventas.value))
}

// Función auxiliar para determinar si un crédito ya está cancelado
function esCancelado(credito) {
  const recarga = Number(credito.recarga || 0)
  const abonado = Number(credito.abonado || 0)
  return abonado >= recarga
}

// Mantenemos el filtro que pertenezcan originalmente a tipo CREDITO
const listaCreditos = computed(() => {
  return ventas.value.filter(v => v.tipo_pago === 'CREDITO')
})

const clientesConCredito = computed(() => {
  const unicos = new Set(listaCreditos.value.map(c => c.cliente))
  return Array.from(unicos)
})

const creditosFiltrados = computed(() => {
  return listaCreditos.value.filter(c => {
    if (filtroCliente.value && c.cliente !== filtroCliente.value) return false
    if (filtroGeneral.value) {
      const texto = filtroGeneral.value.toLowerCase()
      if (!c.cliente.toLowerCase().includes(texto)) return false
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
  montoAbono.value = 0
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  creditoSeleccionado.value = null
  montoAbono.value = 0
}

function saveAbono() {
  const abonoNum = Number(montoAbono.value) || 0
  if (abonoNum <= 0) return

  if (abonoNum > deudaPendienteActual.value) {
    return
  }

  const index = ventas.value.findIndex(v => v.id === form.value.id)
  if (index !== -1) {
    const actualAbonado = Number(ventas.value[index].abonado || 0)
    const nuevoAbonado = actualAbonado + abonoNum
    
    // Solo actualizamos el abonado, asegurando que tipo_pago se quede como 'CREDITO'
    ventas.value[index].abonado = Number(nuevoAbonado.toFixed(2))

    guardarLocalStorage()
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

.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.credito-card {
  border-left: 3px solid #f59e0b;
}

.cancelada-card {
  border-left: 3px solid #10b981;
  background: #fcfdfd;
}

.card-body {
  padding: 0.75rem;
}

.card-header-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}

.cliente {
  font-weight: 700;
  font-size: 0.85rem;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge.credito {
  background: #fef3c7;
  color: #b45309;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  width: fit-content;
}

.badge-cancelada {
  background: #ecfdf5;
  color: #047857;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  width: fit-content;
}

.card-details p {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: #475569;
  margin: 0.2rem 0;
}

.abonado-text { color: #10b981 !important; }
.pendiente-text { color: #d97706 !important; }
.saldado-text { color: #047857 !important; }

.card-details small {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: #94a3b8;
  font-size: 0.65rem;
  margin-top: 0.4rem;
}

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
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  cursor: pointer;
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
}
@media(min-width: 1024px) {
  .cards { grid-template-columns: repeat(4, 1fr); }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>