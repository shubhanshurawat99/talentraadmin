const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, error: 'Username and password required' });

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin || !(await admin.matchPassword(password)))
      return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = signToken(admin._id);
    res.json({
      success: true,
      token,
      admin: { id: admin._id, username: admin.username, displayName: admin.displayName }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/auth/me  (verify token + return admin info)
exports.getMe = async (req, res) => {
  res.json({ success: true, admin: req.admin });
};
