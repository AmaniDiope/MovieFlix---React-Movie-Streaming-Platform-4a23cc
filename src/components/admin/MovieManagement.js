import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  getFirestore
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import MovieForm from "./MovieForm";

const MovieManagement = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const db = getFirestore();
  const storage = getStorage();

  useEffect(() => {
    fetchMovies();
  }, [sortBy, sortOrder]);

  const fetchMovies = async () => {
    try {
      const moviesRef = collection(db, "movies");
      const q = query(moviesRef, orderBy(sortBy, sortOrder));
      const querySnapshot = await getDocs(q);
      
      const moviesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMovies(moviesData);
    } catch (err) {
      console.error("Error fetching movies:", err);
      setError("Failed to load movies");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (movieId) => {
    if (!deleteConfirm || deleteConfirm !== movieId) {
      setDeleteConfirm(movieId);
      return;
    }

    setLoading(true);
    try {
      const movieDoc = doc(db, "movies", movieId);
      const movie = movies.find(m => m.id === movieId);

      // Delete movie files from storage if they exist
      if (movie.poster && movie.poster.startsWith("posters/")) {
        await deleteObject(ref(storage, movie.poster));
      }
      if (movie.videoUrl && movie.videoUrl.startsWith("movies/")) {
        await deleteObject(ref(storage, movie.videoUrl));
      }

      // Delete movie document
      await deleteDoc(movieDoc);
      
      // Update local state
      setMovies(prevMovies => prevMovies.filter(movie => movie.id !== movieId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting movie:", err);
      setError("Failed to delete movie");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (movie) => {
    setEditingMovie(movie);
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingMovie(null);
    fetchMovies();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingMovie(null);
  };

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movie.genre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (loading && movies.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 md:mb-0">Movie Management</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search movies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><rect x="40" y="40" width="176" height="176" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="88" y1="128" x2="168" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="88" x2="128" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            <span className="ml-2">Add Movie</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded relative mb-6">
          {error}
        </div>
      )}

      {showForm ? (
        <MovieForm
          movie={editingMovie}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Poster
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center">
                      Title
                      {sortBy === "title" && (
                        <span className="ml-2">
                          {sortOrder === "asc" ? 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg> :
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                          }
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("genre")}
                  >
                    <div className="flex items-center">
                      Genre
                      {sortBy === "genre" && (
                        <span className="ml-2">
                          {sortOrder === "asc" ? 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg> :
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                          }
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("year")}
                  >
                    <div className="flex items-center">
                      Year
                      {sortBy === "year" && (
                        <span className="ml-2">
                          {sortOrder === "asc" ? 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg> :
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                          }
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredMovies.map((movie) => (
                  <tr key={movie.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-20 w-14 rounded overflow-hidden">
                        <img
                          src={movie.poster}
                          alt={`${movie.title} poster`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1580130775562-0ef92da028de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Mzk2MDh8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyQnBvc3RlciUyQnBsYWNlaG9sZGVyfGVufDB8fHx8MTc0NzUwMDUyMnww&ixlib=rb-4.1.0&q=80&w=1080";
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{movie.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{movie.genre}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{movie.year}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(movie)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><rect x="48" y="120" width="88" height="88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M208,188v12a8,8,0,0,1-8,8H180" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="208" y1="116" x2="208" y2="140" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M184,48h16a8,8,0,0,1,8,8V72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="116" y1="48" x2="140" y2="48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M48,76V56a8,8,0,0,1,8-8H68" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(movie.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          {deleteConfirm === movie.id ? (
                            <span className="text-xs">Click again to confirm</span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><line x1="216" y1="60" x2="40" y2="60" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="88" y1="20" x2="168" y2="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M200,60V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V60" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMovies.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-400">
                      No movies found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieManagement;