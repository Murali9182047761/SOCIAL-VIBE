import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import Feed from "../components/Feed";
import "./Home.css";

const ArchivedPosts = () => {
    return (
        <div className="home-layout">
            <LeftSidebar />
            <Feed initialType="archived" />
            <RightSidebar />
        </div>
    );
};

export default ArchivedPosts;
