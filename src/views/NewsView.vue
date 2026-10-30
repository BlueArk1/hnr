<template>
  <div class="space-y-3">
    <p v-if="news.loading" class="text-m2-on-surface-med">Loading…</p>
    <p v-else-if="news.error" class="text-m2-error">
      {{ news.error }}
      <button class="underline text-m2-primary" @click="reload">Retry</button>
    </p>
    <template v-else>
      <NewsCard
        v-for="(item, i) in news.items"
        :key="item.id"
        :item="item"
        :rank="i + 1"
      />
      <button
        v-if="news.hasMore"
        class="w-full py-2 rounded bg-m2-surface-2 text-m2-on-surface hover:bg-m2-primary/20"
        :disabled="news.loadingMore"
        @click="news.loadBatch()"
      >
        {{ news.loadingMore ? 'Loading…' : 'Load More' }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { useNewsStore } from '../stores/news.js';
import NewsCard from '../components/NewsCard.vue';

const route = useRoute();
const news = useNewsStore();

watch(
  () => route.params.feed,
  (feed) => {
    if (feed) news.fetchFeed(feed);
  },
  { immediate: true }
);

function reload() {
  news.fetchFeed(route.params.feed);
}
</script>