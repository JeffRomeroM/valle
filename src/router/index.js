import { createRouter, createWebHistory } from 'vue-router'

import Dashboard from '../views/Dashboard.vue'
import Ventas from '../views/Ventas.vue'
import Creditos from '../views/Creditos.vue'
import Clientes from '../views/Clientes.vue'
import Juego from '../views/Juego.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/ventas', component: Ventas },
  { path: '/creditos', component: Creditos },
  { path: '/clientes', component: Clientes },
  { path: '/juego', component: Juego },
]


export default createRouter({
  history: createWebHistory(),
  routes
})
