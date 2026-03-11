const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, toObj } = require('../db');

const SECRET = process.env.JWT_USER_SECRET || 'user_secret_key_2024';

router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, age, phone, pin } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'Prénom et nom requis' });
    if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'Code PIN de 4 chiffres requis' });

    const { rows: existing } = await db.execute({
      sql: 'SELECT id FROM users WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)',
      args: [first_name, last_name]
    });
    if (existing.length > 0) return res.status(409).json({ error: 'Un compte existe déjà avec ce prénom et ce nom' });

    const pin_hash = bcrypt.hashSync(pin, 10);
    const result = await db.execute({
      sql: 'INSERT INTO users (first_name, last_name, age, phone, pin_hash) VALUES (?, ?, ?, ?, ?)',
      args: [first_name, last_name, age || null, phone || null, pin_hash]
    });

    const id = Number(result.lastInsertRowid);
    const token = jwt.sign({ id, first_name, last_name }, SECRET, { expiresIn: '30d' });
    res.json({ token, first_name, last_name, message: 'Compte créé avec succès' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { first_name, last_name, pin } = req.body;
    if (!first_name || !last_name || !pin) return res.status(400).json({ error: 'Tous les champs sont requis' });

    const { rows } = await db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)',
      args: [first_name, last_name]
    });
    const user = toObj(rows[0]);
    if (!user || !bcrypt.compareSync(pin, user.pin_hash)) {
      return res.status(401).json({ error: 'Prénom, nom ou code PIN incorrect' });
    }

    const token = jwt.sign({ id: user.id, first_name: user.first_name, last_name: user.last_name }, SECRET, { expiresIn: '30d' });
    res.json({ token, first_name: user.first_name, last_name: user.last_name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function requireUser(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Connexion requise' });
  try {
    req.user = jwt.verify(auth.replace('Bearer ', ''), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
  }
}

module.exports = { router, requireUser, SECRET };
