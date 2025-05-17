import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import VideoPlayer from "../components/VideoPlayer";

const MovieDetailsPage = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [similarMovies, setSimilarMovies] = useState([]);
  
  const db = getFirestore();
  const auth = getAuth();
  const storage = getStorage();

  useEffect(() => {
    const fetchMovie = async () => {
      setIsLoading(true);
      try {
        const movieDoc = await getDoc(doc(db, "movies", id));
        
        if (movieDoc.exists()) {
          const movieData = { id: movieDoc.id, ...movieDoc.data() };
          setMovie(movieData);
          
          // Check if user has this movie in watchlist
          if (auth.currentUser) {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userDoc.exists() && userDoc.data().watchlist) {
              const isInWatchlist = userDoc.data().watchlist.some(
                (item) => item.movieId === id
              );
              setInWatchlist(isInWatchlist);
            }
          }
          
          // Fetch similar movies
          const fetchSimilar = async () => {
            try {
              const { genre } = movieData;
              const similarMoviesQuery = await getDoc(doc(db, "movieCollections", "byGenre"));
              if (similarMoviesQuery.exists() && similarMoviesQuery.data()[genre]) {
                const similarMoviesData = similarMoviesQuery.data()[genre]
                  .filter(m => m.id !== id)
                  .slice(0, 6);
                setSimilarMovies(similarMoviesData);
              }
            } catch (error) {
              console.error("Error fetching similar movies:", error);
            }
          };
          
          fetchSimilar();
        } else {
          setError("Movie not found");
        }
      } catch (err) {
        console.error("Error fetching movie:", err);
        setError("Failed to load movie details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMovie();
  }, [id, db, auth.currentUser]);

  // Handle watch button click
  const handleWatch = useCallback(async () => {
    if (!movie) return;
    
    try {
      let url = movie.videoUrl;
      
      // If path is a Firebase Storage path, get download URL
      if (movie.videoUrl && movie.videoUrl.startsWith("movies/")) {
        const storageRef = ref(storage, movie.videoUrl);
        url = await getDownloadURL(storageRef);
      }
      
      setVideoUrl(url);
      setShowPlayer(true);
    } catch (error) {
      console.error("Error getting video URL:", error);
      setError("Failed to load video");
    }
  }, [movie, storage]);

  // Toggle watchlist status
  const toggleWatchlist = async () => {
    if (!auth.currentUser) {
      // Redirect to login
      return;
    }
    
    try {
      setIsWatchlistLoading(true);
      const userRef = doc(db, "users", auth.currentUser.uid);
      
      if (inWatchlist) {
        // Remove from watchlist
        await updateDoc(userRef, {
          watchlist: arrayRemove({
            movieId: id,
            title: movie.title,
            poster: movie.poster,
            addedAt: new Date()
          })
        });
        setInWatchlist(false);
      } else {
        // Add to watchlist
        await updateDoc(userRef, {
          watchlist: arrayUnion({
            movieId: id,
            title: movie.title,
            poster: movie.poster,
            addedAt: new Date()
          })
        });
        setInWatchlist(true);
      }
    } catch (error) {
      console.error("Error updating watchlist:", error);
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-red-500 text-xl mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="48" height="48"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="132" x2="128" y2="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="172" r="16"/></svg>
        </div>
        <h2 className="text-2xl text-white mb-4">{error}</h2>
        <Link to="/movies" className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700">
          Browse Movies
        </Link>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl text-white mb-4">Movie not found</h2>
        <Link to="/movies" className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700">
          Browse Movies
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Hero section with movie backdrop */}
      <div 
        className="relative min-h-screen bg-cover bg-center bg-no-repeat" 
        style={{
          backgroundImage: `url(${movie.backdrop || movie.poster})`,
          backgroundAttachment: "fixed"
        }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-black/50"></div>
        
        {/* Content */}
        <div className="relative pt-20 pb-16 min-h-screen">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-start">
            {/* Movie poster */}
            <div className="md:w-1/3 flex-shrink-0 mb-6 md:mb-0">
              <div className="rounded-lg overflow-hidden shadow-2xl">
                <img 
                  src={movie.poster} 
                  alt={`${movie.title} poster`} 
                  className="w-full h-auto"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1580130775562-0ef92da028de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Mzk2MDh8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyQnBsYWNlaG9sZGVyJTJCcG9zdGVyfGVufDB8fHx8MTc0NzUwMDI5NXww&ixlib=rb-4.1.0&q=80&w=1080";
                  }}
                />
              </div>
              
              {/* Action buttons for mobile */}
              <div className="md:hidden mt-6 flex flex-col space-y-3">
                <button
                  onClick={handleWatch}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><path d="M170.83,118.13l-52-36A12,12,0,0,0,100,92v72a12,12,0,0,0,18.83,9.87l52-36a12,12,0,0,0,0-19.74Z"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  <span className="ml-2">Watch Now</span>
                </button>
                
                <button
                  onClick={toggleWatchlist}
                  disabled={isWatchlistLoading}
                  className={`flex items-center justify-center py-3 px-6 rounded-lg font-bold ${
                    inWatchlist
                      ? "bg-gray-700 text-white"
                      : "bg-gray-800 text-white"
                  }`}
                >
                  {isWatchlistLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : inWatchlist ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><polyline points="88 136 112 160 168 104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                      <span className="ml-2">In Watchlist</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="88" y1="128" x2="168" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="88" x2="128" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                      <span className="ml-2">Add to Watchlist</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Movie details */}
            <div className="md:w-2/3 md:pl-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{movie.title}</h1>
              
              {/* Movie metadata */}
              <div className="flex flex-wrap items-center text-sm text-gray-400 mb-4">
                <span className="bg-red-600 text-white px-2 py-1 rounded mr-2">
                  {movie.rating || "PG-13"}
                </span>
                <span className="mr-4">{movie.year || "2023"}</span>
                <span className="mr-4">{movie.duration || "120 min"}</span>
                <span>{movie.genre}</span>
              </div>
              
              {/* Rating */}
              {movie.imdbRating && (
                <div className="flex items-center mb-6">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><rect x="40" y="40" width="176" height="176" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="176" y1="24" x2="176" y2="52" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="80" y1="24" x2="80" y2="52" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polygon points="128 158.54 157.67 176 149.6 143.41 176 121.61 141.35 118.94 128 88 114.65 118.94 80 121.61 106.4 143.41 98.33 176 128 158.54" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                    <span className="text-yellow-500 ml-1 font-bold">{movie.imdbRating}</span>
                  </div>
                  <span className="text-gray-500 ml-2">/10 IMDb</span>
                </div>
              )}
              
              {/* Description */}
              <p className="text-gray-300 mb-8 text-lg leading-relaxed">{movie.description}</p>
              
              {/* Action buttons for desktop */}
              <div className="hidden md:flex space-x-4 mb-8">
                <button
                  onClick={handleWatch}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><path d="M170.83,118.13l-52-36A12,12,0,0,0,100,92v72a12,12,0,0,0,18.83,9.87l52-36a12,12,0,0,0,0-19.74Z"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  <span className="ml-2">Watch Now</span>
                </button>
                
                <button
                  onClick={toggleWatchlist}
                  disabled={isWatchlistLoading}
                  className={`flex items-center py-3 px-6 rounded-lg font-bold ${
                    inWatchlist
                      ? "bg-gray-700 text-white"
                      : "bg-gray-800 text-white hover:bg-gray-700"
                  }`}
                >
                  {isWatchlistLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : inWatchlist ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><polyline points="88 136 112 160 168 104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                      <span className="ml-2">In Watchlist</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="88" y1="128" x2="168" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="88" x2="128" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                      <span className="ml-2">Add to Watchlist</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Cast and crew */}
              {movie.cast && movie.cast.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl text-white font-bold mb-3">Cast</h3>
                  <div className="flex flex-wrap -mx-2">
                    {movie.cast.map((person, index) => (
                      <div key={index} className="px-2 mb-3 w-1/2 sm:w-1/3 md:w-1/4">
                        <div className="bg-gray-800 rounded-lg p-3 h-full">
                          <div className="w-full h-24 mb-2 rounded-md bg-gray-700 overflow-hidden">
                            {person.photo ? (
                              <img 
                                src={person.photo} 
                                alt={person.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="80" r="20"/><line x1="84" y1="120" x2="172" y2="120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="156 180 128 136 100 180" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="120" x2="128" y2="136" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                              </div>
                            )}
                          </div>
                          <h4 className="text-white font-medium">{person.name}</h4>
                          <p className="text-gray-400 text-sm">{person.character}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Additional details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Director */}
                {movie.director && (
                  <div>
                    <h3 className="text-white font-bold mb-2">Director</h3>
                    <p className="text-gray-400">{movie.director}</p>
                  </div>
                )}
                
                {/* Writers */}
                {movie.writer && (
                  <div>
                    <h3 className="text-white font-bold mb-2">Writers</h3>
                    <p className="text-gray-400">{movie.writer}</p>
                  </div>
                )}
                
                {/* Language */}
                {movie.language && (
                  <div>
                    <h3 className="text-white font-bold mb-2">Language</h3>
                    <p className="text-gray-400">{movie.language}</p>
                  </div>
                )}
                
                {/* Release Date */}
                {movie.releaseDate && (
                  <div>
                    <h3 className="text-white font-bold mb-2">Release Date</h3>
                    <p className="text-gray-400">{new Date(movie.releaseDate.seconds * 1000).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Similar movies */}
          {similarMovies.length > 0 && (
            <div className="container mx-auto px-4 mt-16">
              <h2 className="text-2xl font-bold text-white mb-6">Similar Movies</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {similarMovies.map((simMovie) => (
                  <Link 
                    to={`/movie/${simMovie.id}`} 
                    key={simMovie.id} 
                    className="block"
                  >
                    <div className="bg-gray-800 rounded-lg overflow-hidden transition-transform hover:scale-105">
                      <div className="aspect-[2/3] relative">
                        <img 
                          src={simMovie.poster} 
                          alt={simMovie.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1580130775562-0ef92da028de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Mzk2MDh8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyQnBsYWNlaG9sZGVyJTJCcG9zdGVyfGVufDB8fHx8MTc0NzUwMDI5NXww&ixlib=rb-4.1.0&q=80&w=1080";
                          }}
                        />
                      </div>
                      <div className="p-2">
                        <h3 className="text-white font-medium truncate">{simMovie.title}</h3>
                        <p className="text-gray-500 text-sm">{simMovie.year || "2023"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Video player modal */}
      {showPlayer && videoUrl && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <VideoPlayer 
            movieId={id}
            videoUrl={videoUrl}
            poster={movie.poster}
            title={movie.title}
            onClose={() => setShowPlayer(false)}
          />
        </div>
      )}
    </>
  );
};

export default MovieDetailsPage;
