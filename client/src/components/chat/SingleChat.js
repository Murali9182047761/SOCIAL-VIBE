import { useEffect, useState, useRef } from "react";
import { ChatState } from "../../context/ChatProvider";
import axios from "axios";
import { API_URL } from "../../config";
import "./SingleChat.css";
import { useSocket } from "../../context/SocketContext";
import { AiOutlineSend, AiOutlinePaperClip, AiFillDelete, AiOutlineInfoCircle, AiOutlineVideoCamera, AiOutlinePhone } from "react-icons/ai";
import { BsEmojiSmile } from "react-icons/bs";
import { MdMic, MdStop } from "react-icons/md";
import EmojiPicker from "emoji-picker-react";

var selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [socketConnected, setSocketConnected] = useState(false);
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [showGroupOptions, setShowGroupOptions] = useState(false); // Dropdown toggle
    const [deleteMenu, setDeleteMenu] = useState(null); // { messageId: string, isSender: boolean }
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const { user, selectedChat, setSelectedChat, notification, setNotification, setOnlineUsers } = ChatState();
    const { socket, callUser, setStream, joinGroupCall } = useSocket();

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!socket) return;

        socket.emit("setup", user);
        socket.on("connected", () => setSocketConnected(true));
        socket.on("typing", () => setIsTyping(true));
        socket.on("stop typing", () => setIsTyping(false));
        socket.on("get-users", (users) => {
            setOnlineUsers(users);
        });

        socket.on("message deleted", (messageId) => {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        });
    }, [user, socket, setOnlineUsers]);


    useEffect(() => {
        fetchMessages();
        selectedChatCompare = selectedChat;
        setShowGroupOptions(false); // Reset dropdown
    }, [selectedChat]); // eslint-disable-line

    useEffect(() => {
        if (!socket) return;

        const handleMessageReceived = (newMessageRecieved) => {
            if (
                !selectedChatCompare ||
                selectedChatCompare._id !== newMessageRecieved.chat._id
            ) {
                if (!notification.includes(newMessageRecieved)) {
                    setNotification([newMessageRecieved, ...notification]);
                    setFetchAgain(!fetchAgain);
                }
            } else {
                setMessages(prev => {
                    if (prev.some(m => m._id === newMessageRecieved._id)) return prev;
                    return [...prev, newMessageRecieved];
                });
                scrollToBottom();
            }
        };

        const handleMessageDeleted = (messageId) => {
            console.log("Socket: Message deleted", messageId);
            setMessages(prev => prev.filter(m => m._id !== messageId));
        };

        socket.on("message received", handleMessageReceived);
        socket.on("message deleted", handleMessageDeleted);

        const handleWindowClick = () => {
            setDeleteMenu(null);
            setShowEmojiPicker(false);
            setShowGroupOptions(false);
        };

        window.addEventListener("click", handleWindowClick);

        return () => {
            socket.off("message received", handleMessageReceived);
            socket.off("message deleted", handleMessageDeleted);
            window.removeEventListener("click", handleWindowClick);
        }
    }, [socketConnected, fetchAgain, notification, setFetchAgain]); // eslint-disable-line

    const fetchMessages = async () => {
        if (!selectedChat) return;

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            };

            setLoading(true);

            const { data } = await axios.get(
                `${API_URL}/messages/${selectedChat._id}`,
                config
            );

            setMessages(data);
            setLoading(false);
            scrollToBottom();
            socket.emit("join chat", selectedChat._id);
        } catch (error) {
            console.log("Failed to load messages", error);
            setLoading(false);
        }
    };

    const sendMessage = async (event) => {
        if (event.key === "Enter" && newMessage) {
            socket.emit("stop typing", selectedChat._id);
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                };
                setNewMessage("");
                const { data } = await axios.post(
                    `${API_URL}/messages`,
                    {
                        content: newMessage,
                        chatId: selectedChat._id,
                    },
                    config
                );

                socket.emit("new message", data);
                setMessages([...messages, data]);
                scrollToBottom();
                setFetchAgain(!fetchAgain);
            } catch (error) {
                console.log("Failed to send message", error);
            }
        }
    };

    const sendMessageBtn = async () => {
        if (!newMessage && !selectedFile) return;
        socket.emit("stop typing", selectedChat._id);

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            };

            let data;
            if (selectedFile) {
                const formData = new FormData();
                formData.append("chatId", selectedChat._id);
                formData.append("media", selectedFile);
                if (newMessage) formData.append("content", newMessage);
                config.headers["Content-Type"] = "multipart/form-data";

                const res = await axios.post(`${API_URL}/messages`, formData, config);
                data = res.data;
            } else {
                const res = await axios.post(
                    `${API_URL}/messages`,
                    {
                        content: newMessage,
                        chatId: selectedChat._id,
                    },
                    config
                );
                data = res.data;
            }

            setNewMessage("");
            setSelectedFile(null);
            setMediaPreview(null);

            socket.emit("new message", data);
            setMessages([...messages, data]);
            scrollToBottom();
            setFetchAgain(!fetchAgain);
        } catch (error) {
            console.log("Failed to send message", error);
        }
    }

    const typingHandler = (e) => {
        setNewMessage(e.target.value);

        if (!socketConnected) return;

        if (!typing) {
            setTyping(true);
            socket.emit("typing", selectedChat._id);
        }
        let lastTypingTime = new Date().getTime();
        var timerLength = 3000;
        setTimeout(() => {
            var timeNow = new Date().getTime();
            var timeDiff = timeNow - lastTypingTime;
            if (timeDiff >= timerLength && typing) {
                socket.emit("stop typing", selectedChat._id);
                setTyping(false);
            }
        }, timerLength);
    };

    const handleDeleteForMe = async (messageId) => {
        try {
            console.log("Deleting for me:", messageId);
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            };
            await axios.delete(`${API_URL}/messages/me/${messageId}`, config);
            setMessages(prev => prev.filter((m) => m._id !== messageId));
            setDeleteMenu(null);
        } catch (error) {
            console.error("Failed to delete message for me", error);
        }
    }

    const handleDeleteForEveryone = async (messageId) => {
        try {
            console.log("Deleting for everyone:", messageId);
            const config = {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            };
            await axios.delete(`${API_URL}/messages/everyone/${messageId}`, config);
            setMessages(prev => prev.filter((m) => m._id !== messageId));
            setDeleteMenu(null);
            socket.emit("delete message", { messageId, chatId: selectedChat._id });
        } catch (error) {
            console.error("Failed to delete message for everyone", error);
        }
    }

    const handleLeaveGroup = async () => {
        if (!window.confirm("Are you sure you want to leave this group?")) return;
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
            await axios.put(`${API_URL}/chat/groupleave`, { chatId: selectedChat._id }, config);

            setSelectedChat(null); // Deselect chat
            setFetchAgain(!fetchAgain); // Refresh list
        } catch (error) {
            console.error("Failed to leave group", error);
            alert("Failed to leave group");
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm("Are you sure you want to delete this group? This cannot be undone.")) return;
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
            await axios.delete(`${API_URL}/chat/group/${selectedChat._id}`, config);

            setSelectedChat(null);
            setFetchAgain(!fetchAgain);
        } catch (error) {
            console.error("Failed to delete group", error);
            alert(error.response?.data?.message || "Failed to delete group");
        }
    }

    const handleClearChat = async () => {
        if (!window.confirm("Delete all messages in this chat? This cannot be undone.")) return;
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
            await axios.delete(`${API_URL}/messages/${selectedChat._id}/all`, config);

            setMessages([]);
            setFetchAgain(!fetchAgain); // Update latest message in sidebar
            // socket.emit("chat cleared", selectedChat._id); // Optional
        } catch (error) {
            console.error("Failed clear chat", error);
            alert("Failed to clear chat");
        }
    }

    const handleDeleteChat = async () => {
        if (!window.confirm("Delete this chat? This will remove it from your chat list.")) return;
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
            await axios.delete(`${API_URL}/chat/${selectedChat._id}`, config);

            setSelectedChat(null);
            setFetchAgain(!fetchAgain);
        } catch (error) {
            console.error("Failed to delete chat", error);
            alert("Failed to delete chat");
        }
    }

    const handleEmojiClick = (emojiObject) => {
        setNewMessage((prev) => prev + emojiObject.emoji);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedFile(file);
        setMediaPreview(URL.createObjectURL(file));
        e.target.value = null;
    }

    const removeSelectedFile = () => {
        setSelectedFile(null);
        setMediaPreview(null);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], "voice-message.webm", { type: 'audio/webm' });

                setSelectedFile(audioFile);
                setMediaPreview(URL.createObjectURL(audioBlob));

                stream.getTracks().forEach(track => track.stop());
                setRecordingTime(0);
            };

            mediaRecorder.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };


    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const getSender = (loggedUser, users) => {
        if (!loggedUser || !users || users.length < 2) return "Unknown User";
        return users[0]._id === loggedUser._id ? users[1].name : users[0].name;
    };

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query) {
            setSearchResults([]);
            return;
        }

        try {
            setLoadingSearch(true);
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
            const { data } = await axios.get(`${API_URL}/user?search=${query}`, config);
            setLoadingSearch(false);
            setSearchResults(data);
        } catch (error) {
            console.log(error);
            setLoadingSearch(false);
        }
    };

    const handleAddUser = async (userToAdd) => {
        if (selectedChat.users.find((u) => u._id === userToAdd._id)) {
            alert("User already in group!");
            return;
        }

        if (selectedChat.groupAdmin._id !== user._id) {
            alert("Only admins can add someone!");
            return;
        }

        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
            const { data } = await axios.put(
                `${API_URL}/chat/groupadd`,
                {
                    chatId: selectedChat._id,
                    userId: userToAdd._id,
                },
                config
            );

            setSelectedChat(data);
            setFetchAgain(!fetchAgain);
            setLoading(false);
            setAddModalOpen(false); // Close after adding one, or keep open? maybe keep open for multiple? Let's close for now or just clear search. 
            // Better to just alert success and maybe clear search
            alert(`${userToAdd.name} added to the group!`);
            setSearchQuery("");
            setSearchResults([]);
        } catch (error) {
            console.error(error);
            alert("Failed to add user");
            setLoading(false);
        }
    };

    return (
        <>
            {selectedChat ? (
                <>
                    <div className="chat-box-header" style={{ position: "relative" }}> {/* Relative for dropdown */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <button onClick={() => setSelectedChat("")} className="back-button" style={{ display: "none" }}>←</button>
                            <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                                {!selectedChat.isGroupChat ? getSender(user, selectedChat.users) : selectedChat.chatName}
                            </span>
                        </div>

                        {/* Chat Options (For both Group and Single) */}
                        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "15px" }}>
                            <AiOutlinePhone
                                size={24}
                                style={{ cursor: "pointer", color: "var(--text-primary)" }}
                                onClick={async () => {
                                    if (!selectedChat.isGroupChat) {
                                        const otherUser = selectedChat.users.find(u => u._id !== user._id);
                                        try {
                                            const currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                            setStream(currentStream);
                                            callUser(otherUser._id, otherUser.name, 'voice', currentStream);
                                        } catch (err) {
                                            alert("Microphone access denied");
                                        }
                                    } else {
                                        joinGroupCall(selectedChat._id, 'voice');
                                    }
                                }}
                            />
                            <AiOutlineVideoCamera
                                size={24}
                                style={{ cursor: "pointer", color: "var(--text-primary)" }}
                                onClick={async () => {
                                    if (!selectedChat.isGroupChat) {
                                        const otherUser = selectedChat.users.find(u => u._id !== user._id);
                                        try {
                                            const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                            setStream(currentStream);
                                            callUser(otherUser._id, otherUser.name, 'video', currentStream);
                                        } catch (err) {
                                            alert("Camera/Microphone access denied");
                                        }
                                    } else {
                                        joinGroupCall(selectedChat._id, 'video');
                                    }
                                }}
                            />
                            <AiOutlineInfoCircle
                                size={24}
                                style={{ cursor: "pointer", color: "var(--text-primary)" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowGroupOptions(!showGroupOptions);
                                }}
                            />
                            {showGroupOptions && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: "absolute",
                                        right: 0,
                                        top: "40px",
                                        background: "white",
                                        boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                                        borderRadius: "8px",
                                        zIndex: 100,
                                        minWidth: "180px",
                                        overflow: "hidden",
                                        border: "1px solid #eaeaea"
                                    }}>
                                    {selectedChat.isGroupChat && (
                                        <>
                                            {selectedChat.groupAdmin._id === user._id && (
                                                <div
                                                    onClick={() => {
                                                        setAddModalOpen(true);
                                                        setShowGroupOptions(false);
                                                    }}
                                                    style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee", fontSize: "14px", color: "#0095f6" }}
                                                    className="hover-bg"
                                                >
                                                    Add Member
                                                </div>
                                            )}
                                            <div
                                                onClick={handleLeaveGroup}
                                                style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee", fontSize: "14px", color: "orange" }}
                                                className="hover-bg"
                                            >
                                                Leave Group
                                            </div>
                                            {selectedChat.groupAdmin._id === user._id && (
                                                <div
                                                    onClick={handleDeleteGroup}
                                                    style={{ padding: "10px", cursor: "pointer", fontSize: "14px", color: "red", borderBottom: "1px solid #eee" }}
                                                    className="hover-bg"
                                                >
                                                    Delete Group
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div
                                        onClick={handleClearChat}
                                        style={{ padding: "10px", cursor: "pointer", fontSize: "14px", color: "brown", borderBottom: "1px solid #eee" }}
                                        className="hover-bg"
                                    >
                                        Clear Chat
                                    </div>
                                    <div
                                        onClick={handleDeleteChat}
                                        style={{ padding: "10px", cursor: "pointer", fontSize: "14px", color: "red" }}
                                        className="hover-bg"
                                    >
                                        Delete Chat
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="messages-container">
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {messages.map((m, i) => (
                                    <div key={m._id || i} className={`message ${m.sender._id === user._id ? "own" : "other"}`}>
                                        {(selectedChat.isGroupChat && m.sender._id !== user._id) && (
                                            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#e67e22", marginBottom: "2px" }}>
                                                {m.sender.name}
                                            </div>
                                        )}

                                        {m.media && (
                                            <div style={{ marginBottom: "5px" }}>
                                                {m.media.type === 'image' ? (
                                                    <img src={m.media.url} alt="media" style={{ maxWidth: "200px", borderRadius: "8px" }} />
                                                ) : m.media.type === 'video' ? (
                                                    <video src={m.media.url} controls style={{ maxWidth: "200px", borderRadius: "8px" }} />
                                                ) : m.media.type === 'audio' ? (
                                                    <audio src={m.media.url} controls style={{ maxWidth: "250px" }} />
                                                ) : (
                                                    <a href={m.media.url} target="_blank" rel="noreferrer">📎 Attached File</a>
                                                )}
                                            </div>
                                        )}

                                        {m.content}

                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div style={{ fontSize: "10px", textAlign: "right", marginTop: "4px", opacity: 0.7 }}>
                                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {m.sender._id === user._id && <span style={{ marginLeft: "5px" }}>✓✓</span>}
                                            </div>
                                            {(m.sender._id === user._id || !selectedChat.isGroupChat) && (
                                                <div style={{ position: "relative" }}>
                                                    <AiFillDelete
                                                        size={14}
                                                        style={{ cursor: "pointer", marginLeft: "10px", color: "#e74c3c" }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteMenu(deleteMenu?.messageId === m._id ? null : { messageId: m._id, isSender: String(m.sender._id) === String(user._id) });
                                                        }}
                                                        title="Delete Message"
                                                    />
                                                    {deleteMenu?.messageId === m._id && (
                                                        <div className="delete-popup"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                position: "absolute",
                                                                bottom: "20px",
                                                                right: "0",
                                                                background: "white",
                                                                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                                                                borderRadius: "6px",
                                                                padding: "5px 0",
                                                                zIndex: 1000,
                                                                minWidth: "140px",
                                                                color: "black"
                                                            }}>
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteForMe(m._id);
                                                                }}
                                                                style={{ padding: "10px 15px", cursor: "pointer", fontSize: "14px", borderBottom: "1px solid #eee" }}
                                                                className="hover-bg"
                                                            >
                                                                Delete for me
                                                            </div>
                                                            {deleteMenu.isSender && (
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteForEveryone(m._id);
                                                                    }}
                                                                    style={{ padding: "10px 15px", cursor: "pointer", fontSize: "14px", color: "#e74c3c" }}
                                                                    className="hover-bg"
                                                                >
                                                                    Delete for everyone
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                        {isTyping ? <div className="typing-indicator">Typing...</div> : <></>}
                    </div>

                    <div className="chat-input-container" style={{ flexDirection: "column", gap: 0, alignItems: "stretch", padding: "10px" }}>
                        {mediaPreview && (
                            <div className="media-preview" style={{ padding: "10px", display: "flex", gap: "10px", alignItems: "center", background: "var(--background-color)", borderRadius: "8px 8px 0 0", border: "1px solid var(--border-color)", borderBottom: "none" }}>
                                {selectedFile && selectedFile.type.startsWith("video") ? (
                                    <video src={mediaPreview} style={{ height: "60px", borderRadius: "4px" }} />
                                ) : selectedFile && selectedFile.type.startsWith("audio") ? (
                                    <audio src={mediaPreview} controls style={{ height: "40px" }} />
                                ) : (
                                    <img src={mediaPreview} alt="preview" style={{ height: "60px", borderRadius: "4px", objectFit: "cover" }} />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>{selectedFile?.name}</div>
                                </div>
                                <button onClick={removeSelectedFile} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", fontSize: "18px" }}>✕</button>
                            </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "10px" }}>
                            {showEmojiPicker && (
                                <div style={{ position: "absolute", bottom: "70px", left: "20px", zIndex: 10 }}>
                                    <EmojiPicker onEmojiClick={handleEmojiClick} theme="light" />
                                </div>
                            )}
                            <BsEmojiSmile
                                size={24}
                                style={{ cursor: "pointer", color: "#666", marginRight: "10px" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmojiPicker(!showEmojiPicker);
                                }}
                            />
                            <input
                                type="file"
                                style={{ display: "none" }}
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <AiOutlinePaperClip
                                size={24}
                                style={{ cursor: "pointer", color: "#666" }}
                                onClick={() => fileInputRef.current.click()}
                            />
                            <input
                                className="chat-input"
                                placeholder={isRecording ? `Recording... ${formatTime(recordingTime)}` : "Type a message..."}
                                onChange={typingHandler}
                                onClick={() => setShowEmojiPicker(false)}
                                value={newMessage}
                                onKeyDown={sendMessage}
                                disabled={isRecording}
                            />

                            {isRecording ? (
                                <button className="send-btn" onClick={stopRecording} style={{ background: "#e74c3c" }}>
                                    <MdStop size={18} />
                                </button>
                            ) : (
                                <>
                                    {!newMessage && !selectedFile ? (
                                        <button className="send-btn" onClick={startRecording} style={{ background: "#27ae60" }}>
                                            <MdMic size={18} />
                                        </button>
                                    ) : (
                                        <button className="send-btn" onClick={sendMessageBtn}>
                                            <AiOutlineSend size={18} />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Add Member Modal */}
                    {addModalOpen && (
                        <div style={{
                            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)",
                            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
                        }}>
                            <div style={{ background: "white", padding: "20px", borderRadius: "8px", width: "350px", maxHeight: "400px", display: "flex", flexDirection: "column" }}>
                                <h3>Add Member</h3>
                                <div style={{ marginBottom: "15px" }}>
                                    <input
                                        placeholder="Search Users..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                                    />
                                </div>

                                <div style={{ flex: 1, overflowY: "auto", marginBottom: "15px" }}>
                                    {loadingSearch ? <div>Loading...</div> : (
                                        searchResults?.slice(0, 5).map(user => (
                                            <div
                                                key={user._id}
                                                onClick={() => handleAddUser(user)}
                                                style={{ padding: "10px", borderBottom: "1px solid #eee", cursor: "pointer", display: "flex", alignItems: "center" }}
                                            >
                                                <img src={user.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="" style={{ width: "30px", height: "30px", borderRadius: "50%", marginRight: "10px", objectFit: "cover" }} />
                                                <div>
                                                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>{user.name}</div>
                                                    <div style={{ fontSize: "12px", color: "gray" }}>{user.email}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button
                                    onClick={() => setAddModalOpen(false)}
                                    style={{ padding: "8px", cursor: "pointer", background: "#f0f0f0", border: "none", borderRadius: "4px" }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", color: "#aaa" }}>
                    <h2>Welcome to SocialVibe Chat</h2>
                    <p>Select a chat to start messaging</p>
                </div>
            )}
        </>
    );
};

export default SingleChat;
