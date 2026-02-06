import { ChatState } from "../../context/ChatProvider";
import SingleChat from "./SingleChat";

const ChatBox = ({ fetchAgain, setFetchAgain }) => {
    const { selectedChat } = ChatState();

    return (
        <div
            className={`chat-box ${!selectedChat ? "hidden-mobile" : ""}`} // Mobile responsiveness logic
            style={{ display: selectedChat ? "flex" : "none" }} // Simple toggle for now, usually managed by media query
        >
            <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        </div>
    );
};

export default ChatBox;
