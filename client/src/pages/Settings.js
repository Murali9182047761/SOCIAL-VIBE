import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import "./Home.css";
import { AiOutlineSetting } from "react-icons/ai";

const Settings = () => {
    const navigate = useNavigate();
    const [isPrivate, setIsPrivate] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    const [loading, setLoading] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`${API_URL}/user/${user._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const userData = res.data;
                if (userData.privacySettings?.profileVisibility === "private") {
                    setIsPrivate(true);
                }
                if (userData.notificationSettings) {
                    setEmailNotifications(userData.notificationSettings.emailNotifications);
                    setPushNotifications(userData.notificationSettings.pushNotifications);
                }
                if (userData.twoFactorEnabled) {
                    setTwoFactorEnabled(userData.twoFactorEnabled);
                }
            } catch (err) {
                console.log("Error fetching settings", err);
            }
        };
        fetchSettings();
        // eslint-disable-next-line
    }, []);

    const updateProfileSettings = async (updates) => {
        setLoading(true);
        try {
            const formData = new FormData();
            for (const key in updates) {
                if (typeof updates[key] === 'object') {
                    formData.append(key, JSON.stringify(updates[key]));
                } else {
                    formData.append(key, updates[key]);
                }
            }

            const res = await axios.put(`${API_URL}/user/profile`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local storage
            const updatedUser = { ...user, ...res.data };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setLoading(false);
            return true;
        } catch (err) {
            console.log("Error updating settings", err);
            setLoading(false);
            alert("Failed to update settings");
            return false;
        }
    };

    const handlePrivacyToggle = async (e) => {
        const newStatus = e.target.checked ? "private" : "public";
        setIsPrivate(e.target.checked);
        const success = await updateProfileSettings({ privacySettings: { profileVisibility: newStatus } });
        if (!success) setIsPrivate(!e.target.checked);
    };

    const handleEmailNotifToggle = async (e) => {
        const newVal = e.target.checked;
        setEmailNotifications(newVal);
        const success = await updateProfileSettings({
            notificationSettings: { emailNotifications: newVal, pushNotifications }
        });
        if (!success) setEmailNotifications(!newVal);
    };

    const handlePushNotifToggle = async (e) => {
        const newVal = e.target.checked;
        setPushNotifications(newVal);
        const success = await updateProfileSettings({
            notificationSettings: { emailNotifications, pushNotifications: newVal }
        });
        if (!success) setPushNotifications(!newVal);
    };

    const handle2FAToggle = async (e) => {
        const newVal = e.target.checked;
        setTwoFactorEnabled(newVal);
        const success = await updateProfileSettings({ twoFactorEnabled: newVal });
        if (!success) setTwoFactorEnabled(!newVal);
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            alert("New passwords do not match!");
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API_URL}/auth/update-password`, {
                userId: user._id,
                currentPassword: passwords.current,
                newPassword: passwords.new
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Password updated successfully!");
            setShowPasswordModal(false);
            setPasswords({ current: "", new: "", confirm: "" });
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            return;
        }

        const confirmName = window.prompt(`Type "${user.name}" to confirm deletion:`);
        if (confirmName !== user.name) {
            alert("Name does not match. Deletion cancelled.");
            return;
        }

        try {
            await axios.delete(`${API_URL}/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Account deleted.");
            localStorage.clear();
            navigate("/login");
        } catch (err) {
            console.error("Delete account error:", err);
            alert(err.response?.data?.message || "Failed to delete account");
        }
    };

    return (
        <div className="home-layout">
            <LeftSidebar />
            <div className="feed-container">
                <div className="card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                        <AiOutlineSetting size={24} color="var(--primary-color)" />
                        <h2 style={{ margin: 0 }}>Settings & Privacy</h2>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {/* Account Security */}
                        <div style={{ padding: "15px", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 10px 0" }}>Account Security</h4>
                            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Change password, enable 2FA.</p>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                                <button className="btn-primary" onClick={() => setShowPasswordModal(true)} style={{ padding: "8px 16px", borderRadius: "5px", fontSize: "14px" }}>
                                    Update Password
                                </button>

                                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={twoFactorEnabled}
                                        onChange={handle2FAToggle}
                                        disabled={loading}
                                    />
                                    <span style={{ fontWeight: "500", fontSize: "14px" }}>Enable 2FA</span>
                                </label>
                            </div>
                        </div>

                        {/* Privacy */}
                        <div style={{ padding: "15px", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 10px 0" }}>Privacy</h4>
                            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Manage who can see your posts and profile.</p>
                            <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={handlePrivacyToggle}
                                    disabled={loading}
                                />
                                <span style={{ fontWeight: "500" }}>Private Account</span>
                            </label>
                        </div>

                        {/* Notifications */}
                        <div style={{ padding: "15px", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 10px 0" }}>Notifications</h4>
                            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Configure what you want to be notified about.</p>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={emailNotifications}
                                        onChange={handleEmailNotifToggle}
                                        disabled={loading}
                                    />
                                    <span style={{ fontWeight: "500" }}>Email Notifications</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={pushNotifications}
                                        onChange={handlePushNotifToggle}
                                        disabled={loading}
                                    />
                                    <span style={{ fontWeight: "500" }}>Push Notifications</span>
                                </label>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div style={{ padding: "15px", border: "1px solid #ff4d4f", borderRadius: "8px", background: "rgba(255, 77, 79, 0.05)" }}>
                            <h4 style={{ margin: "0 0 10px 0", color: "#ff4d4f" }}>Danger Zone</h4>
                            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Once you delete your account, there is no going back. Please be certain.</p>

                            <button
                                onClick={handleDeleteAccount}
                                style={{
                                    marginTop: "10px",
                                    padding: "8px 16px",
                                    borderRadius: "5px",
                                    border: "1px solid #ff4d4f",
                                    background: "transparent",
                                    color: "#ff4d4f",
                                    cursor: "pointer",
                                    fontWeight: "600"
                                }}
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Modal */}
            {
                showPasswordModal && (
                    <div style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
                    }}>
                        <div style={{ background: "white", padding: "20px", borderRadius: "8px", width: "400px", maxWidth: "90%" }}>
                            <h3>Change Password</h3>
                            <form onSubmit={handlePasswordUpdate} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <input
                                    type="password"
                                    placeholder="Current Password"
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    required
                                    style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ddd" }}
                                />
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                    required
                                    style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ddd" }}
                                />
                                <input
                                    type="password"
                                    placeholder="Confirm New Password"
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    required
                                    style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ddd" }}
                                />
                                <div style={{ textAlign: "right" }}>
                                    <span
                                        onClick={() => navigate("/forgot-password")}
                                        style={{ color: "#0095f6", fontSize: "12px", cursor: "pointer" }}
                                    >
                                        Forgot Password?
                                    </span>
                                </div>
                                <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
                                    <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: "8px 16px", borderRadius: "5px", border: "none", background: "#ddd", cursor: "pointer" }}>Cancel</button>
                                    <button type="submit" disabled={loading} className="btn-primary" style={{ padding: "8px 16px", borderRadius: "5px", cursor: "pointer" }}>{loading ? "Updating..." : "Update"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <RightSidebar />
        </div >
    );
};

export default Settings;
