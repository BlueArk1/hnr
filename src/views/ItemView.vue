<template>
  <div>
    <!-- Modern back button with touch target -->
    <div class="mb-3">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-m2-surface hover:bg-m2-surface-2 border border-m2-surface-2 text-m2-on-surface text-sm font-medium transition-colors cursor-pointer touch-manipulation shadow-sm"
        @click="router.back()"
      >
        <svg class="w-4 h-4 text-m2-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>
    </div>

    <p v-if="loading" class="text-m2-on-surface-med mt-4">Loading…</p>
    <div v-else-if="error" class="text-m2-error mt-4">
      {{ error }}
      <button class="underline text-m2-primary" @click="loadItem">Retry</button>
    </div>

    <template v-else-if="item">
      <div class="bg-m2-surface rounded-lg p-4 mt-3">
        <h1 class="text-m2-on-surface text-xl font-medium">{{ item.title }}</h1>
        <p class="text-m2-on-surface-med text-xs mt-1">
          {{ item.score }} points · by
          <a
            :href="`https://news.ycombinator.com/user?id=${item.by}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-m2-secondary"
          >
            {{ item.by }}
          </a>
          · {{ timeAgo }}
        </p>
        <a
          v-if="item.url"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block text-sm text-m2-primary mt-2"
        >
          View Source ↗
        </a>
      </div>

      <section class="mt-4">
        <div class="flex items-center justify-between mb-3 px-1">
          <h2 class="text-m2-on-surface text-base font-semibold flex items-center gap-2">
            <span>{{ item.descendants || 0 }} comments</span>
            <span
              v-if="news.commentsLoading"
              class="inline-flex items-center gap-1.5 text-xs text-m2-primary font-normal"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-m2-primary animate-ping"></span>
              syncing…
            </span>
          </h2>
        </div>
        <div
          v-if="item.kids && item.kids.length"
          class="bg-m2-surface rounded-xl p-3 sm:p-5 border border-m2-surface-2 overflow-hidden"
        >
          <CommentTree
            v-for="kid in item.kids"
            :key="kid"
            :comment-id="kid"
            :depth="0"
            :op="item.by"
          />
        </div>
        <div
          v-else
          class="bg-m2-surface rounded-xl p-8 border border-m2-surface-2 text-center text-m2-on-surface-med"
        >
          No comments yet.
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNewsStore } from '../stores/news.js';
import CommentTree from '../components/CommentTree.vue';

const route = useRoute();
const router = useRouter();
const news = useNewsStore();

const item = ref(null);
const loading = ref(true);
const error = ref(null);

const timeAgo = computed(() => {
  if (!item.value) return '';
  const secs = Math.floor(Date.now() / 1000) - item.value.time;
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
});

async function loadItem() {
  loading.value = true;
  error.value = null;
  try {
    item.value = await news.fetchItem(route.params.id);
    // Prefetch entire thread: Algolia single-shot (~300ms) with Firebase parallel fallback
    news.loadCommentTree(item.value.kids || [], item.value.id);
  } catch (e) {
    error.value = e.message || 'Failed to load item';
  } finally {
    loading.value = false;
  }
}

onMounted(loadItem);
watch(() => route.params.id, loadItem);

onUnmounted(() => {
  const from = route.query.from;
  if (from) news.saveScroll(from);
});
</script>
