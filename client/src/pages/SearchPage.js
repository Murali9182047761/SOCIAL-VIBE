import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import PostCard from "../components/PostCard";
import "./SearchPage.css";

const SearchPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialQuery = queryParams.get("q") || "";

    const [query, setQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState("all"); // all, user, post, hashtag
    const [locationFilter, setLocationFilter] = useState("");
    const [results, setResults] = useState({ users: [], posts: [] });
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    // Fetch Trending on Mount
    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/search/trending`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTrending(data);
            } catch (error) {
                console.log("Failed to fetch trending", error);
            }
        };
        fetchTrending();
    }, [token]);

    // Fetch Search Results
    useEffect(() => {
        const fetchSearch = async () => {
            if (!query && !locationFilter) return;

            setLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/search`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        query,
                        type: activeTab,
                        location: locationFilter
                    }
                });
                setResults(data);
            } catch (error) {
                console.log("Search failed", error);
            }
            setLoading(false);
        };

        // Debounce could be good, but for now simple effect
        const timeoutId = setTimeout(() => {
            fetchSearch();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, activeTab, locationFilter, token]);

    const handleSearchInput = (e) => {
        setQuery(e.target.value);
        navigate(`/search?q=${e.target.value}`, { replace: true });
    };

    const handleTrendingClick = (tag) => {
        setQuery(tag);
        setActiveTab("hashtag"); // Or 'all'
        navigate(`/search?q=${encodeURIComponent(tag)}`);
    }

    return (
        <div className="search-page">
            <div className="search-main">
                {/* Search Input for Mobile/redundancy */}
                <div style={{ marginBottom: "20px", background: "white", padding: "10px", borderRadius: "10px" }}>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={query}
                        onChange={handleSearchInput}
                        style={{ width: "100%", padding: "10px", fontSize: "16px", border: "1px solid #ddd", borderRadius: "5px" }}
                    />
                </div>

                {/* Tabs */}
                <div className="search-tabs">
                    <button className={`search-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>All</button>
                    <button className={`search-tab ${activeTab === "user" ? "active" : ""}`} onClick={() => setActiveTab("user")}>People</button>
                    <button className={`search-tab ${activeTab === "post" ? "active" : ""}`} onClick={() => setActiveTab("post")}>Posts</button>
                    <button className={`search-tab ${activeTab === "hashtag" ? "active" : ""}`} onClick={() => setActiveTab("hashtag")}>Hashtags</button>
                </div>

                {loading && <div style={{ textAlign: "center", padding: "20px" }}>Loading results...</div>}

                {/* Users Results */}
                {((activeTab === "all" || activeTab === "user") && results.users && results.users.length > 0) && (
                    <div className="results-section">
                        {activeTab === "all" && <h3 style={{ margin: "0 0 15px 0" }}>People</h3>}
                        {results.users.map(u => (
                            <div key={u._id} className="user-result-card" onClick={() => navigate(`/profile/${u._id}`)}>
                                <img src={u.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="profile" className="user-result-img" />
                                <div className="user-result-info">
                                    <h4>{u.name}</h4>
                                    {u.location && <p>📍 {u.location}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Posts Results */}
                {((activeTab === "all" || activeTab === "post" || activeTab === "hashtag") && results.posts && results.posts.length > 0) && (
                    <div className="results-section">
                        {activeTab === "all" && <h3 style={{ margin: "20px 0 15px 0" }}>Posts</h3>}
                        {results.posts.map(post => (
                            <PostCard key={post._id} post={post} user={user} refreshPosts={() => { }} />
                        ))}
                    </div>
                )}

                {!loading && (!results.users?.length && !results.posts?.length) && (
                    <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                        No results found for "{query}"
                    </div>
                )}

            </div>

            <div className="search-sidebar">
                {/* Advanced Filters */}
                <div className="search-filters">
                    <h4 style={{ marginTop: 0 }}>Advanced Filters</h4>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "600" }}>Location</label>
                    <input
                        className="filter-input"
                        placeholder="e.g. New York"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                    />
                </div>

                {/* Trending */}
                <div className="trending-card">
                    <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Trending Now</h3>
                    {trending.length > 0 ? (
                        <div>
                            {trending.map((item, index) => (
                                <div key={index} className="trending-item" onClick={() => handleTrendingClick(item._id)}>
                                    <span className="trending-tag">{item._id}</span>
                                    <span className="trending-count">{item.count} posts</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: "#888", fontSize: "13px" }}>No trending topics yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchPage;
