const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'jeunesse_secret_key_2024';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identifiants requis' });

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = jwt.sign({ id: admin.id, username: admin.username }, SECRET, { expiresIn: '8h' });
  res.json({ token, username: admin.username });
});

router.post('/change-password', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Non authentifié' });

  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), SECRET);
    const { old_password, new_password } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(payload.id);

    if (!bcrypt.compareSync(old_password, admin.password_hash)) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, payload.id);
    res.json({ message: 'Mot de passe modifié' });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

module.exports = { router, SECRET };
