<template>
  <div class="flex items-center gap-3 sm:gap-4">
    <!-- Rank to the left of the post item card: compact on mobile, large on desktop -->
    <span class="text-m2-on-surface-disabled text-sm sm:text-lg font-bold w-5 sm:w-8 shrink-0 text-right tabular-nums select-none">
      {{ rank }}
    </span>

    <article
      class="bg-m2-surface rounded-lg p-3 sm:p-4 cursor-pointer flex-1 min-w-0 hover:bg-m2-surface-2/60 transition-colors border border-m2-surface-2/40"
      @click="goToItem"
    >
      <h2 class="text-m2-on-surface font-medium leading-snug text-sm sm:text-base">{{ item.title }}</h2>
      <p class="text-m2-on-surface-med text-[11px] sm:text-xs mt-1.5 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
        <span>{{ item.score }} points</span>
        <span>·</span>
        <span>by
          <a
            :href="`https://news.ycombinator.com/user?id=${item.by}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-m2-secondary hover:underline"
            @click.stop
          >
            {{ item.by }}
          </a>
        </span>
        <span>·</span>
        <span>{{ timeAgo }}</span>
        <template v-if="domain">
          <span>·</span>
          <span class="text-m2-on-surface-disabled">({{ domain }})</span>
        </template>
        <template v-if="item.descendants !== undefined">
          <span>·</span>
          <span>{{ item.descendants }} comments</span>
        </template>
      </p>
    </article>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
  item: { type: Object, required: true },
  rank: { type: Number, default: 0 },
});

const router = useRouter();

const domain = (() => {
  try {
    return new URL(props.item.url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
})();

const timeAgo = (() => {
  const secs = Math.floor(Date.now() / 1000) - props.item.time;
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
})();

function goToItem() {
  router.push(`/item/${props.item.id}?from=${router.currentRoute.value.params.feed}`);
}
</script>