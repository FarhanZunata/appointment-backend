const express = require('express');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'email_confirm'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL Database');
  }
});

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mzunata15@gmail.com',  // Replace with your email
    pass: 'lztk ndtq wbzn aatd'    // Replace with your email password or app password
  }
});

// User Registration & Send Confirmation Code
app.post('/register', (req, res) => {
  const { email, password } = req.body;

  // Generate a 6-digit confirmation code
  const confirmationCode = crypto.randomInt(100000, 999999).toString();

  // Save user & confirmation code in the database
  const query = 'INSERT INTO user (email, password, confirmation_code) VALUES (?, ?, ?)';
  db.query(query, [email, password, confirmationCode], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    // Send confirmation email
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Your Confirmation Code',
      text: `Your confirmation code is: ${confirmationCode}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) return res.status(500).json({ message: 'Email sending failed', error });

      res.json({ message: 'User registered! Check your email for the confirmation code.' });
    });
  });
});

// Verify Confirmation Code
app.post('/verify', (req, res) => {
  const { email, code } = req.body;

  const query = 'SELECT confirmation_code FROM user WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length === 0) return res.status(400).json({ message: 'Email not found' });

    if (results[0].confirmation_code == code) {
      // Update user status (optional)
      db.query('UPDATE user SET is_verified = 1 WHERE email = ?', [email]);
      res.json({ message: 'Email confirmed successfully!' });
    } else {
      res.status(400).json({ message: 'Invalid confirmation code' });
    }
  });
});

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));
