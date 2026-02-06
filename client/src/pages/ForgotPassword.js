import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            await axios.post(`${API_URL}/auth/forgot-password`, { email });
            setMessage("Email sent! Check your inbox for the reset link.");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Forgot Password</h2>
                <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
                    Enter your email to receive a password reset link.
                </p>
                {message && <div style={{ color: "green", marginBottom: "10px", textAlign: "center" }}>{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        style={{ marginTop: "10px", background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "14px" }}
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
