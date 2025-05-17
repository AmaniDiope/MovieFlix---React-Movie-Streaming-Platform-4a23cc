import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import MovieGrid from "../components/MovieGrid";
import SearchBar from "../components/SearchBar";

const HomePage = () => {
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [recentlyAddedMovies, setRecentlyAddedMovies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryMovies, setCategoryMovies] = useState([]);
  const [loading, setLoading] = useState({
    featured: true,
    trending: true,
    recent: true,
    categories: true,
    categoryMovies: false
  });
  const [error, setError] = useState(null);

  const db = getFirestore();

  useEffect(() => {
    const fetchFeaturedMovies = async () => {
      try {
        const featuredQuery = query(
          collection(db, "movies"),
          where("featured", "==", true),
          limit(5)
        );
        const snapshot = await getDocs(featuredQuery);
        const movies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFeaturedMovies(movies);
      } catch (err) {
        console.error("Error fetching featured movies:", err);
        setError("Failed to load featured movies");
      } finally {
        setLoading(prev => ({ ...prev, featured: false }));
      }
    };

    const fetchTrendingMovies = async () => {
      try {
        const trendingQuery = query(
          collection(db, "movies"),
          orderBy("views", "desc"),
          limit(12)
        );
        const snapshot = await getDocs(trendingQuery);
        const movies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrendingMovies(movies);
      } catch (err) {
        console.error("Error fetching trending movies:", err);
      } finally {
        setLoading(prev => ({ ...prev, trending: false }));
      }
    };

    const fetchRecentMovies = async () => {
      try {
        const recentQuery = query(
          collection(db, "movies"),
          orderBy("createdAt", "desc"),
          limit(8)
        );
        const snapshot = await getDocs(recentQuery);
        const movies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentlyAddedMovies(movies);
      } catch (err) {
        console.error("Error fetching recent movies:", err);
      } finally {
        setLoading(prev => ({ ...prev, recent: false }));
      }
    };

    const fetchCategories = async () => {
      try {
        const moviesQuery = query(collection(db, "movies"), limit(50));
        const snapshot = await getDocs(moviesQuery);
        
        const genres = new Set();
        snapshot.docs.forEach(doc => {
          const movie = doc.data();
          if (movie.genre) {
            genres.add(movie.genre);
          }
        });
        
        const categoriesArray = Array.from(genres).map(genre => ({
          id: genre.toLowerCase().replace(/\s+/g, "-"),
          name: genre,
          count: snapshot.docs.filter(doc => doc.data().genre === genre).length
        }));
        
        setCategories(categoriesArray);
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoading(prev => ({ ...prev, categories: false }));
      }
    };

    fetchFeaturedMovies();
    fetchTrendingMovies();
    fetchRecentMovies();
    fetchCategories();
  }, [db]);

  useEffect(() => {
    const fetchCategoryMovies = async () => {
      if (!selectedCategory) {
        setCategoryMovies([]);
        return;
      }

      setLoading(prev => ({ ...prev, categoryMovies: true }));
      
      try {
        const categoryQuery = query(
          collection(db, "movies"),
          where("genre", "==", selectedCategory),
          limit(12)
        );
        const snapshot = await getDocs(categoryQuery);
        const movies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCategoryMovies(movies);
      } catch (err) {
        console.error("Error fetching category movies:", err);
      } finally {
        setLoading(prev => ({ ...prev, categoryMovies: false }));
      }
    };

    fetchCategoryMovies();
  }, [selectedCategory, db]);

  // Hero featured movie is the first in the featured list
  const heroMovie = featuredMovies.length > 0 ? featuredMovies[0] : null;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero section */}
      {heroMovie ? (
        <div 
          className="relative h-[70vh] bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroMovie.backdrop || heroMovie.poster})`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent">
            <div className="container mx-auto px-4 h-full flex items-center">
              <div className="max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{heroMovie.title}</h1>
                <div className="flex items-center mb-4">
                  <span className="bg-red-600 text-white px-2 py-1 text-xs rounded mr-2">
                    {heroMovie.rating || "PG-13"}
                  </span>
                  <span className="text-gray-300 text-sm mr-2">{heroMovie.year || "2023"}</span>
                  <span className="text-gray-300 text-sm mr-2">•</span>
                  <span className="text-gray-300 text-sm mr-2">{heroMovie.duration || "120"} min</span>
                  <span className="text-gray-300 text-sm mr-2">•</span>
                  <span className="text-gray-300 text-sm">{heroMovie.genre}</span>
                </div>
                <p className="text-gray-300 mb-6 line-clamp-3">{heroMovie.description}</p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/movie/${heroMovie.id}`}
                    className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><path d="M170.83,118.13l-52-36A12,12,0,0,0,100,92v72a12,12,0,0,0,18.83,9.87l52-36a12,12,0,0,0,0-19.74Z"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                    <span className="ml-2">Watch Now</span>
                  </Link>
                  <button
                    className="bg-gray-800 hover:bg-gray-700 text-white py-3 px-6 rounded-lg flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="88" y1="128" x2="168" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="88" x2="128" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                    <span className="ml-2">Add to Watchlist</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : loading.featured ? (
        <div className="h-[70vh] bg-gray-800 animate-pulse flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="h-[40vh] bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="64" height="64"><rect width="256" height="256" fill="none"/><polygon points="164 128 108 92 108 164 164 128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M24,128c0,29.91,3.07,47.45,5.41,56.47A16,16,0,0,0,39,195.42C72.52,208.35,128,208,128,208s55.48.35,89-12.58a16,16,0,0,0,9.63-10.95c2.34-9,5.41-26.56,5.41-56.47s-3.07-47.45-5.41-56.47a16,16,0,0,0-9.63-11C183.48,47.65,128,48,128,48s-55.48-.35-89,12.58a16,16,0,0,0-9.63,11C27.07,80.54,24,98.09,24,128Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            </div>
            <h2 className="text-2xl text-white mb-2">Welcome to MovieFlix</h2>
            <p className="text-gray-400">Discover and stream thousands of movies</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="mb-12">
          <SearchBar />
        </div>

        {/* Featured carousel */}
        {featuredMovies.length > 1 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Featured Movies</h2>
              <Link to="/movies?feature=featured" className="text-red-500 hover:text-red-400 flex items-center">
                View All
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {featuredMovies.slice(1).map(movie => (
                <Link key={movie.id} to={`/movie/${movie.id}`} className="block">
                  <div className="relative rounded-lg overflow-hidden group">
                    <img 
                      src={movie.poster} 
                      alt={`${movie.title} poster`} 
                      className="w-full h-auto aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1580130775562-0ef92da028de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Mzk2MDh8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyQnBvc3RlciUyQnBsYWNlaG9sZGVyfGVufDB8fHx8MTc0NzUwMDUyMnww&ixlib=rb-4.1.0&q=80&w=1080";
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-300">
                      <div className="bg-red-600 rounded-full p-3 opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><path d="M170.83,118.13l-52-36A12,12,0,0,0,100,92v72a12,12,0,0,0,18.83,9.87l52-36a12,12,0,0,0,0-19.74Z"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                      <h3 className="text-white font-medium">{movie.title}</h3>
                      <p className="text-gray-300 text-sm">{movie.year}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        
        {/* Categories */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Categories</h2>
          <div className="flex flex-wrap gap-3">
            {loading.categories ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-10 w-24 bg-gray-800 animate-pulse rounded-full"></div>
              ))
            ) : categories.map(category => (
              <button
                key={category.id}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.name
                    ? "bg-red-600 text-white"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
                onClick={() => setSelectedCategory(
                  selectedCategory === category.name ? null : category.name
                )}
              >
                {category.name} 
                <span className="text-xs ml-1 opacity-70">({category.count})</span>
              </button>
            ))}
          </div>

          {/* Category movies */}
          {selectedCategory && (
            <div className="mt-6">
              <h3 className="text-xl text-white font-medium mb-4">{selectedCategory} Movies</h3>
              <MovieGrid 
                movies={categoryMovies}
                isLoading={loading.categoryMovies}
                error={null}
              />
            </div>
          )}
        </section>

        {/* Recently added */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Recently Added</h2>
            <Link to="/movies?sort=recent" className="text-red-500 hover:text-red-400 flex items-center">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            </Link>
          </div>
          <MovieGrid 
            movies={recentlyAddedMovies}
            isLoading={loading.recent}
            error={null}
          />
        </section>

        {/* Trending movies */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Trending Now</h2>
            <Link to="/movies?sort=trending" className="text-red-500 hover:text-red-400 flex items-center">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            </Link>
          </div>
          <MovieGrid 
            movies={trendingMovies}
            isLoading={loading.trending}
            error={null}
          />
        </section>

        {/* Download app banner */}
        <section className="rounded-lg overflow-hidden bg-gradient-to-r from-gray-800 to-gray-900">
          <div className="flex flex-col md:flex-row items-center">
            <div className="p-8 md:w-2/3">
              <h2 className="text-3xl font-bold text-white mb-4">Download Our App</h2>
              <p className="text-gray-300 mb-6">
                Watch on the go with our mobile app. Download movies and enjoy them offline.
                Available for iOS and Android.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="bg-black hover:bg-gray-900 py-3 px-6 rounded-lg flex items-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><path d="M216,73.52C204.53,62.66,185,56,168,56a63.72,63.72,0,0,0-40,14h0A63.71,63.71,0,0,0,88.88,56C52,55.5,23.06,86.3,24,123.19a119.62,119.62,0,0,0,37.65,84.12A31.92,31.92,0,0,0,83.6,216h87.7a31.75,31.75,0,0,0,23.26-10c15.85-17,21.44-33.2,21.44-33.2h0c-16.79-11.53-24-30.87-24-52.78,0-18.3,11.68-34.81,24-46.48Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M148,12a32.12,32.12,0,0,0-9.77,8.37" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  <span className="ml-2 text-white">App Store</span>
                </a>
                <a href="#" className="bg-black hover:bg-gray-900 py-3 px-6 rounded-lg flex items-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><circle cx="164" cy="148" r="16"/><circle cx="92" cy="148" r="16"/><path d="M24,184V161.13C24,103.65,70.15,56.2,127.63,56A104,104,0,0,1,232,160v24a8,8,0,0,1-8,8H32A8,8,0,0,1,24,184Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="32" y1="48" x2="63.07" y2="79.07" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="224" y1="48" x2="193.1" y2="78.9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  <span className="ml-2 text-white">Google Play</span>
                </a>
              </div>
            </div>
            <div className="md:w-1/3 p-8 flex justify-center">
              <img 
                src="https://images.unsplash.com/photo-1517292987719-0369a794ec0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Mzk2MDh8MHwxfHNlYXJjaHwxfHxtb2JpbGUlMkJhcHAlMkJzY3JlZW5zaG90fGVufDB8fHx8MTc0NzUwMDgwN3ww&ixlib=rb-4.1.0&q=80&w=1080" 
                alt="MovieFlix mobile app" 
                className="max-h-72"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
