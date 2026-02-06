import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import Navbar from "../components/Navbar";
import Feed from "../components/Feed";
import "./Home.css";

const SavedPosts = () => {
    return (
        <div className="home-layout">
            <LeftSidebar />
            <Feed initialType="saved" />
            <RightSidebar />
        </div>
    );
};

export default SavedPosts;
