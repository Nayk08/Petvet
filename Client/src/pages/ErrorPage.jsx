import { useRouteError, Link } from "react-router-dom";

const errorConfig = {
  404: {
    title: "Page Not Found",
    message: "The page you're looking for doesn't exist or has been moved.",
    icon: "🔍",
  },
  401: {
    title: "Unauthorized",
    message: "You need to log in to access this page.",
    icon: "🔒",
  },
  403: {
    title: "Forbidden",
    message: "You don't have permission to access this page.",
    icon: "🚫",
  },
  429: {
    title: "Slow Down",
    message: "Too many requests in a short time. Please wait a moment and try again.",
    icon: "⏳",
  },
  500: {
    title: "Server Error",
    message: "Something went wrong on our end. Please try again later.",
    icon: "🔥",
  },
};

export default function ErrorPage() {
  const error = useRouteError();

  // Thrown Response objects (React Router's own convention) carry `.status`;
  // thrown plain Errors from this app's API helpers (see clientPortal.js /
  // http.js) carry `.code` instead — check both so a 429 surfaces its own
  // message either way, rather than falling through to the generic 500.
  const status = error?.status || error?.code || 500;
  const { title, message, icon } = errorConfig[status] || {
    title: "Unexpected Error",
    message: error?.message || "Something went wrong.",
    icon: "⚠️",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-lg w-full">
        {/* Icon */}
        <div className="text-8xl mb-4">{icon}</div>

        {/* Status Code */}
        <h1 className="text-7xl font-extrabold text-gray-800 mb-2">{status}</h1>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-700 mb-3">{title}</h2>

        {/* Message */}
        <p className="text-gray-500 mb-8">{message}</p>

        {/* Dev Error Box */}
        {import.meta.env.DEV && (
          <pre className="bg-gray-100 text-left text-xs text-red-500 rounded-lg p-4 mb-8 overflow-x-auto border border-red-200">
            {error?.stack || error?.message || JSON.stringify(error, null, 2)}
          </pre>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
          >
            ← Go Back
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            🏠 Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
