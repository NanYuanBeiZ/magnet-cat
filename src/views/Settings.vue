<template>
  <div class="settings-page">
    <div class="section">
      <h2 class="section-title">主题</h2>
      <div class="theme-options">
        <button class="theme-btn" :class="{ active: !isDark }" @click="setDark(false)">
          ☀️ 浅色
        </button>
        <button class="theme-btn" :class="{ active: isDark }" @click="setDark(true)">
          🌙 深色
        </button>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">关于</h2>
      <p class="info">磁力猫 - 磁力链接搜索与管理工具</p>
      <p class="info">版本: 1.0.0</p>
      <p class="info">提示: 网页版使用模拟数据。完整功能将在 Electron 桌面版提供。</p>
    </div>

    <div class="section">
      <button class="btn btn-danger" @click="clearAll">清空所有数据</button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'

const ctx = inject('appContext')
const isDark = ref(ctx?.isDark?.value || false)

const setDark = (value) => {
  isDark.value = value
  localStorage.setItem('darkMode', value.toString())
  value ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
}

const clearAll = () => {
  if (confirm('确定要清空所有收藏数据吗？此操作不可恢复。')) {
    localStorage.removeItem('magnet_favorites')
    alert('数据已清空')
    window.location.reload()
  }
}
</script>

<style scoped>
.settings-page { max-width: 600px; margin: 0 auto; }

.section { margin-bottom: 36px; }

.section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.theme-options { display: flex; gap: 12px; }

.theme-btn {
  flex: 1;
  padding: 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--bg3);
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-btn:hover { border-color: var(--accent); }
.theme-btn.active { border-color: var(--accent); background: var(--accent); color: #fff; }

.info { font-size: 14px; color: var(--text2); margin-bottom: 8px; line-height: 1.6; }

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { opacity: 0.9; }
</style>
