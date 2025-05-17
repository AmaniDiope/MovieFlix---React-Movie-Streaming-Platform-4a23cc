import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import MovieDetailsPage from "./pages/MovieDetailsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import WatchlistPage from "./pages/WatchlistPage";
import NotFoundPage from "./pages/NotFoundPage";

// Initialize Firebase (assuming firebase.js is already configured)
import "./firebase/firebase";

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent = () => {
  const location = useLocation();
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-600"></div>
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Protected Route component
  const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const location = useLocation();

    if (!user) {
      // Redirect to login while saving the attempted URL
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
      // Redirect unauthorized users to home
      return <Navigate to="/" replace />;
    }

    return children;
  };

  // Auth Route component (redirects if already logged in)
  const AuthRoute = ({ children }) => {
    const { state } = location;
    
    if (user) {
      // Redirect to the page they tried to visit or home
      return <Navigate to={state?.from?.pathname || "/"} replace />;
    }

    return children;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Don't show navbar on auth pages */}
      {!location.pathname.includes("/login") && 
       !location.pathname.includes("/signup") && 
       <Navbar />}

      <main className={location.pathname.includes("/admin") ? "" : "pt-16"}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<HomePage />} />
          <Route path="/movie/:id" element={<MovieDetailsPage />} />
          <Route path="/categories" element={<HomePage />} />

          {/* Authentication Routes */}
          <Route
            path="/login"
            element={
              <AuthRoute>
                <LoginPage />
              </AuthRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <AuthRoute>
                <SignupPage />
              </AuthRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <WatchlistPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {/* Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 z-50">
        {/* Toasts will be rendered here */}
      </div>
    </div>
  );
};

// 404 Page Component
const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="64" height="64">
            <rect width="256" height="256" fill="none"/>
            <circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
            <line x1="160" y1="96" x2="96" y2="160" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
            <line x1="160" y1="160" x2="96" y2="96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-gray-400 mb-4">Page not found</p>
        <button
          onClick={() => window.history.back()}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default App;
