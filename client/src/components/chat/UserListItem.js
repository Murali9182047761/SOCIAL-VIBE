import React from "react";

const UserListItem = ({ user, handleFunction }) => {
    return (
        <div
            onClick={handleFunction}
            style={{
                cursor: "pointer",
                background: "#E8E8E8",
                padding: "10px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
                transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#38B2AC"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#E8E8E8"}
        >
            <img
                src={user.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt={user.name}
                style={{
                    marginRight: "10px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    objectFit: "cover"
                }}
            />
            <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{user.name}</div>
                <div style={{ fontSize: "12px" }}>
                    <b>Email : </b>
                    {user.email}
                </div>
            </div>
        </div>
    );
};

export default UserListItem;
