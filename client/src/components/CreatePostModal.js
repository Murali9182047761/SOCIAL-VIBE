import { useState, useEffect } from "react";
import axios from "axios";
import "./CreatePostModal.css";
import { API_URL } from "../config";

function CreatePostModal({ onClose, onPostCreated }) {
    const [description, setDescription] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isPoll, setIsPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [mode, setMode] = useState("media"); // "media" | "text"
    const [collaborators, setCollaborators] = useState([]);
    const [showCollabSearch, setShowCollabSearch] = useState(false);
    const [collabQuery, setCollabQuery] = useState("");
    const [collabResults, setCollabResults] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                // Ensure blob has a name for FormData
                if (!blob.name) {
                    blob.name = `pasted-image-${Date.now()}.png`;
                }
                setImage(blob);
                setPreview(URL.createObjectURL(blob));
                e.preventDefault();
                break;
            }
        }
    };

    useEffect(() => {
        document.addEventListener("paste", handlePaste);
        return () => {
            document.removeEventListener("paste", handlePaste);
        }
    }, []);

    const handlePollOptionChange = (index, value) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const addPollOption = () => {
        setPollOptions([...pollOptions, ""]);
    };

    const removePollOption = (index) => {
        if (pollOptions.length > 2) {
            const newOptions = pollOptions.filter((_, i) => i !== index);
            setPollOptions(newOptions);
        }
    };

    const searchCollaborators = async (q) => {
        setCollabQuery(q);
        if (q.length < 2) {
            setCollabResults([]);
            return;
        }
        try {
            const res = await axios.get(`${API_URL}/user/search?query=${q}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCollabResults(res.data.filter(u => u._id !== user._id && !collaborators.find(c => c.userId === u._id)));
        } catch (err) {
            console.log("Search failed", err);
        }
    };

    const addCollaborator = (u) => {
        setCollaborators([...collaborators, { userId: u._id, name: u.name, profilePicture: u.profilePicture }]);
        setCollabQuery("");
        setCollabResults([]);
        setShowCollabSearch(false);
    };

    const removeCollaborator = (id) => {
        setCollaborators(collaborators.filter(c => c.userId !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Remove empty poll options
        const validPollOptions = isPoll ? pollOptions.filter(opt => opt.trim() !== "") : [];

        // Validation
        if (!image && !description.trim() && validPollOptions.length < 2) {
            if (isPoll && validPollOptions.length < 2) {
                alert("Poll must have at least 2 options.");
                return;
            }
            if (!image && !description.trim()) return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("userId", user._id);
        formData.append("description", description);
        if (image) {
            formData.append("picture", image);
            formData.append("picturePath", image.name);
        }

        if (validPollOptions.length >= 2) {
            const formattedOptions = validPollOptions.map(text => ({ text, votes: [] }));
            formData.append("pollOptions", JSON.stringify(formattedOptions));
        }

        if (collaborators.length > 0) {
            formData.append("collaborators", JSON.stringify(collaborators));
        }

        if (!user || !user._id) {
            alert("User not logged in or invalid session. Please re-login.");
            return;
        }

        try {
            await axios.post(`${API_URL}/posts`, formData, {
                headers: { Authorization: `Bearer ${token}` },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                },
            });
            setLoading(false);
            setUploadProgress(0);
            onPostCreated();
            onClose();
        } catch (err) {
            console.log("Error creating post full object:", err);
            console.log("Error response data:", err.response?.data);
            alert(`Failed to create post. Server says: ${err.response?.data?.message || err.message}`);
            setLoading(false);
        }
    };

    return (
        <div className="create-modal-overlay">
            <div className="create-modal">
                <div className="create-modal-header">
                    <h3 style={{ margin: 0 }}>Create new post</h3>
                    <button onClick={onClose} className="close-btn">✕</button>
                </div>
                <div className="create-modal-body">
                    {!preview && mode === "media" ? (
                        <div className="upload-placeholder">
                            <svg aria-label="Icon to represent media such as images or videos" fill="currentColor" height="77" role="img" viewBox="0 0 97.6 77.3" width="96"><path d="M16.3 24h.3c2.8-.2 4.9-2.6 4.8-5.4-.2-2.8-2.6-4.9-5.4-4.8s-4.9 2.6-4.8 5.4c.1 2.7 2.4 4.8 5.1 4.8zm32.4 20.2c6.6 0 12-5.4 12-12 0-6.6-5.4-12-12-12s-12 5.4-12 12c0 6.6 5.4 12 12 12zm0-16c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4zm-.9-26.3H40v-4.1c0-2.3 1.7-4.1 4.1-4.1h9.6c2.3 0 4.1 1.7 4.1 4.1v4.1h7.9c12.1 0 21.9 9.8 21.9 21.9v33.7c0 12.1-9.8 21.9-21.9 21.9H12.9C.8 75.7-9 65.9-9 53.8V20.1c0-12.1 9.8-21.9 21.9-21.9h7.9zm7.9 4.1h-9.6v.9h9.6v-.9zM12.9 8c-6.6 0-12 5.4-12 12v33.7c0 6.6 5.4 12 12 12h62.1c6.6 0 12-5.4 12-12V20.1c0-6.6-5.4-12-12-12H12.9z"></path></svg>
                            <p>Drag photos and videos here</p>
                            <label htmlFor="file-upload" className="select-btn">Select from computer</label>
                            <input id="file-upload" type="file" onChange={handleImageChange} accept="image/*,video/*" style={{ display: "none" }} />
                            <div style={{ marginTop: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
                                <span style={{ color: "#8e8e8e" }}>OR</span>
                            </div>
                            <button className="select-btn" style={{ background: "white", color: "#0095f6", border: "1px solid #0095f6" }} onClick={() => setMode("text")}>Create Text / Poll Post</button>
                        </div>
                    ) : (
                        <div className="create-preview-container">
                            {mode === "media" && (
                                image && image.type.includes("video") ? (
                                    <video src={preview} controls className="create-preview-img" />
                                ) : (
                                    <img src={preview} alt="preview" className="create-preview-img" />
                                )
                            )}
                            <div className="create-caption-section" style={mode === "text" ? { width: "100%", borderLeft: "none" } : {}}>
                                <div className="user-info-small">
                                    <img src={user.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="user" className="avatar-small" />
                                    <span>{user.name}</span>
                                </div>
                                <textarea
                                    placeholder="Write a caption..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="caption-input"
                                ></textarea>

                                <div style={{ marginBottom: "15px" }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsPoll(!isPoll)}
                                        style={{ background: "none", border: "1px solid #dbdbdb", padding: "5px 10px", borderRadius: "15px", cursor: "pointer", fontSize: "12px", color: isPoll ? "#0095f6" : "black", borderColor: isPoll ? "#0095f6" : "#dbdbdb" }}
                                    >
                                        📊 {isPoll ? "Remove Poll" : "Add Poll"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCollabSearch(!showCollabSearch)}
                                        style={{ background: "none", border: "1px solid #dbdbdb", padding: "5px 10px", borderRadius: "15px", cursor: "pointer", fontSize: "12px", marginLeft: "10px", color: collaborators.length > 0 ? "#0095f6" : "black", borderColor: collaborators.length > 0 ? "#0095f6" : "#dbdbdb" }}
                                    >
                                        🤝 {collaborators.length > 0 ? `${collaborators.length} Collaborators` : "Add Collaborator"}
                                    </button>
                                </div>

                                {showCollabSearch && (
                                    <div className="collab-search-section" style={{ marginBottom: "10px" }}>
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={collabQuery}
                                            onChange={(e) => searchCollaborators(e.target.value)}
                                            style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #dbdbdb" }}
                                        />
                                        {collabResults.length > 0 && (
                                            <div className="search-results-dropdown" style={{ background: "white", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", borderRadius: "8px", marginTop: "5px", maxHeight: "150px", overflowY: "auto" }}>
                                                {collabResults.map(u => (
                                                    <div
                                                        key={u._id}
                                                        onClick={() => addCollaborator(u)}
                                                        style={{ padding: "8px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                                                    >
                                                        <img src={u.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%" }} />
                                                        <span>{u.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {collaborators.length > 0 && (
                                    <div className="selected-collabs" style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "10px" }}>
                                        {collaborators.map(c => (
                                            <div key={c.userId} style={{ background: "#f0f2f5", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                                                <span>{c.name}</span>
                                                <span onClick={() => removeCollaborator(c.userId)} style={{ cursor: "pointer", fontWeight: "bold" }}>×</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isPoll && (
                                    <div className="poll-creation-section" style={{ overflowY: "auto", maxHeight: "150px", marginBottom: "15px" }}>
                                        {pollOptions.map((option, index) => (
                                            <div key={index} style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
                                                <input
                                                    type="text"
                                                    placeholder={`Option ${index + 1}`}
                                                    value={option}
                                                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                                                    style={{ flex: 1, padding: "8px", border: "1px solid #dbdbdb", borderRadius: "4px" }}
                                                />
                                                {pollOptions.length > 2 && (
                                                    <button type="button" onClick={() => removePollOption(index)} style={{ border: "none", background: "none", cursor: "pointer", color: "red" }}>✕</button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={addPollOption} style={{ background: "none", border: "none", color: "#0095f6", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                                            + Add Option
                                        </button>
                                    </div>
                                )}

                                <div className="create-actions">
                                    <button onClick={() => { setPreview(null); setMode("media"); setImage(null); setUploadProgress(0); }} className="back-btn">Back</button>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1 }}>
                                        {loading && (
                                            <div style={{ width: "100%", height: "4px", background: "#efefef", borderRadius: "2px", marginBottom: "8px", overflow: "hidden" }}>
                                                <div style={{ width: `${uploadProgress}%`, height: "100%", background: "#0095f6", transition: "width 0.3s ease" }}></div>
                                            </div>
                                        )}
                                        <button onClick={handleSubmit} className="share-btn" disabled={loading}>
                                            {loading ? (uploadProgress < 100 ? `Uploading ${uploadProgress}%` : "Processing...") : "Share"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CreatePostModal;
