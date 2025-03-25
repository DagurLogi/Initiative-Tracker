import express from 'express';
import dotenv from 'dotenv';
import creaturesRoutes from './routes/creatures.js';
import pool from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Optional: Root greeting
app.get('/', (req, res) => {
  res.sendFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/index.html'));
});

// Mount API routes
app.use('/api/creatures', creaturesRoutes);

// Test DB connection
pool.connect()
  .then(() => console.log('✅ Connected to database'))
  .catch((err) => console.error('❌ Failed to connect to the database:', err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
