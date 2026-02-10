import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";


import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Notifications from "./pages/Notifications";
import SearchPage from "./pages/SearchPage";
import SavedPosts from "./pages/SavedPosts";
import Communities from "./pages/Communities";
import ManagePosts from "./pages/ManagePosts";
import ArchivedPosts from "./pages/ArchivedPosts";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatProvider from "./context/ChatProvider";

import { useState, useEffect } from "react";

function App() {
  const [showUsageWarning, setShowUsageWarning] = useState(false);

  useEffect(() => {
    // Session Monitoring Logic
    const startTimeKey = 'sessionStartTime';
    const warnedKey = 'usageWarned';

    let start = sessionStorage.getItem(startTimeKey);
    if (!start) {
      start = Date.now().toString();
      sessionStorage.setItem(startTimeKey, start);
    }

    const interval = setInterval(() => {
      // Only warn if user is logged in
      if (!localStorage.getItem("token")) return;

      const elapsed = Date.now() - parseInt(start, 10);
      const limit = 30 * 60 * 1000; // 30 minutes

      if (elapsed > limit && !sessionStorage.getItem(warnedKey)) {
        setShowUsageWarning(true);
        sessionStorage.setItem(warnedKey, "true");
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      {showUsageWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--card-background, white)',
            padding: '30px', borderRadius: '12px', textAlign: 'center',
            maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            color: 'var(--text-primary, black)'
          }}>
            <h2 style={{ marginTop: 0 }}>🌿 Time for a Break?</h2>
            <p>You've been active for over 30 minutes. Taking small breaks helps maintain mental well-being and focus.</p>
            <div style={{ marginTop: '20px' }}>
              <button
                className="btn-primary"
                onClick={() => setShowUsageWarning(false)}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer'
                }}>
                Okay, thanks
              </button>
              <button
                onClick={() => setShowUsageWarning(false)}
                style={{
                  marginLeft: '10px', padding: '10px 20px', borderRadius: '8px',
                  border: '1px solid var(--border-color, #ccc)', background: 'transparent',
                  color: 'var(--text-secondary, #555)', cursor: 'pointer'
                }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      <ChatProvider>
        <Navbar />
        <Routes>
          {/* Default */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Public routes */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:resetToken" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedPosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/communities"
            element={
              <ProtectedRoute>
                <Communities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-posts"
            element={
              <ProtectedRoute>
                <ManagePosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/archived"
            element={
              <ProtectedRoute>
                <ArchivedPosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ChatProvider>
    </BrowserRouter>
  );
}

export default App;
