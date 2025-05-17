// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_R0fcJ6xY0hHNfj931vlvw6krA9MxXU0",
  authDomain: "movie-1fe5c.firebaseapp.com",
  projectId: "movie-1fe5c",
  storageBucket: "movie-1fe5c.firebasestorage.app",
  messagingSenderId: "139778584244",
  appId: "1:139778584244:web:e6c2c38b1e68323c44f1e1",
  measurementId: "G-KGBJYSSK1T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configure Firebase Authentication
auth.useDeviceLanguage();

// Export initialized services
export { app, analytics, auth, db, storage };

// Export a default instance
export default app;