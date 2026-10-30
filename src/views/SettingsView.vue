<template>
  <div class="max-w-xl mx-auto space-y-6">
    <div class="bg-m2-surface rounded-xl p-6 border border-m2-surface-2 shadow-sm">
      <h1 class="text-m2-on-surface text-xl font-bold">Settings</h1>
      <p class="text-m2-on-surface-med text-xs mt-1">Customize appearance, theme colors, and account security.</p>
    </div>

    <!-- Appearance & Theme Customizer -->
    <div class="bg-m2-surface rounded-xl p-6 border border-m2-surface-2 shadow-sm space-y-6">
      <h2 class="text-m2-on-surface text-base font-semibold border-b border-m2-surface-2 pb-3">Appearance</h2>

      <!-- Accent Color Picker (HSV / Palette wheel + presets) -->
      <div>
        <label class="block text-sm font-medium text-m2-on-surface mb-2">Accent Color</label>
        <p class="text-xs text-m2-on-surface-med mb-3">Choose an accent theme for buttons, badges, links, and thread markers.</p>

        <!-- Quick Presets -->
        <div class="flex items-center gap-2.5 flex-wrap mb-4">
          <button
            v-for="color in presetColors"
            :key="color.hex"
            type="button"
            class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
            :style="{ backgroundColor: color.hex }"
            :class="accentColor.toLowerCase() === color.hex.toLowerCase() ? 'border-white scale-110 shadow-md ring-2 ring-m2-primary/40' : 'border-transparent'"
            :title="color.name"
            @click="setAccent(color.hex)"
          ></button>
        </div>

        <!-- Custom Color Picker (Wheel / Palette + Hex input) -->
        <div class="flex items-center gap-3">
          <label class="relative w-11 h-11 rounded-lg overflow-hidden border border-m2-surface-2 cursor-pointer shadow-inner">
            <input
              type="color"
              v-model="accentColor"
              class="absolute -top-3 -left-3 w-16 h-16 cursor-pointer"
              @input="onAccentChange"
            />
          </label>
          <div class="flex-1">
            <input
              type="text"
              v-model="accentColor"
              class="w-36 px-3 py-1.5 rounded-lg bg-m2-bg border border-m2-surface-2 text-m2-on-surface font-mono text-sm uppercase focus:outline-none focus:border-m2-primary"
              placeholder="#FF6600"
              @change="onAccentChange"
            />
          </div>
          <span
            class="px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm"
            :style="{ backgroundColor: accentColor }"
          >
            Live Preview
          </span>
        </div>
      </div>

      <!-- Font Family Selector -->
      <div class="pt-2 border-t border-m2-surface-2/60">
        <label class="block text-sm font-medium text-m2-on-surface mb-1.5">Font Style</label>
        <p class="text-xs text-m2-on-surface-med mb-3">Select your reading typography.</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            v-for="f in fonts"
            :key="f.id"
            type="button"
            class="p-3 rounded-lg border text-left transition-all cursor-pointer"
            :class="fontFamily === f.id ? 'border-m2-primary bg-m2-primary/10 text-m2-on-surface' : 'border-m2-surface-2 bg-m2-bg text-m2-on-surface-med hover:text-m2-on-surface'"
            @click="setFont(f.id)"
          >
            <div class="text-sm font-medium" :style="{ fontFamily: f.sampleFont }">{{ f.name }}</div>
            <div class="text-[11px] text-m2-on-surface-disabled mt-0.5">Aa Bb Gg</div>
          </button>
        </div>
      </div>

      <!-- Font Scaling Slider -->
      <div class="pt-2 border-t border-m2-surface-2/60">
        <div class="flex justify-between items-center mb-1.5">
          <label class="text-sm font-medium text-m2-on-surface">Font Scale</label>
          <span class="text-xs font-mono text-m2-primary font-semibold">{{ Math.round(fontScale * 100) }}%</span>
        </div>
        <p class="text-xs text-m2-on-surface-med mb-3">Scale text size across all feeds and comments for comfortable mobile reading.</p>
        <div class="flex items-center gap-3">
          <span class="text-xs text-m2-on-surface-med">A</span>
          <input
            type="range"
            min="0.85"
            max="1.3"
            step="0.05"
            v-model.number="fontScale"
            class="flex-1 accent-m2-primary cursor-pointer"
            @input="onScaleChange"
          />
          <span class="text-base text-m2-on-surface font-bold">A</span>
        </div>
      </div>

      <div v-if="settingsSaved" class="text-xs text-emerald-400 font-medium">
        ✓ Preferences saved to account
      </div>
    </div>

    <!-- Change Password Section -->
    <div class="bg-m2-surface rounded-xl p-6 border border-m2-surface-2 shadow-sm space-y-4">
      <h2 class="text-m2-on-surface text-base font-semibold border-b border-m2-surface-2 pb-3">Security</h2>
      <p class="text-xs text-m2-on-surface-med">Update your login password stored in the secure user store.</p>

      <form @submit.prevent="submitPasswordChange" class="space-y-3 max-w-sm">
        <div>
          <label class="block text-xs font-medium text-m2-on-surface-med mb-1">Current Password</label>
          <input
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
            class="w-full px-3 py-2 rounded-lg bg-m2-bg border border-m2-surface-2 text-m2-on-surface text-sm focus:outline-none focus:border-m2-primary"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-m2-on-surface-med mb-1">New Password</label>
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            required
            minlength="6"
            class="w-full px-3 py-2 rounded-lg bg-m2-bg border border-m2-surface-2 text-m2-on-surface text-sm focus:outline-none focus:border-m2-primary"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-m2-on-surface-med mb-1">Confirm New Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            class="w-full px-3 py-2 rounded-lg bg-m2-bg border border-m2-surface-2 text-m2-on-surface text-sm focus:outline-none focus:border-m2-primary"
          />
        </div>

        <p v-if="pwError" class="text-xs text-m2-error">{{ pwError }}</p>
        <p v-if="pwSuccess" class="text-xs text-emerald-400 font-medium">{{ pwSuccess }}</p>

        <button
          type="submit"
          :disabled="pwLoading"
          class="px-4 py-2 rounded-full bg-m2-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {{ pwLoading ? 'Updating…' : 'Update Password' }}
        </button>
      </form>
    </div>

    <!-- Session Sign Out -->
    <div class="bg-m2-surface rounded-xl p-6 border border-m2-surface-2 shadow-sm flex items-center justify-between">
      <div>
        <p class="text-m2-on-surface text-sm font-medium">Sign out</p>
        <p class="text-m2-on-surface-med text-xs mt-0.5">End your session on this device.</p>
      </div>
      <button
        class="px-4 py-2 rounded-full border border-m2-error text-m2-error text-xs font-medium hover:bg-m2-error/10 transition-colors"
        @click="logout"
      >
        Log out
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const presetColors = [
  { name: 'HN Orange', hex: '#FF6600' },
  { name: 'Teal Blue', hex: '#00BCD4' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Rose Red', hex: '#F43F5E' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Indigo', hex: '#6366F1' },
];

const fonts = [
  { id: 'system', name: 'System Sans', sampleFont: 'ui-sans-serif, system-ui' },
  { id: 'serif', name: 'Editorial Serif', sampleFont: 'Georgia, serif' },
  { id: 'mono', name: 'Hacker Mono', sampleFont: 'ui-monospace, monospace' },
  { id: 'dyslexic', name: 'Readable', sampleFont: 'comic sans ms, cursive' },
];

const accentColor = ref(auth.settings.accentColor || '#FF6600');
const fontScale = ref(auth.settings.fontScale || 1);
const fontFamily = ref(auth.settings.fontFamily || 'system');
const settingsSaved = ref(false);

let saveTimer = null;
function queueSave() {
  settingsSaved.value = false;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await auth.saveSettings({
        accentColor: accentColor.value,
        fontScale: fontScale.value,
        fontFamily: fontFamily.value,
      });
      settingsSaved.value = true;
      setTimeout(() => (settingsSaved.value = false), 2500);
    } catch {}
  }, 400);
}

function setAccent(hex) {
  accentColor.value = hex;
  queueSave();
}
function onAccentChange() {
  queueSave();
}
function setFont(id) {
  fontFamily.value = id;
  queueSave();
}
function onScaleChange() {
  queueSave();
}

// Password change state
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const pwError = ref(null);
const pwSuccess = ref(null);
const pwLoading = ref(false);

async function submitPasswordChange() {
  pwError.value = null;
  pwSuccess.value = null;
  if (newPassword.value !== confirmPassword.value) {
    pwError.value = 'New passwords do not match';
    return;
  }
  if (newPassword.value.length < 6) {
    pwError.value = 'New password must be at least 6 characters';
    return;
  }
  pwLoading.value = true;
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    pwSuccess.value = 'Password updated successfully';
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err) {
    pwError.value = err.message || 'Failed to change password';
  } finally {
    pwLoading.value = false;
  }
}

async function logout() {
  await auth.logout();
  router.push('/login');
}
</script>
