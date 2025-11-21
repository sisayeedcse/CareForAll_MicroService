const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const campaignRoutes = require('./routes/campaignRoutes');
const { initDb } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use('/campaigns', campaignRoutes);

const startServer = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Campaign service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

startServer();
