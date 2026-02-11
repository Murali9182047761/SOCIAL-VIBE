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
  const [show2FA, setShow2FA] = useState(false);
  const [otp, setOtp] = useState("");
  const [tempUserId, setTempUserId] = useState(null);

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setMessage("");
      const res = await axios.post(
        `${API_URL}/auth/login`,
        { email, password }
      );

      if (res.data.twoFactorRequired) {
        setShow2FA(true);
        setTempUserId(res.data.userId);
        setMessage("Please enter the 6-digit code sent to your email.");
      } else {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/home");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed");
    }
  };

  const handleVerify2FA = async () => {
    try {
      setMessage("");
      const res = await axios.post(
        `${API_URL}/auth/verify-2fa`,
        { userId: tempUserId, code: otp }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/home");
    } catch (error) {
      setMessage(error.response?.data?.message || "Invalid 2FA code");
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
        <h1 className="auth-title">
          {show2FA ? "Two-Factor Auth" : "Welcome Back"}
        </h1>
        <p className="auth-subtitle">
          {show2FA ? "Enter code sent to email" : "Sign in to continue"}
        </p>

        {!show2FA ? (
          <>
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

            <div style={{ margin: "15px 0", textAlign: "center", position: "relative" }}>
              <div style={{ borderBottom: "1px solid var(--border-color)", position: "absolute", top: "50%", width: "100%", zIndex: 0 }}></div>
              <span style={{ background: "var(--card-background)", padding: "0 10px", position: "relative", zIndex: 1, fontSize: "14px", color: "var(--text-secondary)" }}>
                Or sign in with
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px", width: "100%" }}>
              <div style={{ minHeight: "40px", display: "flex", justifyContent: "center", width: "100%" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    console.log('Login Failed');
                    setMessage("Google Login Failed");
                  }}
                  theme="filled_blue"
                  shape="pill"
                  width="280"
                />
              </div>
              <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "5px" }}>
                Secure login with Google Identity
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="input-group">
              <label className="input-label">6-Digit Code</label>
              <input
                className="auth-input"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ textAlign: "center", fontSize: "24px", letterSpacing: "8px" }}
              />
            </div>

            <motion.button
              className="auth-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleVerify2FA}
            >
              Verify & Login
            </motion.button>

            <button
              onClick={() => setShow2FA(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: "14px",
                marginTop: "15px",
                cursor: "pointer"
              }}
            >
              Back to Login
            </button>
          </>
        )}

        <div className="auth-footer">
          Don’t have an account?
          <Link to="/signup" className="auth-link">Sign Up</Link>
        </div>

        {message && (
          <p className={show2FA && otp.length === 0 ? "auth-info" : "auth-error"}>
            {message}
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default Login;
