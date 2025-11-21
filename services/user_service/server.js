const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/authRoutes');
const { initDb } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);

const startServer = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

startServer();
