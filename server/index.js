import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuthRouter } from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.disable('x-powered-by');
app.use(express.json());

app.use('/api/auth', createAuthRouter());

// Serve built frontend (static) with SPA fallback.
const dist = path.resolve(__dirname, '../dist');
app.use(express.static(dist));

// Never send index.html for API routes — return a 404 JSON instead.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// SPA fallback: serve index.html for client-side routes.
app.get('*', (req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`HNR server listening on :${PORT}`);
});