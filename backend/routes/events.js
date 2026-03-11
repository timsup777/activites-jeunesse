const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, toObj, toRows } = require('../db');

const uploadsDir = process.env.UPLOADS_PATH ||
  (process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../uploads'));
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `event_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { rows } = await db.execute({
      sql: `SELECT e.*,
        COUNT(CASE WHEN r.status = 'registered' THEN 1 END) as registered_count,
        COUNT(CASE WHEN r.status = 'waiting' THEN 1 END) as waiting_count
        FROM events e
        LEFT JOIN registrations r ON e.id = r.event_id
        WHERE e.event_date >= ? AND e.is_active = 1
        GROUP BY e.id ORDER BY e.event_date ASC`,
      args: [now]
    });
    res.json(toRows(rows));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT e.*,
        COUNT(CASE WHEN r.status = 'registered' THEN 1 END) as registered_count,
        COUNT(CASE WHEN r.status = 'waiting' THEN 1 END) as waiting_count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id ORDER BY e.event_date DESC`
    );
    res.json(toRows(rows));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
      db.execute("SELECT COUNT(*) as count FROM events"),
      db.execute("SELECT COUNT(*) as count FROM registrations WHERE status = 'registered'"),
      db.execute("SELECT COUNT(*) as count FROM registrations WHERE status = 'waiting'"),
      db.execute("SELECT COUNT(*) as count FROM events WHERE event_date >= datetime('now','localtime') AND is_active = 1"),
      db.execute("SELECT theme, COUNT(*) as count FROM events WHERE theme IS NOT NULL AND theme != '' GROUP BY theme"),
      db.execute("SELECT e.title, e.event_date, COUNT(r.id) as total FROM events e LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered' GROUP BY e.id ORDER BY total DESC LIMIT 5"),
      db.execute("SELECT CASE WHEN age < 10 THEN '< 10 ans' WHEN age < 13 THEN '10-12 ans' WHEN age < 16 THEN '13-15 ans' WHEN age < 18 THEN '16-17 ans' ELSE '18+ ans' END as tranche, COUNT(*) as count FROM registrations WHERE age IS NOT NULL GROUP BY tranche ORDER BY min(age)")
    ]);

    res.json({
      totalEvents: Number(toObj(r1.rows[0]).count),
      totalRegistrations: Number(toObj(r2.rows[0]).count),
      totalWaiting: Number(toObj(r3.rows[0]).count),
      upcomingEvents: Number(toObj(r4.rows[0]).count),
      byTheme: toRows(r5.rows),
      popularEvents: toRows(r6.rows),
      ageDistribution: toRows(r7.rows)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [req.params.id] });
    if (rows.length === 0) return res.status(404).json({ error: 'Événement non trouvé' });
    res.json(toObj(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { title, theme, description, link, event_date, location, max_participants } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'Titre et date requis' });

    const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await db.execute({
      sql: 'INSERT INTO events (title, theme, description, photo_path, link, event_date, location, max_participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [title, theme || null, description || null, photo_path, link || null, event_date, location || null, max_participants || 20]
    });

    res.json({ id: Number(result.lastInsertRowid), message: 'Événement créé' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [req.params.id] });
    const event = toObj(rows[0]);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé' });

    const { title, theme, description, link, event_date, location, max_participants, is_active } = req.body;
    let photo_path = event.photo_path;

    if (req.file) {
      if (event.photo_path) {
        const old = path.join(uploadsDir, path.basename(event.photo_path));
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      photo_path = `/uploads/${req.file.filename}`;
    }

    await db.execute({
      sql: 'UPDATE events SET title=?, theme=?, description=?, photo_path=?, link=?, event_date=?, location=?, max_participants=?, is_active=? WHERE id=?',
      args: [
        title || event.title,
        theme !== undefined ? theme : event.theme,
        description !== undefined ? description : event.description,
        photo_path,
        link !== undefined ? link : event.link,
        event_date || event.event_date,
        location !== undefined ? location : event.location,
        max_participants || event.max_participants,
        is_active !== undefined ? parseInt(is_active) : event.is_active,
        req.params.id
      ]
    });

    res.json({ message: 'Événement modifié' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [req.params.id] });
    const event = toObj(rows[0]);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé' });

    if (event.photo_path) {
      const p = path.join(uploadsDir, path.basename(event.photo_path));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    await db.execute({ sql: 'DELETE FROM events WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Événement supprimé' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
