<template>
  <div class="bg-m2-surface rounded-lg p-6 max-w-md">
    <h1 class="text-m2-on-surface text-xl font-semibold">Profile</h1>

    <dl class="mt-4 divide-y divide-m2-surface-2 text-sm">
      <div class="flex justify-between gap-4 py-3">
        <dt class="text-m2-on-surface-med">Username</dt>
        <dd class="text-m2-on-surface">{{ auth.user?.username }}</dd>
      </div>
      <div class="flex justify-between gap-4 py-3">
        <dt class="text-m2-on-surface-med">Role</dt>
        <dd class="text-m2-on-surface capitalize">{{ auth.user?.role }}</dd>
      </div>
      <div class="flex justify-between gap-4 py-3">
        <dt class="text-m2-on-surface-med">Session expires</dt>
        <dd class="text-m2-on-surface">{{ expires }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();

const expires = computed(() =>
  auth.expiresAt ? auth.expiresAt.toLocaleString() : 'Unknown'
);
</script>
