import { useState, useEffect } from "react";
import LeftSidebar from "../components/LeftSidebar";
import axios from "axios";
import { API_URL } from "../config";
import socket from "../socket";
import "./Notifications.css";

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    const [followRequests, setFollowRequests] = useState([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await axios.get(`${API_URL}/notifications/${user._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNotifications(res.data);
            } catch (err) {
                console.log("Error fetching notifications", err);
            }
        };

        const fetchRequests = async () => {
            try {
                const res = await axios.get(`${API_URL}/user/${user._id}/requests`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFollowRequests(res.data);
            } catch (err) {
                console.log("Error fetching requests", err);
            }
        }

        fetchNotifications();
        fetchRequests();
    }, [user._id, token]);

    const handleAccept = async (requesterId) => {
        try {
            await axios.post(`${API_URL}/user/requests/accept`,
                { userId: user._id, requesterId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setFollowRequests(prev => prev.filter(req => req._id !== requesterId));
            // Optional: emit notification to requester
        } catch (err) {
            alert("Failed to accept request");
        }
    }

    const handleDecline = async (requesterId) => {
        try {
            await axios.post(`${API_URL}/user/requests/decline`,
                { userId: user._id, requesterId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setFollowRequests(prev => prev.filter(req => req._id !== requesterId));
        } catch (err) {
            alert("Failed to decline request");
        }
    }

    // Listen for new notifications
    useEffect(() => {
        const handleNewNotification = (notification) => {
            setNotifications((prev) => [notification, ...prev]);
        };
        socket.on("new-notification", handleNewNotification);
        return () => socket.off("new-notification", handleNewNotification);
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.patch(`${API_URL}/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="notifications-page">
            <LeftSidebar />
            <div className="notifications-container">
                <div className="notifications-header">Notifications</div>

                <div style={{ marginBottom: "20px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                    <h4 style={{ margin: "10px 0 10px 10px" }}>Follow Requests</h4>
                    {followRequests.length === 0 ? (
                        <p style={{ margin: "0 0 10px 10px", color: "#888", fontSize: "14px" }}>No waiting requests</p>
                    ) : (
                        followRequests.map(req => (
                            <div key={req._id} className="notification-item" style={{ cursor: "default" }}>
                                <img
                                    src={req.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                    alt="sender"
                                    className="notif-img"
                                />
                                <div className="notif-content" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                    <span><strong>{req.name}</strong> wants to follow you.</span>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button onClick={() => handleAccept(req._id)} style={{ background: "#0095f6", color: "white", padding: "5px 10px", borderRadius: "5px", border: "none", cursor: "pointer" }}>Confirm</button>
                                        <button onClick={() => handleDecline(req._id)} style={{ background: "#dbdbdb", color: "black", padding: "5px 10px", borderRadius: "5px", border: "none", cursor: "pointer" }}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="notification-list">
                    {notifications.length === 0 ? (
                        <div className="empty-state">No notifications yet</div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif._id}
                                className={`notification-item ${!notif.read ? "unread" : ""}`}
                                onClick={() => !notif.read && markAsRead(notif._id)}
                            >
                                <img
                                    src={notif.sender?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                    alt="sender" // Placeholder
                                    className="notif-img"
                                />
                                <div className="notif-content">
                                    <strong>{notif.sender?.name}</strong>{" "}
                                    {notif.type === "like" ? "liked your post" :
                                        notif.type === "comment" ? "commented on your post" :
                                            notif.type === "screenshot" ? "took a screenshot of your profile" :
                                                "interacted with you"}
                                    <div className="notif-time">
                                        {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Notifications;
