import { useState, useEffect } from "react";
import AuthForm from "../Authentication/components/AuthForm";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Heart } from "lucide-react";
import petvetLogo from "@/assets/petvet_icon.svg";
import welcomePhoto from "@/assets/petVet/petvet-customer1.jpg";

// Faint dot grid used as decoration on both panels.
const dots = {
  backgroundImage: "radial-gradient(currentColor 1.2px, transparent 1.2px)",
  backgroundSize: "14px 14px",
};

export default function Login() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Sync with OS preferences if user hasn't explicitly set a preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-emerald-50 dark:bg-zinc-950 px-4 py-8 text-zinc-900 dark:text-zinc-50 antialiased transition-colors duration-300">
      {/* Soft background shapes */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-600/20 dark:bg-emerald-600/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-emerald-600/25 dark:bg-emerald-600/10 blur-2xl" />

      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-transform active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400 transition-all" />
          ) : (
            <Moon className="h-4 w-4 text-zinc-700 transition-all" />
          )}
        </Button>
      </div>

      <div className="relative w-full max-w-5xl rounded-[2rem] bg-white dark:bg-zinc-900 p-3 sm:p-4 shadow-2xl shadow-emerald-900/10 grid md:grid-cols-2 gap-4">
        {/* ── Brand panel ── */}
        <section className="relative overflow-hidden rounded-[1.5rem] bg-emerald-600 text-white p-6 sm:p-8 flex flex-col gap-5 min-h-[18rem]">
          <div aria-hidden className="absolute top-6 right-6 h-24 w-36 text-white/30" style={dots} />
          <div aria-hidden className="absolute bottom-24 left-6 h-20 w-28 text-white/25" style={dots} />

          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow">
              <img src={petvetLogo} alt="" className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xl font-extrabold leading-none">
                <span className="text-red-200">Pet</span>Vet
              </p>
              <p className="text-xs text-emerald-50/90 mt-1">Animal Clinic and Grooming Center</p>
            </div>
          </div>

          <div className="relative space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Welcome Back!</h1>
            <p className="text-sm sm:text-base text-emerald-50/95 max-w-sm leading-relaxed">
              We missed you! Sign in to book visits, follow your pet's records and
              keep giving them the best care.
            </p>
          </div>

          <div className="relative mt-auto hidden md:block">
            <Heart aria-hidden className="absolute -top-3 left-6 h-6 w-6 fill-red-400 text-red-400 rotate-[-12deg]" />
            <Heart aria-hidden className="absolute top-4 right-8 h-5 w-5 fill-red-300 text-red-300 rotate-12" />
            <img
              src={welcomePhoto}
              alt="A happy pet at PetVet"
              className="w-full aspect-[4/3] object-cover rounded-2xl border-4 border-white/30 shadow-lg"
            />
          </div>
        </section>

        {/* ── Sign-in panel ── */}
        <section className="relative flex items-center justify-center px-2 py-6 sm:px-8">
          <div aria-hidden className="absolute top-2 right-4 h-20 w-32 text-emerald-600/20" style={dots} />
          <div aria-hidden className="absolute bottom-2 right-8 h-16 w-40 text-emerald-600/15" style={dots} />
          <div className="relative w-full max-w-sm">
            <AuthForm />
          </div>
        </section>
      </div>
    </div>
  );
}
