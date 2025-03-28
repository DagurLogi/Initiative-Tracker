import express from 'express';
import dotenv from 'dotenv';
import creaturesRoutes from './routes/creatures.js';
import partyRoutes from './routes/party.js';
import encounterRoutes from './routes/encounter.js';
import pool from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.use(express.json());

// Mount API routes
app.use('/api/creatures', creaturesRoutes);
app.use('/api/party', partyRoutes);
app.use('/api/encounter', encounterRoutes);


// Test DB connection
pool.connect()
  .then(() => console.log('✅ Connected to database'))
  .catch((err) => console.error('❌ Failed to connect to the database:', err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
