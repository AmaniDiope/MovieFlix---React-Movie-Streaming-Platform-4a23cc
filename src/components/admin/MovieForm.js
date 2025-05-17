import React, { useState, useEffect } from "react";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, doc, updateDoc, getFirestore } from "firebase/firestore";

const MovieForm = ({ movie, onSubmit, onCancel }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [duration, setDuration] = useState("");
  const [rating, setRating] = useState("PG-13");
  const [poster, setPoster] = useState(null);
  const [video, setVideo] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState({
    poster: 0,
    video: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const storage = getStorage();
  const db = getFirestore();

  useEffect(() => {
    if (movie) {
      setTitle(movie.title || "");
      setDescription(movie.description || "");
      setGenre(movie.genre || "");
      setYear(movie.year || "");
      setDuration(movie.duration || "");
      setRating(movie.rating || "PG-13");
      setPosterPreview(movie.poster || "");
    }
  }, [movie]);

  const genres = [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Horror",
    "Sci-Fi",
    "Thriller",
    "Romance",
    "Documentary"
  ];

  const ratings = ["G", "PG", "PG-13", "R", "NC-17"];

  const handlePosterChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file for the poster");
        return;
      }
      setPoster(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        setError("Please select a video file");
        return;
      }
      setVideo(file);
    }
  };

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({
            ...prev,
            [file === poster ? "poster" : "video"]: progress
          }));
        },
        (error) => {
          console.error("Upload error:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let posterUrl = movie?.poster || "";
      let videoUrl = movie?.videoUrl || "";

      if (poster) {
        const posterPath = `posters/${Date.now()}-${poster.name}`;
        posterUrl = await uploadFile(poster, posterPath);
      }

      if (video) {
        const videoPath = `movies/${Date.now()}-${video.name}`;
        videoUrl = await uploadFile(video, videoPath);
      }

      const movieData = {
        title,
        description,
        genre,
        year,
        duration,
        rating,
        poster: posterUrl,
        videoUrl,
        updatedAt: new Date()
      };

      if (movie?.id) {
        await updateDoc(doc(db, "movies", movie.id), movieData);
      } else {
        movieData.createdAt = new Date();
        await addDoc(collection(db, "movies"), movieData);
      }

      onSubmit();
    } catch (err) {
      console.error("Error saving movie:", err);
      setError("Failed to save movie. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              required
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Select Genre</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Year</label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              {ratings.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows="4"
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Poster Image</label>
            <div className="mt-1 flex items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
                className="hidden"
                id="poster-upload"
              />
              <label
                htmlFor="poster-upload"
                className="cursor-pointer bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Choose File
              </label>
              {uploadProgress.poster > 0 && uploadProgress.poster < 100 && (
                <div className="ml-4 text-sm text-gray-300">
                  Uploading: {Math.round(uploadProgress.poster)}%
                </div>
              )}
            </div>
            {posterPreview && (
              <div className="mt-2">
                <img
                  src={posterPreview}
                  alt="Movie poster preview"
                  className="h-32 w-auto object-cover rounded"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Movie File</label>
            <div className="mt-1 flex items-center">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="cursor-pointer bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Choose File
              </label>
              {uploadProgress.video > 0 && uploadProgress.video < 100 && (
                <div className="ml-4 text-sm text-gray-300">
                  Uploading: {Math.round(uploadProgress.video)}%
                </div>
              )}
            </div>
            {video && (
              <p className="mt-2 text-sm text-gray-400">
                Selected file: {video.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${loading ? "bg-red-700" : "bg-red-600 hover:bg-red-700"} 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </div>
            ) : movie?.id ? (
              "Update Movie"
            ) : (
              "Add Movie"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MovieForm;