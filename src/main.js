import { createApp } from './app.js';

createApp().then(({ app }) => {
  app.mount('#app');
});