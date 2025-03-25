import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js'; // Use the pool defined in db.js

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()'); // test query
    res.send(`Database time is: ${result.rows[0].now}`);
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    res.status(500).send('Database connection error');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
