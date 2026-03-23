const express = require('express');
const router = express.Router();
const {
  getAllRecruiters,
  getRecruiterById,
  createRecruiter,
  updateRecruiter,
  deleteRecruiter,
  updateStatus,
  linkCandidate,
  getRecruiterStats
} = require('../controllers/recruiterController');

router.get('/stats', getRecruiterStats);
router.get('/', getAllRecruiters);
router.get('/:id', getRecruiterById);
router.post('/', createRecruiter);
router.put('/:id', updateRecruiter);
router.delete('/:id', deleteRecruiter);
router.patch('/:id/status', updateStatus);
router.post('/:id/link-candidate', linkCandidate);

module.exports = router;
