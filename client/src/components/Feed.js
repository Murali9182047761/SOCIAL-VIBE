import { useEffect, useState } from "react";
import axios from "axios";
import PostCard from "./PostCard";
import "./Feed.css";
import socket from "../socket";
import { API_URL } from "../config";
import InfiniteScroll from "react-infinite-scroll-component";

const Feed = ({ initialType = "latest" }) => {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  /* POST CREATION STATE */
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]); // File objects
  const [imagePreviews, setImagePreviews] = useState([]); // URLs
  const [postType, setPostType] = useState("public"); // public, friends, private
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");

  // Poll State
  const [showPollInput, setShowPollInput] = useState(false);
  const [pollOptions, setPollOptions] = useState([{ text: "" }, { text: "" }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStoryImage, setNewStoryImage] = useState(null);
  const [showStoryInput, setShowStoryInput] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Feed & Infinite Scroll State
  const [feedType, setFeedType] = useState(initialType); // latest, personalized, trending, saved
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ... (rest of state logic same) ...

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  // Fetch posts with pagination and type
  const fetchPosts = async (currentPage = 1, type = feedType) => {
    // ... same fetchPosts logic ... 
    try {
      const response = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { userId: user._id, page: currentPage, limit: 10, type }
      });

      // Handle both old array response and new pagination object response
      let newPosts = [];
      let totalPages = 1;

      if (Array.isArray(response.data)) {
        newPosts = response.data;
      } else if (response.data && Array.isArray(response.data.posts)) {
        newPosts = response.data.posts;
        totalPages = response.data.totalPages || 1;
      }

      if (currentPage === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setHasMore(currentPage < totalPages);
      setPage(currentPage);
    } catch (err) {
      console.log("Error fetching posts:", err);
    }
  };

  // Reset and fetch when feedType changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setPosts([]); // Clear posts for better UX
    fetchPosts(1, feedType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType]);

  const fetchMoreData = () => {
    fetchPosts(page + 1, feedType);
  };

  /* Mental Health / Break Reminder Logic */
  useEffect(() => {
    const handleScroll = () => {
      // Logic: If user has scrolled a lot (e.g. 3000px) or spent time?
      // Let's use a simple timer-based approach resetting on mount, or check depth.
      if (window.scrollY > 4000) {
        // If scrolled down significantly (approx 4-5 pages)
        // Ideally we store this state to not annoy too often.
        const lastReminded = sessionStorage.getItem("breakReminded");
        if (!lastReminded) {
          if (window.confirm("🌿 Mental Health Check-in:\n\nYou've been scrolling for a while. Taking a short break can help reduce stress and improve focus. \n\nWant to take a breather?")) {
            // User said yes, maybe redirect or just close
          }
          sessionStorage.setItem("breakReminded", "true");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getStories = async () => {
    try {
      const response = await axios.get(`${API_URL}/stories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStories(response.data);
    } catch (err) {
      console.log("Error fetching stories:", err);
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    const pastedFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (!blob.name) {
          blob.name = `pasted-image-${Date.now()}-${i}.png`;
        }
        pastedFiles.push(blob);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      setImages(prev => [...prev, ...pastedFiles]);
      const newPreviews = pastedFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  useEffect(() => {
    // Initial fetches
    getStories();

    // Attach paste listener to the window
    window.addEventListener("paste", handlePaste);

    socket.on("new-post", (newPost) => {
      // Only prepend if we are looking at 'latest' or if it matches the current feed logic
      if (feedType === 'latest') {
        setPosts((prevPosts) => [newPost, ...prevPosts]);
      }
    });

    // Listen for post updates (likes/comments)
    socket.on("post-updated", (updatedPost) => {
      setPosts((prevPosts) => prevPosts.map(p => (p._id === updatedPost._id ? updatedPost : p)));
    });

    socket.on("post-deleted", (deletedPostId) => {
      setPosts((prevPosts) => prevPosts.filter((p) => p._id !== deletedPostId));
    });

    return () => {
      window.removeEventListener("paste", handlePaste);
      socket.off("new-post");
      socket.off("post-updated");
      socket.off("post-deleted");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files]);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePostSubmit = async (status = "published") => {
    if (!description && images.length === 0 && !showPollInput) return;
    if (status === 'scheduled' && !scheduledDate) {
      alert("Please select a date/time for scheduling.");
      return;
    }

    // Validate poll
    if (showPollInput) {
      const validOptions = pollOptions.filter(o => o.text.trim() !== "");
      if (validOptions.length < 2) {
        alert("Please provide at least 2 options for the poll.");
        return;
      }
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("userId", user._id);
    formData.append("description", description);
    formData.append("visibility", postType);
    formData.append("status", status);

    if (status === 'scheduled') {
      formData.append("scheduledAt", scheduledDate);
    }

    if (showPollInput) {
      formData.append("pollOptions", JSON.stringify(pollOptions.filter(o => o.text.trim() !== "")));
    }

    // Append each file with the same field name "picture"
    images.forEach((image) => {
      formData.append("picture", image);
    });

    try {
      await axios.post(`${API_URL}/posts`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });
      // Reset form
      setDescription("");
      setImages([]);
      setImagePreviews([]);
      setScheduledDate("");
      setIsScheduled(false);
      setShowPollInput(false);
      setPollOptions([{ text: "" }, { text: "" }]);

      if (status !== 'published') {
        alert(`Post ${status} successfully! Check your profile to view it.`);
      }
    } catch (err) {
      console.log("Error creating post:", err);
      const errorMsg = err.response?.data?.message || err.message || "Unknown error";
      alert(`Failed to create post. Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index].text = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, { text: "" }]);
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const handleStorySubmit = async () => {
    if (!newStoryImage) return;

    const formData = new FormData();
    formData.append("userId", user._id);
    formData.append("picture", newStoryImage);

    try {
      await axios.post(
        `${API_URL}/stories`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          },
        }
      );
      setNewStoryImage(null);
      setShowStoryInput(false);
      getStories();
    } catch (err) {
      console.log("Error creating story:", err);
    }
  }

  const handleDeleteStory = async (storyId) => {
    try {
      await axios.delete(`${API_URL}/stories/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { userId: user._id }
      });
      setSelectedStory(null);
      getStories();
    } catch (err) {
      console.log("Error deleting story:", err);
      alert("Failed to delete story.");
    }
  };

  // Conditionally render
  const hideHeader = feedType === 'saved' || feedType === 'my_posts' || feedType === 'archived';

  return (
    <div className="feed-container">
      {/* Stories - Hide if Saved/Manage Mode */}
      {!hideHeader && (
        <div className="stories-container">
          {/* ... stories content ... */}
          {/* User's Add Story Card */}
          <div className="story-card-add" onClick={() => setShowStoryInput(!showStoryInput)}>
            <img
              src={user?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
              alt="user"
              className="story-card-add-img"
            />
            <div className="story-add-btn-container">
              <div className="story-plus-icon">+</div>
              <span style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px" }}>Add Story</span>
            </div>
          </div>

          {/* Render Fetched Stories */}
          {stories.map((story) => (
            <div className="story-card" key={story._id} onClick={() => setSelectedStory(story)}>
              <img
                src={story.picturePath}
                alt="story"
                className="story-bg-img"
                loading="lazy"
              />
              <img
                src={story.userPicturePath || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt="avatar"
                className="story-avatar-small"
                loading="lazy"
              />
              <div className="story-name-overlay">{story.username}</div>
            </div>
          ))}
        </div>
      )}

      {/* Story Viewer Modal */}
      {selectedStory && (
        <div className="story-viewer-overlay" onClick={() => setSelectedStory(null)}>
          {/* ... viewer content ... */}
          <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedStory.picturePath}
              alt="Story"
              className="story-viewer-img"
              onLoad={() => {
                if (selectedStory.userId !== user._id) {
                  axios.patch(`${API_URL}/stories/${selectedStory._id}/view`, { userId: user._id }, {
                    headers: { Authorization: `Bearer ${token}` }
                  }).catch(err => console.log("Error viewing story", err));
                }
              }}
            />
            <div className="story-viewer-info">
              <img
                src={selectedStory.userPicturePath || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt="user"
                className="story-viewer-user-img"
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="story-viewer-username">{selectedStory.username}</span>
                <span style={{ fontSize: "10px", color: "#ddd" }}>
                  {selectedStory.views && selectedStory.views.length > 0
                    ? `${selectedStory.views.length} views`
                    : "No views yet"}
                </span>
              </div>
            </div>

            {selectedStory.userId === user._id && (
              <button
                className="story-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Delete this story?")) {
                    handleDeleteStory(selectedStory._id);
                  }
                }}
                style={{
                  position: "absolute",
                  bottom: "20px",
                  right: "20px",
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "12px",
                  zIndex: 100
                }}
              >
                🗑 Delete
              </button>
            )}

            <button className="story-viewer-close" onClick={() => setSelectedStory(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Story Input (File Upload) */}
      {showStoryInput && !hideHeader && (
        // ... input content ...
        <div className="create-post-card" style={{ animation: "fadeIn 0.3s" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px", display: "block" }}>Upload Story</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewStoryImage(e.target.files[0])}
              style={{ fontSize: "13px" }}
            />
            <button onClick={handleStorySubmit} className="btn-primary" style={{ padding: "8px 16px", borderRadius: "8px" }} disabled={isSubmitting}>
              {isSubmitting ? (uploadProgress < 100 ? `Uploading ${uploadProgress}%` : "Processing...") : "Upload"}
            </button>
          </div>
          {isSubmitting && (
            <div style={{ width: "100%", height: "4px", background: "#efefef", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
              <div style={{ width: `${uploadProgress}%`, height: "100%", background: "#0095f6", transition: "width 0.3s ease" }}></div>
            </div>
          )}
        </div>
      )}

      {/* Create Post Card - Hide if Saved Mode */}
      {!hideHeader && (
        <div className="create-post-card">
          {/* ... creation content (huge block) ... */}
          <div className="create-post-top">
            <img
              src={user?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
              alt="user"
              style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
              loading="lazy"
            />
            <input
              className="create-post-input"
              type="text"
              placeholder={`What's on your mind, ${user?.name}?`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Preview */}
          {imagePreviews.length > 0 && (
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px", marginBottom: "10px" }}>
              {imagePreviews.map((preview, index) => (
                <div key={index} style={{ position: "relative", minWidth: "100px" }}>
                  <img src={preview} alt="preview" style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px" }} />
                  <button onClick={() => removeImage(index)} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.5)", color: "white", borderRadius: "50%", width: "20px", height: "20px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Poll Input */}
          {showPollInput && (
            <div style={{ marginBottom: "15px", padding: "10px", background: "#f9f9f9", borderRadius: "8px" }}>
              <div style={{ fontWeight: "600", marginBottom: "10px" }}>Create a Poll</div>
              {pollOptions.map((option, index) => (
                <div key={index} style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(index)} style={{ border: "none", background: "none", color: "red", cursor: "pointer" }}>✕</button>
                  )}
                </div>
              ))}
              <button
                onClick={addPollOption}
                style={{ background: "none", border: "none", color: "#0095f6", fontWeight: "600", cursor: "pointer", padding: "5px 0" }}
              >
                + Add Option
              </button>
            </div>
          )}

          <div className="create-post-options">
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <div
                className="cp-option"
                onClick={() => setShowPollInput(!showPollInput)}
                style={{ color: showPollInput ? "orange" : "inherit", background: showPollInput ? "#fff4e5" : "transparent" }}
              >
                <span style={{ color: "orange" }}>📊</span> Poll
              </div>
              <label className="cp-option" htmlFor="post-file-upload">
                <span style={{ color: "#45bd62" }}>📷</span> Photo/Video
              </label>
              <input
                id="post-file-upload"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleImageChange}
                style={{ display: "none" }}
              />

              {/* Visibility */}
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                style={{ background: "#f0f2f5", border: "none", borderRadius: "6px", padding: "5px", fontSize: "12px", color: "#555" }}
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>

              {/* Schedule Toggle */}
              <div
                className="cp-option"
                onClick={() => setIsScheduled(!isScheduled)}
                style={{ color: isScheduled ? "#6a5af9" : "inherit" }}
              >
                📅 Schedule
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {/* Date Picker if Scheduled */}
              {isScheduled && (
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  style={{ fontSize: "12px", padding: "4px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              )}

              <button
                onClick={() => handlePostSubmit("draft")}
                disabled={(!description && images.length === 0) || isSubmitting}
                className="btn-secondary"
                style={{ padding: "6px 15px", borderRadius: "8px", fontSize: "12px", border: "1px solid #ccc", background: "white", cursor: "pointer" }}
              >
                Save Draft
              </button>

              <button
                onClick={() => handlePostSubmit(isScheduled ? "scheduled" : "published")}
                disabled={(!description && images.length === 0) || isSubmitting}
                className="btn-primary"
                style={{
                  padding: "6px 20px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  opacity: (!description && images.length === 0) ? 0.6 : 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center"
                }}
              >
                <span>{isScheduled ? "Schedule" : "Post"}</span>
                {isSubmitting && (
                  <span style={{ fontSize: "10px" }}>
                    {uploadProgress < 100 ? `${uploadProgress}%` : "Processing..."}
                  </span>
                )}
              </button>
            </div>
          </div>
          {isSubmitting && (
            <div style={{ width: "100%", height: "4px", background: "#efefef", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
              <div style={{ width: `${uploadProgress}%`, height: "100%", background: "#0095f6", transition: "width 0.3s ease" }}></div>
            </div>
          )}
        </div>
      )}

      {/* Feed Tabs - Hide if Saved Mode */}
      {!hideHeader && (
        <div className="feed-tabs-container">
          <button
            className={feedType === "latest" ? "tab-active" : "tab-inactive"}
            onClick={() => setFeedType("latest")}
            style={{
              background: "none",
              border: "none",
              borderBottom: feedType === "latest" ? "3px solid #6a5af9" : "3px solid transparent",
              color: feedType === "latest" ? "#6a5af9" : "#65676b",
              fontWeight: "600",
              padding: "10px 15px",
              cursor: "pointer",
              fontSize: "15px"
            }}
          >
            Latest
          </button>
          <button
            className={feedType === "personalized" ? "tab-active" : "tab-inactive"}
            onClick={() => setFeedType("personalized")}
            style={{
              background: "none",
              border: "none",
              borderBottom: feedType === "personalized" ? "3px solid #6a5af9" : "3px solid transparent",
              color: feedType === "personalized" ? "#6a5af9" : "#65676b",
              fontWeight: "600",
              padding: "10px 15px",
              cursor: "pointer",
              fontSize: "15px"
            }}
          >
            For You
          </button>
          <button
            className={feedType === "trending" ? "tab-active" : "tab-inactive"}
            onClick={() => setFeedType("trending")}
            style={{
              background: "none",
              border: "none",
              borderBottom: feedType === "trending" ? "3px solid #6a5af9" : "3px solid transparent",
              color: feedType === "trending" ? "#6a5af9" : "#65676b",
              fontWeight: "600",
              padding: "10px 15px",
              cursor: "pointer",
              fontSize: "15px"
            }}
          >
            Trending
          </button>
          <button
            className={feedType === "wellness" ? "tab-active" : "tab-inactive"}
            onClick={() => setFeedType("wellness")}
            style={{
              background: "none",
              border: "none",
              borderBottom: feedType === "wellness" ? "3px solid #28a745" : "3px solid transparent", // Green for wellness
              color: feedType === "wellness" ? "#28a745" : "#65676b",
              fontWeight: "600",
              padding: "10px 15px",
              cursor: "pointer",
              fontSize: "15px"
            }}
          >
            Wellness 🌿
          </button>
        </div>
      )}

      {/* Saved Title */}
      {feedType === 'saved' && <h3 style={{ margin: "10px 0 20px", color: "var(--text-primary)" }}>Saved Posts</h3>}
      {feedType === 'my_posts' && <h3 style={{ margin: "10px 0 20px", color: "var(--text-primary)" }}>Manage My Posts</h3>}
      {feedType === 'archived' && <h3 style={{ margin: "10px 0 20px", color: "var(--text-primary)" }}>Archived Posts</h3>}

      {/* Posts Infinite Scroll */}
      <div className="posts-container" id="scrollableDiv">
        <InfiniteScroll
          dataLength={posts.length}
          next={fetchMoreData}
          hasMore={hasMore}
          loader={<h4 style={{ textAlign: "center", color: "#888", margin: "10px 0" }}>Loading...</h4>}
          endMessage={
            <p style={{ textAlign: "center", color: "#888", margin: "10px 0" }}>
              <b>You have seen all posts!</b>
            </p>
          }
        >
          {posts.map((post) => (
            <PostCard key={post._id} post={post} user={user} refreshPosts={() => fetchPosts(1)} />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  );
};

export default Feed;
