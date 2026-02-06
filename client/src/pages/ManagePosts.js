import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import Feed from "../components/Feed";
import "./Home.css";

const ManagePosts = () => {
    return (
        <div className="home-layout">
            <LeftSidebar />
            <Feed initialType="my_posts" />
            <RightSidebar />
        </div>
    );
};

export default ManagePosts;
