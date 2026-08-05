import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const savedTheme = localStorage.getItem("theme");
document.documentElement.classList.toggle("dark", savedTheme === "dark");

createRoot(document.getElementById("root")).render(<App />);
