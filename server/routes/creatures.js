// server/routes/creatures.js
import express from 'express';

const router = express.Router();

// Example GET route
router.get('/', (req, res) => {
  res.json({ message: 'GET all creatures - not yet connected to DB' });
});

// You could also add other routes later like:
// router.post('/create', ...)
// router.get('/:id', ...)

export default router;
