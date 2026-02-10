import {
  AiFillHome,
  AiOutlineUsergroupAdd,
  AiOutlineBell,
  AiOutlineSetting,
} from "react-icons/ai";
import { BsBookmarkFill, BsFilePost, BsArchiveFill } from "react-icons/bs";
import { Link, useLocation } from "react-router-dom";
import "./LeftSidebar.css";

function LeftSidebar() {
  const location = useLocation();

  const sidebarItems = [
    { icon: <AiFillHome />, label: "Home", link: "/home", color: "#e76f51" }, // Orangeish icon color
    { icon: <AiOutlineUsergroupAdd />, label: "Communities", link: "/chat", color: "#6a5af9" },
    { icon: <BsBookmarkFill />, label: "Saved", link: "/saved", color: "#e63946" },
    { icon: <AiOutlineBell />, label: "Follow Requests", link: "/notifications", color: "#a8dadc" }, // Using notifications for requests
    { icon: <BsFilePost />, label: "Manage Posts", link: "/manage-posts", color: "#457b9d" },
    { icon: <BsArchiveFill />, label: "Archived", link: "/archived", color: "#546e7a" },
    { icon: <AiOutlineSetting />, label: "Settings", link: "/settings", color: "#1d3557" },
  ];

  return (
    <div className="left-sidebar">
      {/* Shortcuts Card */}
      <div className="shortcuts-card">
        <h3 className="sidebar-title">Shortcuts</h3>

        <nav className="sidebar-nav">
          {sidebarItems.map((item, index) => {
            const isActive = location.pathname === item.link;

            return (
              <Link
                to={item.link}
                key={index}
                className={`sidebar-item ${isActive ? "active" : ""}`}
              >
                <span className="icon" style={{ color: item.color }}>{item.icon}</span>
                <span className="label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pages/Footer link could go here */}
      <div style={{ marginTop: "20px", fontSize: "12px", color: "#aaa", paddingLeft: "10px" }}>
        Privacy · Terms · Advertising · Cookies
        <br />
        SocialVibe © 2026
      </div>
    </div>
  );
}

export default LeftSidebar;
