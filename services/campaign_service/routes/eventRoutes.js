const express = require("express");
const { ingestEvent } = require("../controllers/eventController");

const router = express.Router();

router.post("/", ingestEvent);

module.exports = router;
