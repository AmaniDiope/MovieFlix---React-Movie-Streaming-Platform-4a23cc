import React, { useState, useEffect, useRef } from "react";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const VideoPlayer = ({ movieId, videoUrl, poster, title, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [watchStarted, setWatchStarted] = useState(false);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const timeoutRef = useRef(null);
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  // Format time in MM:SS
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  };

  useEffect(() => {
    // Load the video source
    const loadVideo = async () => {
      try {
        setLoading(true);
        let sourceUrl = videoUrl;

        // If videoUrl is a Firebase storage path, resolve it
        if (videoUrl && videoUrl.startsWith("movies/")) {
          const storageRef = ref(storage, videoUrl);
          sourceUrl = await getDownloadURL(storageRef);
        }

        if (videoRef.current) {
          videoRef.current.src = sourceUrl;
        }
        
        // Get download URL for the download button
        if (videoUrl) {
          try {
            const downloadRef = ref(storage, videoUrl);
            const url = await getDownloadURL(downloadRef);
            setDownloadUrl(url);
          } catch (downloadErr) {
            console.error("Error getting download URL:", downloadErr);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading video:", err);
        setError("Failed to load video. Please try again later.");
        setLoading(false);
      }
    };

    loadVideo();

    // Add to watch history when the video starts playing
    const addToWatchHistory = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        
        // Get the user document to check existing watch history
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const watchHistory = userData.watchHistory || [];
          
          // Check if this movie is already in watch history
          const existingEntry = watchHistory.find(item => item.movieId === movieId);
          
          if (!existingEntry) {
            // Add new entry
            await updateDoc(userRef, {
              "watchHistory": arrayUnion({
                movieId,
                title,
                watchedAt: new Date(),
                poster: poster || null
              })
            });
          } else {
            // Update existing entry - more complex, need to remove old and add new
            const updatedHistory = watchHistory.filter(item => item.movieId !== movieId);
            updatedHistory.push({
              movieId,
              title,
              watchedAt: new Date(),
              poster: poster || null
            });
            await updateDoc(userRef, { watchHistory: updatedHistory });
          }
        }
      } catch (error) {
        console.error("Error updating watch history:", error);
      }
    };

    if (watchStarted) {
      addToWatchHistory();
    }

    // Setup control hiding timeout
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    document.addEventListener("mousemove", handleMouseMove);

    // Cleanup
    return () => {
      clearTimeout(timeoutRef.current);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [videoUrl, storage, watchStarted, movieId, title, poster, auth.currentUser, db, isPlaying]);

  // Handle video events
  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const progress = (currentTime / videoRef.current.duration) * 100;
      setCurrentTime(currentTime);
      setProgress(progress);
      
      // Mark as watched after 30 seconds
      if (currentTime > 30 && !watchStarted) {
        setWatchStarted(true);
      }
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
  };

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const handleVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    setVolume(volume);
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    setIsMuted(volume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        // Store current volume before muting
        videoRef.current.dataset.prevVolume = volume;
        setVolume(0);
      } else {
        // Restore previous volume
        const prevVolume = parseFloat(videoRef.current.dataset.prevVolume || 1);
        setVolume(prevVolume);
        videoRef.current.volume = prevVolume;
      }
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (playerRef.current.requestFullscreen) {
        playerRef.current.requestFullscreen();
      } else if (playerRef.current.webkitRequestFullscreen) {
        playerRef.current.webkitRequestFullscreen();
      } else if (playerRef.current.msRequestFullscreen) {
        playerRef.current.msRequestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  // Handle fullscreen change events from browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const handleBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const handleForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + 10
      );
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${title || "movie"}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div 
      className="relative w-full h-full max-w-5xl mx-auto bg-black rounded-lg overflow-hidden"
      ref={playerRef}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          <span className="text-white ml-3">Loading video...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 p-4">
          <div className="text-red-500 text-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="40" height="40"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="132" x2="128" y2="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="172" r="16"/></svg>
          </div>
          <p className="text-white text-center">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" 
            onClick={onClose}
          >
            Back to Movie
          </button>
        </div>
      )}

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        poster={poster}
        onClick={togglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
      />

      {/* Large play/pause button in the center */}
      {(!isPlaying || showControls) && (
        <button
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white opacity-80 hover:opacity-100 transition-opacity"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <span className="text-8xl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="80" height="80"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="104" y1="96" x2="104" y2="160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="152" y1="96" x2="152" y2="160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            </span>
          ) : (
            <span className="text-8xl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="80" height="80"><rect width="256" height="256" fill="none"/><path d="M170.83,118.13l-52-36A12,12,0,0,0,100,92v72a12,12,0,0,0,18.83,9.87l52-36a12,12,0,0,0,0-19.74Z"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            </span>
          )}
        </button>
      )}

      {/* Skip back/forward buttons */}
      {showControls && (
        <>
          <button
            className="absolute top-1/2 left-12 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-2 text-white opacity-80 hover:opacity-100 transition-opacity"
            onClick={handleBackward}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="32" height="32"><rect width="256" height="256" fill="none"/><rect x="40" y="40" width="176" height="176" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><rect x="96" y="96" width="64" height="64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
          </button>
          <button
            className="absolute top-1/2 right-12 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-2 text-white opacity-80 hover:opacity-100 transition-opacity"
            onClick={handleForward}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="32" height="32"><rect width="256" height="256" fill="none"/><rect x="40" y="40" width="176" height="176" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><rect x="96" y="96" width="64" height="64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
          </button>
        </>
      )}

      {/* Close button */}
      <button
        className="absolute top-4 right-4 p-2 text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-opacity"
        onClick={onClose}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><rect x="88" y="88" width="80" height="80" rx="12"/></svg>
      </button>

      {/* Video controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity">
          {/* Progress bar */}
          <div 
            className="relative h-1 bg-gray-600 rounded cursor-pointer mb-2"
            onClick={handleProgressClick}
          >
            <div className="absolute h-full bg-red-600 rounded" style={{ width: `${progress}%` }}></div>
            <div 
              className="absolute h-3 w-3 bg-red-600 rounded-full -top-1 transform -translate-y-1/2" 
              style={{ left: `${progress}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Play/Pause button */}
              <button
                className="text-white hover:text-red-400 focus:outline-none"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="104" y1="96" x2="104" y2="160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="152" y1="96" x2="152" y2="160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  </span>
                ) : (
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><path d="M170.83,118.13l-52-36A12,12,0,0,0,100,92v72a12,12,0,0,0,18.83,9.87l52-36a12,12,0,0,0,0-19.74Z"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  </span>
                )}
              </button>

              {/* Volume control */}
              <div className="flex items-center">
                <button
                  className="text-white hover:text-red-400 mr-2 focus:outline-none"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><line x1="20" y1="120" x2="20" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="60" y1="96" x2="60" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="100" y1="56" x2="100" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M140,192h64a40,40,0,0,0,7.64-79.27A72,72,0,0,0,140,48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                    </span>
                  ) : volume > 0.5 ? (
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><line x1="20" y1="120" x2="20" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="60" y1="96" x2="60" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="100" y1="56" x2="100" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M140,192h64a40,40,0,0,0,7.64-79.27A72,72,0,0,0,140,48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                    </span>
                  ) : (
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><line x1="20" y1="120" x2="20" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="60" y1="96" x2="60" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="100" y1="56" x2="100" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M140,192h64a40,40,0,0,0,7.64-79.27A72,72,0,0,0,140,48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                    </span>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-16 md:w-24 slider"
                />
              </div>

              {/* Time display */}
              <div className="text-white text-sm hidden md:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Download button */}
              {downloadUrl && (
                <button
                  className="text-white hover:text-red-400 focus:outline-none"
                  onClick={handleDownload}
                  title="Download video"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><line x1="128" y1="144" x2="128" y2="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="216 144 216 208 40 208 40 144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="168 104 128 144 88 104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  </span>
                </button>
              )}

              {/* Fullscreen button */}
              <button
                className="text-white hover:text-red-400 focus:outline-none"
                onClick={toggleFullScreen}
              >
                {isFullScreen ? (
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><path d="M40,156H76.69a8,8,0,0,1,5.65,2.34l19.32,19.32a8,8,0,0,0,5.65,2.34h41.38a8,8,0,0,0,5.65-2.34l19.32-19.32a8,8,0,0,1,5.65-2.34H216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><rect x="40" y="40" width="176" height="176" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="76" x2="128" y2="140" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="96 108 128 140 160 108" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  </span>
                ) : (
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><rect x="32" y="48" width="192" height="140" rx="16" transform="translate(256 236) rotate(180)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="160" y1="224" x2="96" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="32" y1="148" x2="224" y2="148" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="192" x2="128" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Hide native video controls */
        video::-webkit-media-controls {
          display: none !important;
        }

        /* Custom volume slider styling */
        .slider {
          -webkit-appearance: none;
          height: 4px;
          border-radius: 2px;
          background: #4a4a4a;
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #e53e3e;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #e53e3e;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;