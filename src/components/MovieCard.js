import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

const MovieCard = ({ movie, className = "" }) => {
  const {
    id,
    title,
    poster,
    year,
    genre,
    rating,
    duration
  } = movie;

  return (
    <div className={`group relative bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 ${className}`}>
      <Link to={`/movie/${id}`}>
        {/* Poster Image */}
        <div className="aspect-[2/3] relative">
          <img
            src={poster}
            alt={`${title} poster`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1580130775562-0ef92da028de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Mzk2MDh8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyQnBsYWNlaG9sZGVyJTJCcG9zdGVyfGVufDB8fHx8MTc0NzUwMDI5NXww&ixlib=rb-4.1.0&q=80&w=1080";
            }}
          />
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
              <div className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><path d="M170.83,118.13l-52-36A12,12,0,0,0,100,92v72a12,12,0,0,0,18.83,9.87l52-36a12,12,0,0,0,0-19.74Z"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                <span className="ml-2">Watch Now</span>
              </div>
            </div>
          </div>

          {/* Rating Badge */}
          {rating && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
              {rating}
            </div>
          )}
        </div>

        {/* Movie Info */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white truncate mb-1" title={title}>
            {title}
          </h3>
          <div className="flex items-center text-sm text-gray-400 space-x-2">
            {year && <span>{year}</span>}
            {genre && (
              <>
                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                <span>{genre}</span>
              </>
            )}
            {duration && (
              <>
                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                <span>{duration} min</span>
              </>
            )}
          </div>
        </div>
      </Link>
      
      {/* Quick Actions */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button 
          className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full"
          title="Add to Watchlist"
          onClick={(e) => {
            e.preventDefault();
            // Watchlist functionality would be handled by parent component
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="88" y1="128" x2="168" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="88" x2="128" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
        </button>
      </div>
    </div>
  );
};

MovieCard.propTypes = {
  movie: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    poster: PropTypes.string.isRequired,
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    genre: PropTypes.string,
    rating: PropTypes.string,
    duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  className: PropTypes.string
};

export default MovieCard;