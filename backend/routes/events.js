const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `event_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/events - événements futurs (public)
router.get('/', (req, res) => {
  const now = new Date().toISOString();
  const events = db.prepare(`
    SELECT e.*,
      COUNT(CASE WHEN r.status = 'registered' THEN 1 END) as registered_count,
      COUNT(CASE WHEN r.status = 'waiting' THEN 1 END) as waiting_count
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    WHERE e.event_date >= ? AND e.is_active = 1
    GROUP BY e.id
    ORDER BY e.event_date ASC
  `).all(now);
  res.json(events);
});

// GET /api/events/all - tous les événements (admin)
router.get('/all', (req, res) => {
  const events = db.prepare(`
    SELECT e.*,
      COUNT(CASE WHEN r.status = 'registered' THEN 1 END) as registered_count,
      COUNT(CASE WHEN r.status = 'waiting' THEN 1 END) as waiting_count
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    GROUP BY e.id
    ORDER BY e.event_date DESC
  `).all();
  res.json(events);
});

// GET /api/events/stats - statistiques (admin)
router.get('/stats', (req, res) => {
  const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get();
  const totalRegistrations = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE status = 'registered'").get();
  const totalWaiting = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE status = 'waiting'").get();
  const upcomingEvents = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= datetime('now','localtime') AND is_active = 1").get();
  const byTheme = db.prepare(`
    SELECT theme, COUNT(*) as count FROM events WHERE theme IS NOT NULL AND theme != '' GROUP BY theme
  `).all();
  const popularEvents = db.prepare(`
    SELECT e.title, e.event_date, COUNT(r.id) as total
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
    GROUP BY e.id ORDER BY total DESC LIMIT 5
  `).all();
  const ageDistribution = db.prepare(`
    SELECT
      CASE
        WHEN age < 10 THEN '< 10 ans'
        WHEN age < 13 THEN '10-12 ans'
        WHEN age < 16 THEN '13-15 ans'
        WHEN age < 18 THEN '16-17 ans'
        ELSE '18+ ans'
      END as tranche,
      COUNT(*) as count
    FROM registrations WHERE age IS NOT NULL
    GROUP BY tranche ORDER BY min(age)
  `).all();

  res.json({
    totalEvents: totalEvents.count,
    totalRegistrations: totalRegistrations.count,
    totalWaiting: totalWaiting.count,
    upcomingEvents: upcomingEvents.count,
    byTheme,
    popularEvents,
    ageDistribution
  });
});

// GET /api/events/:id - détail d'un événement
router.get('/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement non trouvé' });
  res.json(event);
});

// POST /api/events - créer un événement (admin)
router.post('/', upload.single('photo'), (req, res) => {
  const { title, theme, description, link, event_date, location, max_participants } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'Titre et date requis' });

  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare(`
    INSERT INTO events (title, theme, description, photo_path, link, event_date, location, max_participants)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, theme || null, description || null, photo_path, link || null, event_date, location || null, max_participants || 20);

  res.json({ id: result.lastInsertRowid, message: 'Événement créé' });
});

// PUT /api/events/:id - modifier (admin)
router.put('/:id', upload.single('photo'), (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement non trouvé' });

  const { title, theme, description, link, event_date, location, max_participants, is_active } = req.body;
  let photo_path = event.photo_path;

  if (req.file) {
    if (event.photo_path) {
      const old = path.join(__dirname, '..', event.photo_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    photo_path = `/uploads/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE events SET title=?, theme=?, description=?, photo_path=?, link=?, event_date=?, location=?, max_participants=?, is_active=?
    WHERE id=?
  `).run(
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
  );

  res.json({ message: 'Événement modifié' });
});

// DELETE /api/events/:id (admin)
router.delete('/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement non trouvé' });

  if (event.photo_path) {
    const p = path.join(__dirname, '..', event.photo_path);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ message: 'Événement supprimé' });
});

module.exports = router;
