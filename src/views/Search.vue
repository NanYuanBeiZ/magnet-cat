<template>
  <div class="search-page">
    <div class="search-box">
      <input
        v-model="keyword"
        type="text"
        class="search-input"
        placeholder="输入关键词搜索..."
        @keyup.enter="search"
      />
      <button class="search-btn" :disabled="searching" @click="search">
        {{ searching ? '搜索中...' : '搜索' }}
      </button>
    </div>

    <div v-if="searching" class="progress-bar">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>

    <div v-if="results.length" class="card-grid">
      <div v-for="(item, idx) in sortedResults" :key="item.magnet" class="card">
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
          <button
            class="btn btn-icon"
            :class="{ favorited: isFavorited(item.magnet) }"
            @click="toggleFavorite(item)"
          >
            {{ isFavorited(item.magnet) ? '❤️' : '🤍' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="searched && !searching" class="empty">
      <div class="empty-icon">🔍</div>
      <div>未找到相关结果</div>
    </div>

    <div v-else-if="!searched" class="empty">
      <div class="empty-icon">🔍</div>
      <div>输入关键词开始搜索</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'

const ctx = inject('appContext')
const keyword = ref('')
const results = ref([])
const searching = ref(false)
const searched = ref(false)
const progress = ref(0)
const copied = ref(-1)

const isFavorited = (magnet) => ctx?.isFavorited(magnet) || false
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

const sortedResults = computed(() =>
  [...results.value].sort((a, b) => {
    if (b.magnetCount !== a.magnetCount) return b.magnetCount - a.magnetCount
    return b.sizeBytes - a.sizeBytes
  })
)

const genMagnetCount = (hash) => {
  let h = 0
  for (const c of hash) {
    h = ((h << 5) - h) + c.charCodeAt(0)
    h = h & h
  }
  return Math.abs(h % 50) + 1
}

const search = async () => {
  if (!keyword.value.trim() || searching.value) return

  searching.value = true
  searched.value = true
  results.value = []
  progress.value = 0

  ctx.statusText.value = '正在搜索...'
  ctx.statusClass.value = 'searching'

  await new Promise(r => setTimeout(r, 1000))

  const mockData = [
    { title: '示例资源1.2024.1080p.mp4', size: '2.5 GB', sizeBytes: 2684354560, magnet: 'magnet:?xt=urn:btih:example11111111111111111111111111111111' },
    { title: '另一个资源.BluRay.720p.mkv', size: '1.8 GB', sizeBytes: 1932735283, magnet: 'magnet:?xt=urn:btih:example22222222222222222222222222222222' },
    { title: '合集.zip', size: '500 MB', sizeBytes: 524288000, magnet: 'magnet:?xt=urn:btih:example33333333333333333333333333333333' },
    { title: '高清电影.HDRip.1080p.mp4', size: '3.2 GB', sizeBytes: 3435973836, magnet: 'magnet:?xt=urn:btih:example44444444444444444444444444444444' },
    { title: '电视剧全集中文字幕.mkv', size: '8.5 GB', sizeBytes: 9126805504, magnet: 'magnet:?xt=urn:btih:example55555555555555555555555555555555' }
  ]

  for (let i = 0; i < mockData.length; i++) {
    results.value.push({
      ...mockData[i],
      magnetCount: genMagnetCount(mockData[i].magnet)
    })
    progress.value = Math.round(((i + 1) / mockData.length) * 100)
    await new Promise(r => setTimeout(r, 200))
  }

  searching.value = false
  ctx.statusText.value = `搜索完成，共 ${results.value.length} 个结果`
  ctx.statusClass.value = 'success'
}
</script>

<style scoped>
.search-page { max-width: 1200px; margin: 0 auto; }

.search-box { display: flex; gap: 12px; margin-bottom: 24px; }

.search-input {
  flex: 1;
  padding: 14px 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 16px;
  background: var(--bg3);
  color: var(--text);
  outline: none;
}

.search-input:focus { border-color: var(--accent); }

.search-btn {
  padding: 0 32px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.search-btn:hover:not(:disabled) { opacity: 0.9; }
.search-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.progress-bar {
  height: 6px;
  background: var(--bg2);
  border-radius: 3px;
  margin-bottom: 24px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

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
  background: var(--bg2);
  color: var(--text);
}

.btn-icon:hover { background: var(--border); }
.btn-icon.favorited { color: var(--danger); }

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
</style>
