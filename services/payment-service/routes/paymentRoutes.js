const express = require("express");
const { chargePayment } = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/charge", authMiddleware, chargePayment);

module.exports = router;
