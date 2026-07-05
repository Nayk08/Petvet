import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  redirect,
  Form,
  useActionData,
} from "react-router-dom";

export default function AuthForm() {
  const [searchParams] = useSearchParams();
  const actionData = useActionData();
  const isLogin = searchParams.get("mode") !== "register";

  return (
    <Card className="w-full max-w-md bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md shadow-2xl">
      <CardHeader className="space-y-2 text-center pb-4">
        <div className="flex justify-center mb-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            🔑
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
          {isLogin ? "Sign In" : "Create an Account"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Using React Router's <Form> so this actually triggers the route's action() */}
        <Form method="post" className="space-y-4">
          {/* Registration Fields (Side-by-side grid layout) */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="firstName"
                  className="text-xs font-medium text-zinc-400"
                >
                  First Name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="lastName"
                  className="text-xs font-medium text-zinc-400"
                >
                  Last Name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-zinc-950"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium text-zinc-400"
            >
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-zinc-950"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-medium text-zinc-400"
              >
                Password
              </label>
              {isLogin && (
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-zinc-950"
            />
          </div>

          {/* Confirm Password Field */}
          {!isLogin && (
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-medium text-zinc-400"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-zinc-950"
              />
            </div>
          )}

          {/* Submit Action */}
          <Button
            type="submit"
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 h-10 transition-colors"
          >
            {isLogin ? "Log In" : "Create Account"}
          </Button>

          {actionData?.error || actionData?.message ? (
            <p className="text-sm text-rose-400 text-center">
              {actionData.error || actionData.message}
            </p>
          ) : null}
        </Form>
      </CardContent>

      {/* Dynamic Footer Context */}
      <CardFooter className="justify-center border-t border-zinc-800/60 pt-4 pb-6">
        <p className="text-sm text-zinc-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link
            to={`?mode=${isLogin ? "register" : "login"}`}
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

// Ensures that visiting the route with no "mode" param (e.g. plain /login)
// redirects to ?mode=login so the login form renders by default, and the
// address bar reflects the actual mode (matches ?mode=register elsewhere).
export async function loader({ request }) {
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
    const csrfRes = await fetch("http://localhost:3000/api/csrf-token", {
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
    const response = await fetch("http://localhost:3000/api/auth/" + mode, {
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

    return redirect("/");
  } catch (err) {
    // Network errors, JSON parse errors, etc.
    throw new Response(
      JSON.stringify({ message: err.message || "Unexpected error occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
