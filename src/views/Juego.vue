<template>
  <div class="memorama-app">
    <div class="game-container">
      <!-- Cabecera -->
      <header class="game-header">
        <h1 class="title">Memorama RV</h1>
        <div class="badges-info">
          <span class="badge level-badge">Nivel {{ currentLevelIndex + 1 }}: {{ currentLevel.name }}</span>
          <span class="badge score-badge">Récord: {{ scores[currentLevel.id] || '---' }} movs</span>
        </div>
      </header>

      <!-- Panel de Estadísticas -->
      <div class="stats-bar">
        <div class="stat-item">
          <span>Movimientos</span>
          <strong>{{ moves }}</strong>
        </div>
        <div class="stat-item">
          <span>Parejas</span>
          <strong>{{ matchedPairs }} / {{ currentLevel.pairs }}</strong>
        </div>
        <button @click="startGame" class="btn-icon" title="Reiniciar">🔄</button>
      </div>

      <!-- Tablero Dinámico (Grid Responsive) -->
      <div 
        class="board-grid"
        :style="{ gridTemplateColumns: `repeat(${currentLevel.cols}, minmax(0, 1fr))` }"
      >
        <div 
          v-for="card in cards" 
          :key="card.id"
          @click="flipCard(card)"
          class="card-scene"
        >
          <div :class="['card-object', { flipped: card.isFlipped || card.isMatched }]">
            <!-- Frente (Oculto) -->
            <div class="card-face card-front">
              <span class="question-mark">O_O</span>
            </div>
            <!-- Reverso (Color) -->
            <div class="card-face card-back" :style="{ backgroundColor: card.color }">
              <span v-if="card.isMatched" class="match-check">✓</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de Victoria / Siguiente Nivel -->
      <div v-if="gameWon" class="modal-overlay">
        <div class="modal-card">
          <h2 class="modal-title">¡Nivel Superado! 🎉</h2>
          <p class="modal-text">Completaste el tablero en <strong class="text-white">{{ moves }}</strong> movimientos.</p>
          
          <div class="modal-actions">
            <button v-if="hasNextLevel" @click="nextLevel" class="btn btn-primary">
              Siguiente Nivel 🚀
            </button>
            <button @click="startGame" class="btn btn-secondary">
              Repetir Nivel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Paleta extendida para dar variedad en niveles altos
const colorPalette = [
  { hex: '#ef4444' }, { hex: '#3b82f6' }, { hex: '#22c55e' }, { hex: '#eab308' },
  { hex: '#a855f7' }, { hex: '#ec4899' }, { hex: '#f97316' }, { hex: '#06b6d4' },
  { hex: '#84cc16' }, { hex: '#6366f1' }, { hex: '#14b8a6' }, { hex: '#f43f5e' }
]

// Definición de niveles progresivos (con columnas para el grid responsive)
const levels = [
  { id: 'lvl1', name: 'Principiante', pairs: 4, cols: 4 }, // 8 cartas (2x4)
  { id: 'lvl2', name: 'Intermedio', pairs: 6, cols: 4 },   // 12 cartas (3x4)
  { id: 'lvl3', name: 'Avanzado', pairs: 8, cols: 4 },     // 16 cartas (4x4)
  { id: 'lvl4', name: 'Experto', pairs: 10, cols: 5 },     // 20 cartas (4x5)
  { id: 'lvl5', name: 'Maestro', pairs: 12, cols: 6 }      // 24 cartas (4x6)
]

const currentLevelIndex = ref(0)
const currentLevel = computed(() => levels[currentLevelIndex.value])
const hasNextLevel = computed(() => currentLevelIndex.value < levels.length - 1)

const cards = ref([])
const flippedCards = ref([])
const matchedPairs = ref(0)
const moves = ref(0)
const isChecking = ref(false)
const gameWon = ref(false)
const scores = ref({})

onMounted(() => {
  const saved = localStorage.getItem('memorama_pro_scores')
  if (saved) scores.value = JSON.parse(saved)
  startGame()
})

// Iniciar y barajar de forma totalmente aleatoria
const startGame = () => {
  moves.value = 0
  matchedPairs.value = 0
  gameWon.value = false
  flippedCards.value = []
  isChecking.value = false

  // Mezclar paleta global y tomar N colores requeridos para este nivel
  const shuffledPalette = [...colorPalette].sort(() => Math.random() - 0.5)
  const selectedColors = shuffledPalette.slice(0, currentLevel.value.pairs)

  // Duplicar y asignar IDs unicos, luego mezclar de nuevo
  const deck = [...selectedColors, ...selectedColors].map((item, index) => ({
    id: `${index}-${Math.random().toString(36).substring(2, 7)}`,
    color: item.hex,
    isFlipped: false,
    isMatched: false
  }))

  cards.value = deck.sort(() => Math.random() - 0.5)
}

const flipCard = (card) => {
  if (isChecking.value || card.isFlipped || card.isMatched) return

  card.isFlipped = true
  flippedCards.value.push(card)

  if (flippedCards.value.length === 2) {
    moves.value++
    checkForMatch()
  }
}

const checkForMatch = () => {
  isChecking.value = true
  const [c1, c2] = flippedCards.value

  if (c1.color === c2.color) {
    c1.isMatched = true
    c2.isMatched = true
    matchedPairs.value++
    resetTurn()

    if (matchedPairs.value === currentLevel.value.pairs) {
      endGame()
    }
  } else {
    setTimeout(() => {
      c1.isFlipped = false
      c2.isFlipped = false
      resetTurn()
    }, 750)
  }
}

const resetTurn = () => {
  flippedCards.value = []
  isChecking.value = false
}

const endGame = () => {
  gameWon.value = true
  const lvlId = currentLevel.value.id
  if (!scores.value[lvlId] || moves.value < scores.value[lvlId]) {
    scores.value[lvlId] = moves.value
    localStorage.setItem('memorama_pro_scores', JSON.stringify(scores.value))
  }
}

const nextLevel = () => {
  if (hasNextLevel.value) {
    currentLevelIndex.value++
    startGame()
  }
}
</script>

<style scoped>
/* Reset y Estructura Principal */
.memorama-app {
  min-height: 100vh;
  background: radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%);
  color: #f8fafc;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.game-container {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Cabecera */
.game-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  background: linear-gradient(to right, #818cf8, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.badges-info {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
}
.level-badge { background-color: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4); }
.score-badge { background-color: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); }

/* Barra de Estadísticas */
.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(8px);
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  color: #94a3b8;
}

.stat-item strong {
  font-size: 1.1rem;
  color: #ffffff;
}

.btn-icon {
  background: #334155;
  border: none;
  border-radius: 0.5rem;
  width: 2.5rem;
  height: 2.5rem;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.2s, transform 0.2s;
}
.btn-icon:hover {
  background: #475569;
  transform: scale(1.05);
}

/* Tablero Responsive (Grid inteligente) */
.board-grid {
  display: grid;
  gap: 0.65rem;
  width: 100%;
}

/* Tarjetas y Animación 3D Fluida */
.card-scene {
  aspect-ratio: 3 / 4;
  perspective: 1000px;
  cursor: pointer;
}

.card-object {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.4s cubic-bezier(0.4, 0.2, 0.2, 1);
  transform-style: preserve-3d;
  border-radius: 0.65rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.card-object.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  border-radius: 0.65rem;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.card-front {
  background: linear-gradient(135deg, #312e81, #3730a3);
  border: 2px solid rgba(129, 140, 248, 0.4);
  color: #818cf8;
}

.card-front:hover {
  border-color: #818cf8;
  background: linear-gradient(135deg, #3730a3, #4338ca);
}

.question-mark {
  font-size: 1.25rem;
  opacity: 0.8;
}

.card-back {
  transform: rotateY(180deg);
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.match-check {
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: bold;
}

/* Modal de Victoria */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  z-index: 50;
  animation: fadeIn 0.3s ease;
}

.modal-card {
  background: #1e293b;
  border: 1px solid rgba(99, 102, 241, 0.4);
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  max-width: 320px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.modal-title {
  font-size: 1.35rem;
  font-weight: bold;
  color: #4ade80;
  margin-bottom: 0.5rem;
}

.modal-text {
  color: #94a3b8;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: filter 0.2s, transform 0.1s;
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: #6366f1;
  color: white;
}
.btn-primary:hover {
  background: #4f46e5;
}

.btn-secondary {
  background: #334155;
  color: #cbd5e1;
}
.btn-secondary:hover {
  background: #475569;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>