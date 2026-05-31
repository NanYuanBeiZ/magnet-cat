<template>
  <div id="app" :class="{ dark: isDark }">
    <header class="header">
      <div class="logo">🐱 磁力猫</div>
      <nav class="nav">
        <router-link to="/" :class="{ active: $route.path === '/' }">搜索</router-link>
        <router-link to="/favorites" :class="{ active: $route.path === '/favorites' }">
          收藏
          <span v-if="favorites.length" class="badge">{{ favorites.length }}</span>
        </router-link>
        <router-link to="/settings" :class="{ active: $route.path === '/settings' }">设置</router-link>
      </nav>
    </header>

    <main class="main">
      <router-view />
    </main>

    <footer class="footer">
      <div class="status">
        <span class="dot" :class="statusClass"></span>
        {{ statusText }}
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'

const isDark = ref(localStorage.getItem('darkMode') === 'true')
const favorites = ref(JSON.parse(localStorage.getItem('magnet_favorites') || '[]'))
const statusText = ref('就绪')
const statusClass = ref('')

const toggleFavorite = (item) => {
  const idx = favorites.value.findIndex(f => f.magnet === item.magnet)
  idx >= 0 ? favorites.value.splice(idx, 1) : favorites.value.unshift({ ...item })
  localStorage.setItem('magnet_favorites', JSON.stringify(favorites.value))
}

const isFavorited = (magnet) => favorites.value.some(f => f.magnet === magnet)

const copyMagnet = (magnet) => navigator.clipboard.writeText(magnet)

provide('appContext', {
  favorites,
  isFavorited,
  toggleFavorite,
  copyMagnet,
  statusText,
  statusClass,
  isDark
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #fff;
  --bg2: #f5f5f7;
  --bg3: #fff;
  --text: #1d1d1f;
  --text2: #86868b;
  --border: #d2d2d7;
  --accent: #007aff;
  --danger: #ff3b30;
  --success: #34c759;
}

.dark {
  --bg: #000;
  --bg2: #1c1c1e;
  --bg3: #2c2c2e;
  --text: #f5f5f7;
  --text2: #86868b;
  --border: #38383a;
  --accent: #0a84ff;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.logo { font-size: 20px; font-weight: 600; }

.nav { display: flex; gap: 8px; }

.nav a {
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav a:hover { background: var(--border); }
.nav a.active { background: var(--accent); color: #fff; }

.badge {
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.main { flex: 1; padding: 20px; overflow-y: auto; }

.footer {
  background: var(--bg2);
  border-top: 1px solid var(--border);
  padding: 8px 20px;
  font-size: 13px;
  color: var(--text2);
}

.status { display: flex; align-items: center; gap: 8px; }

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text2);
}

.dot.searching { background: var(--accent); animation: pulse 1s infinite; }
.dot.success { background: var(--success); }
.dot.error { background: var(--danger); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
