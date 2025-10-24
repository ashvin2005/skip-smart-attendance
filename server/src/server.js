const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { prisma } = require('./prisma');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const semesterRoutes = require('./routes/semesterRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/', (req, res) => {
    res.send('SkipSmart API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

