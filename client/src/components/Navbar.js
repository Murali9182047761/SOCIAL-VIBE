import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AiOutlineSearch, AiFillHome, AiOutlineMessage, AiOutlineBell } from "react-icons/ai";
import { FaMoon, FaSun } from "react-icons/fa";


function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuth, setIsAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");



  const user = JSON.parse(localStorage.getItem("user"));

  // Sync auth state with token
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuth(!!token);
  }, [location.pathname]);



  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuth(false);
    navigate("/login");
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Optional: Keep dropdown for quick user results if desired, or just use page.
    // Let's redirect on Enter instead.
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }

  // Quick results logic can remain if we want "Quick Jump" vs "Full Search"
  // For now, let's keep the quick jump for users but add "See all results"


  // Hide navbar on login & signup pages
  if (location.pathname === "/login" || location.pathname === "/signup") {
    return null;
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 40px",
        background: "var(--card-background)",
        boxShadow: "var(--shadow-soft)",
        color: "var(--text-primary)",
        height: "60px",
        transition: "all 0.3s ease"
      }}
      className="navbar-container"
    >
      {/* Left: Logo */}
      <Link to="/home" style={{ textDecoration: "none" }}>
        <h2 style={{ margin: 0, color: "#6a5af9", fontSize: "24px", fontWeight: "800" }}>SocialVibe</h2>
      </Link>

      {/* Center: Search Bar */}
      {isAuth && (
        <div style={{ position: "relative", width: "400px" }} className="navbar-search">
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "var(--input-bg)",
            borderRadius: "20px",
            padding: "8px 15px",
            width: "100%",
            transition: "background 0.3s ease",
            border: "1px solid var(--border-color)"
          }}>
            <AiOutlineSearch size={20} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search creators, hashtags..."
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                marginLeft: "10px",
                width: "100%",
                fontSize: "14px",
                color: "var(--text-primary)"
              }}
            />
          </div>
        </div>
      )}

      {/* Right: Icons & Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {isAuth ? (
          <>
            <Link to="/home"><AiFillHome size={24} color="#6a5af9" /></Link>
            <Link to="/chat"><AiOutlineMessage size={24} color={theme === "dark" ? "#E4E6EB" : "#65676b"} /></Link>
            <Link to="/notifications"><AiOutlineBell size={24} color={theme === "dark" ? "#E4E6EB" : "#65676b"} /></Link>

            <div onClick={toggleTheme} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
              {theme === "light" ? <FaMoon size={22} color="#65676b" /> : <FaSun size={22} color="#E4E6EB" />}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate("/profile")}>
              <img
                src={user?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt="profile"
                style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" }}
              />
            </div>

            <span
              onClick={logout}
              style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500", cursor: "pointer" }}
            >
              Logout
            </span>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: "#65676b", fontWeight: "600", textDecoration: "none", marginRight: "10px" }}>Login</Link>
            <Link to="/signup" style={{ color: "#6a5af9", fontWeight: "600", textDecoration: "none" }}>Sign Up</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default Navbar;
