import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { getFirestore, collection, query, getDocs, where, orderBy, limit } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import MovieManagement from "../components/admin/MovieManagement";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMovies: 0,
    totalUsers: 0,
    totalViews: 0,
    recentUploads: []
  });

  const { user, isAdmin } = useAuth();
  const db = getFirestore();
  const navigate = useNavigate();
  const location = useLocation();

  // Check admin access and fetch dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);
        
        // Verify admin status
        if (!user || !isAdmin) {
          navigate("/");
          return;
        }

        await fetchDashboardStats();
      } catch (error) {
        console.error("Dashboard initialization error:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [user, isAdmin, navigate]);

  // Set active tab based on URL
  useEffect(() => {
    const path = location.pathname.split("/").pop();
    if (path && path !== "admin") {
      setActiveTab(path);
    } else {
      setActiveTab("overview");
    }
  }, [location]);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      const [moviesSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, "movies")),
        getDocs(query(collection(db, "users"), where("role", "==", "user")))
      ]);

      // Get recent uploads
      const recentUploadsSnapshot = await getDocs(
        query(
          collection(db, "movies"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
      );

      const recentUploads = recentUploadsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadDate: doc.data().createdAt.toDate().toLocaleDateString()
      }));

      // Calculate total views
      const totalViews = moviesSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().views || 0),
        0
      );

      setStats({
        totalMovies: moviesSnapshot.size,
        totalUsers: usersSnapshot.size,
        totalViews,
        recentUploads
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Navigate will handle redirection
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Admin header */}
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <Link 
              to="/"
              className="inline-flex items-center px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20">
                <rect width="256" height="256" fill="none"/>
                <polyline points="164.24 208 76.24 120 164.24 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
              </svg>
              <span className="ml-2">Back to Site</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-4">
              <nav className="space-y-1">
                <button
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "overview" 
                      ? "bg-red-600 text-white" 
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                  onClick={() => navigate("/admin")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" className="mr-3">
                    <rect width="256" height="256" fill="none"/>
                    <path d="M24,184V161.13a48,48,0,0,1,48-48h0a48,48,0,0,1,48,48V184" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                    <path d="M136,184V161.13a48,48,0,0,1,48-48h0a48,48,0,0,1,48,48V184" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                  </svg>
                  Overview
                </button>
                <button
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "movies" 
                      ? "bg-red-600 text-white" 
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                  onClick={() => navigate("/admin/movies")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" className="mr-3">
                    <rect width="256" height="256" fill="none"/>
                    <path d="M156,40H100a20,20,0,0,0-20,20v36a20,20,0,0,0,20,20h56a20,20,0,0,0,20-20V60A20,20,0,0,0,156,40Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                    <path d="M156,140H100a20,20,0,0,0-20,20v36a20,20,0,0,0,20,20h56a20,20,0,0,0,20-20V160A20,20,0,0,0,156,140Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                  </svg>
                  Movies
                </button>
                <button
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "users" 
                      ? "bg-red-600 text-white" 
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                  onClick={() => navigate("/admin/users")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" className="mr-3">
                    <rect width="256" height="256" fill="none"/>
                    <circle cx="128" cy="120" r="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                    <path d="M63.8,199.37a72,72,0,0,1,128.4,0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                  </svg>
                  Users
                </button>
                <button
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "settings" 
                      ? "bg-red-600 text-white" 
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                  onClick={() => navigate("/admin/settings")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20" className="mr-3">
                    <rect width="256" height="256" fill="none"/>
                    <circle cx="128" cy="128" r="48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                    <path d="M183.7,65.1q3.8,3.5,7.2,7.2l27.3,3.9a103.2,103.2,0,0,1,10.2,24.6l-16.6,22.1s.3,6.8,0,10.2l16.6,22.1a102.2,102.2,0,0,1-10.2,24.6l-27.3,3.9s-4.7,4.9-7.2,7.2l-3.9,27.3a103.2,103.2,0,0,1-24.6,10.2l-22.1-16.6a57.9,57.9,0,0,1-10.2,0l-22.1,16.6a102.2,102.2,0,0,1-24.6-10.2l-3.9-27.3q-3.7-3.5-7.2-7.2l-27.3-3.9a103.2,103.2,0,0,1-10.2-24.6l16.6-22.1s-.3-6.8,0-10.2L27.6,100.8A102.2,102.2,0,0,1,37.8,76.2l27.3-3.9q3.5-3.7,7.2-7.2l3.9-27.3a103.2,103.2,0,0,1,24.6-10.2l22.1,16.6a57.9,57.9,0,0,1,10.2,0l22.1-16.6a102.2,102.2,0,0,1,24.6,10.2Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                  </svg>
                  Settings
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="bg-gray-800 rounded-lg">
              <Routes>
                <Route path="/" element={<DashboardOverview stats={stats} />} />
                <Route path="/movies/*" element={<MovieManagement />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/settings" element={<DashboardSettings />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ stats }) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Movies"
          value={stats.totalMovies}
          icon={<MovieIcon />}
          color="bg-gradient-to-br from-purple-600 to-blue-600"
        />
        <StatCard 
          title="Total Users"
          value={stats.totalUsers}
          icon={<UserIcon />}
          color="bg-gradient-to-br from-green-600 to-teal-600"
        />
        <StatCard 
          title="Total Views"
          value={stats.totalViews}
          icon={<ViewIcon />}
          color="bg-gradient-to-br from-red-600 to-pink-600"
        />
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Recent Uploads</h2>
      <div className="bg-gray-700 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-600">
          <thead className="bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Movie
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Upload Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Views
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {stats.recentUploads.map((movie) => (
              <tr key={movie.id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-16 flex-shrink-0">
                      <img 
                        src={movie.poster} 
                        alt={movie.title}
                        className="h-10 w-16 object-cover rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/160x90?text=No+Image";
                        }}
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">
                        {movie.title}
                      </div>
                      <div className="text-sm text-gray-400">
                        {movie.genre}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {movie.uploadDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {movie.views || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    to={`/admin/movies/edit/${movie.id}`}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/movie/${movie.id}`}
                    className="text-green-400 hover:text-green-300"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Placeholder Components
const UserManagement = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>
    <p className="text-gray-400">User management functionality coming soon.</p>
  </div>
);

const DashboardSettings = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Dashboard Settings</h2>
    <p className="text-gray-400">Settings functionality coming soon.</p>
  </div>
);

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => (
  <div className={`${color} rounded-lg p-6 shadow-lg`}>
    <div className="flex items-center">
      <div className="p-3 bg-white bg-opacity-10 rounded-lg">
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-white text-sm opacity-90">{title}</p>
        <p className="text-white text-2xl font-bold">{value.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

// Icon Components
const MovieIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24" className="text-white">
    <rect width="256" height="256" fill="none"/>
    <rect x="40" y="40" width="176" height="176" rx="8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="176" y1="40" x2="176" y2="216" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="80" y1="40" x2="80" y2="216" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24" className="text-white">
    <rect width="256" height="256" fill="none"/>
    <circle cx="128" cy="96" r="64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M31,216a112,112,0,0,1,194,0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24" className="text-white">
    <rect width="256" height="256" fill="none"/>
    <path d="M128,56C48,56,8,128,8,128s40,72,120,72,120-72,120-72S208,56,128,56Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <circle cx="128" cy="128" r="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export default AdminDashboard;
