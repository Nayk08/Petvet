import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/api/auth";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Link,
  useSearchParams,
  Form,
  useActionData,
  redirect,
} from "react-router-dom";
import {
  AlertCircle,
  Lock,
  Mail,
  User,
  ShieldCheck,
  HeartPulse,
} from "lucide-react";
import { queryClient } from "@/api/http";
const baseUrl = import.meta.env.VITE_API_BASE_URL;
export default function AuthForm() {
  const [searchParams] = useSearchParams();
  const actionData = useActionData();
  const isLogin = searchParams.get("mode") !== "register";

  return (
    <Card className="w-full max-w-md bg-zinc-900/40 border-zinc-800/80 backdrop-blur-xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden transition-all duration-300">
      {/* Brand Top Accent Line (PetVet Green) */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-80" />

      <CardHeader className="space-y-1.5 text-center pt-8 pb-4">
        <div className="flex justify-center mb-2">
          {/* Hexagonal/Square Icon Container matched to Clinic palette */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-500 border border-green-500/20 flex items-center justify-center shadow-inner ring-4 ring-green-500/[0.02]">
            {isLogin ? (
              <HeartPulse className="h-5 w-5 text-green-500" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-amber-500" />
            )}
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-b from-zinc-50 to-zinc-300 bg-clip-text text-transparent">
          {isLogin ? "PetVet Portal Sign In" : "Create PetVet Account"}
        </CardTitle>
        <p className="text-xs text-zinc-400 max-w-[280px] mx-auto">
          {isLogin
            ? "Access your digital medical files, updates, and upcoming grooming slots."
            : "Register to skip long clinic queues and check live stock updates."}
        </p>
      </CardHeader>

      <CardContent className="pt-2">
        <Form method="post" className="space-y-4">
          {/* Side-by-Side Registration Layout */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in-50 slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <label
                  htmlFor="firstName"
                  className="text-xs font-semibold text-zinc-400 tracking-wide"
                >
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    className="pl-9 bg-zinc-950/50 border-zinc-800/60 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-green-500 focus-visible:ring-offset-zinc-950 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="lastName"
                  className="text-xs font-semibold text-zinc-400 tracking-wide"
                >
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    className="pl-9 bg-zinc-950/50 border-zinc-800/60 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-green-500 focus-visible:ring-offset-zinc-950 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-zinc-400 tracking-wide"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                className="pl-9 bg-zinc-950/50 border-zinc-800/60 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-green-500 focus-visible:ring-offset-zinc-950 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-zinc-400 tracking-wide"
              >
                Password
              </label>
              {isLogin && (
                <Link
                  to="/forgot-password"
                  className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="pl-9 bg-zinc-950/50 border-zinc-800/60 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-green-500 focus-visible:ring-offset-zinc-950 transition-all duration-200"
              />
            </div>
          </div>

          {/* Confirm Password (Registration Only) */}
          {!isLogin && (
            <div className="space-y-1.5 animate-in fade-in-50 slide-in-from-top-2 duration-200">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-semibold text-zinc-400 tracking-wide"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-zinc-950/50 border-zinc-800/60 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-green-500 focus-visible:ring-offset-zinc-950 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {(actionData?.error || actionData?.message) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-in shake-1 duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-medium leading-tight">
                {actionData.error || actionData.message}
              </p>
            </div>
          )}

          {/* Submit Button matched to Landing Page Call to Action */}
          <Button
            type="submit"
            className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white font-medium shadow-lg shadow-green-600/10 h-10 transition-all duration-200 active:scale-[0.99]"
          >
            {isLogin ? "Sign In" : "Register Account"}
          </Button>
        </Form>
      </CardContent>

      {/* Footer Nav Links */}
      <CardFooter className="justify-center border-t border-zinc-800/50 pt-4 pb-6 bg-zinc-950/20">
        <p className="text-sm text-zinc-500">
          {isLogin ? "New to PetVet? " : "Already registered? "}
          <Link
            to={`?mode=${isLogin ? "register" : "login"}`}
            className="font-semibold text-green-400 hover:text-green-300 transition-colors underline-offset-4 hover:underline"
          >
            {isLogin ? "Create Account" : "Sign In Here"}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
export async function loader({ request }) {
  const user = await getCurrentUser();
  if (user) {
    throw redirect("/dashboard");
  }

  const url = new URL(request.url);
  if (!url.searchParams.has("mode")) {
    url.searchParams.set("mode", "login");
    return redirect(url.pathname + url.search);
  }
  return null;
}

export async function action({ request }) {
  const searchParams = new URL(request.url).searchParams;
  const data = await request.formData();

  const mode = searchParams.get("mode") === "register" ? "register" : "login";

  const authData = {
    email: data.get("email"),
    password: data.get("password"),
  };

  if (mode === "register") {
    authData.firstName = data.get("firstName");
    authData.lastName = data.get("lastName");
    authData.confirmPassword = data.get("confirmPassword");
  }

  try {
    // 1. Get a CSRF token first. Your backend's doubleCsrfProtection
    //    middleware needs a matching cookie + header token pair.
    //    This assumes you expose a GET route (e.g. /api/csrf-token)
    //    that calls generateCsrfToken() and returns { csrfToken } while
    //    also setting the csrf cookie via Set-Cookie.
    const csrfRes = await fetch(`${baseUrl}/csrf-token`, {
      method: "GET",
      credentials: "include", // required to receive/send the httpOnly csrf cookie
    });

    if (!csrfRes.ok) {
      throw new Response(
        JSON.stringify({ message: "Could not fetch CSRF token." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const { csrfToken } = await csrfRes.json();

    // 2. Now make the actual auth request, awaited, with the token attached
    //    and credentials included so the csrf cookie travels with it.
    const response = await fetch(`${baseUrl}/auth/` + mode, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify(authData),
    });

    if (response.status === 422 || response.status === 401) {
      // Let the caller (e.g. useActionData) read the validation/auth error
      return response;
    }

    if (!response.ok) {
      throw new Response(
        JSON.stringify({ message: "Could not authenticate user." }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    queryClient.clear();
    return redirect("/dashboard");
  } catch (err) {
    // Network errors, JSON parse errors, etc.
    throw new Response(
      JSON.stringify({ message: err.message || "Unexpected error occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
