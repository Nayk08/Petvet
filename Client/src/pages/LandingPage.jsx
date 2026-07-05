import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, Rocket, Shield, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Rocket className="h-6 w-6 text-primary" />
            <span>SaaSify</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <a
              href="#features"
              className="hover:text-primary transition-colors"
            >
              Features
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#contact" className="hover:text-primary transition-colors">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container px-4 md:px-6 py-24 md:py-32 flex flex-col items-center text-center gap-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-muted text-muted-foreground border">
            ✨ Introducing our newest feature.{" "}
            <a
              href="#"
              className="ml-1 font-semibold text-primary underline-offset-4 hover:underline"
            >
              Learn more &rarr;
            </a>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Build your SaaS app{" "}
            <span className="bg-gradient-to-r lg:bg-clip-text lg:text-transparent lg:from-primary lg:to-indigo-500">
              at lightning speed
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            The ultimate landing page template built with Next.js, Tailwind CSS,
            and shadcn/ui. Beautifully designed, accessible, and ready to
            deploy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
            <Button size="lg" className="h-12 px-6 text-base gap-2">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base">
              Book a Demo
            </Button>
          </div>
        </section>

        <hr className="border-t" />

        {/* Features Section */}
        <section
          id="features"
          className="container px-4 md:px-6 py-20 bg-slate-50/50 dark:bg-zinc-900/20"
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything you need to scale
            </h2>
            <p className="text-muted-foreground">
              Stop reinventing the wheel. We handle the heavy lifting so you can
              focus on your product.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <Card className="bg-background">
              <CardContent className="pt-6 flex flex-col gap-2">
                <div className="p-2 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-xl">Blazing Fast Performance</h3>
                <p className="text-muted-foreground text-sm">
                  Optimized for speed and core web vitals to ensure your users
                  get the best experience possible.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="bg-background">
              <CardContent className="pt-6 flex flex-col gap-2">
                <div className="p-2 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-xl">Secure by Default</h3>
                <p className="text-muted-foreground text-sm">
                  Enterprise-grade security protocols built into every layer of
                  our infrastructure.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="bg-background">
              <CardContent className="pt-6 flex flex-col gap-2">
                <div className="p-2 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-xl">Accessible Components</h3>
                <p className="text-muted-foreground text-sm">
                  Fully compliant with WCAG standards out of the box using Radix
                  UI primitives.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <hr className="border-t" />

        {/* CTA / Newsletter Section */}
        <section
          id="contact"
          className="container px-4 md:px-6 py-20 max-w-4xl mx-auto text-center flex flex-col items-center gap-6"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to transform your workflow?
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Join thousands of developers and makers who are already building
            faster. No credit card required.
          </p>
          <div className="flex w-full max-w-sm items-center space-x-2 mt-4">
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-10"
            />
            <Button type="submit" className="h-10">
              Subscribe
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container flex flex-col gap-4 sm:flex-row py-8 w-full shrink-0 items-center justify-between px-4 md:px-6 text-sm text-muted-foreground">
          <p>© 2026 SaaSify Inc. All rights reserved.</p>
          <nav className="flex gap-4 sm:gap-6">
            <a href="#" className="hover:underline underline-offset-4">
              Terms of Service
            </a>
            <a href="#" className="hover:underline underline-offset-4">
              Privacy Policy
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
