
"use client";

import { useState } from "react";

import { supabase } from "../../lib/supabase";

import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Sign-up submitted! Check your email for a confirmation link if required."
      );
    }

    setLoading(false);
  }

async function signIn() {
  setLoading(true);
  setMessage("");

  try {
    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setMessage(signInError.message);
      return;
    }

    if (!authData.user) {
      setMessage("Could not verify your account.");
      return;
    }

    // Check whether the user belongs to a household
    const { data: membership, error: memberError } =
      await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

    if (memberError) {
      setMessage(memberError.message);
      return;
    }

    if (membership) {
      // Existing member: open fridge dashboard
      router.replace("/");
    } else {
      // New user: create or join a household
      router.replace("/household");
    }
  } catch {
    setMessage("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 p-6 text-gray-900">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-3xl font-bold text-green-800">
          🥬 FridgePal
        </h1>

        <p className="mb-6 text-center text-gray-600">
          Sign in to manage your household fridge.
        </p>

        <input
          type="email"
          placeholder="Email address"
          className="mb-3 w-full rounded border p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-4 w-full rounded border p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signIn}
          disabled={loading}
          className="mb-3 w-full rounded bg-green-700 p-3 text-white disabled:opacity-50"
        >
          Sign In
        </button>

        <button
          onClick={signUp}
          disabled={loading}
          className="w-full rounded border border-green-700 p-3 text-green-700 disabled:opacity-50"
        >
          Create Account
        </button>

        {message && (
          <p className="mt-4 text-center text-sm">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
