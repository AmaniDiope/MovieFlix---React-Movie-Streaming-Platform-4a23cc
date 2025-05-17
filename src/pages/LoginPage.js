import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc, getFirestore } from "firebase/firestore";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const auth = getAuth();
  const db = getFirestore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Attempt login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user is admin
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Update last login timestamp
        await setDoc(doc(db, "users", userCredential.user.uid), {
          ...userData,
          lastLogin: new Date()
        }, { merge: true });
        
        // Redirect based on role
        if (userData.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        // Create user document if it doesn't exist
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: userCredential.user.email,
          name: userCredential.user.displayName || "",
          role: "user",
          createdAt: new Date(),
          lastLogin: new Date(),
          watchlist: []
        });
        navigate("/");
      }
    } catch (error) {
      let errorMessage = "Failed to sign in";
      
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        errorMessage = "Invalid email or password";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if this is a new user
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email,
          name: result.user.displayName,
          role: "user",
          createdAt: new Date(),
          lastLogin: new Date(),
          watchlist: []
        });
        navigate("/");
      } else {
        // Update last login and redirect based on role
        const userData = userDoc.data();
        await setDoc(doc(db, "users", result.user.uid), {
          ...userData,
          lastLogin: new Date()
        }, { merge: true });
        
        if (userData.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError("Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-400">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-red-600 hover:text-red-500">
              Sign up
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-700 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-700 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-600 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-red-600 hover:text-red-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading ? "bg-red-800" : "bg-red-600 hover:bg-red-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><rect x="40" y="88" width="176" height="128" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M88,88V56a40,40,0,0,1,80,0V88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                </span>
              )}
              {loading ? "" : "Sign in"}
            </button>
          </div>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <span className="sr-only">Sign in with Google</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><path d="M128,128h88a88,88,0,1,1-20.11-56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
              <span className="ml-2">Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
