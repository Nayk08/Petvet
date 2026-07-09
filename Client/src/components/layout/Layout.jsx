import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Fixed top navigation bar */}
      <Navbar />

      {/* Main content viewport container:
        - pt-16: Offsets your fixed header bar safely
        - max-w-7xl mx-auto: Centers the content grid on extra large screens
        - px-4 sm:px-6 lg:px-8: Adds flexible fluid side margins on mobile/desktop
      */}
      <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Outlet />
      </main>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />
    </div>
  );
}
