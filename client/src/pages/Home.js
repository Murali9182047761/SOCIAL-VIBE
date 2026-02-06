import { useState, useRef } from "react";
import LeftSidebar from "../components/LeftSidebar";
import Feed from "../components/Feed";
import RightSidebar from "../components/RightSidebar";
import CreatePostModal from "../components/CreatePostModal";
import "./Home.css";

function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const rightSidebarRef = useRef(null);

  // We can force a refresh of Feed by key change or simple reload for now
  const handlePostCreated = () => {
    // window.location.reload(); 
    // No reload needed as socket handles the update
  }

  const handleSearchClick = () => {
    if (rightSidebarRef.current) {
      rightSidebarRef.current.focusSearch();
    }
  }

  return (
    <div className="home-layout">
      <LeftSidebar onCreateClick={() => setShowCreateModal(true)} onSearchClick={handleSearchClick} />
      <Feed />
      <RightSidebar ref={rightSidebarRef} />
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}

export default Home;
