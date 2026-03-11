const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireUser } = require('./users');

// GET /api/registrations/:eventId - liste des inscrits (admin)
router.get('/:eventId', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM registrations WHERE event_id = ? ORDER BY status, registered_at
  `).all(req.params.eventId);
  res.json(rows);
});

// POST /api/registrations/:eventId - s'inscrire (utilisateur connecté)
router.post('/:eventId', requireUser, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ? AND is_active = 1').get(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Événement non trouvé' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Compte introuvable' });

  // Vérifier si déjà inscrit (par user_id)
  const exists = db.prepare(
    'SELECT id FROM registrations WHERE event_id = ? AND user_id = ?'
  ).get(req.params.eventId, req.user.id);
  if (exists) return res.status(409).json({ error: 'Vous êtes déjà inscrit à cet événement' });

  // Compter les inscrits confirmés
  const count = db.prepare("SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'registered'").get(req.params.eventId);
  const status = count.c < event.max_participants ? 'registered' : 'waiting';

  const result = db.prepare(`
    INSERT INTO registrations (event_id, user_id, first_name, last_name, age, phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.eventId, user.id, user.first_name, user.last_name, user.age, user.phone, status);

  res.json({
    id: result.lastInsertRowid,
    status,
    message: status === 'registered' ? 'Inscription confirmée !' : 'Ajouté en liste d\'attente'
  });
});

// GET /api/registrations/user/me - mes inscriptions
router.get('/user/me', requireUser, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, e.title, e.event_date, e.location
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.user_id = ?
    ORDER BY e.event_date ASC
  `).all(req.user.id);
  res.json(rows);
});

// POST /api/registrations/:eventId/admin - ajouter manuellement (admin)
router.post('/:eventId/admin', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Événement non trouvé' });

  const { first_name, last_name, age, phone, status } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'Prénom et nom requis' });

  const count = db.prepare("SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'registered'").get(req.params.eventId);
  const finalStatus = status || (count.c < event.max_participants ? 'registered' : 'waiting');

  const result = db.prepare(`
    INSERT INTO registrations (event_id, first_name, last_name, age, phone, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.eventId, first_name, last_name, age || null, phone || null, finalStatus);

  res.json({ id: result.lastInsertRowid, status: finalStatus, message: 'Participant ajouté' });
});

// PUT /api/registrations/:id/status - changer le statut (admin)
router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['registered', 'waiting'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });

  const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
  if (!reg) return res.status(404).json({ error: 'Inscription non trouvée' });

  db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Statut mis à jour' });
});

// DELETE /api/registrations/:id (admin)
router.delete('/:id', (req, res) => {
  const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
  if (!reg) return res.status(404).json({ error: 'Inscription non trouvée' });

  db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);

  if (reg.status === 'registered') {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(reg.event_id);
    const count = db.prepare("SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'registered'").get(reg.event_id);
    if (count.c < event.max_participants) {
      const next = db.prepare("SELECT id FROM registrations WHERE event_id = ? AND status = 'waiting' ORDER BY registered_at LIMIT 1").get(reg.event_id);
      if (next) {
        db.prepare("UPDATE registrations SET status = 'registered' WHERE id = ?").run(next.id);
      }
    }
  }

  res.json({ message: 'Inscription supprimée' });
});

module.exports = router;
