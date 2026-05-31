import { createRouter, createWebHashHistory } from 'vue-router'
import SearchPage from '../views/SearchPage.vue'
import FavoritesPage from '../views/FavoritesPage.vue'
import SettingsPage from '../views/SettingsPage.vue'

const routes = [
  { path: '/', name: 'Search', component: SearchPage },
  { path: '/favorites', name: 'Favorites', component: FavoritesPage },
  { path: '/settings', name: 'Settings', component: SettingsPage }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
