import React, { createContext, useState, useContext, useEffect } from "react";
import { 
  getAuth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

// Create the context
export const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const auth = getAuth();
  const db = getFirestore();
  const googleProvider = new GoogleAuthProvider();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          
          if (userDoc.exists()) {
            // Combine auth user data with Firestore data
            const userData = userDoc.data();
            const role = userData.role || "user";

            // Set admin status based on role
            const adminStatus = role === "admin";
            setIsAdmin(adminStatus);
            
            // Create enhanced user object with role and other data
            const enhancedUser = {
              ...authUser,
              role,
              isAdmin: adminStatus,
              preferences: userData.preferences || {},
              watchlist: userData.watchlist || [],
              createdAt: userData.createdAt,
              lastLogin: userData.lastLogin
            };
            
            setUser(enhancedUser);
            
            // Update last login
            await updateDoc(doc(db, "users", authUser.uid), {
              lastLogin: new Date().toISOString()
            });
          } else {
            // If no Firestore document exists, create one with default user role
            await createUserDocument(authUser);
            setUser({
              ...authUser,
              role: "user",
              isAdmin: false,
              preferences: {},
              watchlist: [],
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            });
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError(err.message);
          // Set basic user without admin privileges on error
          setUser(authUser);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  // Create a new user document in Firestore
  const createUserDocument = async (user, additionalData = {}, role = "user") => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const { email, displayName, photoURL } = user;
    const createdAt = new Date().toISOString();

    try {
      await setDoc(userRef, {
        uid: user.uid,
        email,
        displayName: displayName || additionalData.displayName || "",
        photoURL: photoURL || "",
        role, // Explicitly set user role
        preferences: {},
        watchlist: [],
        createdAt,
        lastLogin: createdAt,
        ...additionalData
      });
    } catch (err) {
      console.error("Error creating user document:", err);
      setError(err.message);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    try {
      setError(null);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Create user document in Firestore with default user role
      await createUserDocument(user, { displayName });
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setError(null);
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // User role will be fetched in the onAuthStateChanged listener
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if this is a new user
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (!userDoc.exists()) {
        // For new Google sign-ins, create user doc with default user role
        await createUserDocument(result.user);
      }
      
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Check if user is admin
  const checkAdminStatus = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const isAdminUser = userDoc.data().role === "admin";
        setIsAdmin(isAdminUser);
        return isAdminUser;
      }
      return false;
    } catch (err) {
      console.error("Error checking admin status:", err);
      return false;
    }
  };

  // Update user profile
  const updateUserProfile = async (data) => {
    try {
      setError(null);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("No user logged in");
      }

      // Update auth profile if display name or photo URL is provided
      if (data.displayName || data.photoURL) {
        await updateProfile(currentUser, {
          displayName: data.displayName || currentUser.displayName,
          photoURL: data.photoURL || currentUser.photoURL
        });
      }

      // Do not allow role updates through this method for security
      if (data.role) {
        delete data.role;
      }

      // Update Firestore document
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      const updatedUserDoc = await getDoc(userRef);
      const updatedData = updatedUserDoc.data();
      
      setUser(prevUser => ({
        ...prevUser,
        ...updatedData,
        displayName: data.displayName || prevUser.displayName,
        photoURL: data.photoURL || prevUser.photoURL
      }));
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Set admin role (restricted function that should only be callable by existing admins)
  const setAdminRole = async (uid, makeAdmin = true) => {
    try {
      setError(null);
      
      // Verify current user is admin before allowing role changes
      if (!isAdmin) {
        throw new Error("Permission denied: Only administrators can change user roles");
      }
      
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        role: makeAdmin ? "admin" : "user",
        updatedAt: new Date().toISOString()
      });
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Toggle movie in watchlist
  const toggleWatchlist = async (movieId, movieData) => {
    try {
      setError(null);
      if (!user) {
        throw new Error("Must be logged in to manage watchlist");
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const watchlist = userDoc.data().watchlist || [];
      
      // Check if movie is already in watchlist
      const existingIndex = watchlist.findIndex(item => item.movieId === movieId);
      let updatedWatchlist;
      
      if (existingIndex >= 0) {
        // Remove from watchlist
        updatedWatchlist = watchlist.filter(item => item.movieId !== movieId);
      } else {
        // Add to watchlist
        const newWatchlistItem = {
          movieId,
          title: movieData.title,
          poster: movieData.poster,
          addedAt: new Date().toISOString()
        };
        updatedWatchlist = [...watchlist, newWatchlistItem];
      }

      // Update Firestore
      await updateDoc(userRef, { 
        watchlist: updatedWatchlist 
      });
      
      // Update local state
      setUser(prevUser => ({
        ...prevUser,
        watchlist: updatedWatchlist
      }));

      return updatedWatchlist;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Update user preferences
  const updatePreferences = async (preferences) => {
    try {
      setError(null);
      if (!user) {
        throw new Error("Must be logged in to update preferences");
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        preferences: {
          ...(user.preferences || {}),
          ...preferences
        }
      });

      setUser(currentUser => ({
        ...currentUser,
        preferences: {
          ...(currentUser.preferences || {}),
          ...preferences
        }
      }));
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    toggleWatchlist,
    updatePreferences,
    checkAdminStatus,
    setAdminRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex justify-center items-center min-h-screen bg-gray-900">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-600"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
