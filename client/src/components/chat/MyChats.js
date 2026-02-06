import { useEffect, useState } from "react";
import { ChatState } from "../../context/ChatProvider";
import axios from "axios";
import { API_URL } from "../../config";
import UserListItem from "./UserListItem";

const MyChats = ({ fetchAgain }) => {
    const [loggedUser, setLoggedUser] = useState();
    const { selectedChat, setSelectedChat, chats, setChats, onlineUsers } = ChatState();
    const [showSearch, setShowSearch] = useState(false);
    const [search, setSearch] = useState("");
    const [searchResult, setSearchResult] = useState([]);
    const [loading, setLoading] = useState(false);


    // Group Chat Modal state
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);

    const [groupSearchResults, setGroupSearchResults] = useState([]);

    const token = localStorage.getItem("token");

    const fetchChats = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            const { data } = await axios.get(`${API_URL}/chat`, config);
            setChats(data);
        } catch (error) {
            console.log("Failed to load chats", error);
        }
    };

    useEffect(() => {
        setLoggedUser(JSON.parse(localStorage.getItem("user")));
        fetchChats();
        // eslint-disable-next-line
    }, [fetchAgain]);

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query) {
            return;
        }

        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(`${API_URL}/user?search=${query}`, config);
            setLoading(false);
            setSearchResult(data);
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    };

    const accessChat = async (userId) => {
        try {

            const config = {
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            };
            const { data } = await axios.post(`${API_URL}/chat`, { userId }, config);

            if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
            setSelectedChat(data);

            setShowSearch(false);
            setSearch("");
        } catch (error) {
            console.log(error);

        }
    };

    const handleGroupSearch = async (query) => {

        if (!query) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // Assuming user search endpoint returns list of users
            // Re-using the /user endpoint which returns filtered list usually
            const { data } = await axios.get(`${API_URL}/user/search?query=${query}`, config);
            setGroupSearchResults(data);
        } catch (error) {
            console.log("Failed to search users", error);
        }
    }

    const handleGroupSubmit = async () => {
        if (!groupName || !selectedUsers) {
            alert("Please fill all the fields");
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const { data } = await axios.post(
                `${API_URL}/chat/group`,
                {
                    name: groupName,
                    users: JSON.stringify(selectedUsers.map((u) => u._id)),
                },
                config
            );
            setChats([data, ...chats]);
            setGroupModalOpen(false);
            alert("New Group Chat Created!");
        } catch (error) {
            alert("Failed to create group");
        }
    }

    const handleAddUserToGroup = (userToAdd) => {
        if (selectedUsers.includes(userToAdd)) {
            alert("User already added");
            return;
        }
        setSelectedUsers([...selectedUsers, userToAdd]);
    }

    const getSender = (loggedUser, users) => {
        if (!loggedUser || !users || users.length < 2) return "Unknown User";
        return users[0]._id === loggedUser._id ? users[1].name : users[0].name;
    };

    const getSenderPic = (loggedUser, users) => {
        if (!loggedUser || !users || users.length < 2) return "";
        return users[0]._id === loggedUser._id ? users[1].picturePath : users[0].picturePath;
    }

    return (
        <div className={`my-chats ${selectedChat ? "hidden-mobile" : ""}`}>
            <div className="my-chats-header">
                <h3 style={{ margin: 0 }}>My Chats</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setGroupModalOpen(true)} style={{ fontSize: "12px", padding: "5px 10px", cursor: "pointer" }}>
                        + Group
                    </button>
                    <button onClick={() => setShowSearch(!showSearch)} style={{ fontSize: "12px", padding: "5px 10px", cursor: "pointer" }}>
                        {showSearch ? "Close" : "Find"}
                    </button>
                </div>
            </div>

            {showSearch ? (
                <div style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
                    <input
                        placeholder="Search user..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                    />
                    <div style={{ maxHeight: "200px", overflowY: "auto", marginTop: "10px" }}>
                        {loading ? <div>Loading...</div> : (
                            searchResult?.map(user => (
                                <UserListItem
                                    key={user._id}
                                    user={user}
                                    handleFunction={() => accessChat(user._id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            ) : null}

            <div className="chat-list">
                {chats ? (
                    chats.map((chat) => (
                        <div
                            key={chat._id}
                            className={`chat-list-item ${selectedChat === chat ? "selected" : ""}`}
                            onClick={() => setSelectedChat(chat)}
                        >
                            <img
                                src={!chat.isGroupChat
                                    ? getSenderPic(loggedUser, chat.users) || "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                                    : "https://cdn-icons-png.flaticon.com/512/166/166258.png"} // Group Icon
                                className="chat-avatar"
                                alt="avatar"
                            />
                            <div style={{ overflow: "hidden" }}>
                                <div style={{ fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {!chat.isGroupChat ? getSender(loggedUser, chat.users) : chat.chatName}
                                    {!chat.isGroupChat && loggedUser && chat.users.find(u => u._id !== loggedUser._id && onlineUsers.some(online => online.userId === u._id)) && (
                                        <span style={{ height: "8px", width: "8px", background: "#2ecc71", borderRadius: "50%", display: "inline-block", marginLeft: "5px" }} title="Online"></span>
                                    )}
                                </div>
                                {chat.latestMessage && (
                                    <div style={{ fontSize: "12px", color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        <b>{chat.latestMessage.sender.name.split(" ")[0]} : </b>
                                        {chat.latestMessage.content
                                            ? (chat.latestMessage.content.length > 50
                                                ? chat.latestMessage.content.substring(0, 51) + "..."
                                                : chat.latestMessage.content)
                                            : (chat.latestMessage.media ? "📷 Photo/Video" : "")}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: "20px", textAlign: "center" }}>Loading Chats...</div>
                )}
            </div>

            {/* Group Modal (Simplified inline) */}
            {groupModalOpen && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)",
                    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div style={{ background: "white", padding: "20px", borderRadius: "8px", width: "400px" }}>
                        <h3>Create Group Chat</h3>
                        <input
                            placeholder="Chat Name"
                            style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                        <input
                            placeholder="Add Users eg: John, Jane"
                            style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
                            onChange={(e) => handleGroupSearch(e.target.value)}
                        />
                        {/* Selected Users */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
                            {selectedUsers.map(u => (
                                <div key={u._id} style={{ background: "#c8e6c9", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", display: "flex", alignItems: "center" }}>
                                    {u.name} <span style={{ cursor: "pointer", marginLeft: "5px" }} onClick={() => setSelectedUsers(selectedUsers.filter(sel => sel._id !== u._id))}>x</span>
                                </div>
                            ))}
                        </div>

                        {/* Search Results */}
                        <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                            {groupSearchResults?.slice(0, 4).map(user => (
                                <div key={user._id} onClick={() => handleAddUserToGroup(user)} style={{ padding: "5px", cursor: "pointer", borderBottom: "1px solid #eee" }}>
                                    <img src={user.picturePath} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%", verticalAlign: "middle", marginRight: "5px" }} />
                                    {user.name}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button onClick={() => setGroupModalOpen(false)}>Cancel</button>
                            <button onClick={handleGroupSubmit} style={{ background: "#0095f6", color: "white", border: "none", padding: "5px 15px", borderRadius: "5px" }}>Create Chat</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MyChats;
