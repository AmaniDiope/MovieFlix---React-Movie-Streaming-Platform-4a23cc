import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import App from "./App";
import "./firebase/firebase";

const container = document.getElementById("root");
const root = createRoot(container);

// Add Tailwind CSS via CDN in development
if (process.env.NODE_ENV === "development") {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";
  document.head.appendChild(script);
}

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
