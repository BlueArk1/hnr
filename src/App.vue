<template>
  <div class="min-h-screen bg-m2-bg text-m2-on-bg">
    <header class="sticky top-0 z-20 bg-m2-bg/95 backdrop-blur border-b border-m2-surface-2">
      <div class="max-w-4xl mx-auto px-2 sm:px-4 h-14 flex items-center gap-1.5 sm:gap-3">
        <button
          class="font-bold text-m2-primary text-base sm:text-lg shrink-0 hover:opacity-80 transition-opacity cursor-pointer px-0.5 py-1"
          title="Go to Top stories"
          @click="goHome"
        >
          HNR
        </button>

        <nav
          v-if="auth.isAuthenticated"
          class="flex-1 min-w-0 flex items-center justify-between sm:justify-center p-0.5 sm:p-1 rounded-full border border-m2-surface-2 bg-m2-surface text-[11px] sm:text-sm"
        >
          <RouterLink
            v-for="f in feeds"
            :key="f"
            :to="`/${f}`"
            class="flex-1 sm:flex-initial sm:px-5 px-1 py-1.5 sm:py-2 rounded-full whitespace-nowrap font-medium transition-colors text-center"
            :class="isActive(f) ? 'bg-m2-surface-2 text-m2-on-surface shadow-sm' : 'text-m2-on-surface-med hover:text-m2-on-surface hover:bg-m2-surface-2/40'"
          >
            {{ labels[f] }}
          </RouterLink>
        </nav>

        <div v-if="auth.isAuthenticated" class="shrink-0 relative" ref="menuRoot">
          <button
            class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-m2-surface-2 text-m2-on-surface text-sm font-semibold flex items-center justify-center hover:ring-2 hover:ring-m2-primary/40 transition cursor-pointer"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            :aria-label="`Account menu for ${auth.user?.username}`"
            @click.stop="menuOpen = !menuOpen"
          >
            {{ initial }}
          </button>

          <div
            v-if="menuOpen"
            role="menu"
            class="absolute right-0 mt-2 w-48 rounded-lg border border-m2-surface-2 bg-m2-surface shadow-lg py-1"
          >
            <div class="px-4 py-2 border-b border-m2-surface-2">
              <p class="text-sm text-m2-on-surface truncate">{{ auth.user?.username }}</p>
              <p class="text-xs text-m2-on-surface-med capitalize">{{ auth.user?.role }}</p>
            </div>
            <RouterLink
              to="/profile"
              role="menuitem"
              class="block px-4 py-2 text-sm text-m2-on-surface hover:bg-m2-surface-2"
              @click="menuOpen = false"
            >
              Profile
            </RouterLink>
            <RouterLink
              to="/settings"
              role="menuitem"
              class="block px-4 py-2 text-sm text-m2-on-surface hover:bg-m2-surface-2"
              @click="menuOpen = false"
            >
              Settings
            </RouterLink>
            <button
              role="menuitem"
              class="w-full text-left px-4 py-2 text-sm text-m2-error hover:bg-m2-surface-2"
              @click="logout"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const feeds = ['top', 'new', 'show', 'ask'];
const labels = { top: 'Top', new: 'New', show: 'Show', ask: 'Ask' };

const menuOpen = ref(false);
const menuRoot = ref(null);
const initial = computed(() => (auth.user?.username || '?').charAt(0).toUpperCase());

function isActive(feed) {
  return router.currentRoute.value.name === 'feed' && router.currentRoute.value.params.feed === feed;
}

function goHome() {
  router.push('/top');
}

function refresh() {
  router.push(router.currentRoute.value.fullPath);
}

async function logout() {
  menuOpen.value = false;
  await auth.logout();
  router.push('/login');
}

// Close the account menu on outside click or Escape.
function onDocClick(e) {
  if (menuRoot.value && !menuRoot.value.contains(e.target)) menuOpen.value = false;
}
function onKey(e) {
  if (e.key === 'Escape') menuOpen.value = false;
}
onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});

router.afterEach((to) => {
  const name = to.name;
  const feed = to.params.feed;
  const id = to.params.id;
  if (name === 'feed' && feed) {
    localStorage.setItem('hnr_last_route', `/${feed}`);
  } else if (name === 'item' && /^\d+$/.test(String(id))) {
    localStorage.setItem('hnr_last_route', `/item/${id}`);
  }
});
</script>
