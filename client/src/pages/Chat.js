import { useState } from "react";
import { ChatState } from "../context/ChatProvider";
import ChatBox from "../components/chat/ChatBox";
import MyChats from "../components/chat/MyChats";
import "./Chat.css";

const Chat = () => {
    const { user } = ChatState();
    const [fetchAgain, setFetchAgain] = useState(false);

    return (
        <div style={{ width: "100%" }}>
            {user && (
                <div className="chat-layout">
                    <MyChats fetchAgain={fetchAgain} />
                    <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
                </div>
            )}
        </div>
    );
};

export default Chat;
