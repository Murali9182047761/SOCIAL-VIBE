const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { detectFakeAccount } = require("../utils/aiDetector");

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    const oldUser = await User.findOne({ email });
    if (oldUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const isFake = detectFakeAccount(email, name);

    const user = new User({
      name,
      username,
      email,
      password: hashedPassword,
      flags: {
        isPotentialFake: isFake
      }
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (!user.username) {
      let baseUsername = user.email.split("@")[0];
      let generatedUsername = baseUsername;
      while (await User.findOne({ username: generatedUsername })) {
        generatedUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
      }
      user.username = generatedUsername;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= PROFILE =================
exports.getProfile = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// ================= GOOGLE LOGIN =================
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    // Verify Google Token
    // NOTE: For local testing without a real Client ID in .env, we might skip verification or use a mock.
    // However, in production, ALWAYS verify.
    // If process.env.GOOGLE_CLIENT_ID is not set, this might fail unless we make it optional for dev.

    let email, name, picture, googleId;

    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    } else {
      // Fallback for development if decoding manually (NOT SECURE for prod)
      // Usually frontend sends a JWT, we can decode it locally to test
      const decode = jwt.decode(credential);
      email = decode.email;
      name = decode.name;
      picture = decode.picture;
      googleId = decode.sub;
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Generate unique username
      let baseUsername = email.split("@")[0];
      let generatedUsername = baseUsername;
      let counter = 1;
      while (await User.findOne({ username: generatedUsername })) {
        generatedUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
      }

      // Create new user
      user = new User({
        name,
        username: generatedUsername,
        email,
        profilePicture: picture,
        googleId: googleId,
        authSource: "google",
        // Password left empty or can set a random one
      });
      await user.save();
    } else {
      let isModified = false;

      // Link Google Account if not linked
      if (!user.googleId) {
        user.googleId = googleId;
        isModified = true;
      }

      // Backfill username if missing
      if (!user.username) {
        let baseUsername = email.split("@")[0];
        let generatedUsername = baseUsername;
        while (await User.findOne({ username: generatedUsername })) {
          generatedUsername = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
        }
        user.username = generatedUsername;
        isModified = true;
      }

      if (isModified) {
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user._id },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Google login successful",
      token,
      user
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(400).json({ message: "Google login failed" });
  }
};
// ================= UPDATE PASSWORD =================
exports.updatePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    // For Google Logins or if password not set
    if (!user.password) {
      if (currentPassword) return res.status(400).json({ message: "Password not set for this account." });
      // Logic for setting password first time if needed, but assuming update flow
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid current password" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and save to DB
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expiry to 10 minutes
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Create reset URL (pointing to frontend)
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    const message = `
      <h1>You have requested a password reset</h1>
      <p>Please go to this link to reset your password:</p>
      <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message: `You requested a password reset. Link: ${resetUrl}`,
        html: message,
      });

      res.status(200).json({ success: true, data: "Email Sent" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      console.error("Email send error:", err); // Log the actual error
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid Token" });
    }

    const { password } = req.body;
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(201).json({
      success: true,
      data: "Password Reset Success",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
