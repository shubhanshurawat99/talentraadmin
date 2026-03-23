const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');

// GET all candidates
exports.getAllCandidates = async (req, res) => {
  try {
    const { status, experience, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (experience) filter.experience = experience;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { currentCompany: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    const candidates = await Candidate.find(filter)
      .populate('recruiters', 'company contactPerson email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: candidates.length, data: candidates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET single candidate
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('recruiters', 'company contactPerson email phone status');
    if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });
    res.json({ success: true, data: candidate });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST create candidate
exports.createCandidate = async (req, res) => {
  try {
    const { skills, ...rest } = req.body;
    const skillsArray = typeof skills === 'string'
      ? skills.split(',').map(s => s.trim()).filter(Boolean)
      : skills || [];
    const candidate = await Candidate.create({ ...rest, skills: skillsArray });
    res.status(201).json({ success: true, data: candidate });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, error: 'Email already exists' });
    res.status(400).json({ success: false, error: err.message });
  }
};

// PUT update candidate
exports.updateCandidate = async (req, res) => {
  try {
    const { skills, ...rest } = req.body;
    if (skills !== undefined) {
      rest.skills = typeof skills === 'string'
        ? skills.split(',').map(s => s.trim()).filter(Boolean)
        : skills;
    }
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
    if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });
    res.json({ success: true, data: candidate });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// DELETE candidate
exports.deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });
    // Remove from recruiters
    await Recruiter.updateMany({ candidates: req.params.id }, { $pull: { candidates: req.params.id } });
    res.json({ success: true, message: 'Candidate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH update status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });
    res.json({ success: true, data: candidate });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// GET stats
exports.getCandidateStats = async (req, res) => {
  try {
    const stats = await Candidate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const expStats = await Candidate.aggregate([
      { $group: { _id: '$experience', count: { $sum: 1 } } }
    ]);
    const total = await Candidate.countDocuments();
    res.json({ success: true, data: { total, byStatus: stats, byExperience: expStats } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
