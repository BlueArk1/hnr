<template>
  <div class="relative text-sm">
    <!-- Skeleton loader -->
    <div v-if="!comment && !missing" class="py-3 space-y-2 animate-pulse">
      <div class="h-3 bg-m2-surface-2 rounded w-1/4"></div>
      <div class="h-3 bg-m2-surface-2 rounded w-3/4"></div>
    </div>

    <p v-else-if="missing" class="text-m2-on-surface-disabled text-xs italic py-2">[unavailable]</p>

    <!-- Main Comment Node -->
    <div
      v-else
      class="transition-colors"
      :class="depth === 0 ? 'py-4 border-b border-m2-surface-2/60 last:border-0' : 'pt-3'"
    >
      <!-- Row layout: Gutter (line) on the left, Content on the right. Guaranteed NO OVERLAP! -->
      <div class="flex items-stretch gap-2 sm:gap-3">
        <!-- Thread guide rail column (only shown for nested comments) -->
        <div
          v-if="depth > 0"
          class="w-3 shrink-0 flex justify-center cursor-pointer select-none group/rail py-0.5 touch-manipulation"
          :title="collapsed ? 'Expand thread' : 'Collapse thread'"
          @click="collapsed = !collapsed"
        >
          <div
            class="w-[2px] h-full rounded-full transition-colors"
            :class="lineColorClass"
          ></div>
        </div>

        <!-- Content column: Header + Body + Children -->
        <div class="min-w-0 flex-1">
          <!-- Comment Header: Tap anywhere to collapse/expand on mobile -->
          <div
            class="flex items-center justify-between text-xs select-none py-1 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-m2-surface-2/40 active:bg-m2-surface-2/70 transition-colors touch-manipulation"
            @click="collapsed = !collapsed"
          >
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <span
                v-if="comment.by"
                class="font-semibold text-sm"
                :class="isOp ? 'text-m2-primary font-bold' : 'text-m2-on-surface'"
              >
                {{ comment.by }}
                <span
                  v-if="isOp"
                  class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-m2-primary/20 text-m2-primary font-mono uppercase"
                >OP</span>
              </span>
              <span v-else class="text-m2-on-surface-disabled italic text-sm">[deleted]</span>

              <span class="text-m2-on-surface-disabled">·</span>
              <span class="text-m2-on-surface-med text-xs">{{ timeAgo }}</span>

              <!-- Collapsed badge -->
              <span
                v-if="collapsed"
                class="ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-m2-surface-2 text-m2-primary border border-m2-surface-2"
              >
                +{{ hiddenCount }} {{ hiddenCount === 1 ? 'reply' : 'replies' }}
              </span>
            </div>

            <!-- Arrow button with 36x36 touch target -->
            <button
              type="button"
              class="w-8 h-8 -mr-1 flex items-center justify-center text-m2-on-surface-disabled hover:text-m2-on-surface rounded-full hover:bg-m2-surface-2 transition-colors shrink-0"
              :aria-label="collapsed ? 'Expand comment' : 'Collapse comment'"
              @click.stop="collapsed = !collapsed"
            >
              <svg
                class="w-4 h-4 transition-transform duration-150"
                :class="{ '-rotate-90': collapsed }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <!-- Comment Body (hidden when collapsed) -->
          <div v-show="!collapsed" class="mt-1.5 text-m2-on-surface">
            <p v-if="isGone" class="italic text-m2-on-surface-disabled text-xs">
              [{{ comment.dead ? 'dead' : 'deleted' }}]
            </p>
            <div
              v-else
              class="comment-body leading-relaxed text-[14px] text-m2-on-surface/90 break-words space-y-2.5
                     [&_a]:text-m2-secondary [&_a]:underline [&_a:hover]:text-m2-primary [&_a]:break-all
                     [&_pre]:bg-m2-bg [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:border [&_pre]:border-m2-surface-2
                     [&_code]:text-xs [&_code]:font-mono [&_code]:bg-m2-bg [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
                     [&_blockquote]:border-l-2 [&_blockquote]:border-m2-surface-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-m2-on-surface-med
                     [&_p]:my-2"
              v-html="safeHtml"
            ></div>

            <!-- Nested children -->
            <div
              v-if="comment.kids && comment.kids.length"
              class="mt-1 space-y-1"
            >
              <CommentTree
                v-for="kid in comment.kids"
                :key="kid"
                :comment-id="kid"
                :depth="depth + 1"
                :op="op"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import DOMPurify from 'dompurify';
import { useNewsStore } from '../stores/news.js';

const props = defineProps({
  commentId: { type: Number, required: true },
  depth: { type: Number, default: 0 },
  op: { type: String, default: '' },
});

const news = useNewsStore();

const collapsed = ref(false);
const missing = ref(false);

const comment = computed(() => news.comments[props.commentId] || null);
const isGone = computed(() => !!comment.value && !!(comment.value.deleted || comment.value.dead));
const isOp = computed(() => !!comment.value?.by && comment.value.by === props.op);

// Cycle through muted accent colors for nested thread guide lines
const lineColors = [
  'bg-m2-surface-2 group-hover/line:bg-m2-primary',
  'bg-cyan-500/30 group-hover/line:bg-cyan-400',
  'bg-emerald-500/30 group-hover/line:bg-emerald-400',
  'bg-purple-500/30 group-hover/line:bg-purple-400',
  'bg-amber-500/30 group-hover/line:bg-amber-400',
  'bg-rose-500/30 group-hover/line:bg-rose-400',
];
const lineColorClass = computed(() => lineColors[props.depth % lineColors.length]);

const timeAgo = computed(() => {
  if (!comment.value) return '';
  const secs = Math.floor(Date.now() / 1000) - comment.value.time;
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
});

// Count hidden descendants when collapsed
function countDescendants(id, seen = new Set()) {
  const c = news.comments[id];
  if (!c || !c.kids) return 0;
  let n = 0;
  for (const kid of c.kids) {
    if (seen.has(kid)) continue;
    seen.add(kid);
    n += 1 + countDescendants(kid, seen);
  }
  return n;
}
const hiddenCount = computed(() => 1 + countDescendants(props.commentId));

const safeHtml = computed(() => {
  if (!comment.value?.text) return '';
  const expanded = comment.value.text.replace(
    /<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g,
    (m, href, text) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text || href}</a>`
  );
  return DOMPurify.sanitize(expanded);
});

onMounted(async () => {
  if (comment.value) return;
  const c = await news.ensureComment(props.commentId);
  if (!c) missing.value = true;
});
</script>
