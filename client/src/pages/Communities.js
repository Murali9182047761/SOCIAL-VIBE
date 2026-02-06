import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import "./Home.css"; // Reuse home layout
import { AiOutlineUsergroupAdd } from "react-icons/ai";

const Communities = () => {
    return (
        <div className="home-layout">
            <LeftSidebar />
            <div className="feed-container">
                <div style={{
                    background: "var(--card-background)",
                    padding: "40px",
                    borderRadius: "12px",
                    textAlign: "center",
                    boxShadow: "var(--shadow-soft)",
                    marginTop: "20px"
                }}>
                    <div style={{
                        background: "#e7f3ff",
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px"
                    }}>
                        <AiOutlineUsergroupAdd size={40} color="#1877f2" />
                    </div>
                    <h2 style={{ color: "var(--text-primary)", marginBottom: "10px" }}>Communities</h2>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
                        Connect with people who share your interests. Groups and communities coming soon!
                    </p>
                    <button className="btn-primary" style={{ padding: "10px 20px", borderRadius: "8px" }}>Explore Groups</button>
                </div>
            </div>
            <RightSidebar />
        </div>
    );
};

export default Communities;
