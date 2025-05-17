import React, { useState, useEffect } from "react";
import MovieCard from "./MovieCard";
import PropTypes from "prop-types";

const MovieGrid = ({ 
  movies,
  isLoading = false,
  error = null,
  loadMore = null,
  hasMore = false
}) => {
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) { // sm
        setColumns(2);
      } else if (width < 768) { // md
        setColumns(3);
      } else if (width < 1024) { // lg
        setColumns(4);
      } else { // xl and above
        setColumns(5);
      }
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="48" height="48"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="132" x2="128" y2="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="172" r="16"/></svg>
        </div>
        <p className="text-lg text-gray-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
        
        {/* Loading placeholders */}
        {isLoading && Array.from({ length: columns }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="bg-gray-800 rounded-lg overflow-hidden animate-pulse"
          >
            <div className="aspect-[2/3] bg-gray-700" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* No results message */}
      {!isLoading && movies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="48" height="48"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="224" x2="232" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="84" r="20"/><circle cx="128" cy="172" r="20"/><circle cx="172" cy="128" r="20"/><circle cx="84" cy="128" r="20"/></svg>
          </div>
          <h3 className="text-xl text-white font-medium">No movies found</h3>
          <p className="text-gray-400 mt-2">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && loadMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            Load More
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
          </button>
        </div>
      )}

      {/* Loading indicator for load more */}
      {isLoading && movies.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-2 text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600"></div>
            <span>Loading more movies...</span>
          </div>
        </div>
      )}
    </div>
  );
};

MovieGrid.propTypes = {
  movies: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      poster: PropTypes.string.isRequired,
      year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      genre: PropTypes.string,
      rating: PropTypes.string,
      duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ).isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  loadMore: PropTypes.func,
  hasMore: PropTypes.bool
};

export default MovieGrid;