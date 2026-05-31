<template>
  <div class="app-container">
    <header class="header">
      <div class="header-left">
        <span class="logo">🐱 磁力猫</span>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">搜索</router-link>
        <router-link to="/favorites" class="nav-link" :class="{ active: $route.path === '/favorites' }">
          收藏
          <span v-if="favorites.length > 0" class="badge">{{ favorites.length }}</span>
        </router-link>
        <router-link to="/settings" class="nav-link" :class="{ active: $route.path === '/settings' }">设置</router-link>
      </nav>
    </header>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="footer">
      <div class="status-bar">
        <span class="status-dot" :class="statusClass"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'

const favorites = ref([])
const statusText = ref('就绪')
const statusClass = ref('')

const loadFavorites = () => {
  try {
    const saved = localStorage.getItem('magnet_favorites')
    favorites.value = saved ? JSON.parse(saved) : []
  } catch (e) {
    favorites.value = []
  }
}

const saveFavorites = () => {
  localStorage.setItem('magnet_favorites', JSON.stringify(favorites.value))
}

const isFavorited = (magnet) => {
  return favorites.value.some(f => f.magnet === magnet)
}

const toggleFavorite = (item) => {
  const idx = favorites.value.findIndex(f => f.magnet === item.magnet)
  if (idx >= 0) {
    favorites.value.splice(idx, 1)
  } else {
    favorites.value.unshift({ ...item })
  }
  saveFavorites()
}

const copyMagnet = (magnet) => {
  navigator.clipboard.writeText(magnet)
}

onMounted(() => {
  loadFavorites()
})

const appContext = {
  favorites,
  isFavorited,
  toggleFavorite,
  copyMagnet,
  statusText,
  statusClass
}

provide('appContext', appContext)
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.header-left .logo {
  font-size: 20px;
  font-weight: 600;
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.nav-link:hover {
  background: var(--border-color);
}

.nav-link.active {
  background: var(--accent);
  color: white;
}

.badge {
  background: var(--danger);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.footer {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 8px 20px;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
}

.status-dot.searching {
  background: var(--warning);
  animation: pulse 1s infinite;
}

.status-dot.success {
  background: var(--success);
}

.status-dot.error {
  background: var(--danger);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
