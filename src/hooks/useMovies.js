import { useState, useEffect, useCallback } from "react";
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  getFirestore,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { 
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

/**
 * Custom hook for fetching and managing movie data from Firebase
 */
const useMovies = () => {
  const [movies, setMovies] = useState([]);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const db = getFirestore();
  const storage = getStorage();
  const moviesCollection = collection(db, "movies");

  /**
   * Fetch a list of movies based on query parameters
   */
  const fetchMovies = useCallback(async ({
    categoryFilter = null,
    yearFilter = null,
    searchQuery = null,
    sortField = "createdAt",
    sortDirection = "desc",
    itemsPerPage = 12,
    resetPagination = false
  } = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Start building the query
      let moviesQuery = collection(db, "movies");
      const conditions = [];

      // Add filters
      if (categoryFilter) {
        conditions.push(where("genre", "==", categoryFilter));
      }
      
      if (yearFilter) {
        conditions.push(where("year", "==", yearFilter));
      }
      
      // Add search query (basic implementation)
      if (searchQuery) {
        // This is a simple implementation that only searches by title prefix
        // A more advanced solution would use Firebase extensions like Algolia
        conditions.push(where("title", ">=", searchQuery));
        conditions.push(where("title", "<=", searchQuery + "\uf8ff"));
      }

      // Apply all conditions
      if (conditions.length > 0) {
        moviesQuery = query(moviesQuery, ...conditions);
      }
      
      // Apply sorting
      moviesQuery = query(moviesQuery, orderBy(sortField, sortDirection));
      
      // Apply pagination
      if (resetPagination) {
        setLastVisible(null);
        setHasMore(true);
      }
      
      moviesQuery = query(moviesQuery, limit(itemsPerPage));
      
      if (lastVisible && !resetPagination) {
        moviesQuery = query(moviesQuery, startAfter(lastVisible));
      }
      
      // Execute query
      const snapshot = await getDocs(moviesQuery);
      
      // Check if there are more results
      if (snapshot.docs.length < itemsPerPage) {
        setHasMore(false);
      } else {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      // Process results
      const fetchedMovies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update state based on pagination
      if (resetPagination) {
        setMovies(fetchedMovies);
      } else {
        setMovies(prev => [...prev, ...fetchedMovies]);
      }

      return fetchedMovies;
    } catch (err) {
      console.error("Error fetching movies:", err);
      setError("Failed to fetch movies. Please try again later.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [db, lastVisible]);

  /**
   * Fetch a single movie by ID
   */
  const fetchMovieById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const movieDoc = await getDoc(doc(db, "movies", id));
      
      if (movieDoc.exists()) {
        const movieData = {
          id: movieDoc.id,
          ...movieDoc.data()
        };
        setMovie(movieData);
        return movieData;
      } else {
        setError("Movie not found");
        setMovie(null);
        return null;
      }
    } catch (err) {
      console.error("Error fetching movie:", err);
      setError("Failed to fetch movie. Please try again later.");
      setMovie(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [db]);

  /**
   * Fetch related movies (same genre or director)
   */
  const fetchRelatedMovies = useCallback(async (currentMovieId, genre, director = null, limit = 6) => {
    try {
      let relatedQuery;

      if (director) {
        // Try to find movies by the same director first
        relatedQuery = query(
          moviesCollection,
          where("director", "==", director),
          where("__name__", "!=", currentMovieId),
          limit
        );
      } else {
        // Fall back to genre if director isn't provided or no results
        relatedQuery = query(
          moviesCollection,
          where("genre", "==", genre),
          where("__name__", "!=", currentMovieId),
          limit
        );
      }

      const relatedSnapshot = await getDocs(relatedQuery);
      const relatedMovies = relatedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If we didn't get enough movies with the same director, add some with the same genre
      if (director && relatedMovies.length < limit) {
        const genreQuery = query(
          moviesCollection,
          where("genre", "==", genre),
          where("director", "!=", director),
          where("__name__", "!=", currentMovieId),
          limit(limit - relatedMovies.length)
        );
        
        const genreSnapshot = await getDocs(genreQuery);
        const genreMovies = genreSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        return [...relatedMovies, ...genreMovies];
      }

      return relatedMovies;
    } catch (err) {
      console.error("Error fetching related movies:", err);
      return [];
    }
  }, [moviesCollection]);

  /**
   * Add a new movie
   */
  const addMovie = useCallback(async (movieData, posterFile, videoFile = null) => {
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);
      
      // Upload poster image
      let posterUrl = "";
      if (posterFile) {
        posterUrl = await uploadFile(posterFile, "posters");
      }

      // Upload video file if provided
      let videoUrl = "";
      if (videoFile) {
        videoUrl = await uploadFile(videoFile, "movies");
      }

      // Prepare movie data
      const newMovie = {
        ...movieData,
        poster: posterUrl,
        videoUrl: videoUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        views: 0,
        downloads: 0,
        ratings: []
      };

      // Add to Firestore
      const docRef = await addDoc(moviesCollection, newMovie);
      
      const addedMovie = {
        id: docRef.id,
        ...newMovie
      };

      setMovies(prev => [addedMovie, ...prev]);
      return addedMovie;
    } catch (err) {
      console.error("Error adding movie:", err);
      setError("Failed to add movie. Please try again.");
      throw err;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, [moviesCollection]);

  /**
   * Update an existing movie
   */
  const updateMovie = useCallback(async (id, movieData, posterFile = null, videoFile = null) => {
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      // Get current movie data
      const movieRef = doc(db, "movies", id);
      const movieSnapshot = await getDoc(movieRef);
      
      if (!movieSnapshot.exists()) {
        throw new Error("Movie not found");
      }
      
      const currentData = movieSnapshot.data();
      
      // Upload new poster if provided
      let posterUrl = currentData.poster;
      if (posterFile) {
        // Delete old poster if it exists and is in our storage
        if (currentData.poster && currentData.poster.includes("firebasestorage")) {
          try {
            const oldPosterRef = ref(storage, currentData.poster);
            await deleteObject(oldPosterRef);
          } catch (err) {
            console.warn("Could not delete old poster:", err);
            // Continue anyway
          }
        }
        
        posterUrl = await uploadFile(posterFile, "posters");
      }

      // Upload new video if provided
      let videoUrl = currentData.videoUrl || "";
      if (videoFile) {
        // Delete old video if it exists and is in our storage
        if (currentData.videoUrl && currentData.videoUrl.includes("firebasestorage")) {
          try {
            const oldVideoRef = ref(storage, currentData.videoUrl);
            await deleteObject(oldVideoRef);
          } catch (err) {
            console.warn("Could not delete old video:", err);
            // Continue anyway
          }
        }
        
        videoUrl = await uploadFile(videoFile, "movies");
      }

      // Update movie data
      const updatedMovie = {
        ...movieData,
        poster: posterUrl,
        videoUrl,
        updatedAt: serverTimestamp()
      };

      await updateDoc(movieRef, updatedMovie);
      
      // Update local state
      setMovies(prev => prev.map(movie => 
        movie.id === id ? { ...movie, ...updatedMovie } : movie
      ));
      
      if (movie && movie.id === id) {
        setMovie({ ...movie, ...updatedMovie });
      }

      return { id, ...updatedMovie };
    } catch (err) {
      console.error("Error updating movie:", err);
      setError("Failed to update movie. Please try again.");
      throw err;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, [db, storage, movie]);

  /**
   * Delete a movie
   */
  const deleteMovie = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the movie data
      const movieRef = doc(db, "movies", id);
      const movieSnapshot = await getDoc(movieRef);
      
      if (!movieSnapshot.exists()) {
        throw new Error("Movie not found");
      }
      
      const movieData = movieSnapshot.data();
      
      // Delete poster from storage
      if (movieData.poster && movieData.poster.includes("firebasestorage")) {
        try {
          const posterRef = ref(storage, movieData.poster);
          await deleteObject(posterRef);
        } catch (err) {
          console.warn("Could not delete poster:", err);
          // Continue with deletion anyway
        }
      }
      
      // Delete video from storage
      if (movieData.videoUrl && movieData.videoUrl.includes("firebasestorage")) {
        try {
          const videoRef = ref(storage, movieData.videoUrl);
          await deleteObject(videoRef);
        } catch (err) {
          console.warn("Could not delete video:", err);
          // Continue with deletion anyway
        }
      }
      
      // Delete movie document from Firestore
      await deleteDoc(movieRef);
      
      // Update local state
      setMovies(prev => prev.filter(movie => movie.id !== id));
      
      if (movie && movie.id === id) {
        setMovie(null);
      }

      return true;
    } catch (err) {
      console.error("Error deleting movie:", err);
      setError("Failed to delete movie. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db, storage, movie]);

  /**
   * Upload a file to Firebase Storage
   */
  const uploadFile = useCallback(async (file, folder) => {
    return new Promise((resolve, reject) => {
      const fileRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }, [storage]);

  /**
   * Increment view count for a movie
   */
  const recordView = useCallback(async (id) => {
    try {
      const movieRef = doc(db, "movies", id);
      await updateDoc(movieRef, {
        views: increment(1),
        lastViewed: serverTimestamp()
      });
      
      // Update local state
      if (movie && movie.id === id) {
        setMovie(prev => prev ? { ...prev, views: (prev.views || 0) + 1 } : null);
      }
      
      setMovies(prev => prev.map(m => 
        m.id === id ? { ...m, views: (m.views || 0) + 1 } : m
      ));
    } catch (err) {
      console.error("Error recording view:", err);
    }
  }, [db, movie]);

  /**
   * Increment download count for a movie
   */
  const recordDownload = useCallback(async (id) => {
    try {
      const movieRef = doc(db, "movies", id);
      await updateDoc(movieRef, {
        downloads: increment(1),
        lastDownloaded: serverTimestamp()
      });
      
      // Update local state
      if (movie && movie.id === id) {
        setMovie(prev => prev ? { ...prev, downloads: (prev.downloads || 0) + 1 } : null);
      }
      
      setMovies(prev => prev.map(m => 
        m.id === id ? { ...m, downloads: (m.downloads || 0) + 1 } : m
      ));
    } catch (err) {
      console.error("Error recording download:", err);
    }
  }, [db, movie]);

  /**
   * Add a rating to a movie
   */
  const rateMovie = useCallback(async (id, userId, rating, comment = "") => {
    try {
      const movieRef = doc(db, "movies", id);
      const movieDoc = await getDoc(movieRef);
      
      if (!movieDoc.exists()) {
        throw new Error("Movie not found");
      }
      
      const movieData = movieDoc.data();
      const ratings = movieData.ratings || [];
      
      // Check if user has already rated
      const existingRatingIndex = ratings.findIndex(r => r.userId === userId);
      
      if (existingRatingIndex >= 0) {
        // Update existing rating
        ratings[existingRatingIndex] = {
          ...ratings[existingRatingIndex],
          rating,
          comment,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Add new rating
        ratings.push({
          userId,
          rating,
          comment,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Calculate average rating
      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / ratings.length;
      
      // Update movie with new ratings
      await updateDoc(movieRef, {
        ratings,
        averageRating,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      const updatedMovie = {
        ...movieData,
        ratings,
        averageRating
      };
      
      if (movie && movie.id === id) {
        setMovie({ ...movie, ...updatedMovie });
      }
      
      setMovies(prev => prev.map(m => 
        m.id === id ? { ...m, ...updatedMovie } : m
      ));
      
      return { ratings, averageRating };
    } catch (err) {
      console.error("Error rating movie:", err);
      throw err;
    }
  }, [db, movie]);

  /**
   * Get featured movies for homepage
   */
  const getFeaturedMovies = useCallback(async (count = 5) => {
    try {
      const featuredQuery = query(
        moviesCollection,
        where("featured", "==", true),
        limit(count)
      );
      
      const snapshot = await getDocs(featuredQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error("Error fetching featured movies:", err);
      return [];
    }
  }, [moviesCollection]);

  /**
   * Get trending movies based on view count
   */
  const getTrendingMovies = useCallback(async (count = 10) => {
    try {
      const trendingQuery = query(
        moviesCollection,
        orderBy("views", "desc"),
        limit(count)
      );
      
      const snapshot = await getDocs(trendingQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error("Error fetching trending movies:", err);
      return [];
    }
  }, [moviesCollection]);

  /**
   * Get recently added movies
   */
  const getRecentMovies = useCallback(async (count = 10) => {
    try {
      const recentQuery = query(
        moviesCollection,
        orderBy("createdAt", "desc"),
        limit(count)
      );
      
      const snapshot = await getDocs(recentQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error("Error fetching recent movies:", err);
      return [];
    }
  }, [moviesCollection]);

  /**
   * Get all unique movie genres 
   */
  const getGenres = useCallback(async () => {
    try {
      const snapshot = await getDocs(query(moviesCollection, limit(100)));
      const genres = new Set();
      
      snapshot.docs.forEach(doc => {
        const movie = doc.data();
        if (movie.genre) {
          genres.add(movie.genre);
        }
      });
      
      return Array.from(genres).map(genre => ({
        id: genre.toLowerCase().replace(/\s+/g, "-"),
        name: genre,
        count: snapshot.docs.filter(doc => doc.data().genre === genre).length
      }));
    } catch (err) {
      console.error("Error fetching genres:", err);
      return [];
    }
  }, [moviesCollection]);

  return {
    movies,
    movie,
    loading,
    error,
    hasMore,
    uploadProgress,
    fetchMovies,
    fetchMovieById,
    fetchRelatedMovies,
    addMovie,
    updateMovie,
    deleteMovie,
    recordView,
    recordDownload,
    rateMovie,
    getFeaturedMovies,
    getTrendingMovies,
    getRecentMovies,
    getGenres
  };
};

export default useMovies;