<template>
  <div class="search-page">
    <div class="search-box">
      <input 
        v-model="keyword" 
        type="text" 
        class="search-input"
        placeholder="输入关键词搜索..."
        @keyup.enter="search"
      >
      <button 
        class="search-btn" 
        @click="search" 
        :disabled="searching"
      >
        {{ searching ? '搜索中...' : '搜索' }}
      </button>
    </div>

    <div v-if="searching && searchProgress > 0" class="progress-bar">
      <div class="progress-fill" :style="{ width: searchProgress + '%' }"></div>
    </div>

    <div v-if="results.length > 0" class="results-container">
      <div class="card-grid">
        <div v-for="(item, index) in sortedResults" :key="item.magnet" class="card">
          <div class="card-title">{{ item.title }}</div>
          <div class="card-meta">
            <span class="tag">{{ item.size }}</span>
            <span class="tag" :class="getFileTypeClass(item.title)">{{ getFileTypeLabel(item.title) }}</span>
            <span class="tag">🔥 {{ item.magnetCount }}</span>
          </div>
          <div class="magnet-preview">{{ item.magnet.substring(0, 70) }}...</div>
          <div class="card-actions">
            <button 
              class="btn btn-primary" 
              :class="{ success: copied === index }"
              @click="copyItem(item, index)"
            >
              {{ copied === index ? '已复制' : '复制磁链' }}
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
    </div>

    <div v-else-if="searched && results.length === 0 && !searching" class="empty-state">
      <div class="empty-icon">🔍</div>
      <div>未找到相关结果</div>
    </div>

    <div v-else-if="!searched" class="empty-state">
      <div class="empty-icon">🔍</div>
      <div>输入关键词开始搜索</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'

const appContext = inject('appContext')
const keyword = ref('')
const results = ref([])
const searching = ref(false)
const searched = ref(false)
const searchProgress = ref(0)
const copied = ref(-1)

const isFavorited = (magnet) => appContext?.isFavorited(magnet) || false
const toggleFavorite = (item) => appContext?.toggleFavorite(item)

const copyItem = (item, index) => {
  appContext?.copyMagnet(item.magnet)
  copied.value = index
  setTimeout(() => copied.value = -1, 2500)
}

const getFileTypeClass = (title) => {
  const t = title.toLowerCase()
  if (/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/.test(t)) return 'video'
  if (/\.(rar|zip|7z|tar|gz)$/.test(t)) return 'zip'
  if (/\.(pdf|doc|docx|txt|xls|xlsx)$/.test(t)) return 'doc'
  if (/\.(mp3|wav|flac|aac|ogg)$/.test(t)) return 'audio'
  if (/\.(jpg|jpeg|png|gif|bmp|svg)$/.test(t)) return 'img'
  return ''
}

const getFileTypeLabel = (title) => {
  const t = title.toLowerCase()
  if (/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/.test(t)) return '视频'
  if (/\.(rar|zip|7z|tar|gz)$/.test(t)) return '压缩'
  if (/\.(pdf|doc|docx|txt|xls|xlsx)$/.test(t)) return '文档'
  if (/\.(mp3|wav|flac|aac|ogg)$/.test(t)) return '音频'
  if (/\.(jpg|jpeg|png|gif|bmp|svg)$/.test(t)) return '图片'
  return '其他'
}

const sortedResults = computed(() => {
  return [...results.value].sort((a, b) => {
    if (b.magnetCount !== a.magnetCount) return b.magnetCount - a.magnetCount
    return b.sizeBytes - a.sizeBytes
  })
})

const generateMagnetCount = (magnetHash) => {
  let hash = 0
  for (let i = 0; i < magnetHash.length; i++) {
    const charCode = magnetHash.charCodeAt(i)
    hash = ((hash << 5) - hash) + charCode
    hash = hash & hash
  }
  return Math.abs(hash % 50) + 1
}

const search = async () => {
  if (!keyword.value.trim() || searching.value) return

  searching.value = true
  searched.value = true
  results.value = []
  searchProgress.value = 0

  if (appContext) {
    appContext.statusText.value = '正在搜索...'
    appContext.statusClass.value = 'searching'
  }

  // 模拟搜索结果（因为网页版无法直接跨域请求 clm50.top）
  await new Promise(resolve => setTimeout(resolve, 1000))

  const mockResults = [
    {
      title: '示例资源1.2024.1080p.mp4',
      size: '2.5 GB',
      sizeBytes: 2684354560,
      magnet: 'magnet:?xt=urn:btih:example11111111111111111111111111111111'
    },
    {
      title: '另一个资源.BluRay.720p.mkv',
      size: '1.8 GB',
      sizeBytes: 1932735283,
      magnet: 'magnet:?xt=urn:btih:example22222222222222222222222222222222'
    },
    {
      title: '合集.zip',
      size: '500 MB',
      sizeBytes: 524288000,
      magnet: 'magnet:?xt=urn:btih:example33333333333333333333333333333333'
    }
  ]

  for (let i = 0; i < mockResults.length; i++) {
    const item = {
      ...mockResults[i],
      magnetCount: generateMagnetCount(mockResults[i].magnet)
    }
    results.value.push(item)
    searchProgress.value = Math.round(((i + 1) / mockResults.length) * 100)
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  searching.value = false
  if (appContext) {
    appContext.statusText.value = `搜索完成，共 ${results.value.length} 个结果`
    appContext.statusClass.value = 'success'
  }
}

onMounted(() => {
  // 检查是否有保存的主题
  if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark')
  }
})
</script>

<style scoped>
.search-page {
  max-width: 1200px;
  margin: 0 auto;
}

.search-box {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input {
  flex: 1;
  padding: 14px 20px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 16px;
  background: var(--bg-card);
  color: var(--text-primary);
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-btn {
  padding: 0 32px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.search-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progress-bar {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  margin-bottom: 24px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

.results-container {
  margin-top: 24px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
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

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--bg-secondary);
}

.tag.video { background: #ff6b6b20; color: #ff6b6b; }
.tag.zip { background: #feca5720; color: #feca57; }
.tag.doc { background: #54a0ff20; color: #54a0ff; }
.tag.audio { background: #5f27cd20; color: #5f27cd; }
.tag.img { background: #00d2d320; color: #00d2d3; }

.magnet-preview {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

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
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-primary.success {
  background: var(--success);
}

.btn-icon {
  padding: 8px 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-icon:hover {
  background: var(--border-color);
}

.btn-icon.favorited {
  color: var(--danger);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  gap: 16px;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.5;
}
</style>
