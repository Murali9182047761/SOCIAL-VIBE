const express = require("express");
const { searchAll, getTrending } = require("../controllers/searchController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Allow public access to search? Likely yes, but maybe restricted to auth. 
// User instructions imply internal app search, so authMiddleware is safer.
router.get("/", authMiddleware, searchAll);
router.get("/trending", authMiddleware, getTrending);

module.exports = router;
