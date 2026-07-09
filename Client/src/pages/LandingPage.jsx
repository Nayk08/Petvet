import { useState } from "react";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import PetVetLogo from "./../assets/petvet_icon.svg";

import petvetA1 from "../assets/petVet/petvet-img.jpg";
import petvetA2 from "../assets/petVet/petvet-img2.jpg";
import petvetA3 from "../assets/petVet/petvet-img3.jpg";
import petvetA4 from "../assets/petVet/petvet-img4.jpg";
import petvetC1 from "../assets/petVet/petvet-customer1.jpg";
import petvetC2 from "../assets/petVet/petvet-customer2.jpg";
import petvetC3 from "../assets/petVet/petvet-customer3.jpg";
import petvetC4 from "../assets/petVet/petvet-customer4.jpg";

export default function LandingPage() {
  // Lightbox State for full-size announcement image viewing
  const [activeImage, setActiveImage] = useState(null);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-red-500 text-xl">
            <img src={PetVetLogo} alt="PetVet Logo" className="h-6 w-6" />
            Pet<span className="text-green-500">Vet</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <a href="#home" className="hover:text-primary transition-colors">
              Home
            </a>
            <a href="#about" className="hover:text-primary transition-colors">
              About Us
            </a>
            <a
              href="#services"
              className="hover:text-primary transition-colors"
            >
              Services & Hours
            </a>
            <a
              href="#announcements"
              className="hover:text-primary transition-colors"
            >
              Announcements
            </a>
            <a
              href="#testimonials"
              className="hover:text-primary transition-colors"
            >
              Testimonials
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
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
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Streamlined Care for Your Best Friends at{" "}
            <span className="bg-gradient-to-r lg:bg-clip-text lg:text-transparent lg:from-green-500 lg:to-emerald-600">
              PetVet Center
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Serving Commonwealth, QC since 2007. No more long wait times, missed
            reminders, or missing record folders. Book grooming or check updates
            seamlessly online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
            <Button
              size="lg"
              className="h-12 px-6 text-base gap-2 bg-green-600 hover:bg-green-700"
              asChild
            >
              <Link to="/register">
                Book An Appointment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              asChild
            >
              <a href="#services">View Clinic Hours</a>
            </Button>
          </div>
        </section>

        <hr className="border-t" />

        {/* About Us / Core System Modules */}
        <section
          id="about"
          className="container px-4 md:px-6 py-20 bg-slate-50/50 dark:bg-zinc-900/20"
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Your Complete Pet Care Platform
            </h2>
            <p className="text-muted-foreground">
              We have completely modernized our legacy operations to replace
              manual notebooks, messy spreadsheets, and paper records with a
              centralized digital workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Module 1: Scheduling */}
            <Card className="bg-background">
              <CardContent className="pt-6 flex flex-col gap-2">
                <div className="p-2 w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center mb-2">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg">Smart Scheduling</h3>
                <p className="text-muted-foreground text-sm">
                  Real-time slot choices for grooming and surgeries. Eliminates
                  double bookings and fires off automated reminders to end
                  costly no-shows.
                </p>
              </CardContent>
            </Card>

            {/* Module 2: Billing */}
            <Card className="bg-background">
              <CardContent className="pt-6 flex flex-col gap-2">
                <div className="p-2 w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center mb-2">
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg">Automated Billing</h3>
                <p className="text-muted-foreground text-sm">
                  Instant calculation of service fees, pet food, and medical
                  essentials. Eliminates notebook tallies for clear financial
                  records.
                </p>
              </CardContent>
            </Card>

            {/* Module 3: Inventory */}
            <Card className="bg-background">
              <CardContent className="pt-6 flex flex-col gap-2">
                <div className="p-2 w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center mb-2">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg">Live Stock Monitoring</h3>
                <p className="text-muted-foreground text-sm">
                  Tracks quick-moving goods like vitamins and grooming items
                  dynamically. Auto-triggers warning alerts before critical item
                  stock runs out.
                </p>
              </CardContent>
            </Card>

            {/* Module 4: Records */}
            <Card className="bg-background">
              <CardContent className="pt-6 flex flex-col gap-2">
                <div className="p-2 w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center mb-2">
                  <FolderHeart className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg">
                  Centralized Health Profiles
                </h3>
                <p className="text-muted-foreground text-sm">
                  Instant access to medical files, immunization dates, and pet
                  allergies. Replaces physical folders for reliable patient care
                  tracking.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <hr className="border-t" />

        {/* Operational Guidelines & Rules Section */}
        <section
          id="services"
          className="container px-4 md:px-6 py-20 max-w-5xl mx-auto"
        >
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Clinic Policies & Hours
            </h2>
            <p className="text-muted-foreground mt-2">
              Please plan your visits accordingly based on our operational
              guidelines below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4 p-4 border rounded-xl bg-background">
              <Clock className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <h4 className="font-bold mb-1">Operating Window</h4>
                <p className="text-sm text-muted-foreground">
                  Open daily from 9:00 AM to 6:00 PM.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  * Daily consultation cutoff is strictly at 5:00 PM.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border rounded-xl bg-background">
              <CalendarRange className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <h4 className="font-bold mb-1">Service Limitations</h4>
                <p className="text-sm text-muted-foreground">
                  Grooming is unavailable on <strong>Sundays</strong>.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Veterinarians do not hold clinic hours on{" "}
                  <strong>Wednesdays</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 border rounded-xl bg-background">
              <MapPin className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <h4 className="font-bold mb-1">Consultation Rules</h4>
                <p className="text-sm text-muted-foreground">
                  Medical examinations run on a strict{" "}
                  <strong>First Come, First Served</strong> arrangement.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t" />

        {/* Dynamic Announcements Bulletin Section with Interactive Lightbox Images */}
        <section
          id="announcements"
          className="container px-4 md:px-6 py-20 max-w-6xl mx-auto"
        >
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
            <div className="p-2 rounded-full bg-green-500/10 text-green-600 mb-3">
              <Megaphone className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Clinic Bulletin & Announcements
            </h2>
            <p className="text-muted-foreground mt-2">
              Stay up to date with direct announcements, schedule adjustments,
              and stock updates. Click any image below to view it full size.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Announcement 1: petvetA1 */}
            <Card className="bg-background overflow-hidden flex flex-col shadow-sm border-t-4 border-t-amber-500">
              <div
                className="aspect-[16/10] w-full overflow-hidden bg-muted relative group cursor-zoom-in"
                onClick={() =>
                  setActiveImage({
                    src: petvetA1,
                    alt: "Weekend Traffic Volumes Notice",
                  })
                }
              >
                <img
                  src={petvetA1}
                  alt="Clinic Traffic"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                  <Maximize2 className="h-4 w-4" /> View Full Image
                </div>
              </div>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                  Traffic Notice
                </span>
                <h3 className="font-bold text-base mb-1">Weekend Volumes</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  We are experiencing heavy client volumes (30 to 40 daily pets)
                  during weekend afternoons. Please utilize your client
                  dashboard to reserve slots ahead.
                </p>
              </CardContent>
            </Card>

            {/* Announcement 2: petvetA2 */}
            <Card className="bg-background overflow-hidden flex flex-col shadow-sm border-t-4 border-t-red-500">
              <div
                className="aspect-[16/10] w-full overflow-hidden bg-muted relative group cursor-zoom-in"
                onClick={() =>
                  setActiveImage({
                    src: petvetA2,
                    alt: "Wednesday Veterinary Schedule Adjustment",
                  })
                }
              >
                <img
                  src={petvetA2}
                  alt="Veterinary Diagnostics"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                  <Maximize2 className="h-4 w-4" /> View Full Image
                </div>
              </div>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block mb-1">
                  Medical Operations
                </span>
                <h3 className="font-bold text-base mb-1">Wednesday Vets Off</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Reminder: Our veterinarians do not hold standard clinic hours
                  on Wednesdays. Emergency treatments must be requested
                  explicitly via our primary portal.
                </p>
              </CardContent>
            </Card>

            {/* Announcement 3: petvetA3 */}
            <Card className="bg-background overflow-hidden flex flex-col shadow-sm border-t-4 border-t-green-500">
              <div
                className="aspect-[16/10] w-full overflow-hidden bg-muted relative group cursor-zoom-in"
                onClick={() =>
                  setActiveImage({
                    src: petvetA3,
                    alt: "Sunday Grooming Policy",
                  })
                }
              >
                <img
                  src={petvetA3}
                  alt="Pet Grooming"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                  <Maximize2 className="h-4 w-4" /> View Full Image
                </div>
              </div>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 block mb-1">
                  Grooming Update
                </span>
                <h3 className="font-bold text-base mb-1">
                  Sunday Grooming Close
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Grooming service bays are fully closed on Sundays. Each
                  groomer caps daily volume between 5 to 10 pets maximum from
                  Mon-Sat.
                </p>
              </CardContent>
            </Card>

            {/* Announcement 4: petvetA4 */}
            <Card className="bg-background overflow-hidden flex flex-col shadow-sm border-t-4 border-t-blue-500">
              <div
                className="aspect-[16/10] w-full overflow-hidden bg-muted relative group cursor-zoom-in"
                onClick={() =>
                  setActiveImage({
                    src: petvetA4,
                    alt: "Premium Pet Essentials Supply Update",
                  })
                }
              >
                <img
                  src={petvetA4}
                  alt="Pet Supplies Shop"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                  <Maximize2 className="h-4 w-4" /> View Full Image
                </div>
              </div>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                  Inventory Restock
                </span>
                <h3 className="font-bold text-base mb-1">
                  Supplies & Vitamins
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Fast-selling pet foods, shampoos, and vital medications are
                  fully restocked. Our live tracking module ensures clean
                  expiration date oversight.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Email Update Bar */}
          <div className="mt-12 max-w-xl mx-auto bg-muted rounded-2xl p-6 border text-center flex flex-col items-center gap-4">
            <div>
              <h4 className="font-bold text-base">
                Want live bulletins on your phone?
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Get immediate emails regarding holiday schedule alerts and
                emergency updates.
              </p>
            </div>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                type="email"
                placeholder="Your email address"
                className="h-10 bg-background"
              />
              <Button
                type="submit"
                className="h-10 bg-green-600 hover:bg-green-700 text-white shrink-0"
              >
                Subscribe
              </Button>
            </div>
          </div>
        </section>

        <hr className="border-t" />

        {/* Happy Customers & Patients Testimonial Section */}
        <section
          id="testimonials"
          className="container px-4 md:px-6 py-20 bg-slate-50/50 dark:bg-zinc-900/10"
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Loved by Pets, Trusted by Owners
            </h2>
            <p className="text-muted-foreground">
              See some of our regular clinic companions and happy pet parents
              from the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Customer 1 */}
            <Card className="bg-background overflow-hidden flex flex-col justify-between">
              <div className="aspect-[4/3] bg-muted w-full overflow-hidden">
                <img
                  src={petvetC1}
                  alt="Happy patient"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-4 flex flex-col gap-2">
                <div className="flex text-amber-500 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  "Scheduling a grooming session online saved me hours of
                  waiting on the weekend. Spot looks beautiful!"
                </p>
                <span className="text-xs font-bold mt-2 block">
                  — Maria & Spot
                </span>
              </CardContent>
            </Card>

            {/* Customer 2 */}
            <Card className="bg-background overflow-hidden flex flex-col justify-between">
              <div className="aspect-[4/3] bg-muted w-full overflow-hidden">
                <img
                  src={petvetC2}
                  alt="Happy companion"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-4 flex flex-col gap-2">
                <div className="flex text-amber-500 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  "I love knowing his vaccination logs are online. It makes
                  routine follow-ups totally stress-free."
                </p>
                <span className="text-xs font-bold mt-2 block">
                  — Jay & Milo
                </span>
              </CardContent>
            </Card>

            {/* Customer 3 */}
            <Card className="bg-background overflow-hidden flex flex-col justify-between">
              <div className="aspect-[4/3] bg-muted w-full overflow-hidden">
                <img
                  src={petvetC3}
                  alt="Groomed pet"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-4 flex flex-col gap-2">
                <div className="flex text-amber-500 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  "No more missing out on vitamins. The inventory system keeps
                  my cat's favorite food always ready."
                </p>
                <span className="text-xs font-bold mt-2 block">
                  — Chloe & Luna
                </span>
              </CardContent>
            </Card>

            {/* Customer 4 */}
            <Card className="bg-background overflow-hidden flex flex-col justify-between">
              <div className="aspect-[4/3] bg-muted w-full overflow-hidden">
                <img
                  src={petvetC4}
                  alt="Healthy cat"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-4 flex flex-col gap-2">
                <div className="flex text-amber-500 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  "The transparency with billing and instant digital receipts
                  keeps our vet budgets perfectly tracked."
                </p>
                <span className="text-xs font-bold mt-2 block">
                  — David & Coco
                </span>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Full-Size Overlay Lightbox Modal */}
      {activeImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveImage(null)}
        >
          <button
            className="absolute top-4 right-4 bg-zinc-900/80 text-white rounded-full p-2.5 hover:bg-zinc-800 transition-colors border border-white/10"
            onClick={() => setActiveImage(null)}
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-lg shadow-2xl border border-white/5 bg-zinc-900"
            onClick={(e) => e.stopPropagation()} // Prevents closing overlay when clicking inside image container
          >
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="w-full h-auto max-h-[85vh] object-contain object-center"
            />
          </div>
          <p className="text-zinc-400 text-xs mt-3 bg-zinc-900/50 py-1 px-3 rounded-full backdrop-blur">
            {activeImage.alt} — Click anywhere outside to close
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container flex flex-col gap-4 sm:flex-row py-8 w-full shrink-0 items-center justify-between px-4 md:px-6 text-sm text-muted-foreground">
          <p>
            © 2026 PetVet Cycle Animal and Grooming Center. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
