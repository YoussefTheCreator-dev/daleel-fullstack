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

const gmailService = require('./gmailService');

// ... (rest of imports)

// API: Book a Session
app.post('/api/sessions/book', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const { senior_id, slot, type, topic } = req.body;

  db.get("SELECT name, email FROM users WHERE id = ?", [senior_id], (err, senior) => {
    if (err || !senior) return res.status(404).json({ error: "Senior not found" });

    db.run(`INSERT INTO bookings (senior_id, student_id, slot, type, topic, status) VALUES (?, ?, ?, ?, ?, 'upcoming')`,
      [senior_id, req.user.id, slot, type, topic || 'General advice'],
      async function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // 1. Send Email to Freshman
        const html = gmailService.getBookingHtml(req.user.name, senior.name, slot, type);
        await gmailService.sendEmail(req.user.email, "Session Confirmed! 📅", html);
        
        // 2. Send Email to Senior
        const seniorHtml = gmailService.getBookingHtml(senior.name, req.user.name, slot, type);
        await gmailService.sendEmail(senior.email, "New Booking Received! 🎓", seniorHtml);
        
        res.json({ success: true, bookingId: this.lastID });
      }
    );
  });
});

// Mock Login
app.post('/api/auth/mock-login', (req, res) => {
  const { email, role } = req.body;
  console.log(`Login request: ${email} as ${role}`);
  
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
    if (row) {
      console.log('User found:', row.name);
      res.json(row);
    } else {
      // Create a mock user if they don't exist
      const name = email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      db.run("INSERT INTO users (name, email, role) VALUES (?, ?, ?)", [name, email, role || 'fresh'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (err, newRow) => {
          console.log('New user created:', newRow.name);
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

// Start server if run directly (for Codespaces, Glitch, Local)
if (require.main === module) {
  initDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  });
}
