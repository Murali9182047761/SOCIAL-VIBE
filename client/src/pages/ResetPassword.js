import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./Auth.css";

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { resetToken } = useParams();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setMessage("");
        setError("");

        try {
            await axios.put(`${API_URL}/auth/reset-password/${resetToken}`, { password });
            setMessage("Password reset successful! You can now login.");
            setTimeout(() => navigate("/login"), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password. Link might be expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Reset Password</h2>
                <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
                    Enter your new password below.
                </p>
                {message && <div style={{ color: "green", marginBottom: "10px", textAlign: "center" }}>{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="auth-input"
                        minLength="6"
                    />
                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="auth-input"
                        minLength="6"
                    />
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
