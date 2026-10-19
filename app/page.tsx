
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
  const [foods, setFoods] = useState<Food[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("expiring");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [databaseError, setDatabaseError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void findHousehold();
    // Initial household lookup after the page loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const savedFoods = localStorage.getItem("fridgepal-foods");

      if (savedFoods) {
        setFoods(JSON.parse(savedFoods) as Food[]);
      }
    } catch (error) {
      console.error("Could not load groceries:", error);
    } finally {
      setLoaded(true);
    }
  }, []);
  
  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      "fridgepal-foods",
      JSON.stringify(foods)
    );
  }, [foods, loaded]);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        setIsAuthenticated(false);
        router.replace("/login");
      } else {
        setIsAuthenticated(true);
      }

      setCheckingAuth(false);
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pieces");
  const [category, setCategory] = useState("Other");

  async function findHousehold() {
    setDatabaseError("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setDatabaseError("Please sign in to FridgePal first.");
      return;
    }

    const { data, error } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      setDatabaseError(error.message);
      return;
    }

    if (!data) {
      setDatabaseError("No household is linked to your account.");
      return;
    }

    setHouseholdId(data.household_id);
  }

  function addFood() {
    const amount = Number(quantity);

    if (
      !name.trim() ||
      !expiry ||
      !quantity.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }

    const newFood: Food = {
      id: Date.now(),
      name: name.trim(),
      expiry: expiry,
      quantity: amount,
      unit: unit,
      category: category,
    };

    setFoods([...foods, newFood]);

    setName("");
    setExpiry("");
    setQuantity("1");
    setUnit("pieces");
    setCategory("Other");
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

  if (checkingAuth || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-green-50 text-gray-700">
        <p>Checking your login...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-green-50 p-8 text-gray-900">
      <div className="mx-auto mb-4 max-w-2xl">
        {householdId ? (
          <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">
            ✓ Connected to your household database!
          </p>
        ) : databaseError ? (
          <p className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {databaseError}
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
            className="w-full rounded bg-green-700 p-3 text-white hover:bg-green-800"
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
              onClick={() =>
                setFoods(foods.filter((item) => item.id !== food.id))
              }
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
