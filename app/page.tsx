"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import NotificationSettings from "../components/NotificationSettings";
import PresetImage from "../components/PresetImage";
import FridgePalTutorial from "../components/FridgePalTutorial";
import GroceryInventory from "../components/GroceryInventory";
import KitchenNavigation from "../components/KitchenNavigation";
import InventoryHeaderButtons from "../components/InventoryHeaderButtons";

type Food = {
  id: number;
  name: string;
  expiry: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  storage_location?: "fridge" | "cupboards";
};

type QuickAddPreset = {
  id: string;
  household_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  days_after_opening: number;
  image_path: string | null;
};


export default function Home() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [quickAddPresets, setQuickAddPresets] =
    useState<QuickAddPreset[]>([]);
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

  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [editName, setEditName] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editStorageLocation, setEditStorageLocation] =
    useState<"fridge" | "cupboards">("fridge");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnit, setEditUnit] = useState("pieces");
  const [editCategory, setEditCategory] = useState("Other");


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

        const { data: presets, error: presetsError } =
          await supabase
            .from("quick_add_presets")
            .select(
              "id, household_id, name, quantity, unit, category, days_after_opening,image_path"
            )
            .eq("household_id", membership.household_id)
            .order("created_at", { ascending: true });

        if (presetsError) throw presetsError;

        if (active) {
          setQuickAddPresets(presets ?? []);
        }


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
          .select("id, name, expiry, quantity, unit, category, storage_location")
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

  function calculateExpiry(startDate: string, days: number) {
    const date = new Date(startDate + "T12:00:00Z");

    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
  }

  function quickAddPreset(preset: QuickAddPreset) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    setName(preset.name);
    setQuantity(String(preset.quantity));
    setUnit(preset.unit);
    setCategory(preset.category);
    setExpiry(
      calculateExpiry(today, preset.days_after_opening)
    );

    document.getElementById("tutorial-manual-add")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function addFood() {
    const amount = Number(quantity);
    if (!householdId || saving || !name.trim() || !expiry || !quantity.trim() ||
        !Number.isFinite(amount) || amount <= 0) return;

    setSaving(true);
    setDatabaseError("");
    const { data, error } = await supabase
      .from("groceries")
      .insert({ household_id: householdId, name: name.trim(), expiry,
                quantity: amount, unit, category, 
                storage_location: "fridge",
               })
      .select("id, name, expiry, quantity, unit, category, storage_location")
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

  function startEditing(food: Food) {
    setEditingFood(food);

    setEditName(food.name);
    setEditExpiry(food.expiry);
    setEditQuantity(String(food.quantity ?? 1));
    setEditUnit(food.unit ?? "pieces");
    setEditCategory(food.category ?? "Other");
    setEditStorageLocation(food.storage_location ?? "fridge");

    setDatabaseError("");
  }

  async function saveEditedFood() {
    if (!editingFood || !householdId || saving) return;

    const amount = Number(editQuantity);

    if (
      !editName.trim() ||
      !editExpiry ||
      !editQuantity.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setDatabaseError("Please enter valid grocery details.");
      return;
    }

    setSaving(true);
    setDatabaseError("");

    try {
      const { data, error } = await supabase
        .from("groceries")
        .update({
          name: editName.trim(),
          expiry: editExpiry,
          quantity: amount,
          unit: editUnit,
          category: editCategory,
          storage_location: editStorageLocation,
        })
        .eq("id", editingFood.id)
        .eq("household_id", householdId)
        .select("id, name, expiry, quantity, unit, category, storage_location")
        .single();

      if (error) throw error;

      setFoods((current) =>
        current.map((food) =>
          food.id === editingFood.id ? data : food
        )
      );

      setEditingFood(null);
    } catch (error) {
      setDatabaseError(
        error instanceof Error
          ? error.message
          : "Could not update grocery."
      );
    } finally {
      setSaving(false);
    }
  }

  const fridgeFoods = foods.filter(
    (food) => (food.storage_location ?? "fridge") === "fridge"
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F2E9]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#DED5C8] border-t-[#665548]" />
          <p className="font-medium text-[#665548]">
            Getting your fridge ready...
          </p>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#F6F2E9] p-4 text-gray-900 sm:p-8">
      <div className="mx-auto mb-4 max-w-2xl">
        {databaseError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {databaseError}
          </p>
        ) : householdId ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#DED5C8] bg-[#F1EBE2] p-4">
            <span className="text-lg text-[#665548]">✓</span>
            <div>
              <p className="text-sm font-medium text-[#665548]">
                Connected to your household database!
              </p>
              <p className="text-xs text-[#897968]">
                Your groceries are synced and ready.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-[#DED5C8] bg-[#F1EBE2] p-4">
            <span className="text-lg text-[#665548]">◌</span>
            <div>
              <p className="text-sm font-medium text-[#665548]">
                Connecting to Supabase...
              </p>
              <p className="text-xs text-[#897968]">
                Getting your household ready.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-2xl">
    
    {/* FridgePAL Header */}
    <div className="flex items-center justify-between gap-2 sm:gap-4">
      <h1 className="whitespace-nowrap text-xl font-bold tracking-tight text-green-900 sm:text-4xl">
        fridge<span className="text-green-700">PAL</span> 🥬
      </h1>

      <InventoryHeaderButtons />
    </div>

        <p className="mt-2 text-gray-600">
          Keep your groceries fresh and reduce food waste.
        </p>

      <KitchenNavigation />

        <div
            id="tutorial-manual-add"
            className="mt-8 rounded-xl bg-white p-6 shadow"
          >
          <h2 className="mb-2 text-2xl font-semibold text-gray-900">
            ➕ Manually Add Grocery Item
          </h2>

          <p className="mb-5 text-sm text-gray-500">
            Fill in the details to add a new item to your fridge.
          </p>

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

          <div className="mb-3">
            <label
              htmlFor="expiry-date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Expiry Date
            </label>

            <input
              id="expiry-date"
              type="date"
              className="w-full rounded border p-3"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>

          <button
            onClick={addFood}
            disabled={!householdId || saving}
            className="w-full rounded-xl bg-[#665548] p-3 font-medium text-white transition hover:bg-[#514237] disabled:opacity-50"
          >
            Add Food
          </button>
        </div>

        {/* Fridge Inventory */}
        <GroceryInventory
          items={fridgeFoods}
          title="🧊 My Fridge"
          saving={saving}
          onEdit={startEditing}
          onRemove={(id) => void removeFood(id)}
        />

        {editingFood && (
          <div className="mt-6 rounded-xl border-2 border-green-300 bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-green-800">
              ✏️ Edit Grocery
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Food Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded border p-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full rounded border p-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Unit
                  </label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full rounded border p-3"
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

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Food Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded border p-3"
                >
                  <option value="Dairy">🥛 Dairy</option>
                  <option value="Vegetables">🥬 Vegetables</option>
                  <option value="Fruits">🍎 Fruits</option>
                  <option value="Meat & Seafood">🥩 Meat & Seafood</option>
                  <option value="Drinks">🥤 Drinks</option>
                  <option value="Other">🍱 Other</option>
                </select>
              </div>

              {/* Storage Location */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Storage Location
                </label>

                <select
                  value={editStorageLocation}
                  onChange={(e) =>
                    setEditStorageLocation(
                      e.target.value as "fridge" | "cupboards"
                    )
                  }
                  className="w-full rounded border border-[#DED5C8] bg-white p-3"
                >
                  <option value="fridge">🧊 Fridge</option>
                  <option value="cupboards">🗄️ Cupboards</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full rounded border p-3"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setEditingFood(null)}
                  disabled={saving}
                  className="flex-1 rounded border border-gray-300 p-3 text-gray-700"
                >
                  Cancel
                </button>

                <button
                  onClick={() => void saveEditedFood()}
                  disabled={saving}
                  className="flex-1 rounded bg-green-700 p-3 text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      <div id="tutorial-notifications">
        <NotificationSettings />
        </div>

      </div>
    </main>
  );
}
             