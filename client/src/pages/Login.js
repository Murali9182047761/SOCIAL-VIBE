import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleLogin } from '@react-oauth/google';
import { motion } from "framer-motion";
import { IoEye, IoEyeOff } from "react-icons/io5";
import "./Auth.css";
import { API_URL } from "../config";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/auth/login`,
        { email, password }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/home");
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed");
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
      console.error("Google Login Error", error);
      setMessage(error.response?.data?.message || "Google Login failed");
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
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        <div className="input-group">
          <label className="input-label">Email or Username</label>
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

        <div style={{ textAlign: "right", marginTop: "-10px", marginBottom: "20px" }}>
          <Link to="/forgot-password" style={{ color: "var(--primary-color)", fontSize: "14px", textDecoration: "none" }}>
            Forgot Password?
          </Link>
        </div>

        <motion.button
          className="auth-button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
        >
          Sign In
        </motion.button>

        <div style={{ margin: "20px 0", display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log('Login Failed');
              setMessage("Google Login Failed");
            }}
            shape="pill"
            width="100%"
          />
        </div>

        <div className="auth-footer">
          Don’t have an account?
          <Link to="/signup" className="auth-link">Sign Up</Link>
        </div>

        {message && <p className="auth-error">{message}</p>}
      </motion.div>
    </div>
  );
}

export default Login;
