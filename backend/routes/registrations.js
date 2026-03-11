const express = require('express');
const router = express.Router();
const { db, toObj, toRows } = require('../db');
const { requireUser } = require('./users');

router.get('/:eventId', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: 'SELECT * FROM registrations WHERE event_id = ? ORDER BY status, registered_at',
      args: [req.params.eventId]
    });
    res.json(toRows(rows));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:eventId', requireUser, async (req, res) => {
  try {
    const { rows: evts } = await db.execute({ sql: 'SELECT * FROM events WHERE id = ? AND is_active = 1', args: [req.params.eventId] });
    const event = toObj(evts[0]);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé' });

    const { rows: usrs } = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.user.id] });
    const user = toObj(usrs[0]);
    if (!user) return res.status(401).json({ error: 'Compte introuvable' });

    const { rows: ex } = await db.execute({ sql: 'SELECT id FROM registrations WHERE event_id = ? AND user_id = ?', args: [req.params.eventId, req.user.id] });
    if (ex.length > 0) return res.status(409).json({ error: 'Vous êtes déjà inscrit à cet événement' });

    const { rows: cr } = await db.execute({ sql: "SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'registered'", args: [req.params.eventId] });
    const count = Number(toObj(cr[0]).c);
    const status = count < event.max_participants ? 'registered' : 'waiting';

    const result = await db.execute({
      sql: 'INSERT INTO registrations (event_id, user_id, first_name, last_name, age, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [req.params.eventId, user.id, user.first_name, user.last_name, user.age, user.phone, status]
    });

    res.json({ id: Number(result.lastInsertRowid), status, message: status === 'registered' ? 'Inscription confirmée !' : "Ajouté en liste d'attente" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/user/me', requireUser, async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT r.*, e.title, e.event_date, e.location
            FROM registrations r JOIN events e ON r.event_id = e.id
            WHERE r.user_id = ? ORDER BY e.event_date ASC`,
      args: [req.user.id]
    });
    res.json(toRows(rows));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:eventId/admin', async (req, res) => {
  try {
    const { rows: evts } = await db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [req.params.eventId] });
    const event = toObj(evts[0]);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé' });

    const { first_name, last_name, age, phone, status } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'Prénom et nom requis' });

    const { rows: cr } = await db.execute({ sql: "SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'registered'", args: [req.params.eventId] });
    const count = Number(toObj(cr[0]).c);
    const finalStatus = status || (count < event.max_participants ? 'registered' : 'waiting');

    const result = await db.execute({
      sql: 'INSERT INTO registrations (event_id, first_name, last_name, age, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
      args: [req.params.eventId, first_name, last_name, age || null, phone || null, finalStatus]
    });

    res.json({ id: Number(result.lastInsertRowid), status: finalStatus, message: 'Participant ajouté' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['registered', 'waiting'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });

    const { rows } = await db.execute({ sql: 'SELECT * FROM registrations WHERE id = ?', args: [req.params.id] });
    if (rows.length === 0) return res.status(404).json({ error: 'Inscription non trouvée' });

    await db.execute({ sql: 'UPDATE registrations SET status = ? WHERE id = ?', args: [status, req.params.id] });
    res.json({ message: 'Statut mis à jour' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM registrations WHERE id = ?', args: [req.params.id] });
    const reg = toObj(rows[0]);
    if (!reg) return res.status(404).json({ error: 'Inscription non trouvée' });

    await db.execute({ sql: 'DELETE FROM registrations WHERE id = ?', args: [req.params.id] });

    if (reg.status === 'registered') {
      const { rows: evts } = await db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [reg.event_id] });
      const event = toObj(evts[0]);
      const { rows: cr } = await db.execute({ sql: "SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'registered'", args: [reg.event_id] });
      const count = Number(toObj(cr[0]).c);

      if (count < event.max_participants) {
        const { rows: next } = await db.execute({ sql: "SELECT id FROM registrations WHERE event_id = ? AND status = 'waiting' ORDER BY registered_at LIMIT 1", args: [reg.event_id] });
        if (next.length > 0) {
          await db.execute({ sql: "UPDATE registrations SET status = 'registered' WHERE id = ?", args: [toObj(next[0]).id] });
        }
      }
    }

    res.json({ message: 'Inscription supprimée' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
