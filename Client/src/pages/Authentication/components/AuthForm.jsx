import { useState } from "react";
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
  Form,
  useActionData,
  redirect,
  useNavigation,
  useNavigate,
} from "react-router-dom";
import {
  AlertCircle,
  Lock,
  Mail,
  HeartPulse,
  Eye,
  EyeOff,
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { queryClient, fetchNavbar, safeRedirectPath } from "@/api/http";
import { resolveLandingPath } from "@/utils/resolveLandingPath.js";
import { loginWithGoogle, fetchMyProfile } from "@/api/clientPortal.js";

const baseUrl = import.meta.env.VITE_API_BASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Staff sign-in only — there is no self-registration path here. Staff
// accounts are created by an admin (Users Management); clients sign in
// with Google below, which only links an existing record a staff member
// already created (see ClientPortal_Service.js).
export default function AuthForm() {
  const actionData = useActionData();
  const { state } = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = state === "submitting";
  const [showPassword, setShowPassword] = useState(false);

  // Client (Google) sign-in is a separate flow from the staff email/password
  // Form above — it doesn't go through the router action, so it needs its
  // own error state and its own submitting flag.
  const [googleError, setGoogleError] = useState(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleGoogleSuccess(credentialResponse) {
    setGoogleError(null);
    setIsGoogleSubmitting(true);
    try {
      // The server sets the auth cookie itself (Set-Cookie on the login
      // response) — nothing for the client to store.
      await loginWithGoogle(credentialResponse.credential);
      navigate("/portal");
    } catch (err) {
      setGoogleError(
        err.message ||
          "Sign-in failed. If you're a first-time visitor, please contact the clinic to set up your record first.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Brand Top Accent Line (PetVet Green) */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />

      <CardHeader className="space-y-1.5 text-center pt-8 pb-4">
        <div className="flex justify-center mb-2">
          {/* Accent Icon Container */}
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-inner ring-4 ring-emerald-500/5">
            <HeartPulse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          PetVet Portal Sign In
        </CardTitle>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[280px] mx-auto">
          Access your digital medical files, updates, and upcoming grooming
          slots.
        </p>
      </CardHeader>

      <CardContent className="pt-2">
        <Form method="post" className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 tracking-wide"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                className="pl-9 bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-emerald-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 tracking-wide"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                className="pl-9 pr-9 bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-emerald-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-transparent border-none cursor-pointer transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message Box */}
          {(actionData?.error || actionData?.message) && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-in shake-1 duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-medium leading-tight">
                {actionData.error || actionData.message}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/10 h-10 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </Form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Client? Sign in with Google
          </span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {isGoogleSubmitting ? (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Signing in...
          </p>
        ) : GOOGLE_CLIENT_ID ? (
          <div className="flex justify-center">
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setGoogleError("Google sign-in failed. Please try again.")
                }
              />
            </GoogleOAuthProvider>
          </div>
        ) : (
          <p role="alert" className="text-center text-xs text-rose-500 dark:text-rose-400">
            Google sign-in isn't configured yet.
          </p>
        )}

        {googleError && (
          <div role="alert" className="flex items-center gap-2 p-3 mt-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium leading-tight">{googleError}</p>
          </div>
        )}

        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-3">
          New client? Visit the clinic in person first so we can set up your
          record.
        </p>
      </CardContent>

      {/* Footer */}
      <CardFooter className="justify-center border-t border-zinc-100 dark:border-zinc-800/80 pt-4 pb-6 bg-zinc-50/50 dark:bg-zinc-900/40">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Staff accounts are created by an administrator.
        </p>
      </CardFooter>
    </Card>
  );
}

export async function loader() {
  const user = await getCurrentUser();
  if (user) {
    const { modules } = await fetchNavbar({});
    throw redirect(resolveLandingPath(modules));
  }

  // Already signed in as a client? Same idea as the staff check above —
  // skip the form and go straight to the portal. The auth cookie is
  // httpOnly now, so this has to ask the server rather than check locally.
  const clientProfile = await fetchMyProfile().catch(() => null);
  if (clientProfile) {
    throw redirect("/portal");
  }

  return null;
}

export async function action({ request }) {
  const data = await request.formData();

  const authData = {
    email: data.get("email"),
    password: data.get("password"),
  };

  try {
    const csrfRes = await fetch(`${baseUrl}/csrf-token`, {
      method: "GET",
      credentials: "include",
    });

    if (!csrfRes.ok) {
      throw new Response(
        JSON.stringify({ message: "Could not fetch CSRF token." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const { csrfToken } = await csrfRes.json();

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify(authData),
    });

    if (response.status === 422 || response.status === 401) {
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
    // Back to the page that bounced them here (its own loader still checks
    // permissions), else the role's default landing page.
    const returnTo = safeRedirectPath(
      new URLSearchParams(window.location.search).get("redirect"),
    );
    if (returnTo) return redirect(returnTo);
    const { modules } = await fetchNavbar({});
    return redirect(resolveLandingPath(modules));
  } catch (err) {
    throw new Response(
      JSON.stringify({ message: err.message || "Unexpected error occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
