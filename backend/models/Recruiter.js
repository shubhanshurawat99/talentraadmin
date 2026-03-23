const mongoose = require('mongoose');

const recruiterSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],
  status: {
    type: String,
    enum: ['pending', 'contacted', 'closed'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Recruiter', recruiterSchema);
