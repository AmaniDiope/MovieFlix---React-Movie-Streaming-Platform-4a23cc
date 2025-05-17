import { useState, useEffect, useCallback } from "react";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc,
  getFirestore 
} from "firebase/firestore";

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const auth = getAuth();
  const db = getFirestore();

  // Observe auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            setUser({
              ...user,
              role: userDoc.data().role,
              preferences: userDoc.data().preferences || {},
              watchlist: userDoc.data().watchlist || []
            });
          } else {
            // If no additional data exists yet, set basic user data
            setUser(user);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUser(user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [auth, db]);

  const createUserDocument = async (user, additionalData = {}) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const { email, displayName, photoURL } = user;
      const createdAt = new Date();

      try {
        await setDoc(userRef, {
          email,
          displayName,
          photoURL,
          createdAt,
          role: "user",
          watchlist: [],
          preferences: {},
          ...additionalData
        });
      } catch (err) {
        console.error("Error creating user document:", err);
        setError(err.message);
      }
    }
  };

  const signUp = async (email, password, displayName) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(result.user, { displayName });
      
      // Create user document in Firestore
      await createUserDocument(result.user);
      
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Create/update user document in Firestore
      await createUserDocument(result.user);
      
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateUserProfile = async (data) => {
    try {
      setError(null);
      
      // Update auth profile if display name or photo URL is provided
      if (data.displayName || data.photoURL) {
        await updateProfile(auth.currentUser, {
          displayName: data.displayName,
          photoURL: data.photoURL
        });
      }

      // Update additional data in Firestore
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, data, { merge: true });

      // Update local user state
      setUser(prevUser => ({
        ...prevUser,
        ...data
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = useCallback(async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [auth]);

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    updateUserProfile,
    logout
  };
};

export default useAuth;