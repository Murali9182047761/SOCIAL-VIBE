import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { AiFillEye, AiFillHeart, AiFillMessage, AiOutlineBarChart } from "react-icons/ai";

const AnalyticsDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/analytics`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(data);
                setLoading(false);
            } catch (error) {
                console.log("Failed to fetch analytics", error);
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [token]);

    if (loading) return <div style={{ textAlign: "center", padding: "20px" }}>Loading insights...</div>;
    if (!data) return <div style={{ textAlign: "center", padding: "20px" }}>No data available.</div>;

    const StatCard = ({ icon, label, value, color }) => (
        <div style={{
            background: "white", padding: "20px", borderRadius: "12px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "15px", flex: 1
        }}>
            <div style={{
                width: "50px", height: "50px", borderRadius: "10px", background: `${color}20`,
                display: "flex", alignItems: "center", justifyContent: "center", color: color
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>{value}</div>
                <div style={{ fontSize: "14px", color: "#666" }}>{label}</div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: "20px", background: "#f8f9fa", borderRadius: "10px", marginTop: "20px" }}>
            <h3 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                <AiOutlineBarChart /> Analytics & Insights
            </h3>

            {/* Key Stats Row */}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "30px" }}>
                <StatCard icon={<AiFillEye size={24} />} label="Profile Visits" value={data.profileViews} color="#0095f6" />
                <StatCard icon={<AiFillHeart size={24} />} label="Total Likes" value={data.totalLikes} color="#e74c3c" />
                <StatCard icon={<AiFillMessage size={24} />} label="Total Comments" value={data.totalComments} color="#2ecc71" />
                <StatCard icon={<span style={{ fontSize: "20px", fontWeight: "bold" }}>P</span>} label="Total Posts" value={data.totalPosts} color="#f39c12" />
            </div>

            {/* Top Posts */}
            <div>
                <h4 style={{ marginBottom: "15px" }}>Top Performing Posts</h4>
                {data.topPosts.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {data.topPosts.map(post => (
                            <div key={post._id} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: "white", padding: "15px", borderRadius: "10px", border: "1px solid #eee"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                    {post.picturePath ? (
                                        <img src={post.picturePath} alt="" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "5px" }} />
                                    ) : (
                                        <div style={{ width: "50px", height: "50px", background: "#eee", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#888" }}>No Image</div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "3px" }}>
                                            {post.description.substring(0, 40)}{post.description.length > 40 ? "..." : ""}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#888" }}>
                                            {new Date(post.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "20px", fontSize: "14px", fontWeight: "500" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#e74c3c" }}><AiFillHeart /> {post.likes}</span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#2ecc71" }}><AiFillMessage /> {post.comments}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: "#888", fontStyle: "italic" }}>No posts yet to analyze.</div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
