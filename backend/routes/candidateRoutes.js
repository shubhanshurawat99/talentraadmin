const express = require('express');
const router = express.Router();
const {
  getAllCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  updateStatus,
  getCandidateStats
} = require('../controllers/candidateController');

router.get('/stats', getCandidateStats);
router.get('/', getAllCandidates);
router.get('/:id', getCandidateById);
router.post('/', createCandidate);
router.put('/:id', updateCandidate);
router.delete('/:id', deleteCandidate);
router.patch('/:id/status', updateStatus);

module.exports = router;
