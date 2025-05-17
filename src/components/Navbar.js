import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? "bg-black shadow-lg" : "bg-gradient-to-b from-black to-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="32" height="32" className="text-red-600">
                  <rect width="256" height="256" fill="none"/>
                  <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216V96H40Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
                </svg>
                <span className="text-white font-bold text-xl ml-2">MovieFlix</span>
              </div>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === "/"
                      ? "text-white bg-gray-900"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/movies"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === "/movies"
                      ? "text-white bg-gray-900"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  Movies
                </Link>
                <Link
                  to="/categories"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === "/categories"
                      ? "text-white bg-gray-900"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  Categories
                </Link>
                {user && (
                  <Link
                    to="/watchlist"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === "/watchlist"
                        ? "text-white bg-gray-900"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    My Watchlist
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.startsWith("/admin")
                        ? "text-white bg-red-600"
                        : "text-red-400 hover:bg-red-600 hover:text-white"
                    }`}
                  >
                    Admin Dashboard
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {/* Search button */}
              <button className="p-1 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                <span className="sr-only">Search</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20">
                  <rect width="256" height="256" fill="none"/>
                  <circle cx="116" cy="116" r="84" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                  <line x1="175.4" y1="175.4" x2="224" y2="224" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                </svg>
              </button>

              {/* User menu */}
              {user ? (
                <div className="ml-3 relative">
                  <div>
                    <button
                      onClick={() => setIsOpen(!isOpen)}
                      className="max-w-xs bg-gray-800 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                      id="user-menu"
                      aria-expanded="false"
                      aria-haspopup="true"
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </div>
                    </button>
                  </div>
                  {isOpen && (
                    <div
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu"
                    >
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                      >
                        Your Profile
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          onClick={() => setIsOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <Link
                    to="/login"
                    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium ml-2"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24">
                  <rect width="256" height="256" fill="none"/>
                  <line x1="40" y1="128" x2="216" y2="128" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                  <line x1="40" y1="64" x2="216" y2="64" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                  <line x1="40" y1="192" x2="216" y2="192" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24">
                  <rect width="256" height="256" fill="none"/>
                  <line x1="200" y1="56" x2="56" y2="200" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                  <line x1="200" y1="200" x2="56" y2="56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-gray-900">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/movies"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Movies
            </Link>
            <Link
              to="/categories"
              className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Categories
            </Link>
            {user && (
              <Link
                to="/watchlist"
                className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsOpen(false)}
              >
                My Watchlist
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="text-red-400 hover:bg-red-600 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsOpen(false)}
              >
                Admin Dashboard
              </Link>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            {user ? (
              <>
                <div className="flex items-center px-5">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium leading-none text-white">
                      {user.displayName || "User"}
                    </div>
                    <div className="text-sm font-medium leading-none text-gray-400 mt-1">
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  <Link
                    to="/profile"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                    onClick={() => setIsOpen(false)}
                  >
                    Your Profile
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="px-5 py-3 flex flex-col space-y-2">
                <Link
                  to="/login"
                  className="text-center block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-center block bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
