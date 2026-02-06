import React, { useState, useEffect } from "react";
import "./PostCard.css";
import {

    FaRegHeart,
    FaRegComment,
    FaShare,
    FaRegBookmark,
    FaBookmark,
    FaPaperPlane,
    FaTrash // Import FaTrash
} from "react-icons/fa";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";

// Simple time formatter since moment/date-fns is not available/checked
const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

    return date.toLocaleDateString();
};

const PostCard = ({ post, user, refreshPosts }) => {
    const navigate = useNavigate();
    const [userReaction, setUserReaction] = useState(post.likes ? post.likes[user._id] : null);
    const [likeCount, setLikeCount] = useState(post.likes ? Object.keys(post.likes).length : 0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState(post.comments || []);
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState(null); // { id: commentId, username: string }

    const [isSaved, setIsSaved] = useState(user.savedPosts && user.savedPosts.includes(post._id));

    const [isPinned, setIsPinned] = useState(post.isPinned || false);
    const [isEditing, setIsEditing] = useState(false);

    const [editDescription, setEditDescription] = useState(post.description);

    const [pollOptions, setPollOptions] = useState(post.pollOptions || []);
    const totalVotes = pollOptions.reduce((acc, opt) => acc + opt.votes.length, 0);
    const userVotedIndex = pollOptions.findIndex(opt => opt.votes.includes(String(user._id)));

    useEffect(() => {
        setPollOptions(post.pollOptions || []);
    }, [post.pollOptions]);

    // ... existing token ...
    const token = localStorage.getItem("token");

    // ... existing reactionIcons ...
    const reactionIcons = {
        like: "❤️",
        love: "😍",
        haha: "😂",
        wow: "😮",
        sad: "😢",
        angry: "😡"
    };

    // Handle Vote
    const handleVote = async (index) => {
        if (userVotedIndex === index) return; // Already voted for this option

        // Optimistic update
        const newOptions = pollOptions.map(opt => ({
            ...opt,
            votes: [...opt.votes]
        }));

        // Remove from previous vote if exists
        if (userVotedIndex !== -1) {
            newOptions[userVotedIndex].votes = newOptions[userVotedIndex].votes.filter(id => id !== user._id);
        }

        // Add to new vote
        newOptions[index].votes.push(user._id);
        setPollOptions(newOptions);

        try {
            const res = await axios.patch(
                `${API_URL}/posts/${post._id}/vote`,
                { userId: user._id, optionIndex: index },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPollOptions(res.data.pollOptions);
        } catch (err) {
            console.log("Error voting:", err);
            // Revert on error
            setPollOptions(post.pollOptions || []);
        }
    };

    // Handle Pin
    const handlePin = async () => {
        try {
            const res = await axios.patch(
                `${API_URL}/posts/${post._id}/pin`,
                { userId: user._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsPinned(res.data.isPinned);
        } catch (err) {
            console.log("Error pinning post:", err);
        }
    };

    // Handle Edit
    const handleEditSubmit = async () => {
        try {
            const res = await axios.put(
                `${API_URL}/posts/${post._id}`,
                { userId: user._id, description: editDescription },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsEditing(false);
            // Ideally update the prop or local state deeply, but for now:
            post.description = res.data.description;
        } catch (err) {
            console.log("Error updating post:", err);
            alert("Failed to update post.");
        }
    };

    // ... handleLike, handleCommentSubmit ... keep these
    // Handle Like
    const handleLike = async (reactionType = "like") => {
        const previousReaction = userReaction;
        const previousCount = likeCount;

        // Optimistic Update
        if (userReaction === reactionType) {
            // Unlike
            setUserReaction(null);
            setLikeCount(Math.max(0, likeCount - 1));
        } else {
            // Like or Change Reaction
            if (!userReaction) {
                setLikeCount(likeCount + 1);
            }
            setUserReaction(reactionType);
        }
        setShowEmojiPicker(false);

        try {
            await axios.patch(
                `${API_URL}/posts/${post._id}/like`,
                { userId: user._id, reactionType: reactionType },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) {
            console.log("Error liking post:", err);
            // Revert
            setUserReaction(previousReaction);
            setLikeCount(previousCount);
        }
    };

    // Handle Comment
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const payload = {
                userId: user._id,
                comment: {
                    userId: user._id,
                    username: user.name,
                    userPicturePath: user.profilePicture,
                    text: newComment,
                    parentId: replyTo ? replyTo.id : null
                }
            };

            const res = await axios.post(
                `${API_URL}/posts/${post._id}/comment`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update comments locally
            setComments(res.data.comments);
            setNewComment("");
            setReplyTo(null);
        } catch (err) {
            console.log("Error commenting:", err);
            alert("Failed to post comment.");
        }
    };

    // Handle Share
    const handleShare = async () => {
        // Use Web Share API if available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Post by ${post.firstName}`,
                    text: post.description,
                    url: window.location.href // Ideally link to specific post
                });
            } catch (err) {
                console.log("Error sharing", err);
            }
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(`${window.location.origin}/profile/${post.userId}`);
            alert("Link copied to clipboard!");
        }
    };

    // Handle Save
    const handleSave = async () => {
        const wasSaved = isSaved;
        setIsSaved(!wasSaved);

        try {
            await axios.patch(
                `${API_URL}/user/${user._id}/save/${post._id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update localStorage user to persist saved state across reloads
            const currentUser = JSON.parse(localStorage.getItem("user"));
            if (currentUser) {
                if (!wasSaved) {
                    if (!currentUser.savedPosts) currentUser.savedPosts = [];
                    currentUser.savedPosts.push(post._id);
                } else {
                    currentUser.savedPosts = currentUser.savedPosts.filter(id => id !== post._id);
                }
                localStorage.setItem("user", JSON.stringify(currentUser));
            }

        } catch (err) {
            console.log("Error saving post", err);
            setIsSaved(wasSaved);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        try {
            await axios.delete(`${API_URL}/posts/${post._id}`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { userId: user._id }
            });
            refreshPosts();
        } catch (err) {
            console.log("Error deleting post", err);
            alert("Failed to delete post.");
        }
    };

    // Handle Delete Comment
    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            const res = await axios.delete(
                `${API_URL}/posts/${post._id}/comment/${commentId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    data: { userId: user._id }
                }
            );
            setComments(res.data.comments);
        } catch (err) {
            console.log("Error deleting comment:", err);
            alert("Failed to delete comment");
        }
    };



    return (
        <div className="post-card" style={isPinned ? { border: "2px solid #ffcc00" } : {}}>
            <div className="post-header">
                <div className="post-user-info" onClick={() => navigate(`/profile/${post.userId}`)}>
                    <img
                        src={post.userPicturePath || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                        alt="user"
                        className="post-avatar"
                    />
                    <div className="post-user-details">
                        <h4>{post.firstName} {post.lastName} {isPinned && "📌"}</h4>
                        <span className="post-time">
                            {formatTime(post.createdAt)} • {post.status !== 'published' ? <span style={{ color: 'orange' }}>{post.status}</span> : "Public"}
                        </span>
                    </div>
                </div>

                {user._id === post.userId && (
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button
                            onClick={handlePin}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", transition: "transform 0.2s" }}
                            title={isPinned ? "Unpin Post" : "Pin Post"}
                        >
                            📌
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", transition: "transform 0.2s" }}
                            title="Edit Post"
                        >
                            ✏️
                        </button>
                        <button
                            onClick={handleDelete}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", transition: "transform 0.2s" }}
                            title="Delete Post"
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>

            <div className="post-content">
                {isEditing ? (
                    <div style={{ marginBottom: "10px" }}>
                        <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            style={{
                                width: "100%",
                                minHeight: "60px",
                                borderRadius: "8px",
                                padding: "8px",
                                border: "1px solid #ccc",
                                fontFamily: "inherit"
                            }}
                        />
                        <div style={{ marginTop: "5px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button onClick={() => setIsEditing(false)} style={{ padding: "5px 10px", borderRadius: "5px", border: "none", cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleEditSubmit} style={{ padding: "5px 10px", borderRadius: "5px", border: "none", background: "#007bff", color: "white", cursor: "pointer" }}>Save</button>
                        </div>
                    </div>
                ) : (
                    <p className="post-description">{post.description}</p>
                )}

                {/* Poll Section */}
                {pollOptions.length > 0 && (
                    <div className="poll-container">
                        {pollOptions.map((option, index) => {
                            const voteCount = option.votes.length;
                            const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
                            const isSelected = userVotedIndex === index;

                            return (
                                <div
                                    key={index}
                                    className={`poll-option ${userVotedIndex !== -1 ? "voted" : ""}`}
                                    onClick={() => handleVote(index)}
                                >
                                    {(userVotedIndex !== -1) && (
                                        <div
                                            className="poll-progress-bar"
                                            style={{ width: `${percentage}%`, background: isSelected ? "rgba(0, 149, 246, 0.25)" : "rgba(0, 0, 0, 0.05)" }}
                                        ></div>
                                    )}
                                    <div className="poll-option-content">
                                        <span>{option.text} {isSelected && "✓"}</span>
                                        {userVotedIndex !== -1 && <span className="poll-percentage">{percentage}%</span>}
                                    </div>
                                </div>
                            );
                        })}
                        <div style={{ fontSize: "12px", color: "#8e8e8e", marginTop: "5px" }}>
                            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                        </div>
                    </div>
                )}
            </div>

            {post.picturePath && (
                <div className="post-image-container">
                    <img
                        src={post.picturePath}
                        alt="post"
                        className="post-image"
                        onDoubleClick={() => handleLike("like")}
                    />
                </div>
            )}

            {/* Stats Line */}
            <div className="post-stats">
                <div className="post-stat-item" onClick={() => { }}>
                    {likeCount > 0 && <span>{likeCount} Likes</span>}
                </div>
                <div className="post-stat-item" onClick={() => setShowComments(!showComments)}>
                    {comments.length > 0 && <span>{comments.length} Comments</span>}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="post-actions">
                <button
                    className={`action-btn ${userReaction ? 'liked' : ''}`}
                    onClick={() => handleLike(userReaction || "like")}
                    onMouseEnter={() => setShowEmojiPicker(true)}
                    onMouseLeave={() => setShowEmojiPicker(false)}
                >
                    {userReaction ? (
                        <span style={{ fontSize: "18px", marginRight: "5px" }}>{reactionIcons[userReaction] || reactionIcons['like']}</span>
                    ) : (
                        <FaRegHeart />
                    )}
                    {userReaction ? (userReaction.charAt(0).toUpperCase() + userReaction.slice(1)) : "Like"}

                    {/* Hover Emoji Picker (Simplified) */}
                    {showEmojiPicker && (
                        <div className="emoji-picker-container" onMouseEnter={() => setShowEmojiPicker(true)}>
                            <div style={{
                                background: "white",
                                borderRadius: "20px",
                                padding: "5px",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                                display: "flex",
                                gap: "5px"
                            }}>
                                {Object.entries(reactionIcons).map(([key, icon]) => (
                                    <span
                                        key={key}
                                        onClick={(e) => { e.stopPropagation(); handleLike(key); }}
                                        style={{ fontSize: "20px", cursor: "pointer", transition: "transform 0.2s" }}
                                        className="emoji-reaction"
                                    >
                                        {icon}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </button>

                <button className="action-btn" onClick={() => setShowComments(!showComments)}>
                    <FaRegComment /> Comment
                </button>

                <button className="action-btn" onClick={handleShare}>
                    <FaShare /> Share
                </button>

                <button className={`action-btn ${isSaved ? 'saved' : ''}`} onClick={handleSave}>
                    {isSaved ? <FaBookmark /> : <FaRegBookmark />}
                    {isSaved ? "Saved" : "Save"}
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="comments-section">
                    {/* Comment Input */}
                    <div className="comment-input-container">
                        <img
                            src={user.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                            alt="me"
                            className="comment-avatar"
                        />
                        <div className="comment-input-wrapper">
                            <form onSubmit={handleCommentSubmit} style={{ width: '100%', display: 'flex' }}>
                                <input
                                    type="text"
                                    className="comment-input"
                                    placeholder={replyTo ? `Replying to ${replyTo.username}...` : "Write a comment..."}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <button type="submit" className="comment-submit-btn" disabled={!newComment.trim()}>
                                    <FaPaperPlane />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Comments List */}
                    <div className="comments-list">
                        {comments.map((comment, index) => (
                            <div key={comment._id || index}>
                                <div className="comment-item">
                                    <img
                                        src={comment.userPicturePath || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                        alt="user"
                                        className="comment-avatar"
                                    />
                                    <div>
                                        <div className="comment-content">
                                            <span className="comment-author">{comment.username}</span>
                                            <span className="comment-text">{comment.text}</span>
                                        </div>
                                        <div className="comment-actions">
                                            <span className="comment-action" onClick={() => {
                                                setReplyTo({ id: comment._id, username: comment.username });
                                                setNewComment(`@${comment.username} `);
                                            }}>Reply</span>
                                            <span>{formatTime(comment.createdAt || new Date())}</span>
                                            {(user._id === comment.userId || user._id === post.userId) && (
                                                <span
                                                    className="comment-action"
                                                    style={{ color: '#d9534f', cursor: 'pointer', marginLeft: '8px' }}
                                                    onClick={() => handleDeleteComment(comment._id)}
                                                    title="Delete Comment"
                                                >
                                                    <FaTrash size={10} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="reply-container">
                                        {comment.replies.map((reply, rIndex) => (
                                            <div key={reply._id || rIndex} className="comment-item">
                                                <img
                                                    src={reply.userPicturePath || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                                    alt="user"
                                                    className="comment-avatar"
                                                    style={{ width: "24px", height: "24px" }}
                                                />
                                                <div>
                                                    <div className="comment-content">
                                                        <span className="comment-author">{reply.username}</span>
                                                        <span className="comment-text">{reply.text}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#666', marginTop: '2px', marginLeft: '5px' }}>
                                                        <span>{formatTime(reply.createdAt || new Date())}</span>
                                                        {(user._id === reply.userId || user._id === post.userId) && (
                                                            <span
                                                                style={{ color: '#d9534f', cursor: 'pointer' }}
                                                                onClick={() => handleDeleteComment(reply._id)}
                                                                title="Delete Reply"
                                                            >
                                                                <FaTrash size={10} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostCard;
