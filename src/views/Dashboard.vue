<template>
  <div class="dashboard-container">
    <header class="header">
      <div class="logo-area">
        <Icon icon="solar:chart-bold-duotone" class="header-logo-icon" />
        <h1>Panel de Reportes y Estadísticas</h1>
      </div>
      <button class="refresh-btn" @click="cargarDatos">
        <Icon icon="solar:restart-bold" /> <span class="btn-text">Actualizar</span>
      </button>
    </header>

    <!-- FILTROS POR FECHA -->
    <div class="filtros-card">
      <div class="input-group">
        <Icon icon="solar:calendar-bold-duotone" />
        <select v-model="filtroMes">
          <option value="">Todos los meses</option>
          <option v-for="(m, n) in meses" :key="n" :value="n + 1">{{ m }}</option>
        </select>
      </div>

      <div class="input-group">
        <Icon icon="solar:calendar-date-bold-duotone" />
        <input type="date" v-model="filtroDia" class="date-input" />
      </div>

      <button class="clear-filters-btn" @click="limpiarFiltros" v-if="filtroMes || filtroDia">
        <Icon icon="solar:close-circle-bold" /> Limpiar filtros
      </button>
    </div>

    <!-- TARJETAS DE RESUMEN GLOBAL -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon ventas">
          <Icon icon="solar:wallet-money-bold-duotone" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Ventas Totales</span>
          <h3>C$ {{ kpis.totalVentas.toLocaleString() }}</h3>
          <small>{{ kpis.cantidadVentas }} transacciones</small>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon ganancias">
          <Icon icon="solar:chart-square-bold-duotone" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Ganancia Neta</span>
          <h3>C$ {{ kpis.totalGanancias.toLocaleString() }}</h3>
          <small>Margen general estimado</small>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon creditos">
          <Icon icon="solar:hand-money-bold-duotone" />
        </div>
        <div class="metric-info">
          <span class="metric-label">Créditos Pendientes</span>
          <h3>C$ {{ kpis.deudaPendienteTotal.toLocaleString() }}</h3>
          <small>{{ kpis.creditosActivos }} créditos por cobrar</small>
        </div>
      </div>
    </div>

    <!-- SECCIÓN DE REPORTES DETALLADOS -->
    <div class="reports-grid">
      <!-- Reporte 1: Estado de Créditos y Cobros -->
      <div class="report-card">
        <div class="report-header">
          <h3><Icon icon="solar:card-send-bold-duotone" /> Estado de Créditos</h3>
          <span class="badge warning">{{ kpis.creditosActivos }} pendientes</span>
        </div>
        <div class="report-body" v-if="creditosPendientesList.length > 0">
          <div v-for="item in creditosPendientesList" :key="item.id" class="report-item">
            <div class="item-main">
              <strong>{{ item.cliente }}</strong>
              <small>{{ item.fecha }}</small>
            </div>
            <div class="item-values">
              <span class="text-danger">Debe: C$ {{ (item.monto - (item.abonado || 0)).toFixed(2) }}</span>
              <span class="text-muted">Total: C$ {{ item.monto }}</span>
            </div>
          </div>
        </div>
        <div class="empty-report" v-else>
          <p>No hay créditos pendientes bajo este filtro.</p>
        </div>
      </div>

      <!-- Reporte 2: Resumen por Tipo de Pago -->
      <div class="report-card">
        <div class="report-header">
          <h3><Icon icon="solar:pie-chart-2-bold-duotone" /> Distribución de Ingresos</h3>
        </div>
        <div class="report-body distribution-list">
          <div class="dist-row">
            <div class="dist-info">
              <span class="dot contado"></span>
              <span>Ventas de Contado</span>
            </div>
            <strong>C$ {{ kpis.montoContado.toLocaleString() }}</strong>
          </div>
          <div class="dist-row">
            <div class="dist-info">
              <span class="dot credito"></span>
              <span>Ventas al Crédito (Total)</span>
            </div>
            <strong>C$ {{ kpis.montoCredito.toLocaleString() }}</strong>
          </div>
          <div class="dist-row">
            <div class="dist-info">
              <span class="dot abonado"></span>
              <span>Abonos Recaudados</span>
            </div>
            <strong>C$ {{ kpis.totalAbonado.toLocaleString() }}</strong>
          </div>
        </div>
      </div>
    </div>

    
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'

const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const filtroMes = ref('')
const filtroDia = ref('')

const ventasOriginales = ref([])
const creditosPendientesList = ref([])
const ventasFiltradasList = ref([])

const kpis = ref({
  totalVentas: 0,
  cantidadVentas: 0,
  totalGanancias: 0,
  deudaPendienteTotal: 0,
  creditosActivos: 0,
  montoContado: 0,
  montoCredito: 0,
  totalAbonado: 0
})

function cargarDatos() {
  const storedVentas = localStorage.getItem('valle_ventas')
  if (storedVentas) {
    try {
      ventasOriginales.value = JSON.parse(storedVentas)
    } catch (e) {
      ventasOriginales.value = []
    }
  } else {
    ventasOriginales.value = []
  }
  procesarFiltrosYMetricas()
}

function limpiarFiltros() {
  filtroMes.value = ''
  filtroDia.value = ''
}

function procesarFiltrosYMetricas() {
  let filtradas = ventasOriginales.value.filter(v => {
    if (!v.fecha) return true
    if (filtroDia.value && v.fecha !== filtroDia.value) {
      return false
    }
    if (filtroMes.value) {
      const mesVenta = new Date(v.fecha + 'T00:00:00').getMonth() + 1
      if (mesVenta !== Number(filtroMes.value)) {
        return false
      }
    }
    return true
  })

  let tVentas = 0
  let tGanancias = 0
  let tDeuda = 0
  let cActivos = 0
  let mContado = 0
  let mCredito = 0
  let tAbonado = 0
  let creditosPendientes = []

  filtradas.forEach(v => {
    const monto = Number(v.monto || 0)
    const ganancia = Number(v.ganancia || 0)
    const abonado = Number(v.abonado || 0)

    tVentas += monto
    tGanancias += ganancia

    if (v.tipo_pago === 'CONTADO') {
      mContado += monto
    } else if (v.tipo_pago === 'CREDITO') {
      mCredito += monto
      tAbonado += abonado
      const pendiente = monto - abonado
      if (pendiente > 0) {
        cActivos++
        tDeuda += pendiente
        creditosPendientes.push(v)
      }
    }
  })

  kpis.value = {
    totalVentas: tVentas,
    cantidadVentas: filtradas.length,
    totalGanancias: tGanancias,
    deudaPendienteTotal: tDeuda,
    creditosActivos: cActivos,
    montoContado: mContado,
    montoCredito: mCredito,
    totalAbonado: tAbonado
  }

  creditosPendientesList.value = creditosPendientes
  ventasFiltradasList.value = [...filtradas].sort((a, b) => b.id - a.id)
}

watch([filtroMes, filtroDia], () => {
  procesarFiltrosYMetricas()
})

onMounted(() => {
  cargarDatos()
})
</script>

<style scoped>
.dashboard-container {
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

.refresh-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 0.5rem 0.8rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

/* FILTROS CARD */
.filtros-card {
  background: #ffffff;
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
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
  flex: 1;
  min-width: 140px;
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

.clear-filters-btn {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

/* MÉTRICAS / KPIS */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media(min-width: 640px) {
  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.metric-card {
  background: #ffffff;
  padding: 0.85rem;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.metric-icon {
  font-size: 26px;
  padding: 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon.ventas { background: #eff6ff; color: #3b82f6; }
.metric-icon.ganancias { background: #f0fdf4; color: #10b981; }
.metric-icon.creditos { background: #fef3c7; color: #f59e0b; }

.metric-label {
  font-size: 0.65rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  display: block;
}

.metric-card h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0.1rem 0;
}

.metric-card small {
  font-size: 0.65rem;
  color: #94a3b8;
}

/* REPORTES BLOQUES */
.reports-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media(min-width: 768px) {
  .reports-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.report-card, .recent-section {
  background: #ffffff;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  margin-bottom: 1rem;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.report-header h3 {
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #0f172a;
}

.report-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px dashed #f1f5f9;
  font-size: 0.8rem;
}

.item-main {
  display: flex;
  flex-direction: column;
}

.item-main small {
  color: #94a3b8;
  font-size: 0.65rem;
}

.item-values {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.text-danger { color: #d97706; font-weight: 600; }
.text-muted { color: #94a3b8; font-size: 0.65rem; }
.text-success { color: #10b981; font-weight: 600; }

.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.dist-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  background: #f8fafc;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

.dist-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.contado { background: #10b981; }
.dot.credito { background: #f59e0b; }
.dot.abonado { background: #3b82f6; }

/* TABLA RECIENTE */
.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.recent-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  text-align: left;
}

.recent-table th {
  background: #f8fafc;
  color: #64748b;
  padding: 0.5rem;
  font-weight: 600;
}

.recent-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.badge.contado { background: #dcfce7; color: #15803d; }
.badge.credito { background: #fef3c7; color: #b45309; }
.badge.warning { background: #fef3c7; color: #b45309; }

.empty-report {
  text-align: center;
  padding: 1.5rem;
  color: #94a3b8;
  font-size: 0.8rem;
}

@media(min-width: 640px) {
  .dashboard-container { padding: 1.5rem; }
  .header h1 { font-size: 1.35rem; }
}
</style>