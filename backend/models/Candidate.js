const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  currentCompany: { type: String, required: true, trim: true },
  currentCTC: { type: String, required: true, trim: true },
  skills: [{ type: String, trim: true }],
  experience: {
    type: String,
    required: true,
    enum: ['0-1', '1-3', '3-5', '5-8', '8-12', '12+']
  },
  resumeLink: { type: String, trim: true },
  recruiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', default: null }],
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);
