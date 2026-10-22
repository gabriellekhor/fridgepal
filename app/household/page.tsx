
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function HouseholdPage() {
  const router = useRouter();

  const [householdId, setHouseholdId] =
    useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("");

  const [newName, setNewName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHousehold() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (!active) return;

        if (authError || !auth.user) {
          router.replace("/login");
          return;
        }

        const { data: membership, error: memberError } =
          await supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", auth.user.id)
            .maybeSingle();

        if (memberError) throw memberError;

        if (membership) {
          const { data: household, error: houseError } =
            await supabase
              .from("households")
              .select("name")
              .eq("id", membership.household_id)
              .single();

          if (houseError) throw houseError;

          if (active) {
            setHouseholdId(membership.household_id);
            setHouseholdName(household.name);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load household."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHousehold();

    return () => {
      active = false;
    };
  }, [router]);

  async function createHousehold() {
    const name = newName.trim();
    if (name.length < 2 || name.length > 100 ||
        working || householdId) return;

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const { data, error: createError } =
        await supabase.rpc("create_household", {
          p_name: name,
        });

      if (createError) throw createError;

      setHouseholdId(data);
      setHouseholdName(name);
      setNewName("");
      setMessage("Household created successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create household."
      );
    } finally {
      setWorking(false);
    }
  }

  async function generateInvite() {
    if (!householdId || working) return;

    setWorking(true);
    setError("");
    setMessage("");
    setInviteCode("");

    try {
      const { data, error: inviteError } =
        await supabase.rpc("create_household_invite", {
          p_household_id: householdId,
        });

      if (inviteError) throw inviteError;

      setInviteCode(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate invitation."
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F6F2E9] p-8 text-center text-gray-900">
        Loading household...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F2E9] p-6 text-gray-900">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-3xl font-bold text-green-800">
          🥬 Household
        </h1>

        <p className="mb-6 text-gray-600">
          Manage your shared FridgePal inventory.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="mb-4 rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </p>
        )}

        {!error && householdId ? (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Your Household
            </p>

            <h2 className="mt-2 text-2xl font-bold text-green-800">
              🏠 {householdName}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              You're a member of this household.
            </p>

            <div className="mt-6 border-t pt-6">
              <h3 className="mb-2 text-lg font-semibold">
                Invite Family Members
              </h3>

              <p className="mb-4 text-sm text-gray-600">
                Generate a code to invite someone to your fridge.
              </p>

              <button
                onClick={generateInvite}
                disabled={working}
                className="w-full rounded bg-green-700 p-3 text-white disabled:opacity-50"
              >
                {working
                  ? "Generating..."
                  : "Generate Invitation Code"}
              </button>

              {inviteCode && (
                <div className="mt-4 rounded-lg bg-green-100 p-4">
                  <p className="mb-2 text-sm">
                    Share this invitation code:
                  </p>

                  <p className="break-all font-mono font-bold">
                    {inviteCode}
                  </p>

                  <p className="mt-2 text-xs text-gray-600">
                    Expires in 24 hours. Maximum 5 uses.
                  </p>

                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(inviteCode)
                    }
                    className="mt-3 rounded bg-white px-4 py-2 text-sm text-green-800"
                  >
                    Copy Code
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : !error ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-[#E8E0D6] bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-xl font-semibold">
                Create a Household
              </h2>

              <p className="mb-4 text-sm text-gray-600">
                Start a shared fridge for your family.
              </p>

              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My Family"
                maxLength={100}
                className="mb-3 w-full rounded border p-3"
              />

              <button
                onClick={createHousehold}
                disabled={working || newName.trim().length < 2}
                className="w-full rounded-xl bg-[#665548] p-3 font-medium text-white transition hover:bg-[#514237] disabled:opacity-50"
              >
                {working ? "Creating..." : "Create Household"}
              </button>
            </div>

            <div className="rounded-xl border border-[#E8E0D6] bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-xl font-semibold">
                Join a Household
              </h2>

              <p className="mb-4 text-sm text-gray-600">
                Have an invitation code from your family?
              </p>

              <button
                onClick={() => router.push("/join")}
                className="w-full rounded-xl bg-[#665548] p-3 font-medium text-white transition hover:bg-[#514237] disabled:opacity-50"
              >
                Enter Invitation Code
              </button>
            </div>
          </div>
        ) : null}

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
