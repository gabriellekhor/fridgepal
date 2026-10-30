
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function JoinHouseholdPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        router.replace("/login");
      } else {
        setCheckingAuth(false);
      }
    }

    void checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  async function joinHousehold() {
    if (!code.trim() || loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error: joinError } = await supabase.rpc(
        "join_household",
        { p_code: code.trim() }
      );

      if (joinError) {
        setError(joinError.message);
        return;
      }

      setMessage("Successfully joined your household!");
      router.replace("/kitchen");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-green-50 text-gray-700">
        Checking your login...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 p-6 text-gray-900">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-3xl font-bold text-green-800">
          🥬 Join a Household
        </h1>

        <p className="mb-6 text-center text-gray-600">
          Enter the invitation code shared by your family.
        </p>

        <label
          htmlFor="invite-code"
          className="mb-2 block text-sm font-medium"
        >
          Invitation Code
        </label>

        <input
          id="invite-code"
          type="text"
          placeholder="Paste your invitation code"
          className="mb-4 w-full rounded border p-3 font-mono"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />

        <button
          onClick={joinHousehold}
          disabled={loading || !code.trim()}
          className="w-full rounded bg-green-700 p-3 text-white disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join Household"}
        </button>

        {error && (
          <p className="mt-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded bg-green-100 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full text-center text-sm text-green-700 underline"
        >
          Back to Dashboard
        </button>
      </div>
    </main>
  );
}
