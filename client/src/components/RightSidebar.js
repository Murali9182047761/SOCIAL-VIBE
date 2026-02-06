import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import "./RightSidebar.css";
import { API_URL } from "../config";

const RightSidebar = forwardRef((props, ref) => {
  const [users, setUsers] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");


  const searchInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }));



  useEffect(() => {
    const getUsers = async () => {
      try {
        const res = await axios.get(`${API_URL}/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Filter out current user and already followed users
        const suggestions = res.data.filter(user =>
          user._id !== currentUser._id &&
          !currentUser.following.includes(user._id)
        );
        setUsers(suggestions.slice(0, 5));
      } catch (err) {
        console.log(err);
      }
    };
    getUsers();
  }, [currentUser._id, currentUser.following, token]);

  const handleFollow = async (friendId) => {
    try {
      await axios.patch(`${API_URL}/user/${currentUser._id}/${friendId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state to remove followed user
      setUsers(users.filter(u => u._id !== friendId));

      // Optionally update local storage user if we want consistency without refresh
      // But strict consistency requires a full refetch of user profile or complex state management (Redux)
      // For now just removing from list mimics "Followed" UI
    } catch (err) {
      console.log(err);
    }
  }





  return (
    <div className="right-sidebar">

      {/* Trends Card */}
      <div className="trends-card">
        <h3 className="section-title">Trending</h3>
        <p style={{ fontSize: "13px", color: "#888", marginTop: "10px" }}>No trends yet.</p>
      </div>

      {/* Suggested People */}
      <div className="suggestions-card">
        <div className="suggestions-header">
          <span>Suggested For You</span>
        </div>

        {users.length === 0 ? <p style={{ color: "#999", fontSize: "12px" }}>No new suggestions</p> : null}

        {users.map((user) => (
          <div className="suggestion-item" key={user._id}>
            <div className="suggestion-user">
              <img
                src={user.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt="suggested"
                className="suggestion-avatar"
              />
              <div className="suggestion-info">
                <div className="suggestion-username">{user.name}</div>
              </div>
            </div>
            <button className="follow-text-btn" onClick={() => handleFollow(user._id)}>Follow</button>
          </div>
        ))}
      </div>



    </div>
  );
});

export default RightSidebar;
