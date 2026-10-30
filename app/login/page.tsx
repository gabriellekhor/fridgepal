
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data.session && data.user) {
        router.replace("/household");
      } else {
        setMessage(
          "Account created! Please check your email to confirm your account, then sign in."
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create account."
      );
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) throw signInError;

      if (!authData.user) {
        throw new Error("Could not verify your account.");
      }

      const { data: membership, error: memberError } =
        await supabase
          .from("household_members")
          .select("household_id")
          .eq("user_id", authData.user.id)
          .limit(1)
          .maybeSingle();

      if (memberError) throw memberError;

      if (membership) {
        router.replace("/kitchen");
      } else {
        router.replace("/household");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((current) =>
      current === "signin" ? "signup" : "signin"
    );
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }
  
  return (
    <main
      className="relative flex min-h-dvh items-center justify-center bg-gray-400 px-3 py-10 text-gray-900 sm:px-4 sm:py-12"
      style={{
        backgroundImage: "url('/fridge-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Subtle overlay */}
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      {/* Wrapper for paper and magnet */}
      <div className="relative z-10 w-full max-w-[310px] sm:max-w-md">

        {/* Realistic silver magnet */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-500 sm:h-11 sm:w-11"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, #FFFFFF 0%, #DDE1E2 18%, #9CA3A6 48%, #5E6669 76%, #C7CCCE 100%)",
              boxShadow:
                "2px 5px 7px rgba(0,0,0,0.4), inset 1px 2px 3px rgba(255,255,255,0.8)",
            }}
          >
            <div
              className="h-3 w-3 rounded-full border border-gray-500 sm:h-4 sm:w-4"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #C8CCCD, #525A5D)",
                boxShadow:
                  "inset 1px 2px 3px rgba(0,0,0,0.35)",
              }}
            />
          </div>
        </div>

        {/* Textured cream paper */}
        <div
          className="relative w-full border border-[#E8DCC4] px-4 pb-5 pt-9 sm:px-10 sm:pb-10 sm:pt-14"
          style={{
            backgroundColor: "#FFF9E9",
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent 0px,
                rgba(130, 105, 65, 0.045) 1px,
                transparent 2px,
                transparent 5px
              ),
              repeating-linear-gradient(
                90deg,
                transparent 0px,
                rgba(130, 105, 65, 0.035) 1px,
                transparent 2px,
                transparent 7px
              )
            `,
            clipPath:
              "polygon(0.4% 0%, 99.5% 0.3%, 100% 98.8%, 98.5% 99.5%, 70% 99.8%, 45% 99.3%, 20% 100%, 0% 99.2%)",
            boxShadow:
              "3px 5px 10px rgba(0,0,0,0.18), 0 18px 45px rgba(0,0,0,0.16)",
          }}
        >
          {/* Logo */}
          <div className="text-center">
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-green-900 sm:mb-2 sm:text-4xl">
              fridge
              <span className="text-green-700">PAL</span> 🥬
            </h1>

            <p className="text-xs text-gray-600 sm:text-sm">
              your groceries, all in one place.
            </p>
          </div>

          {/* Welcome heading */}
          <h2 className="mb-4 mt-5 text-center text-base font-semibold text-green-900 sm:mb-6 sm:mt-8 sm:text-xl">
            {mode === "signin"
              ? "Welcome back!"
              : "Let's fill your fridge!"}
          </h2>

          {/* Login / Signup Form */}
          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (mode === "signin") {
                void signIn();
              } else {
                void signUp();
              }
            }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-medium sm:mb-2 sm:text-sm"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2.5 text-base outline-none focus:border-green-700 sm:rounded-xl sm:p-3"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-xs font-medium sm:mb-2 sm:text-sm"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  autoComplete={
                    mode === "signin"
                      ? "current-password"
                      : "new-password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2.5 pr-14 text-base outline-none focus:border-green-700 sm:rounded-xl sm:p-3 sm:pr-14"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 sm:text-sm"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm Password - Signup only */}
            {mode === "signup" && (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1 block text-xs font-medium sm:mb-2 sm:text-sm"
                >
                  Confirm password
                </label>

                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2.5 text-base outline-none focus:border-green-700 sm:rounded-xl sm:p-3"
                />

                {confirmPassword &&
                  password !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">
                      Passwords do not match.
                    </p>
                  )}
              </div>
            )}

            {/* Error / Success Message */}
            {message && (
              <p
                role="status"
                className="rounded-lg bg-white/80 p-3 text-center text-xs text-green-900 sm:text-sm"
              >
                {message}
              </p>
            )}

            {/* Main Button */}
            <button
              type="submit"
              disabled={
                loading ||
                (mode === "signup" &&
                  (password.length < 8 ||
                    password !== confirmPassword))
              }
              className="w-full rounded-lg bg-green-900 px-4 py-3 text-sm font-medium text-white shadow-md transition hover:bg-green-800 disabled:opacity-50 sm:rounded-xl sm:py-4 sm:text-base"
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                ? "Open My Fridge →"
                : "Create My Account →"}
            </button>
          </form>

          {/* Switch between Sign In and Sign Up */}
          <div className="mt-4 border-t border-gray-300 pt-3 text-center sm:mt-7 sm:pt-5">
            <p className="mb-1 text-xs text-gray-600 sm:mb-2 sm:text-sm">
              {mode === "signin"
                ? "New to FridgePal?"
                : "Already have an account?"}
            </p>

            <button
              type="button"
              onClick={switchMode}
              className="text-sm font-medium text-green-900 underline underline-offset-4"
            >
              {mode === "signin"
                ? "Create an account"
                : "Sign in instead"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

