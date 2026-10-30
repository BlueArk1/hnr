import { createWebHistory, createRouter as _createRouter } from 'vue-router';

const routes = [
  { path: '/', redirect: '/top' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/:feed(top|new|show|ask)',
    name: 'feed',
    component: () => import('../views/NewsView.vue'),
  },
  {
    path: '/item/:id',
    name: 'item',
    component: () => import('../views/ItemView.vue'),
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/top' },
];

export function createRouter() {
  return _createRouter({
    history: createWebHistory(),
    routes,
  });
}