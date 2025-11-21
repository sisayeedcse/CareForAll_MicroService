require('dotenv').config();
const express = require('express');
const { initDB } = require('./config/db');
const pledgeRoutes = require('./routes/pledgeRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Initialize DB before starting server
initDB().then(() => {
    
    app.use('/api/v1', pledgeRoutes);
    
    app.listen(PORT, () => {
        console.log(`Pledge Service running on http://localhost:${PORT}`);
    });

}).catch(err => {
    console.error('Failed to start server due to DB error');
});