import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AiOutlineSearch, AiFillHome, AiOutlineMessage, AiOutlineBell } from "react-icons/ai";
import { FaMoon, FaSun, FaUserCircle } from "react-icons/fa";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuth, setIsAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuth(!!token);
  }, [location.pathname]);

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
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }

  if (location.pathname === "/login" || location.pathname === "/signup") {
    return null;
  }

  return (
    <>
      <nav className="navbar-container">
        {/* Left: Logo */}
        <div className="navbar-logo">
          <Link to="/home" style={{ textDecoration: "none" }}>
            <h2>SocialVibe</h2>
          </Link>
        </div>

        {/* Center: Search Bar */}
        {isAuth && (
          <div className="navbar-search-wrapper">
            <div className="search-bar">
              <AiOutlineSearch size={20} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearch}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        )}

        {/* Right: Icons & Profile */}
        <div className="navbar-actions">
          {isAuth ? (
            <>
              <Link to="/home" className="nav-icon hide-mobile">
                <AiFillHome size={24} color="#6a5af9" />
              </Link>
              <Link to="/chat" className="nav-icon hide-mobile">
                <AiOutlineMessage size={24} color={theme === "dark" ? "#E4E6EB" : "#65676b"} />
              </Link>
              <Link to="/notifications" className="nav-icon hide-mobile">
                <AiOutlineBell size={24} color={theme === "dark" ? "#E4E6EB" : "#65676b"} />
              </Link>

              <div onClick={toggleTheme} className="nav-icon" style={{ cursor: "pointer" }}>
                {theme === "light" ? <FaMoon size={20} color="#65676b" /> : <FaSun size={20} color="#E4E6EB" />}
              </div>

              <div className="nav-icon hide-mobile" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
                <img
                  src={user?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                  alt="profile"
                  className="profile-img-nav"
                />
              </div>

              <span onClick={logout} className="logout-text">
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
      </nav>

      {/* Mobile Bottom Navigation */}
      {isAuth && (
        <div className="mobile-bottom-nav">
          <Link to="/home" className="nav-icon">
            <AiFillHome size={26} color={location.pathname === "/home" ? "#6a5af9" : "#65676b"} />
          </Link>
          <Link to="/search" className="nav-icon">
            <AiOutlineSearch size={26} color={location.pathname === "/search" ? "#6a5af9" : "#65676b"} />
          </Link>
          <Link to="/chat" className="nav-icon">
            <AiOutlineMessage size={26} color={location.pathname === "/chat" ? "#6a5af9" : "#65676b"} />
          </Link>
          <Link to="/notifications" className="nav-icon">
            <AiOutlineBell size={26} color={location.pathname === "/notifications" ? "#6a5af9" : "#65676b"} />
          </Link>
          <Link to="/profile" className="nav-icon">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="me" style={{ width: "26px", height: "26px", borderRadius: "50%", border: location.pathname === "/profile" ? "2px solid #6a5af9" : "none" }} />
            ) : (
              <FaUserCircle size={26} color={location.pathname === "/profile" ? "#6a5af9" : "#65676b"} />
            )}
          </Link>
        </div>
      )}
    </>
  );
}

export default Navbar;
