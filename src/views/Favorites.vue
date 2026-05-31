<template>
  <div class="favorites-page">
    <div v-if="favorites.length" class="card-grid">
      <div v-for="(item, idx) in favorites" :key="item.magnet" class="card">
        <div class="card-title">{{ item.title }}</div>
        <div class="card-meta">
          <span class="tag">{{ item.size }}</span>
          <span class="tag" :class="getTypeClass(item.title)">{{ getTypeLabel(item.title) }}</span>
          <span class="tag">🔥 {{ item.magnetCount }}</span>
        </div>
        <div class="magnet-preview">{{ item.magnet.slice(0, 70) }}...</div>
        <div class="card-actions">
          <button
            class="btn btn-primary"
            :class="{ success: copied === idx }"
            @click="copyItem(item, idx)"
          >
            {{ copied === idx ? '已复制' : '复制磁链' }}
          </button>
          <button class="btn btn-icon favorited" @click="toggleFavorite(item)">❤️</button>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <div class="empty-icon">📁</div>
      <div>还没有收藏的磁力链接</div>
      <router-link to="/" class="link">去搜索</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'

const ctx = inject('appContext')
const favorites = ctx?.favorites || ref([])
const copied = ref(-1)

const toggleFavorite = (item) => ctx?.toggleFavorite(item)
const copyItem = (item, idx) => {
  ctx?.copyMagnet(item.magnet)
  copied.value = idx
  setTimeout(() => copied.value = -1, 2500)
}

const getTypeClass = (title) => {
  const t = title.toLowerCase()
  if (/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/.test(t)) return 'video'
  if (/\.(rar|zip|7z|tar|gz)$/.test(t)) return 'zip'
  if (/\.(pdf|doc|docx|txt|xls|xlsx)$/.test(t)) return 'doc'
  if (/\.(mp3|wav|flac|aac|ogg)$/.test(t)) return 'audio'
  if (/\.(jpg|jpeg|png|gif|bmp|svg)$/.test(t)) return 'img'
  return ''
}

const getTypeLabel = (title) => {
  const t = title.toLowerCase()
  if (/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/.test(t)) return '视频'
  if (/\.(rar|zip|7z|tar|gz)$/.test(t)) return '压缩'
  if (/\.(pdf|doc|docx|txt|xls|xlsx)$/.test(t)) return '文档'
  if (/\.(mp3|wav|flac|aac|ogg)$/.test(t)) return '音频'
  if (/\.(jpg|jpeg|png|gif|bmp|svg)$/.test(t)) return '图片'
  return '其他'
}
</script>

<style scoped>
.favorites-page { max-width: 1200px; margin: 0 auto; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta { display: flex; flex-wrap: wrap; gap: 8px; }

.tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--bg2);
}

.tag.video { background: #ff6b6b20; color: #ff6b6b; }
.tag.zip { background: #feca5720; color: #feca57; }
.tag.doc { background: #54a0ff20; color: #54a0ff; }
.tag.audio { background: #5f27cd20; color: #5f27cd; }
.tag.img { background: #00d2d320; color: #00d2d3; }

.magnet-preview {
  font-size: 11px;
  color: var(--text2);
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions { display: flex; gap: 8px; margin-top: auto; }

.btn {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  flex: 1;
  background: var(--accent);
  color: #fff;
}

.btn-primary:hover { opacity: 0.9; }
.btn-primary.success { background: var(--success); }

.btn-icon {
  padding: 8px 12px;
  background: var(--danger);
  color: #fff;
}

.btn-icon:hover { opacity: 0.9; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text2);
  gap: 16px;
}

.empty-icon { font-size: 64px; opacity: 0.5; }

.link {
  padding: 10px 20px;
  background: var(--accent);
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
}

.link:hover { opacity: 0.9; }
</style>
