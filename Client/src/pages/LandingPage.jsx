import { useState, useEffect } from "react";
import { getCurrentUser } from "@/api/auth";
import { fetchNavbar } from "@/api/http";
import { resolveLandingPath } from "@/utils/resolveLandingPath.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  CalendarRange,
  Receipt,
  Package,
  FolderHeart,
  Clock,
  MapPin,
  AlertCircle,
  Star,
  Megaphone,
  X,
  Maximize2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import { Link, redirect } from "react-router-dom";
import PetVetLogo from "../assets/petvet_icon.svg";
import { fetchPublicClinicSchedule, fetchPublicServices } from "@/api/clientPortal.js";

import petvetA1 from "../assets/petVet/petvet-img.jpg";
import petvetA2 from "../assets/petVet/petvet-img2.jpg";
import petvetA3 from "../assets/petVet/petvet-img3.jpg";
import petvetA4 from "../assets/petVet/petvet-img4.jpg";
import petvetC1 from "../assets/petVet/petvet-customer1.jpg";
import petvetC2 from "../assets/petVet/petvet-customer2.jpg";
import petvetC3 from "../assets/petVet/petvet-customer3.jpg";
import petvetC4 from "../assets/petVet/petvet-customer4.jpg";
import { tierPriceRange } from "@/utils/groomingTier.js";

export default function LandingPage() {
  const [activeImage, setActiveImage] = useState(null);
  const [email, setEmail] = useState("");

  // Initialize theme from localStorage or default to dark
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  // Sync theme class to standard HTML document tag & save preference
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Dismiss lightbox on 'Escape' key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setActiveImage(null);
    };
    if (activeImage) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImage]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    setEmail("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#060814] text-zinc-900 dark:text-white transition-colors duration-200 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800/50 bg-white/95 dark:bg-[#060814]/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#060814]/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-red-500 text-xl">
            <img src={PetVetLogo} alt="PetVet Logo" className="h-6 w-6" />
            Pet<span className="text-green-500">Vet</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a
              href="#home"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Home
            </a>
            <a
              href="#about"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              About Us
            </a>
            <a
              href="#services"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Services & Hours
            </a>
            <a
              href="#calendar"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Live Calendar
            </a>
            <a
              href="#announcements"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Announcements
            </a>
            <a
              href="#testimonials"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Testimonials
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {/* Darkmode Toggle Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-700" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              asChild
            >
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Home / Hero Section */}
        <section
          id="home"
          className="container px-4 md:px-6 py-20 md:py-28 flex flex-col items-center text-center gap-6 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 mr-2" />
            Skip the overcrowding—Book your grooming slots online!
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-zinc-900 dark:text-white">
            Streamlined Care for Your Best Friends at{" "}
            <span className="bg-gradient-to-r lg:bg-clip-text lg:text-transparent lg:from-green-500 lg:to-emerald-600">
              <span className="text-red-500">Pet</span>Vet Center
            </span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Serving Commonwealth, QC since 2007. No more long wait times, missed
            reminders, or missing record folders. Book grooming or check updates
            seamlessly online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
            <Button
              size="lg"
              className="h-12 px-6 text-base gap-2 bg-green-600 hover:bg-green-700 text-white"
              asChild
            >
              <Link to="/login">
                Book An Appointment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
              asChild
            >
              <a href="#hours">View Clinic Hours</a>
            </Button>
          </div>
        </section>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        {/* About Us Section */}
        <section
          id="about"
          className="container px-4 md:px-6 py-20 bg-zinc-50/50 dark:bg-[#060814]"
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-zinc-900 dark:text-white">
              Your Complete Pet Care Platform
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              We have completely modernized our legacy operations to replace
              manual notebooks, messy spreadsheets, and paper records with a
              centralized digital workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <FeatureCard
              icon={<CalendarRange className="h-5 w-5" />}
              title="Smart Scheduling"
              description="Real-time slot choices for grooming and surgeries. Eliminates double bookings and fires off automated reminders to end costly no-shows."
            />
            <FeatureCard
              icon={<Receipt className="h-5 w-5" />}
              title="Automated Billing"
              description="Instant calculation of service fees, pet food, and medical essentials. Eliminates notebook tallies for clear financial records."
            />
            <FeatureCard
              icon={<Package className="h-5 w-5" />}
              title="Live Stock Monitoring"
              description="Tracks quick-moving goods like vitamins and grooming items dynamically. Auto-triggers warning alerts before critical item stock runs out."
            />
            <FeatureCard
              icon={<FolderHeart className="h-5 w-5" />}
              title="Centralized Health Profiles"
              description="Instant access to medical files, immunization dates, and pet allergies. Replaces physical folders for reliable patient care tracking."
            />
          </div>
        </section>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        {/* Services Section — live catalog from Maintenance */}
        <section
          id="services"
          className="container px-4 md:px-6 py-20 max-w-6xl mx-auto"
        >
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-zinc-900 dark:text-white">
              Our Services
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Everything we offer, with how long each visit takes. Sign in to
              book any of these online.
            </p>
          </div>
          <ServicesList />
        </section>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        {/* Clinic Policies & Hours Section */}
        <section
          id="hours"
          className="container px-4 md:px-6 py-20 max-w-5xl mx-auto"
        >
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-zinc-900 dark:text-white">
              Clinic Policies & Hours
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Please plan your visits accordingly based on our operational
              guidelines below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#0e1121]">
              <Clock className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <h4 className="font-bold mb-1 text-zinc-900 dark:text-white">
                  Operating Window
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Open daily from 9:00 AM to 6:00 PM.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  * Daily consultation cutoff is strictly at 5:00 PM.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#0e1121]">
              <CalendarRange className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <h4 className="font-bold mb-1 text-zinc-900 dark:text-white">
                  Service Limitations
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Grooming is unavailable on <strong>Sundays</strong>.
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Veterinarians do not hold clinic hours on{" "}
                  <strong>Wednesdays</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#0e1121]">
              <MapPin className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <h4 className="font-bold mb-1 text-zinc-900 dark:text-white">
                  Consultation Rules
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Medical examinations run on a strict{" "}
                  <strong>First Come, First Served</strong> arrangement.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        {/* Live Calendar Section */}
        <section
          id="calendar"
          className="container px-4 md:px-6 py-20 max-w-4xl mx-auto"
        >
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
            <div className="p-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 mb-3">
              <CalendarClock className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-zinc-900 dark:text-white">
              Live Clinic Calendar
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              See how busy we are before you visit — this updates in real
              time as appointments get booked. Sign in to reserve an open
              slot for yourself.
            </p>
          </div>
          <LiveCalendar />
        </section>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        {/* Announcements Bulletin Section */}
        <section
          id="announcements"
          className="container px-4 md:px-6 py-20 max-w-6xl mx-auto"
        >
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
            <div className="p-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 mb-3">
              <Megaphone className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-zinc-900 dark:text-white">
              Clinic Bulletin & Announcements
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Stay up to date with direct announcements, schedule adjustments,
              and stock updates. Click any image below to view it full size.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnnouncementCard
              img={petvetA1}
              badge="Traffic Notice"
              borderColor="border-t-amber-500"
              badgeColor="text-amber-600 dark:text-amber-400"
              title="Weekend Volumes"
              description="We are experiencing heavy client volumes (30 to 40 daily pets) during weekend afternoons. Please utilize your client dashboard to reserve slots ahead."
              onOpenImage={setActiveImage}
            />
            <AnnouncementCard
              img={petvetA2}
              badge="Medical Operations"
              borderColor="border-t-red-500"
              badgeColor="text-red-600 dark:text-red-400"
              title="Wednesday Vets Off"
              description="Reminder: Our veterinarians do not hold standard clinic hours on Wednesdays. Emergency treatments must be requested explicitly via our primary portal."
              onOpenImage={setActiveImage}
            />
            <AnnouncementCard
              img={petvetA3}
              badge="Grooming Update"
              borderColor="border-t-green-500"
              badgeColor="text-green-600 dark:text-green-400"
              title="Sunday Grooming Close"
              description="Grooming service bays are fully closed on Sundays. Each groomer caps daily volume between 5 to 10 pets maximum from Mon-Sat."
              onOpenImage={setActiveImage}
            />
            <AnnouncementCard
              img={petvetA4}
              badge="Inventory Restock"
              borderColor="border-t-blue-500"
              badgeColor="text-blue-600 dark:text-blue-400"
              title="Supplies & Vitamins"
              description="Fast-selling pet foods, shampoos, and vital medications are fully restocked. Our live tracking module ensures clean expiration date oversight."
              onOpenImage={setActiveImage}
            />
          </div>

          {/* Email Newsletter Subscription Form */}
          <div className="mt-12 max-w-xl mx-auto bg-zinc-50 dark:bg-[#0e1121] rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center gap-4">
            <div>
              <h4 className="font-bold text-base text-zinc-900 dark:text-white">
                Want live bulletins on your phone?
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Get immediate emails regarding holiday schedule alerts and
                emergency updates.
              </p>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-sm items-center space-x-2"
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="h-10 bg-white dark:bg-[#060814] border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-700"
              />
              <Button
                type="submit"
                className="h-10 bg-green-600 hover:bg-green-700 text-white shrink-0"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </section>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        {/* Testimonial Section */}
        <section
          id="testimonials"
          className="container px-4 md:px-6 py-20 bg-zinc-50/50 dark:bg-[#060814]"
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-zinc-900 dark:text-white">
              Loved by Pets, Trusted by Owners
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              See some of our regular clinic companions and happy pet parents
              from the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <TestimonialCard
              img={petvetC1}
              quote="Scheduling a grooming session online saved me hours of waiting on the weekend. Spot looks beautiful!"
              author="— Maria & Spot"
            />
            <TestimonialCard
              img={petvetC2}
              quote="I love knowing his vaccination logs are online. It makes routine follow-ups totally stress-free."
              author="— Jay & Milo"
            />
            <TestimonialCard
              img={petvetC3}
              quote="No more missing out on vitamins. The inventory system keeps my cat's favorite food always ready."
              author="— Chloe & Luna"
            />
            <TestimonialCard
              img={petvetC4}
              quote="The transparency with billing and instant digital receipts keeps our vet budgets perfectly tracked."
              author="— David & Coco"
            />
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveImage(null)}
        >
          <button
            className="absolute top-4 right-4 bg-zinc-900/80 text-white rounded-full p-2.5 hover:bg-zinc-800 transition-colors border border-white/10"
            onClick={() => setActiveImage(null)}
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-lg shadow-2xl border border-white/5 bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="w-full h-auto max-h-[85vh] object-contain object-center"
            />
          </div>
          <p className="text-zinc-300 text-xs mt-3 bg-zinc-900/50 py-1 px-3 rounded-full backdrop-blur">
            {activeImage.alt} — Press Esc or click outside to close
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#060814]">
        <div className="container flex flex-col gap-4 sm:flex-row py-8 w-full shrink-0 items-center justify-between px-4 md:px-6 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            © 2026 PetVet Cycle Animal and Grooming Center. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Sub-components

function toDateString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Bucketed rather than an exact "X of N slots" count — the schedule spans
// every staff member at once, so a raw appointment count isn't a slot
// fraction of any one person's day; this is a rough at-a-glance signal for
// visitors deciding when to visit or book, not a precise capacity meter.
function busyLevel(count) {
  if (count === 0) return { label: "Open", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" };
  if (count <= 3) return { label: "Some bookings", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { label: "Busy", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function LiveCalendar() {
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [schedule, setSchedule] = useState([]);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const viewedMonth = new Date();
  viewedMonth.setDate(1);
  viewedMonth.setMonth(viewedMonth.getMonth() + monthOffset);
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();

  useEffect(() => {
    const controller = new AbortController();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    setIsPending(true);
    setError(null);
    setSelectedDate(null);
    fetchPublicClinicSchedule({
      start_date: toDateString(start),
      end_date: toDateString(end),
      signal: controller.signal,
    })
      .then((rows) => setSchedule(rows))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setIsPending(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);

  const byDate = schedule.reduce((acc, row) => {
    (acc[row.appointment_date] ??= []).push(row);
    return acc;
  }, {});

  const todayStr = toDateString(new Date());
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedRows = selectedDate ? byDate[selectedDate] ?? [] : [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
          disabled={monthOffset === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-bold text-zinc-900 dark:text-white">
          {viewedMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isPending ? (
        <div className="h-64 flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          Loading calendar...
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-sm text-rose-500 dark:text-rose-400">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-1"
              >
                {label}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`blank-${i}`} />;
              const dateStr = toDateString(new Date(year, month, day));
              const isPast = dateStr < todayStr;
              const count = byDate[dateStr]?.length ?? 0;
              const level = busyLevel(count);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                    isPast
                      ? "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-default"
                      : isSelected
                        ? "border-green-500 bg-green-500/10 text-zinc-900 dark:text-white cursor-pointer"
                        : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-100 hover:border-green-500 hover:bg-green-500/5 cursor-pointer"
                  }`}
                >
                  <span className="font-semibold">{day}</span>
                  {!isPast && (
                    <span className={`w-1.5 h-1.5 rounded-full ${level.dot}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-5 text-xs text-zinc-500 dark:text-zinc-400">
            {["Open", "Some bookings", "Busy"].map((label) => {
              const level = busyLevel(label === "Open" ? 0 : label === "Busy" ? 99 : 1);
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${level.dot}`} />
                  {label}
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedDate && (
            <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0e1121] p-4">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white mb-2">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                  "en-US",
                  { weekday: "long", month: "long", day: "numeric" },
                )}
              </h4>
              {selectedRows.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  No appointments booked yet — wide open.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {selectedRows
                    .slice()
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((row, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <span>
                          {new Date(row.start_time.replace(" ", "T")).toLocaleTimeString(
                            "en-US",
                            { hour: "numeric", minute: "2-digit" },
                          )}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {row.service_name}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              <Button
                size="sm"
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                asChild
              >
                <Link to="/login">Sign in to book this day</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// The clinic's live service catalog (managed in Maintenance), grouped by
// category — so the landing page never shows a stale or hardcoded price.
function ServicesList() {
  const [services, setServices] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchPublicServices({ signal: controller.signal })
      .then(setServices)
      .catch((err) => {
        if (err.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, []);

  if (failed) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Couldn't load our services right now — please try again later.
      </p>
    );
  }
  if (!services) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Loading services...
      </p>
    );
  }

  // Already in category order (Grooming, Consultation, Operation).
  const byCategory = [...new Set(services.map((s) => s.category_name))].map(
    (name) => [name, services.filter((s) => s.category_name === name)],
  );

  return (
    <div className="space-y-10">
      {byCategory.map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((s) => (
              <div
                key={s.appointment_services_id}
                className="flex flex-col gap-2 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#0e1121]"
              >
                <h4 className="font-semibold text-zinc-900 dark:text-white">
                  {s.appointment_services}
                </h4>
                {s.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                    {s.description}
                  </p>
                )}
                <div className="mt-auto pt-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                    <Clock className="h-4 w-4" />
                    {s.duration_minutes} min
                  </span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    {s.grooming_tiers
                      ? (tierPriceRange(s.grooming_tiers) ?? "Price at clinic")
                      : s.service_price != null
                        ? `₱${Number(s.service_price).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "Price at clinic"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <Card className="bg-zinc-50 dark:bg-[#0e1121] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white">
      <CardContent className="pt-6 flex flex-col gap-2">
        <div className="p-2 w-10 h-10 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mb-2">
          {icon}
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function AnnouncementCard({
  img,
  badge,
  borderColor,
  badgeColor,
  title,
  description,
  onOpenImage,
}) {
  return (
    <Card
      className={`bg-zinc-50 dark:bg-[#0e1121] overflow-hidden flex flex-col shadow-sm border-x-0 border-b-0 border-t-4 ${borderColor} border-zinc-200 dark:border-zinc-800`}
    >
      <div
        className="aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 relative group cursor-zoom-in"
        onClick={() => onOpenImage({ src: img, alt: title })}
      >
        <img
          src={img}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
          <Maximize2 className="h-4 w-4" /> View Full Image
        </div>
      </div>
      <CardContent className="pt-4 flex-1 flex flex-col">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${badgeColor} block mb-1`}
        >
          {badge}
        </span>
        <h3 className="font-bold text-base mb-1 text-zinc-900 dark:text-white">
          {title}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function TestimonialCard({ img, quote, author }) {
  return (
    <Card className="bg-zinc-50 dark:bg-[#0e1121] border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col justify-between text-zinc-900 dark:text-white">
      <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 w-full overflow-hidden">
        <img src={img} alt={author} className="w-full h-full object-cover" />
      </div>
      <CardContent className="pt-4 flex flex-col gap-2">
        <div className="flex text-amber-400 gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
          "{quote}"
        </p>
        <span className="text-xs font-bold mt-2 block text-zinc-900 dark:text-white">
          {author}
        </span>
      </CardContent>
    </Card>
  );
}

export async function loader() {
  const user = await getCurrentUser();

  if (user) {
    const { modules } = await fetchNavbar({});
    throw redirect(resolveLandingPath(modules));
  }

  return null;
}
