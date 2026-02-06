import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import { motion } from "framer-motion";
import { IoEye, IoEyeOff } from "react-icons/io5";
import "./Auth.css";
import { API_URL } from "../config";

function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!firstName || !lastName || !username || !email || !password) {
      setMessage("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/auth/register`,
        {
          name: `${firstName} ${lastName}`,
          username,
          email,
          password,
        }
      );

      setMessage(res.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || "Signup failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(
        `${API_URL}/auth/google`,
        { credential: credentialResponse.credential }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/home");
    } catch (error) {
      console.error("Google Signup Error", error);
      setMessage(error.response?.data?.message || "Google Signup failed");
    }
  };

  return (
    <div className="auth-container">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join us to explore ideas</p>

        <div className="auth-row">
          <div className="input-group">
            <label className="input-label">First Name</label>
            <input
              className="auth-input"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Last Name</label>
            <input
              className="auth-input"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Username</label>
          <input
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Email</label>
          <input
            className="auth-input"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <div className="input-wrapper">
            <input
              className="auth-input"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div
              className="password-toggle-icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <IoEyeOff /> : <IoEye />}
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Confirm Password</label>
          <div className="input-wrapper">
            <input
              className="auth-input"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div
              className="password-toggle-icon"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <IoEyeOff /> : <IoEye />}
            </div>
          </div>
        </div>

        <motion.button
          className="auth-button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignup}
        >
          Sign Up
        </motion.button>

        <div style={{ margin: "20px 0", display: "flex", justifyContent: "center" }}>
          <p style={{ margin: "0 0 10px 0", width: "100%", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>Or sign up with</p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log('Login Failed');
              setMessage("Google Login Failed");
            }}
            text="signup_with"
            shape="pill"
            width="100%"
          />
        </div>

        <div className="auth-footer">
          Already have an account?
          <Link to="/login" className="auth-link">Login here</Link>
        </div>

        {message && <p className="auth-error">{message}</p>}
      </motion.div>
    </div>
  );
}

export default Signup;
