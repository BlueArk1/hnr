<template>
  <div class="bg-m2-surface rounded-lg p-6 max-w-sm mx-auto">
    <h1 class="text-m2-on-surface text-xl font-semibold">Login</h1>
    <p class="text-m2-on-surface-med text-sm mt-1">
      Accounts are created by an administrator inside the container.
    </p>

    <form class="mt-4 space-y-3" @submit.prevent="submit">
      <input
        v-model="username"
        type="text"
        autocomplete="username"
        placeholder="Username"
        class="w-full px-3 py-2 rounded bg-m2-surface-2 text-m2-on-surface focus:outline-none focus:ring-1 focus:ring-m2-primary"
      />
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        placeholder="Password"
        class="w-full px-3 py-2 rounded bg-m2-surface-2 text-m2-on-surface focus:outline-none focus:ring-1 focus:ring-m2-primary"
      />
      <p v-if="auth.error" class="text-m2-error text-sm">{{ auth.error }}</p>
      <button
        type="submit"
        :disabled="auth.loading"
        class="w-full py-2 rounded bg-m2-primary text-white font-medium disabled:opacity-50"
      >
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const username = ref('');
const password = ref('');

async function submit() {
  const ok = await auth.login(username.value, password.value);
  if (!ok) return;
  const redirect = route.query.redirect;
  router.push(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/top');
}
</script>