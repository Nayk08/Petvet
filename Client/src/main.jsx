import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";




// Light mode only (dark mode was removed): forget any old saved choice.
localStorage.removeItem("theme");

// Chrome's back-forward cache can restore an old snapshot of the page on
// Back/Forward — e.g. a signed-in portal after the session ended, frozen on
// "Loading...". Reload instead, so the route guards check the session again.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

createRoot(document.getElementById("root")).render(<App />);
