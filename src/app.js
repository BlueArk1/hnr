import { createApp as createVueApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { createRouter } from './router/index.js';
import { useAuthStore } from './stores/auth.js';
import './style.css';

export async function createApp() {
  const app = createVueApp(App);
  const pinia = createPinia();
  app.use(pinia);

  // Validate the stored session BEFORE the router's initial navigation runs.
  const auth = useAuthStore(pinia);
  await auth.restore();

  const router = createRouter();
  // Login required for every route except /login.
  router.beforeEach((to) => {
    if (to.meta.public) {
      return auth.isAuthenticated && to.name === 'login' ? { path: '/top' } : true;
    }
    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    return true;
  });
  app.use(router);

  return { app };
}