require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Mock Auth Middleware (to be replaced by MSAL)
// For now, it looks for a user-id header
app.use((req, res, next) => {
  const userId = req.headers['user-id'];
  if (userId) {
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
      if (row) {
        req.user = row;
      }
      next();
    });
  } else {
    next();
  }
});

// API: Get Seniors
app.get('/api/seniors', (req, res) => {
  db.all("SELECT * FROM users WHERE role = 'senior'", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const seniors = rows.map(s => ({
      ...s,
      topics: JSON.parse(s.topics),
      initials: s.name.split(' ').map(n => n[0]).join('').toUpperCase()
    }));
    res.json(seniors);
  });
});

// API: Get My Sessions
app.get('/api/sessions/my', (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const query = req.user.role === 'senior' 
    ? `SELECT b.*, u.name as student_name FROM bookings b JOIN users u ON b.student_id = u.id WHERE b.senior_id = ?`
    : `SELECT b.*, u.name as senior_name, u.major as senior_major FROM bookings b JOIN users u ON b.senior_id = u.id WHERE b.student_id = ?`;

  db.all(query, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const { getAuthCodeUrl, acquireTokenByCode } = require('./auth');
const GraphService = require('./graphService');

// ... (existing middleware)

// API: Microsoft Login Redirect
app.get('/api/auth/login', async (req, res) => {
  const role = req.query.role || 'fresh';
  try {
    const authUrl = await getAuthCodeUrl(role);
    res.redirect(authUrl);
  } catch (err) {
    res.status(500).send("Error generating auth URL");
  }
});

// API: Microsoft Auth Callback
app.get('/api/auth/redirect', async (req, res) => {
  const { code, state: role } = req.query;
  try {
    const response = await acquireTokenByCode(code);
    const msUser = response.account;
    const accessToken = response.accessToken;

    // Find or create user in our DB
    db.get("SELECT * FROM users WHERE microsoft_id = ?", [msUser.homeAccountId], (err, row) => {
      if (row) {
        // User exists, update token if needed or just return user
        res.redirect(`/?user_id=${row.id}`); // Simple redirect with user_id for demo
      } else {
        // Create new user
        db.run("INSERT INTO users (microsoft_id, name, email, role) VALUES (?, ?, ?, ?)", 
          [msUser.homeAccountId, msUser.name, msUser.username, role], 
          function(err) {
            res.redirect(`/?user_id=${this.lastID}`);
          }
        );
      }
    });
  } catch (err) {
    res.status(500).send("Error during authentication");
  }
});

// API: Book a Session
app.post('/api/sessions/book', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const { senior_id, slot, type, topic } = req.body;

  db.run(`INSERT INTO bookings (senior_id, student_id, slot, type, topic, status) VALUES (?, ?, ?, ?, ?, 'upcoming')`,
    [senior_id, req.user.id, slot, type, topic || 'General advice'],
    async function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const bookingId = this.lastID;

      // TRIGGER NOTIFICATIONS (Boilerplate)
      // Note: In a real app, you'd store and refresh the user's access token
      const userAccessToken = req.headers['x-ms-access-token']; 
      if (userAccessToken) {
        const graph = new GraphService(userAccessToken);
        
        // 1. Send Email to Freshman
        await graph.sendEmail(req.user.email, "Booking Confirmed!", `Your session for ${slot} is confirmed.`);
        
        // 2. Create Calendar Event
        // (Parsing slot to ISO date would happen here)
        // await graph.createCalendarEvent('2026-05-20T10:00:00', '2026-05-20T10:45:00', "Daleel Advising Session", "Microsoft Teams");
      } else {
        console.log(`Booking ${bookingId} confirmed. Microsoft Graph notifications skipped (no access token).`);
      }
      
      res.json({ success: true, bookingId });
    }
  );
});

// Mock Login (for testing before MSAL)
app.post('/api/auth/mock-login', (req, res) => {
  const { email, role } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
    if (row) {
      res.json(row);
    } else {
      // Create a mock user if they don't exist
      const name = email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      db.run("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", [name, email, role || 'fresh'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (err, newRow) => {
          res.json(newRow);
        });
      });
    }
  });
});

// Initialize DB only once
let isDbInitialized = false;

app.use(async (req, res, next) => {
  if (!isDbInitialized) {
    await initDb();
    isDbInitialized = true;
  }
  next();
});

module.exports = app;
