import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './assets/tokens.css'
import './assets/auth.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  // Restore a persisted session (if any) before the router resolves the
  // first navigation, so route guards see the correct auth state instead
  // of briefly treating a signed-in user as a guest.
  await useAuthStore().init()

  app.use(router)
  app.mount('#app')
}

bootstrap()
