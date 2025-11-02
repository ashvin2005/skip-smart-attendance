const express = require('express');
const { createSemester, getSemesters, createSubject, getSubjects } = require('../controllers/semesterController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.post('/', createSemester);
router.get('/', getSemesters);
router.post('/subjects', createSubject);
router.get('/:semesterId/subjects', getSubjects);

module.exports = router;
