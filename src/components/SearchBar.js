import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, getFirestore, orderBy, limit } from "firebase/firestore";
import { useDebounce } from "../hooks/useDebounce";

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchContainerRef = useRef(null);
  const navigate = useNavigate();
  const db = getFirestore();

  const categories = [
    { id: "all", label: "All" },
    { id: "title", label: "Title" },
    { id: "genre", label: "Genre" },
    { id: "year", label: "Year" }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const searchMovies = async () => {
      if (!debouncedSearchTerm) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const moviesRef = collection(db, "movies");
        let searchQuery;

        switch (selectedCategory) {
          case "title":
            searchQuery = query(
              moviesRef,
              where("title", ">=", debouncedSearchTerm),
              where("title", "<=", debouncedSearchTerm + "\uf8ff"),
              orderBy("title"),
              limit(5)
            );
            break;
          case "genre":
            searchQuery = query(
              moviesRef,
              where("genre", ">=", debouncedSearchTerm),
              where("genre", "<=", debouncedSearchTerm + "\uf8ff"),
              limit(5)
            );
            break;
          case "year":
            searchQuery = query(
              moviesRef,
              where("year", "==", parseInt(debouncedSearchTerm)),
              limit(5)
            );
            break;
          default:
            // Search across multiple fields
            const queries = [
              query(
                moviesRef,
                where("title", ">=", debouncedSearchTerm),
                where("title", "<=", debouncedSearchTerm + "\uf8ff"),
                orderBy("title"),
                limit(3)
              ),
              query(
                moviesRef,
                where("genre", ">=", debouncedSearchTerm),
                where("genre", "<=", debouncedSearchTerm + "\uf8ff"),
                limit(2)
              )
            ];

            const results = await Promise.all(queries.map(q => getDocs(q)));
            const combinedResults = results.flatMap(snapshot =>
              snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
            );

            setResults(combinedResults);
            setLoading(false);
            return;
        }

        const snapshot = await getDocs(searchQuery);
        setResults(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      } catch (error) {
        console.error("Search error:", error);
      }
      setLoading(false);
    };

    searchMovies();
  }, [debouncedSearchTerm, selectedCategory, db]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setIsExpanded(true);
  };

  const handleResultClick = (movieId) => {
    setIsExpanded(false);
    setSearchTerm("");
    navigate(`/movie/${movieId}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}&category=${selectedCategory}`);
      setIsExpanded(false);
      setSearchTerm("");
    }
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setIsExpanded(true)}
              placeholder="Search movies..."
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><rect x="48" y="120" width="88" height="88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M208,188v12a8,8,0,0,1-8,8H180" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="208" y1="116" x2="208" y2="140" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M184,48h16a8,8,0,0,1,8,8V72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="116" y1="48" x2="140" y2="48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M48,76V56a8,8,0,0,1,8-8H68" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-700 text-white px-3 border-l border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-red-600 text-white px-4 py-2 rounded-r-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Search
          </button>
        </div>
      </form>

      {isExpanded && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-400">
              <div className="animate-spin inline-block w-6 h-6 border-t-2 border-red-500 rounded-full"></div>
              <span className="ml-2">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto">
              {results.map((movie) => (
                <li
                  key={movie.id}
                  onClick={() => handleResultClick(movie.id)}
                  className="hover:bg-gray-700 cursor-pointer"
                >
                  <div className="flex items-center p-3">
                    <div className="w-12 h-16 flex-shrink-0">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1580130775562-0ef92da028de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Mzk2MDh8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyQnBsYWNlaG9sZGVyJTJCcG9zdGVyfGVufDB8fHx8MTc0NzUwMDI5NXww&ixlib=rb-4.1.0&q=80&w=1080";
                        }}
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-white font-medium">{movie.title}</div>
                      <div className="text-sm text-gray-400">
                        {movie.year} • {movie.genre}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : searchTerm ? (
            <div className="p-4 text-center text-gray-400">
              No results found for "{searchTerm}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;