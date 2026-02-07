const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);

// ✅ PROFILE ROUTE
router.get("/profile", authMiddleware, authController.getProfile);
router.post("/update-password", authMiddleware, authController.updatePassword);

// ✅ PASSWORD RESET ROUTES
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-2fa", authController.verify2FA);
router.put("/reset-password/:resetToken", authController.resetPassword);

module.exports = router;
