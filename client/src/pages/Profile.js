import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "./Profile.css"
import { API_URL } from "../config";
import PostCard from "../components/PostCard";
import AnalyticsDashboard from "../components/AnalyticsDashboard";

function Profile() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [editCover, setEditCover] = useState(null); // New cover state

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("ACCOUNT"); // ACCOUNT | PRIVACY
  const [settingsEmail, setSettingsEmail] = useState("");
  const [settingsPrivacy, setSettingsPrivacy] = useState("public");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [viewProfileImage, setViewProfileImage] = useState(false);
  const [viewCoverImage, setViewCoverImage] = useState(false);


  const navigate = useNavigate();
  const { userId } = useParams(); // Get ID from URL if present

  const token = localStorage.getItem("token");
  const loggedInUser = JSON.parse(localStorage.getItem("user"));

  // Determine if we are viewing our own profile
  // If params has ID, compare. If no params, it's own profile? 
  // Router usually is /profile/:userId. If /profile route exists without ID, it redirects or shows own.
  // Let's assume /profile/:userId is the main route. If someone goes to /profile, we redirect to /profile/me or handle it.
  // Actually, let's assume if userId is undefined, we use loggedInUser._id

  const targetUserId = userId || loggedInUser._id;
  const isOwnProfile = targetUserId === loggedInUser._id;

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        // Fetch user data
        const userRes = await axios.get(`${API_URL}/user/${targetUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userRes.data);

        // Fetch user posts
        const postRes = await axios.get(`${API_URL}/posts/${targetUserId}/posts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(postRes.data);

        setLoading(false);
      } catch (err) {
        console.log("Error fetching profile:", err);
        setLoading(false);
      }
    }
    fetchProfileData();
  }, [targetUserId, token, navigate]);

  useEffect(() => {
    const triggerNotification = async () => {
      if (isOwnProfile) {
        // Optional: Alert for testing purposes
        console.log("Screenshot of own profile detected.");
        return;
      }

      if (user) {
        try {
          await axios.post(`${API_URL}/notifications/screenshot`,
            { recipientId: user._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // Using a toast or silent notification might be better, but alert is fine for now
          alert("Screenshot taken! Notification sent to the user.");
          console.log("Screenshot notification sent.");
        } catch (err) {
          console.error("Error sending screenshot notification:", err);
        }
      }
    };

    const handleKey = (e) => {
      // PrintScreen usually fires on keyup
      if (e.type === "keyup" && e.key === "PrintScreen") {
        triggerNotification();
      }
      // Mac and Windows shortcuts usually fire on keydown
      if (e.type === "keydown") {
        if (
          (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4")) || // Mac
          (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s")         // Windows Snipping Tool
        ) {
          triggerNotification();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
    };
  }, [isOwnProfile, user, token]);

  const handleFollow = async () => {
    try {
      await axios.patch(
        `${API_URL}/user/${loggedInUser._id}/${user._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refetch to update UI
      const updatedUserRes = await axios.get(`${API_URL}/user/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(updatedUserRes.data);
    } catch (err) {
      console.log("Error following/unfollowing:", err);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Are you sure you want to block ${user.name}?`)) return;
    try {
      await axios.put(`${API_URL}/user/${user._id}/block`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("User blocked.");
      // Ideally redirect to home
      navigate("/home");
    } catch (err) {
      alert("Failed to block user.");
    }
  };

  const handleUnblock = async () => {
    try {
      await axios.put(`${API_URL}/user/${user._id}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("User unblocked.");
      // Refetch
      const updatedUserRes = await axios.get(`${API_URL}/user/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(updatedUserRes.data);
    } catch (err) {
      alert("Failed to unblock user.");
      console.log(err);
    }
  };


  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", editName);
    formData.append("bio", editBio);
    if (editImage) formData.append("picture", editImage);
    if (editCover) formData.append("cover", editCover);

    try {
      const res = await axios.put(`${API_URL}/user/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      // Update localStorage user if it's own profile
      if (isOwnProfile) {
        const localUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ ...localUser, ...res.data }));
      }

      setIsEditing(false);
      setEditImage(null);
      setEditCover(null);
    } catch (err) {
      console.log(err);
      const errorMsg = err.response?.data?.message || err.message || "Unknown error";
      alert(`Failed to update profile: ${errorMsg}`);
    }
  }

  const openEditModal = () => {
    setEditName(user.name);
    setEditBio(user.bio || "");
    setIsEditing(true);
  }

  const [activeTab, setActiveTab] = useState("POSTS");
  const [savedPosts, setSavedPosts] = useState([]);

  useEffect(() => {
    if (activeTab === "SAVED" && user) {
      const fetchSaved = async () => {
        try {
          const res = await axios.get(`${API_URL}/user/${user._id}/saved`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSavedPosts(res.data);
        } catch (err) {
          console.log("Error fetching saved posts", err);
        }
      }
      fetchSaved();
    }
  }, [activeTab, user, token]);

  // Derived state for different post lists
  // Posts array now contains all posts fetched from user (which usually includes everything if not filtered by backend?)
  // Actually the backend endpoint `getUserPosts` grabs everything for that user.
  // We need to filter them on client side or update backend to return only published on that route?
  // `userController / getUserPosts` simply does `Post.find({ userId })`. So it returns all statuses.

  const publishedPosts = posts.filter(p => p.status === "published" || !p.status);
  const draftPosts = posts.filter(p => p.status === "draft");
  const scheduledPosts = posts.filter(p => p.status === "scheduled");

  // Sort published posts: Pinned first, then date
  const sortedPublishedPosts = [...publishedPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  let displayPosts = [];
  if (activeTab === "SAVED") displayPosts = savedPosts;
  else if (activeTab === "DRAFTS") displayPosts = draftPosts;
  else if (activeTab === "SCHEDULED") displayPosts = scheduledPosts;
  else displayPosts = sortedPublishedPosts;

  // User List Modal State
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [userListTitle, setUserListTitle] = useState("");
  const [userList, setUserList] = useState([]);

  // Post Detail Modal State
  const [selectedPost, setSelectedPost] = useState(null);

  const openFollowers = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/${user._id}/followers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserList(res.data);
      setUserListTitle("Followers");
      setShowUserListModal(true);
    } catch (err) {
      console.log("Error fetching followers:", err);
    }
  };

  const openFollowing = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/${user._id}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserList(res.data);
      setUserListTitle("Following");
      setShowUserListModal(true);
    } catch (err) {
      console.log("Error fetching following:", err);
    }
  };

  if (loading || !user) {
    return <p style={{ padding: "40px", textAlign: "center" }}>Loading profile...</p>;
  }

  const isBlockedByMe = loggedInUser.blockedUsers && loggedInUser.blockedUsers.includes(user._id);

  // Settings Modal handler
  const openSettingsModal = (tab) => {
    setSettingsTab(tab);
    setSettingsEmail(user.email || "");
    setSettingsPrivacy(user.privacySettings?.profileVisibility || "public");
    setShowSettings(false); // close dropdown
    setIsSettingsModalOpen(true);
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatePayload = {};
      if (settingsTab === "ACCOUNT") {
        updatePayload.email = settingsEmail;
      } else {
        updatePayload.privacySettings = JSON.stringify({ profileVisibility: settingsPrivacy });
      }

      // Since we are sending JSON for privacySettings but using formData in backend for files...
      // But here we might not have files.
      // The backend expects multipart/form-data because of upload.fields middleware.
      // OR it can handle JSON if no files? 
      // Express middleware order: if upload.fields is used, it parses body only if content-type is multipart.
      // If I send JSON, upload.fields might skip or not populate req.body correctly depending on config.
      // Safest to always send FormData if the route expects it.

      const formData = new FormData();
      if (settingsTab === "ACCOUNT") {
        formData.append("email", settingsEmail);
      } else {
        formData.append("privacySettings", JSON.stringify({ profileVisibility: settingsPrivacy }));
      }

      const res = await axios.put(`${API_URL}/user/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(res.data);
      if (isOwnProfile) {
        const localUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem("user", JSON.stringify({ ...localUser, ...res.data }));
      }
      alert("Settings updated successfully!");
      setIsSettingsModalOpen(false);

    } catch (err) {
      console.log(err);
      alert("Failed to update settings.");
    }
  };

  return (
    <div className="profile-container">
      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: "20px" }}>
              <div
                style={{ padding: "10px", cursor: "pointer", fontWeight: settingsTab === "ACCOUNT" ? "bold" : "normal", borderBottom: settingsTab === "ACCOUNT" ? "2px solid black" : "none" }}
                onClick={() => setSettingsTab("ACCOUNT")}
              >
                Account
              </div>
              <div
                style={{ padding: "10px", cursor: "pointer", fontWeight: settingsTab === "PRIVACY" ? "bold" : "normal", borderBottom: settingsTab === "PRIVACY" ? "2px solid black" : "none" }}
                onClick={() => setSettingsTab("PRIVACY")}
              >
                Privacy
              </div>
            </div>

            <form onSubmit={handleSettingsSubmit}>
              {settingsTab === "ACCOUNT" && (
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={settingsEmail} onChange={(e) => setSettingsEmail(e.target.value)} required />
                </div>
              )}

              {settingsTab === "PRIVACY" && (
                <div className="form-group">
                  <label>Profile Visibility</label>
                  <select value={settingsPrivacy} onChange={(e) => setSettingsPrivacy(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                    Private profiles are only visible to followers.
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={() => setIsSettingsModalOpen(false)} style={{ background: "#ccc", marginRight: "10px" }}>Cancel</button>
                <button type="submit" style={{ background: "#0095f6", color: "white" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cover Photo */}
      <div
        className="profile-cover"
        style={{
          backgroundImage: user.coverPicture ? `url(${user.coverPicture})` : 'none',
          background: user.coverPicture ? `url(${user.coverPicture}) center/cover` : 'linear-gradient(to right, #8e2de2, #4a00e0)',
          cursor: user.coverPicture ? "pointer" : "default"
        }}
        onClick={() => user.coverPicture && setViewCoverImage(true)}
      ></div>

      {/* Profile Header */}
      <header className="profile-header">
        <div className="profile-pic-container">
          <img
            src={user.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="profile"
            className="profile-pic-large"
            style={{ cursor: "pointer" }}
            onClick={() => setViewProfileImage(true)}
          />
        </div>
        <div className="profile-info-section">
          <div className="profile-username-row">
            <h2 className="profile-username">{user.name}</h2>
            {user.isVerified && <span className="verified-badge" title="Verified Account">✓</span>}

            {isOwnProfile ? (
              <>
                <button className="edit-profile-btn" onClick={openEditModal}>Edit Profile</button>
                <div style={{ position: "relative" }}>
                  <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>⚙️</button>
                  {/* Settings Dropdown for Own Profile */}
                  {showSettings && (
                    <div className="settings-menu" style={{ right: 0, top: "100%" }}>
                      <div className="menu-item" onClick={() => openSettingsModal("PRIVACY")}>Privacy Settings</div>
                      <div className="menu-item" onClick={() => openSettingsModal("ACCOUNT")}>Account Settings</div>
                      <div className="menu-item danger" onClick={() => {
                        localStorage.clear();
                        navigate("/login");
                      }}>Logout</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  className="edit-profile-btn"
                  onClick={handleFollow}
                  style={{
                    background: user.followers.includes(loggedInUser._id) ? "#dbdbdb" :
                      (user.followRequests && user.followRequests.includes(loggedInUser._id)) ? "#dbdbdb" : "#0095f6",
                    color: user.followers.includes(loggedInUser._id) ? "black" :
                      (user.followRequests && user.followRequests.includes(loggedInUser._id)) ? "black" : "white",
                    border: "none"
                  }}
                >
                  {user.followers.includes(loggedInUser._id) ? "Unfollow" :
                    (user.followRequests && user.followRequests.includes(loggedInUser._id)) ? "Requested" : "Follow"}
                </button>
                <div style={{ position: "relative" }}>
                  <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>•••</button>
                  {/* Settings Dropdown for Other Profile */}
                  {showSettings && (
                    <div className="settings-menu" style={{ right: 0, top: "100%" }}>
                      {isBlockedByMe ? (
                        <div className="menu-item" onClick={handleUnblock}>Unblock User</div>
                      ) : (
                        <div className="menu-item danger" onClick={handleBlock}>Block User</div>
                      )}
                      <div className="menu-item danger">Report User</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="profile-stats-row">
            <span><b>{posts.length}</b> posts</span>
            <span onClick={openFollowers} style={{ cursor: "pointer" }}><b>{user.followers.length}</b> followers</span>
            <span onClick={openFollowing} style={{ cursor: "pointer" }}><b>{user.following.length}</b> following</span>
          </div>

          <div className="profile-bio-row">
            <b>{user.name}</b>
            <p style={{ whiteSpace: "pre-wrap", margin: "5px 0" }}>{user.bio || "No bio yet."}</p>
            {isOwnProfile && <div className="profile-views">Profile Views: {user.profileViews || 0}</div>}
          </div>
        </div>
      </header>

      {/* Profile Image View Modal */}
      {
        viewProfileImage && (
          <div className="edit-modal-overlay" onClick={() => setViewProfileImage(false)} style={{ zIndex: 1100 }}>
            <img
              src={user.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
              alt="profile-large"
              style={{ maxHeight: "80vh", maxWidth: "90vw", borderRadius: "50%", cursor: "auto" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )
      }

      {/* Cover Image View Modal */}
      {
        viewCoverImage && user.coverPicture && (
          <div className="edit-modal-overlay" onClick={() => setViewCoverImage(false)} style={{ zIndex: 1100 }}>
            <img
              src={user.coverPicture}
              alt="cover-large"
              style={{ maxHeight: "80vh", maxWidth: "90vw", objectFit: "contain", cursor: "auto" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )
      }

      {/* Edit Profile Modal */}
      {
        isEditing && (
          <div className="edit-modal-overlay">
            <div className="edit-modal">
              <h3>Edit Profile</h3>
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Profile Picture</label>
                  <input type="file" accept="image/*" onChange={(e) => setEditImage(e.target.files[0])} />
                </div>
                <div className="form-group">
                  <label>Cover Photo</label>
                  <input type="file" accept="image/*" onChange={(e) => setEditCover(e.target.files[0])} />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows="3"></textarea>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setIsEditing(false)} style={{ background: "#ccc", marginRight: "10px" }}>Cancel</button>
                  <button type="submit" style={{ background: "#0095f6", color: "white" }}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* User List Modal */}
      {
        showUserListModal && (
          <div className="edit-modal-overlay" onClick={() => setShowUserListModal(false)}>
            <div className="edit-modal" style={{ maxHeight: "400px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #dbdbdb", paddingBottom: "10px", marginBottom: "10px" }}>
                <h3 style={{ margin: 0 }}>{userListTitle}</h3>
                <button onClick={() => setShowUserListModal(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>
              {userList.length === 0 ? (
                <p>No users found.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {userList.map((u) => (
                    <div key={u._id} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => { navigate(`/profile/${u._id}`); setShowUserListModal(false); }}>
                      <img src={u.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="user" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
                      <span style={{ fontWeight: "bold" }}>{u.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Post Detail Modal */}
      {
        selectedPost && (
          <div className="edit-modal-overlay" onClick={() => setSelectedPost(null)} style={{ zIndex: 1000 }}>
            <div style={{ background: "white", maxHeight: "90vh", overflowY: "auto", width: "100%", maxWidth: "600px", borderRadius: "8px" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ borderBottom: "1px solid #eee", padding: "10px", textAlign: "right" }}>
                <button onClick={() => setSelectedPost(null)} style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }}>✕</button>
              </div>
              <PostCard post={selectedPost} user={loggedInUser} />
            </div>
          </div>
        )
      }

      <div className="profile-tabs">
        <div
          className={`tab ${activeTab === "POSTS" ? "active" : ""}`}
          onClick={() => setActiveTab("POSTS")}
        >
          POSTS
        </div>
        {/* Only show SAVED tab if viewing own profile */}
        {user._id === loggedInUser._id && (
          <>
            <div
              className={`tab ${activeTab === "DRAFTS" ? "active" : ""}`}
              onClick={() => setActiveTab("DRAFTS")}
            >
              DRAFTS
            </div>
            <div
              className={`tab ${activeTab === "SCHEDULED" ? "active" : ""}`}
              onClick={() => setActiveTab("SCHEDULED")}
            >
              SCHEDULED
            </div>
            <div
              className={`tab ${activeTab === "SAVED" ? "active" : ""}`}
              onClick={() => setActiveTab("SAVED")}
            >
              SAVED
            </div>
            <div
              className={`tab ${activeTab === "ANALYTICS" ? "active" : ""}`}
              onClick={() => setActiveTab("ANALYTICS")}
            >
              INSIGHTS
            </div>
          </>
        )}

      </div>

      {/* Analytics View */}
      {
        activeTab === "ANALYTICS" ? (
          <AnalyticsDashboard />
        ) : (
          /* Profile Posts Grid */
          <div className="profile-posts-grid">
            {displayPosts.length === 0 && (
              <div style={{ width: '100%', textAlign: 'center', padding: '20px', gridColumn: '1 / -1', color: '#888' }}>
                {activeTab === "SAVED" ? "No saved posts yet." : "No posts yet."}
              </div>
            )}
            {displayPosts.map((post) => (
              <div key={post._id} className="profile-post-card" onClick={() => setSelectedPost(post)}>
                {post.picturePath ? (
                  <img src={post.picturePath} alt="post" className="profile-grid-img" />
                ) : (
                  <div className="profile-text-post">
                    {post.description}
                  </div>
                )}
                <div className="profile-post-overlay">
                  <span>❤️ {post.likes ? Object.keys(post.likes).length : 0}</span>
                  <span>💬 {post.comments ? post.comments.length : 0}</span>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div >
  );
}

export default Profile;
