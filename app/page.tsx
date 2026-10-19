"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";



type Food = {
  id: number;
  name: string;
  expiry: string;
  quantity?: number;
  unit?: string;
  category?: string;
};


export default function Home() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [activeTab, setActiveTab] = useState("expiring");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [databaseError, setDatabaseError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pieces");
  const [category, setCategory] = useState("Other");

  useEffect(() => {
    let active = true;

    async function loadInventory() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!active) return;
        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const { data: membership, error: membershipError } = await supabase
          .from("household_members")
          .select("household_id")
          .eq("user_id", authData.user.id)
          .limit(1)
          .maybeSingle();
        if (membershipError) throw membershipError;
        if (!membership) {
          setDatabaseError("Your account is not linked to a household yet.");
          return;
        }
        setHouseholdId(membership.household_id);

        const { data: household, error: householdError } =
          await supabase
            .from("households")
            .select("name")
            .eq("id", membership.household_id)
            .single();

        if (householdError) {
          setDatabaseError(householdError.message);
        } else {
          setHouseholdName(household.name);
        }

        const { data: groceries, error: groceriesError } = await supabase
          .from("groceries")
          .select("id, name, expiry, quantity, unit, category")
          .eq("household_id", membership.household_id)
          .order("expiry", { ascending: true });
        if (groceriesError) throw groceriesError;
        if (active) setFoods(groceries ?? []);
      } catch (error) {
        if (active) setDatabaseError(error instanceof Error ? error.message : "Could not load groceries.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInventory();
    return () => { active = false; };
  }, [router]);

  async function addFood() {
    const amount = Number(quantity);
    if (!householdId || saving || !name.trim() || !expiry || !quantity.trim() ||
        !Number.isFinite(amount) || amount <= 0) return;

    setSaving(true);
    setDatabaseError("");
    const { data, error } = await supabase
      .from("groceries")
      .insert({ household_id: householdId, name: name.trim(), expiry,
                quantity: amount, unit, category })
      .select("id, name, expiry, quantity, unit, category")
      .single();
    setSaving(false);
    if (error) {
      setDatabaseError(error.message);
      return;
    }
    setFoods(current => [...current, data]);
    setName("");
    setExpiry("");
    setQuantity("1");
    setUnit("pieces");
    setCategory("Other");
  }

  async function removeFood(id: number) {
    if (!householdId || saving) return;
    setSaving(true);
    setDatabaseError("");
    const { error } = await supabase
      .from("groceries")
      .delete()
      .eq("id", id)
      .eq("household_id", householdId);
    setSaving(false);
    if (error) {
      setDatabaseError(error.message);
      return;
    }
    setFoods(current => current.filter(food => food.id !== id));
  }

  function getStatus(date: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(date + "T00:00:00");
    const days = Math.round(
      (expiryDate.getTime() - today.getTime()) / 86400000
    );

    if (days < 0) return "Expired";
    if (days === 0) return "Expires today";
    if (days <= 3) return `Expiring in ${days} days`;
    return `${days} days left`;
  }

  function getCategory(date: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(date + "T00:00:00");

    const days = Math.round(
      (expiryDate.getTime() - today.getTime()) / 86400000
    );

    if (days < 0) return "expired";
    if (days <= 3) return "expiring";
    return "fresh";
  }

  function getExpiryColor(date: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(date + "T00:00:00");

    const days = Math.round(
      (expiryDate.getTime() - today.getTime()) / 86400000
    );

    if (days < 0) return "text-red-600";
    if (days <= 3) return "text-orange-600";
    return "text-green-700";
  }


  const expiredFoods = foods.filter(
    (food) => getCategory(food.expiry) === "expired"
  );

  const expiringFoods = foods.filter(
    (food) => getCategory(food.expiry) === "expiring"
  );

  const freshFoods = foods.filter(
    (food) => getCategory(food.expiry) === "fresh"
  );

  const displayedFoods =
    activeTab === "expired"
      ? expiredFoods
      : activeTab === "expiring"
      ? expiringFoods
      : freshFoods;

  if (loading) {
    return <main className="min-h-screen bg-green-50 p-8 text-gray-900">Loading your fridge...</main>;
  }

  return (
    <main className="min-h-screen bg-green-50 p-8 text-gray-900">
      <div className="mx-auto mb-4 max-w-2xl">
        {databaseError ? (
          <p className="rounded-lg bg-red-100 p-3 text-sm text-red-700">{databaseError}</p>
        ) : householdId ? (
          <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">
            ✓ Connected to your household database!
          </p>
        ) : (
          <p className="rounded-lg bg-yellow-100 p-3 text-sm text-yellow-800">
            Connecting to Supabase...
          </p>
        )}
      </div>

      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold text-green-800">
          🥬 FridgePal
        </h1>

        <p className="mt-2 text-gray-600">
          Keep your groceries fresh and reduce food waste.
        </p>

        <nav className="mt-6 flex gap-6 border-b border-gray-200 pb-3">
          <a
            href="/"
            className="border-b-2 border-green-700 pb-2 font-semibold text-green-700"
          >
            🥬 My Fridge
          </a>

          <a
            href="/household"
            className="pb-2 text-gray-600 hover:text-green-700"
          >
            👨‍👩‍👧‍👦 Household
          </a>
        </nav>

        {householdId && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-100 p-4">
            <span className="text-2xl">🏠</span>

            <div>
              <p className="text-xs font-medium uppercase text-green-700">
                Current Household
              </p>

              <p className="text-lg font-semibold text-green-900">
                {householdName || "Loading household..."}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Add a grocery item
          </h2>

          <input
            className="mb-3 w-full rounded border p-3"
            placeholder="Food name (e.g. Milk)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Quantity
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                className="w-full rounded border p-3"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Unit
              </label>
              <select
                className="w-full rounded border p-3"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="pieces">Pieces</option>
                <option value="cartons">Cartons</option>
                <option value="bottles">Bottles</option>
                <option value="packs">Packs</option>
                <option value="kg">Kilograms</option>
                <option value="g">Grams</option>
                <option value="L">Litres</option>
                <option value="mL">Millilitres</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">
              Food Category
            </label>
            <select
              className="w-full rounded border p-3"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Dairy">🥛 Dairy</option>
              <option value="Vegetables">🥬 Vegetables</option>
              <option value="Fruits">🍎 Fruits</option>
              <option value="Meat & Seafood">🥩 Meat & Seafood</option>
              <option value="Drinks">🥤 Drinks</option>
              <option value="Other">🍱 Other</option>
            </select>
          </div>

          <input
            type="date"
            className="mb-3 w-full rounded border p-3"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />

          <button
            onClick={addFood}
            disabled={!householdId || saving}
            className="w-full rounded bg-green-700 p-3 text-white hover:bg-green-800 disabled:opacity-50"
          >
            Add Food
          </button>
        </div>

        <h2 className="mb-4 mt-8 text-2xl font-semibold">
          My Fridge ({foods.length} items)
        </h2>

        <div className="mb-6 mt-4 grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveTab("expired")}
            className={`rounded-xl p-4 text-center ${
              activeTab === "expired"
                ? "border-2 border-red-500 bg-red-100"
                : "bg-white"
            }`}
          >
            <p className="text-2xl font-bold text-red-600">
              {expiredFoods.length}
            </p>
            <p className="text-sm">Expired</p>
          </button>

          <button
            onClick={() => setActiveTab("expiring")}
            className={`rounded-xl p-4 text-center ${
              activeTab === "expiring"
                ? "border-2 border-orange-500 bg-orange-100"
                : "bg-white"
            }`}
          >
            <p className="text-2xl font-bold text-orange-600">
              {expiringFoods.length}
            </p>
            <p className="text-sm">Expiring Soon</p>
          </button>

          <button
            onClick={() => setActiveTab("fresh")}
            className={`rounded-xl p-4 text-center ${
              activeTab === "fresh"
                ? "border-2 border-green-500 bg-green-100"
                : "bg-white"
            }`}
          >
            <p className="text-2xl font-bold text-green-700">
              {freshFoods.length}
            </p>
            <p className="text-sm">Fresh</p>
          </button>
        </div>

        {foods.length === 0 && (
          <p className="text-gray-500">
            Your fridge is empty. Add your first item!
          </p>
        )}

      {displayedFoods.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-gray-500">
          No groceries in this category!
        </p>
      )}

      {[...displayedFoods]
        .sort((a, b) => a.expiry.localeCompare(b.expiry))
        .map((food) => (
          <div
            key={food.id}
            className="mb-3 flex items-center justify-between rounded-xl bg-white p-4 shadow"
          >
            <div>
              <h3 className="font-semibold">{food.name}</h3>
              <p className="text-sm text-gray-600">
                {food.quantity ?? 1} {food.unit ?? "piece"}
                {" · "}
                {food.category ?? "Uncategorised"}
              </p>
              <p className="text-sm text-gray-500">
                Expiry: {food.expiry}
              </p>
              <p className={`text-sm font-medium ${getExpiryColor(food.expiry)}`}>
                {getStatus(food.expiry)}
              </p>

            </div>

            <button
              onClick={() => void removeFood(food.id)}
              disabled={saving}
              className="rounded bg-red-100 px-3 py-2 text-sm text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

             