import "./PostCard.css";
import { FaHeart, FaRegCommentDots, FaShare } from "react-icons/fa";

function PostCard({ post }) {
  return (
    <div className="post-card">
      {/* Header */}
      <div className="post-header">
        <img
          src={post.userAvatar}
          alt="user"
          className="post-avatar"
        />
        <div>
          <h4>{post.username}</h4>
          <span className="post-time">2 hours ago</span>
        </div>
      </div>

      {/* Image */}
      <img src={post.image} alt="post" className="post-image" />

      {/* Actions */}
      <div className="post-actions">
        <FaHeart />
        <FaRegCommentDots />
        <FaShare />
      </div>

      {/* Caption */}
      <p className="post-caption">
        <b>{post.username}</b> {post.caption}
      </p>
    </div>
  );
}

export default PostCard;
