<template>
  <div class="app">
    <header>
      <h1>Coritos Evangélicos</h1>
      <input v-model="busqueda" placeholder="Buscar corito..." />
    </header>

    <ul class="lista">
      <li
        v-for="corito in coritosFiltrados"
        :key="corito.id"
        @click="abrirModal(corito)"
      >
        {{ corito.titulo }}
      </li>
    </ul>

    <div v-if="mostrarModal" class="modal">
      <div class="modal-content">
        <button class="cerrar" @click="cerrarModal">✕</button>
        <h2>{{ coritoSeleccionado.titulo }}</h2>
        <pre>{{ coritoSeleccionado.letra }}</pre>
        <div class="acciones">
          <button @click="compartirWhatsApp">📱 Compartir</button>
          <button @click="imprimir">🖨️ Imprimir</button>
          <button @click="copiarTexto">📋 Copiar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const coritos = ref([]);
const busqueda = ref("");
const mostrarModal = ref(false);
const coritoSeleccionado = ref(null);

onMounted(async () => {
  try {
    const res = await fetch("/coritos.json");
    if (!res.ok) throw new Error("No se pudo cargar coritos.json");
    coritos.value = await res.json();
  } catch (e) {
    console.error(e);
  }
});

const coritosFiltrados = computed(() =>
  coritos.value.filter((c) =>
    c.titulo.toLowerCase().includes(busqueda.value.toLowerCase())
  )
);

function abrirModal(corito) {
  coritoSeleccionado.value = corito;
  mostrarModal.value = true;
}

function cerrarModal() {
  mostrarModal.value = false;
  coritoSeleccionado.value = null;
}

function compartirWhatsApp() {
  const texto = `📖 *${coritoSeleccionado.value.titulo}*\n\n${coritoSeleccionado.value.letra}`;
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

function imprimir() {
  const titulo = `<h2>${coritoSeleccionado.value.titulo}</h2>`;
  const letra = `<pre>${coritoSeleccionado.value.letra}</pre>`;
  const printWindow = window.open("", "", "width=800,height=600");
  printWindow.document.write(
    `<html><body style="font-family:sans-serif;padding:20px;">${titulo}${letra}</body></html>`
  );
  printWindow.document.close();
  printWindow.print();
}

function copiarTexto() {
  const texto = `📖 ${coritoSeleccionado.value.titulo}\n\n${coritoSeleccionado.value.letra}`;
  navigator.clipboard.writeText(texto).then(() => {
    alert("Texto copiado al portapapeles");
  });
}
</script>

<style scoped>
.app {
  max-width: 600px;
  margin: auto;
  padding: 1rem;
  font-family: "Segoe UI", sans-serif;

  min-height: 100vh;
}

header {
  text-align: center;
  margin-bottom: 1rem;
}

input {
  width: 91%;
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  box-shadow: 0 0 5px #ccc;
}

.lista {
  list-style: none;
  padding: 0;
}

.lista li {
  background: white;
  margin: 0.5rem 0;
  padding: 1rem;
  border-radius: 10px;
  cursor: pointer;
  border: 2px solid #f4f6f8;
  transition: background 0.2s;
}

.lista li:hover {
  background: #e0e0e0;
}

/* Modal actualizado para móviles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  justify-content: center;
  z-index: 1000;
  padding: 0px;

}

.modal-content {
  background: #ffffff;
  padding: 10px;
  padding-top: 80px;
  border-radius: 0;
  text-align: center;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  position: relative;
  box-shadow: none;
}

.cerrar {
  position: absolute;
  top: 2.5rem;
  right: 1rem;
  background: transparent;
  border: none;
  font-size: 2rem;
  color: #333;
}

.acciones {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.acciones button {
  padding: 0.75rem;
  font-size: 1rem;
  width: 10vw;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: #3880ff;
  color: white;
  margin: auto;
  margin-top: 3px;
  
  transition: background 0.2s;
}

.acciones .cerrar-modal {
  background: #ccc;
  color: #000;
}

/* Responsive */
@media (max-width: 600px) {
  .modal-content {
    border-radius: 12px;
    width: 90%;
    height: auto;
    max-height: 90%;
  }

  .acciones button {
  padding: 0.75rem;
  font-size: 1rem;
  width: 40vw;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: #3880ff;
  color: white;
  margin-top: 3px;
  transition: background 0.2s;
}
}
</style>
