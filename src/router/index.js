import { createRouter, createWebHashHistory } from 'vue-router'
import Search from '../views/Search.vue'
import Favorites from '../views/Favorites.vue'
import Settings from '../views/Settings.vue'

const routes = [
  { path: '/', component: Search },
  { path: '/favorites', component: Favorites },
  { path: '/settings', component: Settings }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
