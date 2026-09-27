<template>
  <nav class="menu" aria-label="Navegación principal">
    <div class="logo-container">
      <span class="logo">Valle</span>
    </div>

    <div class="nav-links">
      <RouterLink to="/dashboard" class="nav-item">
        <Icon icon="solar:home-2-bold-duotone" class="nav-icon" />
        <span class="label">Inicio</span>
      </RouterLink>

      <RouterLink to="/ventas" class="nav-item">
        <Icon icon="solar:cart-large-2-bold-duotone" class="nav-icon" />
        <span class="label">Ventas</span>
      </RouterLink>

      <RouterLink to="/creditos" class="nav-item">
        <Icon icon="solar:wallet-money-bold-duotone" class="nav-icon" />
        <span class="label">Créditos</span>
      </RouterLink>

      <RouterLink to="/clientes" class="nav-item">
        <Icon icon="solar:user-plus-bold" class="nav-icon" />
        <span class="label">Clientes</span>
      </RouterLink>
      <RouterLink to="/juego" class="nav-item">
        <Icon icon="solar:gamepad-bold-duotone" class="nav-icon" />
        <span class="label">Juego</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
</script>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  width: 80px;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  background: #ffffff;
  border-right: 1px solid #f1f5f9;
  padding: 1.5rem 0;
  z-index: 1000;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02);
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.logo {
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: 800;
  font-size: 20px;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #64748b;
  padding: 0.75rem 0;
  gap: 4px;
  transition: all 0.2s ease;
  position: relative;
}

.nav-item:hover {
  color: #3b82f6;
  background: #f8fafc;
}

.nav-icon {
  font-size: 24px;
}

.label {
  font-size: 11px;
  font-weight: 500;
}

/* ACTIVO */
.router-link-active {
  color: #3b82f6;
  background: #eff6ff;
}

.router-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #3b82f6;
  border-radius: 0 4px 4px 0;
}

/* MOBILE */
@media (max-width: 640px) {
  .menu {
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    height: 64px;
    bottom: 0;
    top: auto;
    border-top: 1px solid #f1f5f9;
    border-right: none;
    padding: 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.04);
  }

  .logo-container {
    display: none;
  }

  .nav-links {
    flex-direction: row;
    justify-content: space-around;
    width: 100%;
    height: 100%;
  }

  .nav-item {
    flex: 1;
    height: 100%;
    justify-content: center;
  }

  .router-link-active::before {
    left: 0;
    right: 0;
    top: 0;
    bottom: auto;
    width: auto;
    height: 4px;
    border-radius: 0 0 4px 4px;
  }
}
</style>