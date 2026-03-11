const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

require('./db');

const { router: authRouter, SECRET } = require('./routes/auth');
const { router: usersRouter } = require('./routes/users');
const eventsRouter = require('./routes/events');
const registrationsRouter = require('./routes/registrations');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Middleware admin
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Authentification requise' });
  try {
    req.admin = jwt.verify(auth.replace('Bearer ', ''), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Routes publiques
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

// Événements publics (GET seulement)
app.get('/api/events', eventsRouter);

// Inscriptions (nécessite compte utilisateur — géré dans le router)
app.use('/api/registrations', registrationsRouter);

// Événements admin (toutes les opérations)
app.use('/api/events', (req, res, next) => {
  if (req.method === 'GET' && req.path === '/') return next();
  requireAuth(req, res, next);
}, eventsRouter);

// Gestion inscriptions admin
app.use('/api/admin/registrations', requireAuth, registrationsRouter);
app.get('/api/admin/stats', requireAuth, (req, res) => {
  req.url = '/stats';
  eventsRouter(req, res);
});

// Frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServeur démarré sur http://0.0.0.0:${PORT}`);
  console.log(`  Accès local : http://localhost:${PORT}`);
  console.log(`  Admin       : http://localhost:${PORT}/admin`);
  console.log(`  Identifiants: admin / activites2024\n`);
});
