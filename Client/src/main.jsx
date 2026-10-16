import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";




const savedTheme = localStorage.getItem("theme");
document.documentElement.classList.toggle("dark", savedTheme === "dark");

// Android's address bar (and installed-app title bar) takes its colour from
// theme-color, which index.html only sets per *system* theme. Follow the
// app's own light/dark toggle instead, wherever it's switched.
const syncThemeColor = () => {
  const color = document.documentElement.classList.contains("dark") ? "#0a0c0a" : "#ffffff";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
};
syncThemeColor();
new MutationObserver(syncThemeColor).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});

// Chrome's back-forward cache can restore an old snapshot of the page on
// Back/Forward — e.g. a signed-in portal after the session ended, frozen on
// "Loading...". Reload instead, so the route guards check the session again.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

createRoot(document.getElementById("root")).render(<App />);
