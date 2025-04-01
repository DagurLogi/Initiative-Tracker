import express from 'express';
import dotenv from 'dotenv';
import creaturesRoutes from './routes/creatures.js';
import partyRoutes from './routes/party.js';
import encounterRoutes from './routes/encounter.js';
import battleRoute from './routes/battle.js';
import pool from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Increase JSON payload size limit to 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Mount API routes
app.use('/api/creatures', creaturesRoutes);
app.use('/api/party', partyRoutes);
app.use('/api/encounter', encounterRoutes);
app.use('/api/battle', battleRoute);



// Test DB connection
pool.connect()
  .then(() => console.log('✅ Connected to database'))
  .catch((err) => console.error('❌ Failed to connect to the database:', err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
