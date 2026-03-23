const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');

// GET all recruiters
exports.getAllRecruiters = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { company: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const recruiters = await Recruiter.find(filter)
      .populate('candidates', 'name email status experience')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: recruiters.length, data: recruiters });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET single recruiter
exports.getRecruiterById = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id)
      .populate('candidates', 'name email phone status experience skills location currentCompany currentCTC resumeLink');
    if (!recruiter) return res.status(404).json({ success: false, error: 'Recruiter not found' });
    res.json({ success: true, data: recruiter });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST create recruiter
exports.createRecruiter = async (req, res) => {
  try {
    const recruiter = await Recruiter.create(req.body);
    res.status(201).json({ success: true, data: recruiter });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// PUT update recruiter
exports.updateRecruiter = async (req, res) => {
  try {
    const recruiter = await Recruiter.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!recruiter) return res.status(404).json({ success: false, error: 'Recruiter not found' });
    res.json({ success: true, data: recruiter });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// DELETE recruiter
exports.deleteRecruiter = async (req, res) => {
  try {
    const recruiter = await Recruiter.findByIdAndDelete(req.params.id);
    if (!recruiter) return res.status(404).json({ success: false, error: 'Recruiter not found' });
    await Candidate.updateMany({ recruiters: req.params.id }, { $pull: { recruiters: req.params.id } });
    res.json({ success: true, message: 'Recruiter deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH update status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const recruiter = await Recruiter.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!recruiter) return res.status(404).json({ success: false, error: 'Recruiter not found' });
    res.json({ success: true, data: recruiter });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// POST link candidate to recruiter
exports.linkCandidate = async (req, res) => {
  try {
    const { candidateId } = req.body;
    const recruiter = await Recruiter.findById(req.params.id);
    const candidate = await Candidate.findById(candidateId);
    if (!recruiter || !candidate) return res.status(404).json({ success: false, error: 'Not found' });

    if (!recruiter.candidates.includes(candidateId)) {
      recruiter.candidates.push(candidateId);
      await recruiter.save();
    }
    if (!candidate.recruiters.includes(req.params.id)) {
      candidate.recruiters.push(req.params.id);
      await candidate.save();
    }
    res.json({ success: true, message: 'Candidate linked to recruiter' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET recruiter stats
exports.getRecruiterStats = async (req, res) => {
  try {
    const stats = await Recruiter.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const total = await Recruiter.countDocuments();
    const topCompanies = await Recruiter.aggregate([
      { $group: { _id: '$company', count: { $sum: 1 }, candidates: { $sum: { $size: '$candidates' } } } },
      { $sort: { candidates: -1 } },
      { $limit: 5 }
    ]);
    res.json({ success: true, data: { total, byStatus: stats, topCompanies } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
