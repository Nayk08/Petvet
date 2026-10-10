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
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { queryClient, fetchNavbar, safeRedirectPath } from "@/api/http";
import { resolveLandingPath } from "@/utils/resolveLandingPath.js";
import {
  loginWithGoogle,
  registerWithGoogle,
  verifyClientOtp,
  resendClientOtp,
  fetchMyProfile,
} from "@/api/clientPortal.js";

const baseUrl = import.meta.env.VITE_API_BASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Staff sign in with email/password (accounts are created by an admin in
// Users Management). Clients sign in with Google below; a first-time client
// adds a mobile number and is saved to Client Records (see
// ClientPortal_Service.js:registerWithGoogle).
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
      const result = await loginWithGoogle(credentialResponse.credential);
      if (result.needs_registration) {
        setRegistration({
          registration_token: result.registration_token,
          email: result.profile.email,
          client_name: result.profile.name,
          contact_no: "",
        });
        return;
      }
      // Known client: a sign-in code was emailed — ask for it next.
      setOtp({ otp_token: result.otp_token, email: result.email, code: "" });
    } catch (err) {
      setGoogleError(err.message || "Sign-in failed. Please try again.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  // Set when Google sign-in finds no client record — shows the
  // "complete registration" step instead of the sign-in form.
  const [registration, setRegistration] = useState(null);

  async function handleRegister(e) {
    e.preventDefault();
    setGoogleError(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await registerWithGoogle(registration);
      setRegistration(null);
      setOtp({ otp_token: result.otp_token, email: result.email, code: "" });
    } catch (err) {
      setGoogleError(err.message);
      // An expired token can't be retried — back to the Google button.
      if (err.code === 401) setRegistration(null);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  // Set after Google (and registration): the emailed 6-digit sign-in code
  // must be entered before the portal opens.
  const [otp, setOtp] = useState(null); // { otp_token, email, code }
  const [otpNotice, setOtpNotice] = useState(null);

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setGoogleError(null);
    setIsGoogleSubmitting(true);
    try {
      await verifyClientOtp(otp);
      navigate("/portal");
    } catch (err) {
      setGoogleError(err.message);
      // Expired: the only way forward is signing in with Google again.
      if (err.code === 401) setOtp(null);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setGoogleError(null);
    setOtpNotice(null);
    try {
      const result = await resendClientOtp(otp.otp_token);
      setOtp({ otp_token: result.otp_token, email: result.email, code: "" });
      setOtpNotice(`We sent a new code to ${result.email}.`);
    } catch (err) {
      setGoogleError(err.message);
      if (err.code === 401) setOtp(null);
    }
  }

  if (otp) {
    return (
      <Card className="w-full border-0 shadow-none bg-transparent dark:bg-transparent py-0 gap-0">
        <CardHeader className="space-y-1.5 text-center pt-8 pb-4">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Check your email
          </CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[300px] mx-auto">
            We sent a 6-digit sign-in code to <strong>{otp.email}</strong>. It
            expires in 10 minutes.
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="otp_code" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Sign-in code
              </label>
              <Input
                id="otp_code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={6}
                pattern="\d{6}"
                title="Enter the 6-digit code from your email"
                placeholder="000000"
                value={otp.code}
                onChange={(e) =>
                  setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))
                }
                className="text-center text-2xl tracking-[0.5em] font-semibold h-12 bg-zinc-50/50 dark:bg-zinc-950/50 focus-visible:ring-emerald-500"
              />
            </div>

            {otpNotice && !googleError && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{otpNotice}</p>
            )}
            {googleError && (
              <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="font-medium leading-tight">{googleError}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isGoogleSubmitting || otp.code.length !== 6}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-10 disabled:opacity-60"
            >
              {isGoogleSubmitting ? "Verifying..." : "Verify & Sign In"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline bg-transparent border-none cursor-pointer"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtp(null);
                  setOtpNotice(null);
                  setGoogleError(null);
                }}
                className="text-zinc-500 hover:underline bg-transparent border-none cursor-pointer"
              >
                Use a different account
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (registration) {
    return (
      <Card className="w-full border-0 shadow-none bg-transparent dark:bg-transparent py-0 gap-0">
        <CardHeader className="space-y-1.5 text-center pt-8 pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Complete Registration
          </CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[300px] mx-auto">
            Welcome to PetVet! Add your mobile number so the clinic can reach
            you about your appointments.
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Email (from Google)
              </label>
              <Input value={registration.email} disabled className="bg-zinc-100 dark:bg-zinc-950/50" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reg_name" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Full Name
              </label>
              <Input
                id="reg_name"
                required
                maxLength={100}
                value={registration.client_name}
                onChange={(e) => setRegistration((r) => ({ ...r, client_name: e.target.value }))}
                className="bg-zinc-50/50 dark:bg-zinc-950/50 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reg_mobile" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Mobile Number
              </label>
              <Input
                id="reg_mobile"
                type="tel"
                inputMode="tel"
                required
                placeholder="09XXXXXXXXX"
                pattern="(\+63[\s\-]?9\d{2}[\s\-]?\d{3}[\s\-]?\d{4}|09\d{9})"
                title="Use 09XXXXXXXXX or +63 9XX XXX XXXX"
                value={registration.contact_no}
                onChange={(e) => setRegistration((r) => ({ ...r, contact_no: e.target.value }))}
                className="bg-zinc-50/50 dark:bg-zinc-950/50 focus-visible:ring-emerald-500"
              />
            </div>

            {googleError && (
              <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="font-medium leading-tight">{googleError}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isGoogleSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-10 disabled:opacity-60"
            >
              {isGoogleSubmitting ? "Creating your account..." : "Register & Continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRegistration(null);
                setGoogleError(null);
              }}
              className="w-full text-zinc-500"
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-0 shadow-none bg-transparent dark:bg-transparent py-0 gap-0">

      <CardHeader className="space-y-1.5 px-0 pt-0 pb-6">
        <CardTitle className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Login
        </CardTitle>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Please sign in with your credentials.
        </p>
      </CardHeader>

      <CardContent className="px-0">
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
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                className="h-12 rounded-xl pl-11 bg-white dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-emerald-500 transition-all duration-200"
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
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                className="h-12 rounded-xl pl-11 pr-11 bg-white dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-emerald-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-transparent border-none cursor-pointer transition-colors"
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
            className="w-full mt-2 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? "Signing in..." : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </Form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Client? Continue with Google
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
          New client? Continue with Google to register.
        </p>
      </CardContent>

      {/* Footer */}
      <CardFooter className="justify-center px-0 pt-5 pb-0">
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
