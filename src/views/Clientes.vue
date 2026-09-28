<template>
  <div class="clientes-container">
    <header class="header">
      <div class="logo-area">
        <Icon icon="solar:users-group-rounded-bold-duotone" class="header-logo-icon" />
        <h1>Gestión de Clientes</h1>
      </div>
      <!-- Indicador de Red / Sincronización -->
      <div class="sync-status" :class="isOnline ? 'online' : 'offline'">
        <span class="dot"></span>
        {{ isOnline ? (syncing ? 'Sincronizando...' : 'En línea') : 'Sin conexión' }}
      </div>
    </header>

    <!-- FILTROS / BUSCADOR -->
    <div class="filtros-card">
      <div class="filtros-inputs single-input">
        <div class="input-group search-box">
          <Icon icon="solar:magnifer-linear" />
          <input type="text" v-model="filtroGeneral" placeholder="Buscar por nombre o teléfono..." />
        </div>
      </div>
    </div>

    <!-- TOTALES -->
    <div class="totales-grid single-total">
      <div class="total-card">
        <Icon icon="solar:users-bold-duotone" class="total-icon clientes" />
        <div class="total-info">
          <span class="total-label">Total Clientes</span>
          <h3>{{ clientesFiltrados.length }}</h3>
        </div>
      </div>
    </div>

    <button class="add-btn" @click="openModal()">
      <Icon icon="solar:user-plus-bold" /> <span class="btn-text">Nuevo</span>
    </button>

    <!-- LISTADO DE TARJETAS -->
    <div class="cards" v-if="clientesPaginados.length > 0">
      <div v-for="cliente in clientesPaginados" :key="cliente.id" class="card">
        <div class="card-body" @click="openModal(cliente)">
          <div class="card-header-info">
            <span class="cliente-nombre"><Icon icon="solar:user-bold" /> {{ cliente.nombre }}</span>
          </div>
          <div class="card-details">
            <p><Icon icon="solar:phone-bold-duotone" /> Teléfono: <strong>{{ cliente.telefono || 'No especificado' }}</strong></p>
          </div>
        </div>

        <div class="card-actions">
          <button class="edit" @click.stop="openModal(cliente)" title="Editar">
            <Icon icon="solar:pen-new-square-bold" />
          </button>
          <button class="delete" @click.stop="confirmDelete(cliente)" title="Eliminar">
            <Icon icon="solar:trash-bin-trash-bold" />
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <Icon icon="solar:document-text-bold-duotone" class="empty-icon" />
      <p>No se encontraron registros de clientes.</p>
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
            <h3>{{ form.id ? 'Editar Cliente' : 'Nuevo Cliente' }}</h3>
            <button class="close-modal-btn" @click="closeModal">
              <Icon icon="solar:close-circle-bold" />
            </button>
          </div>

          <form @submit.prevent="saveCliente" class="modal-form">
            <div class="form-group">
              <label>Nombre Completo</label>
              <input type="text" v-model="form.nombre" placeholder="Ej. Juan Pérez" required class="form-control" />
            </div>

            <div class="form-group">
              <label>Teléfono</label>
              <input type="text" v-model="form.telefono" placeholder="Ej. 88888888" class="form-control" />
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
          <h3>¿Eliminar cliente?</h3>
          <p>Esta acción eliminará el registro localmente y se sincronizará.</p>
          <div class="modal-actions">
            <button class="delete-confirm-btn" @click="deleteCliente">Eliminar</button>
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

const clientes = ref([])
const modalOpen = ref(false)
const confirmOpen = ref(false)
const clienteEliminar = ref(null)

const isOnline = ref(navigator.onLine)
const syncing = ref(false)

const filtroGeneral = ref('')
const paginaActual = ref(1)
const elementosPorPagina = 6

const emptyForm = { id: null, nombre: '', telefono: '' }
const form = ref({ ...emptyForm })

onMounted(async () => {
  // 1. Cargar datos locales inmediatamente para renderizado rápido
  const stored = localStorage.getItem('valle_clientes')
  if (stored) {
    try {
      clientes.value = JSON.parse(stored)
    } catch (e) {
      clientes.value = []
    }
  }

  // 2. Escuchar eventos de red
  window.addEventListener('online', handleOnlineStatus)
  window.addEventListener('offline', () => { isOnline.value = false })

  // 3. Sincronizar al iniciar si hay internet
  if (isOnline.value) {
    await sincronizarConSupabase()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatus)
  window.removeEventListener('offline', () => { isOnline.value = false })
})

function handleOnlineStatus() {
  isOnline.value = true
  sincronizarConSupabase()
}

function guardarLocalStorage() {
  localStorage.setItem('valle_clientes', JSON.stringify(clientes.value))
}

// Función auxiliar para limpiar el objeto antes de enviarlo a Supabase (evita errores por columnas extra)
function limpiarObjetoParaSupabase(cliente) {
  return {
    id: String(cliente.id),
    nombre: cliente.nombre,
    telefono: cliente.telefono || ''
  }
}

// COLA DE SINCRONIZACIÓN Y ACCESO A SUPABASE
async function sincronizarConSupabase() {
  if (!isOnline.value || syncing.value) return
  syncing.value = true

  try {
    const colaPendiente = JSON.parse(localStorage.getItem('valle_clientes_cola') || '[]')
    
    // 1. Procesar ítem por ítem y limpiar de la cola solo los exitosos
    if (colaPendiente.length > 0) {
      const nuevaCola = []
      
      for (const item of colaPendiente) {
        if (item._accion === 'delete') {
          const { error } = await supabase.from('clientes_xochil').delete().eq('id', item.id)
          if (error) {
            console.error('Error sincronizando eliminación:', error)
            nuevaCola.push(item) // Mantenemos en cola si falló
          }
        } else {
          const payloadLimpio = limpiarObjetoParaSupabase(item)
          const { error } = await supabase.from('clientes_xochil').upsert(payloadLimpio, { onConflict: 'id' })
          
          if (error) {
            console.error('Error sincronizando ítem:', error)
            nuevaCola.push(item) // Mantenemos en cola si falló
          }
        }
      }
      
      // Actualizamos la cola con los que realmente fallaron (si hubo alguno)
      if (nuevaCola.length > 0) {
        localStorage.setItem('valle_clientes_cola', JSON.stringify(nuevaCola))
      } else {
        localStorage.removeItem('valle_clientes_cola')
      }
    }

    // 2. Obtener datos actualizados desde Supabase de forma segura
    const { data, error } = await supabase
      .from('clientes_xochil')
      .select('*')
      .order('nombre', { ascending: true })

    if (!error && data) {
      // FUSIÓN SEGURA: Si hay elementos en la cola pendiente, 
      // asegurémonos de no borrarlos visualmente si el servidor aún no los refleja.
      const colaActual = JSON.parse(localStorage.getItem('valle_clientes_cola') || '[]')
      const idsPendientes = new Set(colaActual.map(i => i.id))
      
      // Mapeamos los datos de Supabase y agregamos los locales pendientes que falten
      const mapRemoto = new Map(data.map(c => [c.id, c]))
      
      // Asegurar que los clientes locales actuales que están en la cola no se pierdan
      clientes.value.forEach(localC => {
        if (idsPendientes.has(localC.id) && !mapRemoto.has(localC.id)) {
          data.push(localC) // Lo retenemos visualmente hasta que la BD lo procese
        }
      })

      // Ordenar nuevamente por nombre
      data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))

      clientes.value = data
      guardarLocalStorage()
    }
  } catch (e) {
    console.error('Error de red al sincronizar clientes:', e)
  } finally {
    syncing.value = false
  }
}

function registrarEnCola(cliente, accion = 'upsert') {
  const cola = JSON.parse(localStorage.getItem('valle_clientes_cola') || '[]')
  const index = cola.findIndex(item => item.id === cliente.id)
  if (index !== -1) {
    cola[index] = { ...cliente, _accion: accion }
  } else {
    cola.push({ ...cliente, _accion: accion })
  }
  localStorage.setItem('valle_clientes_cola', JSON.stringify(cola))
}

function openModal(cliente = null) {
  form.value = cliente ? { ...cliente } : { ...emptyForm }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  form.value = { ...emptyForm }
}

function confirmDelete(cliente) {
  clienteEliminar.value = cliente
  confirmOpen.value = true
}

async function deleteCliente() {
  const idAEliminar = clienteEliminar.value.id
  clientes.value = clientes.value.filter(c => c.id !== idAEliminar)
  guardarLocalStorage()

  if (isOnline.value) {
    const { error } = await supabase.from('clientes_xochil').delete().eq('id', idAEliminar)
    if (error) registrarEnCola({ id: idAEliminar }, 'delete')
  } else {
    registrarEnCola({ id: idAEliminar }, 'delete')
  }

  confirmOpen.value = false
  clienteEliminar.value = null
}

async function saveCliente() {
  const esNuevo = !form.value.id

  if (esNuevo) {
    form.value.id = 'c_' + Date.now() + Math.random().toString(36).substring(2, 7)
    clientes.value.unshift({ ...form.value })
  } else {
    const index = clientes.value.findIndex(c => c.id === form.value.id)
    if (index !== -1) {
      clientes.value[index] = { ...form.value }
    }
  }

  guardarLocalStorage()

  const payloadLimpio = limpiarObjetoParaSupabase(form.value)

  if (isOnline.value) {
    const { error } = await supabase.from('clientes_xochil').upsert(payloadLimpio, { onConflict: 'id' })
    if (error) {
      console.error('Error al guardar en Supabase, enviando a cola:', error)
      registrarEnCola(form.value, 'upsert')
    }
  } else {
    registrarEnCola(form.value, 'upsert')
  }

  closeModal()
}

const clientesFiltrados = computed(() => {
  return clientes.value.filter(c => {
    if (!filtroGeneral.value) return true
    const texto = filtroGeneral.value.toLowerCase()
    const nombreMatch = c.nombre && c.nombre.toLowerCase().includes(texto)
    const telefonoMatch = c.telefono && c.telefono.toLowerCase().includes(texto)
    return nombreMatch || telefonoMatch
  })
})

const totalPaginas = computed(() => Math.ceil(clientesFiltrados.value.length / elementosPorPagina) || 1)

const clientesPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * elementosPorPagina
  const fin = inicio + elementosPorPagina
  return clientesFiltrados.value.slice(inicio, fin)
})

watch(filtroGeneral, () => {
  paginaActual.value = 1
})
</script>

<style scoped>
.clientes-container {
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

/* Indicador de Red */
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

/* FILTROS CARD */
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

.filtros-inputs {
  display: grid;
  grid-template-columns: 1fr;
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

.input-group input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.5rem 0;
  font-size: 0.8rem;
  color: #1e293b;
  outline: none;
}

/* TOTALES GRID */
.totales-grid {
  display: grid;
  grid-template-columns: 1fr;
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

.total-icon.clientes {
  background: #eff6ff;
  color: #3b82f6;
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

/* LISTADO DE TARJETAS */
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

.card-body {
  padding: 0.75rem;
  cursor: pointer;
}

.card-header-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}

.cliente-nombre {
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

.card-details p {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: #475569;
  margin: 0.2rem 0;
}

.card-details strong {
  font-size: 0.75rem;
}

.card-actions {
  display: flex;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}

.card-actions button {
  flex: 1;
  padding: 0.4rem;
  border: none;
  background: transparent;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.edit { color: #3b82f6; }
.edit:hover { background: #eff6ff; }

.delete { color: #ef4444; }
.delete:hover { background: #fef2f2; }

/* EMPTY STATE */
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

/* PAGINACIÓN */
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

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination span {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

/* MODALES */
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

.modal-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
}

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

.confirm-modal {
  text-align: center;
  max-width: 320px;
}

.warn-icon {
  font-size: 40px;
  color: #f59e0b;
  margin-bottom: 0.3rem;
}

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
  .clientes-container { padding: 1.5rem; }
  .header h1 { font-size: 1.5rem; }
  .add-btn { padding: 0.6rem 1.2rem; font-size: 0.95rem; }
}

@media(min-width: 1024px) {
  .cards { grid-template-columns: repeat(4, 1fr); }
}

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>