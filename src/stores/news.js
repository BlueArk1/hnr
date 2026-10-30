import { defineStore } from 'pinia';

const API_BASE = 'https://hacker-news.firebaseio.com/v0';
const CACHE_TTL = 300000; // 5 min cache
const CONCURRENCY = 8;
const PAGE_SIZE = 30;
const COMMENT_CONCURRENCY = 40; // High parallelism for fast comment batching
const MAX_PREFETCH = 1500;

const FEEDS = {
  top: '/topstories.json',
  new: '/newstories.json',
  show: '/showstories.json',
  ask: '/askstories.json',
};

const fetchCache = new Map();
const inflight = new Map();

async function cachedFetch(url, ttl = CACHE_TTL) {
  const hit = fetchCache.get(url);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  fetchCache.set(url, { t: Date.now(), v: data });
  return data;
}

async function fetchBatch(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const slice = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map((id) => cachedFetch(`${API_BASE}/item/${id}.json`).catch(() => null))
    );
    out.push(...results);
  }
  return out.filter(Boolean);
}

export const useNewsStore = defineStore('news', {
  state: () => ({
    items: [],
    loading: false,
    loadingMore: false,
    allIds: [],
    loadedCount: 0,
    scrollPositions: {},
    error: null,
    comments: {},
    commentsLoading: false,
  }),
  getters: {
    hasMore: (s) => s.loadedCount < s.allIds.length,
  },
  actions: {
    async fetchFeed(feed) {
      this.loading = true;
      this.error = null;
      this.items = [];
      this.loadedCount = 0;
      try {
        const endpoint = FEEDS[feed];
        if (!endpoint) throw new Error('Unknown feed');
        this.allIds = await cachedFetch(`${API_BASE}${endpoint}`);
        await this.loadBatch();
      } catch (e) {
        this.error = e.message || 'Failed to load feed';
      } finally {
        this.loading = false;
      }
    },
    async loadBatch() {
      if (this.loadingMore) return;
      this.loadingMore = true;
      try {
        const next = this.allIds.slice(this.loadedCount, this.loadedCount + PAGE_SIZE);
        const batch = await fetchBatch(next);
        this.items.push(...batch);
        this.loadedCount += next.length;
      } catch (e) {
        this.error = e.message || 'Failed to load more';
      } finally {
        this.loadingMore = false;
      }
    },
    async ensureComment(id) {
      if (this.comments[id]) return this.comments[id];
      if (inflight.has(id)) return inflight.get(id);
      const p = cachedFetch(`${API_BASE}/item/${id}.json`)
        .then((c) => {
          if (c) this.comments[id] = c;
          return c;
        })
        .finally(() => inflight.delete(id));
      inflight.set(id, p);
      return p;
    },
    // Fast full-thread loader: tries Algolia items API first (returns the ENTIRE tree
    // in one single fast HTTP request ~300ms instead of 700 individual roundtrips!).
    // Falls back gracefully to Firebase batching if Algolia is unreachable or missing the item.
    async loadCommentTree(rootIds, storyId = null) {
      this.commentsLoading = true;
      try {
        if (storyId) {
          try {
            const res = await fetch(`https://hn.algolia.com/api/v1/items/${storyId}`);
            if (res.ok) {
              const data = await res.json();
              if (data && Array.isArray(data.children) && data.children.length > 0) {
                // Ingest entire nested tree into `this.comments`
                const ingest = (node) => {
                  if (!node || !node.id) return;
                  const kidIds = (node.children || []).map((c) => c.id).filter(Boolean);
                  this.comments[node.id] = {
                    id: node.id,
                    by: node.author,
                    time: node.created_at_i,
                    text: node.text || '',
                    parent: node.parent_id,
                    kids: kidIds,
                    deleted: !node.author && !node.text,
                    dead: false,
                  };
                  (node.children || []).forEach(ingest);
                };
                data.children.forEach(ingest);
                return;
              }
            }
          } catch (algoliaErr) {
            console.warn('Algolia fast fetch failed, falling back to Firebase', algoliaErr);
          }
        }

        // Fallback: Parallel BFS via Firebase API
        const seen = new Set();
        let level = (rootIds || []).slice();
        let total = 0;
        while (level.length && total < MAX_PREFETCH) {
          level = level.filter((id) => !seen.has(id));
          level.forEach((id) => seen.add(id));
          const batch = level.slice(0, MAX_PREFETCH - total);
          total += batch.length;
          const next = [];
          for (let i = 0; i < batch.length; i += COMMENT_CONCURRENCY) {
            const slice = batch.slice(i, i + COMMENT_CONCURRENCY);
            const results = await Promise.all(
              slice.map((id) => this.ensureComment(id).catch(() => null))
            );
            results.forEach((c) => {
              if (c && c.kids) next.push(...c.kids);
            });
          }
          level = next;
        }
      } finally {
        this.commentsLoading = false;
      }
    },
    async fetchItem(id) {
      return cachedFetch(`${API_BASE}/item/${id}.json`);
    },
    saveScroll(key) {
      this.scrollPositions[key] = window.scrollY;
    },
    restoreScroll(key) {
      const y = this.scrollPositions[key];
      if (y === undefined) return;
      requestAnimationFrame(() => window.scrollTo(0, y));
    },
  },
});