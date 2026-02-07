# MVS Media – Social Media Application

## 1. Project Overview

MVS Media is a full-stack social media application inspired by platforms such as Instagram and Twitter. It enables users to connect, share moments, and interact with content through a modern, visually engaging interface.

### Key Objectives

* Build a responsive and user-friendly interface
* Implement secure authentication and user management
* Enable media sharing through posts and stories
* Encourage engagement via likes, comments, and follows

---

## 2. Comprehensive Feature List

### 🔐 Authentication & Security
* **Secure Login & Signup**: JWT-based authentication for secure session management.
* **Google OAuth**: Integrated Google Sign-In for quick access.
* **Password Management**: Forgot Password and Reset Password functionality using email verification (Nodemailer).
* **Account Control**: Two-Factor Authentication (2FA) support and permanent account deletion.

### 📱 Social Feed & Content
* **Dynamic Feed**: Personalized feeds showing posts from followed users.
* **Wellness Feed**: Specialized feed filtering positive content for mental well-being.
* **Post Creation**: Create rich posts with text and image support (Multer).
* **AI Sentiment Analysis**: Integrated AI detection to analyze post sentiment (Positive/Neutral/Negative).
* **Interactions**: Like, Unlike, and Comment on posts.
* **Post Management**: Edit, Delete, and Archive posts.
* **Saved Posts**: Bookmark/Save posts for later viewing.

### 🤝 User Connections & Networking
* **Follow System**: Follow/Unfollow users to build your network.
* **Follow Requests**: Manage privacy with Accept/Decline options for private accounts.
* **Profile Management**: Customizable user profiles with stats (Followers/Following) and bio.
* **User Search**: robust search functionality to find users and content.

### 💬 Communication & Engagement
* **Real-time Chat**: Instant messaging system for one-on-one conversations.
* **Notifications**: Real-time alerts for likes, comments, follows, and interactions.
* **Privacy Alerts**: Notification when someone takes a screenshot of a profile.
* **Stories**: Share ephemeral moments that last for 24 hours.

### 📊 Analytics & Insights
* **User Analytics**: Dashboard tracking engagement metrics and user activity.
* **Content Insights**: Tracking post performance.

### 🎨 UI/UX Design
* **Modern Interface**: Clean, visually appealing design with a violet/purple aesthetic.
* **Responsive Layout**: Optimized for various screen sizes using a Sidebar layout.
* **Communities**: (Beta) Interface for joining and interacting within interest groups.

---

## 3. Technology Stack

### Frontend

* **React.js** (v19)
* **React Router DOM**
* **Socket.io Client**
* **Framer Motion**
* **React Icons**
* **Emoji Picker React**
* **React Infinite Scroll**
* **CSS3** (Values & Modules)

### Backend

* **Node.js & Express**
* **MongoDB & Mongoose**
* **Socket.io** (Real-time)
* **JWT** (Authentication)
* **Nodemailer** (Email)
* **Multer** (Uploads)
* **Google Auth Library**
* **Bcrypt**

---

## 4. Setup & Installation

### Prerequisites

* Node.js installed on your system
* MongoDB (local installation or MongoDB Atlas URI)

### Step 1: Clone the Repository

```bash
git clone <repository_url>
cd mvsmedia
```

### Step 2: Backend Setup

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory:

```env
MONGO_URL=mongodb://localhost:27017/mvsmedia
JWT_SECRET=your_super_secret_key
PORT=4000
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
CLIENT_URL=http://localhost:3000
```

Start the backend server:

```bash
npm start
```

Server runs at **[http://localhost:4000](http://localhost:4000)**

### Step 3: Frontend Setup

```bash
cd ../client
npm install
npm start
```

Client runs at **[http://localhost:3000](http://localhost:3000)**

---

## 5. Project Structure

```
mvsmedia/
├── client/                 # React Frontend
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page views (Home, Profile, Login)
│       └── ...
└── server/                 # Node.js Backend
    ├── controllers/        # API logic
    ├── middleware/         # Authentication & uploads
    ├── models/             # Mongoose schemas
    ├── public/assets/      # Uploaded media files
    └── routes/             # API routes
```

---

## 6. Testing

* **Frontend**: Basic rendering tests using `App.test.js`
* **Manual Testing**: Verified user flows such as login → post creation → like interaction

---

## 7. Future Enhancements

* **Video Streaming**: Support for uploading and viewing video content.
* **Voice Notes**: Ability to send voice messages in chat.
* **Advanced Content Moderation**: Automated filtering of inappropriate content.
* **Mobile App**: React Native version for iOS and Android.

---

## 8. Conclusion

MVS Media demonstrates a complete MERN stack social media application with modern UI design, secure authentication, and scalable architecture. The project is designed to be extensible and production-ready with scope for future real-time and multimedia features.

---

© 2026 MVS Media
