
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function HouseholdPage() {
  const router = useRouter();

  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHousehold() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (userError || !userData.user) {
        router.replace("/login");
        return;
      }

      const { data, error: membershipError } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userData.user.id)
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (membershipError) {
        setError(membershipError.message);
      } else if (!data) {
        setError("You haven't joined a household yet.");
      } else {
        setHouseholdId(data.household_id);
      }

      setLoading(false);
    }

    void loadHousehold();

    return () => {
      active = false;
    };
  }, [router]);

  async function generateInvite() {
    if (!householdId) return;

    setGenerating(true);
    setError("");
    setInviteCode("");

    const { data, error: inviteError } = await supabase.rpc(
      "create_household_invite",
      { p_household_id: householdId }
    );

    if (inviteError) {
      setError(inviteError.message);
    } else {
      setInviteCode(data);
    }

    setGenerating(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-green-50 p-8 text-center text-gray-700">
        Loading household...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-green-50 p-6 text-gray-900">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-3xl font-bold text-green-800">
          🥬 Household Settings
        </h1>

        <p className="mb-6 text-gray-600">
          Invite family members to share your fridge inventory.
        </p>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Household Invitations
          </h2>

          {error && (
            <p className="mb-4 rounded bg-red-100 p-3 text-red-700">
              {error}
            </p>
          )}

          {householdId && (
            <button
              onClick={generateInvite}
              disabled={generating}
              className="w-full rounded bg-green-700 p-3 text-white disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Invitation Code"}
            </button>
          )}

          {inviteCode && (
            <div className="mt-5 rounded-lg bg-green-100 p-4">
              <p className="mb-2 text-sm font-medium">
                Share this code with your family:
              </p>

              <p className="break-all font-mono text-lg font-bold">
                {inviteCode}
              </p>

              <p className="mt-2 text-sm text-gray-600">
                Expires in 24 hours. Maximum 5 uses.
              </p>

              <button
                onClick={() => navigator.clipboard.writeText(inviteCode)}
                className="mt-3 rounded bg-white px-4 py-2 text-sm text-green-800"
              >
                Copy Code
              </button>
            </div>
          )}

            <div className="mt-6 border-t border-gray-200 pt-6">
            <h2 className="mb-2 text-lg font-semibold">
                Join a Household
            </h2>

            <p className="mb-4 text-sm text-gray-600">
                Have an invitation code from your family?
            </p>

            <button
                onClick={() => router.push("/join")}
                className="w-full rounded border border-green-700 p-3 text-green-700 hover:bg-green-50"
            >
                Join Household
            </button>
            </div>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-6 text-green-700 underline"
        >
          ← Back to Dashboard
        </button>
      </div>
    </main>
  );
}