const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'daleel.db');

// Ensure directory exists if DB_PATH is set
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users Table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        microsoft_id TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT CHECK( role IN ('fresh', 'senior') ) DEFAULT 'fresh',
        major TEXT,
        year TEXT,
        gpa TEXT,
        bio TEXT,
        topics TEXT, -- Stored as JSON string
        available BOOLEAN DEFAULT 1,
        color TEXT
      )`, (err) => { if (err) reject(err); });

      // Bookings Table
      db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senior_id INTEGER,
        student_id INTEGER,
        slot TEXT NOT NULL,
        type TEXT CHECK( type IN ('call', 'meet') ) NOT NULL,
        topic TEXT,
        status TEXT CHECK( status IN ('upcoming', 'completed', 'cancelled') ) DEFAULT 'upcoming',
        earned INTEGER,
        FOREIGN KEY(senior_id) REFERENCES users(id),
        FOREIGN KEY(student_id) REFERENCES users(id)
      )`, (err) => { if (err) reject(err); });

      // Seed Initial Seniors if empty
      db.get("SELECT COUNT(*) as count FROM users WHERE role = 'senior'", (err, row) => {
        if (row.count === 0) {
          const seniors = [
            ['Sara Al-Mansouri', 'sara@adu.ac.ae', 'senior', 'Computer Engineering', '3rd Year', '3.8', 'Happy to help with course selection, internship tips, and study strategies for CE students!', JSON.stringify(['Course Selection','Internships','Study Tips']), 1, '#3d6b4f'],
            ['Ahmed Khalil', 'ahmed@adu.ac.ae', 'senior', 'Biomedical Engineering', '4th Year', '3.6', 'I can guide you through the BME curriculum, research opportunities, and hospital internships.', JSON.stringify(['Research','Internships','Lab Work']), 1, '#e8834a'],
            ['Layla Hassan', 'layla@adu.ac.ae', 'senior', 'IT', '3rd Year', '3.9', 'Specializing in web dev and networking. Ask me about projects, clubs, and career paths in IT.', JSON.stringify(['Web Dev','Networking','Career']), 0, '#6fa882'],
            ['Omar Al-Rashid', 'omar@adu.ac.ae', 'senior', 'Cybersecurity Engineering', '4th Year', '3.7', 'Cybersecurity enthusiast. I can help with certifications, labs, and career guidance.', JSON.stringify(['Certifications','CTF','Career']), 1, '#c9972a'],
            ['Fatima Al-Zahra', 'fatima@adu.ac.ae', 'senior', 'Architecture', '3rd Year', '3.5', 'Architecture student passionate about design. I can help with studio projects and portfolio building.', JSON.stringify(['Design','Portfolio','Studio']), 1, '#9898a8'],
            ['Khalid Nasser', 'khalid@adu.ac.ae', 'senior', 'Mechanical Engineering', '4th Year', '3.4', 'ME student with experience in CAD, manufacturing, and internships at major companies.', JSON.stringify(['CAD','Manufacturing','Internships']), 0, '#5c5c6e'],
            ['Nour Al-Amin', 'nour@adu.ac.ae', 'senior', 'Public Health', '3rd Year', '3.7', 'Public health student with experience in community projects and research. Here to help!', JSON.stringify(['Research','Community','Career']), 1, '#6fa882'],
            ['Reem Saeed', 'reem@adu.ac.ae', 'senior', 'Psychology', '4th Year', '3.5', 'Psychology senior. I can help with academic planning, research methods, and internship advice.', JSON.stringify(['Academic Planning','Research','Internships']), 1, '#e8834a']
          ];
          const stmt = db.prepare(`INSERT INTO users (name, email, role, major, year, gpa, bio, topics, available, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
          seniors.forEach(s => stmt.run(s));
          stmt.finalize();
        }
      });

      resolve(db);
    });
  });
};

module.exports = { db, initDb };
