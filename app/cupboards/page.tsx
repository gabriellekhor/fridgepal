
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import GroceryInventory, {
  type Grocery,
} from "../../components/GroceryInventory";
import KitchenNavigation from "../../components/KitchenNavigation";
import InventoryHeaderButtons from "../../components/InventoryHeaderButtons";
import NotificationSettings from "../../components/NotificationSettings";


type CupboardItem = {
  id: number;
  name: string;
  expiry: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  storage_location: "fridge" | "cupboards";
};

export default function CupboardsPage() {
  const router = useRouter();

  const [householdId, setHouseholdId] =
    useState<string | null>(null);

  const [items, setItems] = useState<CupboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("packs");
  const [category, setCategory] = useState("Other");
  const [expiry, setExpiry] = useState("");
    const [editingItem, setEditingItem] = useState<Grocery | null>(null);
    const [editName, setEditName] = useState("");
    const [editExpiry, setEditExpiry] = useState("");
    const [editQuantity, setEditQuantity] = useState("1");
    const [editUnit, setEditUnit] = useState("packs");
    const [editCategory, setEditCategory] = useState("Other");
    const [editLocation, setEditLocation] =
    useState<"fridge" | "cupboards">("cupboards");

  useEffect(() => {
    let active = true;

    async function loadCupboards() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

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

        if (!membership) {
          router.replace("/household");
          return;
        }

        const id = membership.household_id;

        const { data, error: inventoryError } =
          await supabase
            .from("groceries")
            .select(
              "id, name, expiry, quantity, unit, category, storage_location"
            )
            .eq("household_id", id)
            .eq("storage_location", "cupboards")
            .order("expiry", { ascending: true });

        if (inventoryError) throw inventoryError;

        if (active) {
          setHouseholdId(id);
          setItems(data ?? []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load cupboard items."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCupboards();

    return () => {
      active = false;
    };
  }, [router]);

  async function addItem() {
    if (!householdId || saving) return;

    const amount = Number(quantity);

    if (
      !name.trim() ||
      !expiry ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError("Please enter valid item details.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data, error: insertError } =
        await supabase
          .from("groceries")
          .insert({
            household_id: householdId,
            name: name.trim(),
            quantity: amount,
            unit,
            category,
            expiry,
            storage_location: "cupboards",
          })
          .select(
            "id, name, expiry, quantity, unit, category, storage_location"
          )
          .single();

      if (insertError) throw insertError;

      setItems((current) =>
        [...current, data].sort((a, b) =>
          a.expiry.localeCompare(b.expiry)
        )
      );

      setName("");
      setQuantity("1");
      setUnit("packs");
      setCategory("Other");
      setExpiry("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not add cupboard item."
      );
    } finally {
      setSaving(false);
    }
  }

function startEditing(item: Grocery) {
  setEditingItem(item);
  setEditName(item.name);
  setEditExpiry(item.expiry);
  setEditQuantity(String(item.quantity ?? 1));
  setEditUnit(item.unit ?? "packs");
  setEditCategory(item.category ?? "Other");
  setEditLocation(item.storage_location ?? "cupboards");
  setError("");
}

async function saveEditedItem() {
  if (!editingItem || !householdId || saving) return;

  const amount = Number(editQuantity);

  if (
    !editName.trim() ||
    !editExpiry ||
    !editQuantity.trim() ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    setError("Please enter valid item details.");
    return;
  }

  setSaving(true);
  setError("");

  try {
    const { data, error: updateError } = await supabase
      .from("groceries")
      .update({
        name: editName.trim(),
        expiry: editExpiry,
        quantity: amount,
        unit: editUnit,
        category: editCategory,
        storage_location: editLocation,
      })
      .eq("id", editingItem.id)
      .eq("household_id", householdId)
      .select(
        "id, name, expiry, quantity, unit, category, storage_location"
      )
      .single();

    if (updateError) throw updateError;

    setItems((current) =>
      current
        .map((item) =>
          item.id === editingItem.id ? data : item
        )
        .filter((item) => item.storage_location === "cupboards")
        .sort((a, b) => a.expiry.localeCompare(b.expiry))
    );

    setEditingItem(null);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not update cupboard item."
    );
  } finally {
    setSaving(false);
  }
}

async function removeItem(id: number) {
  if (!householdId || saving) return;

  if (!window.confirm("Remove this item from your cupboards?")) {
    return;
  }

  setSaving(true);
  setError("");

  try {
    const { error: deleteError } = await supabase
      .from("groceries")
      .delete()
      .eq("id", id)
      .eq("household_id", householdId);

    if (deleteError) throw deleteError;

    setItems((current) =>
      current.filter((item) => item.id !== id)
    );

    if (editingItem?.id === id) {
      setEditingItem(null);
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not remove cupboard item."
    );
  } finally {
    setSaving(false);
  }
}


  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#F6F2E9]">
        <p className="text-[#665548]">
          Loading your cupboards...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F6F2E9] p-4 text-gray-900 sm:p-8">
      <div className="mx-auto max-w-2xl">

        <button
          type="button"
          onClick={() => router.push("/kitchen")}
          className="mb-6 rounded-xl border border-[#DED5C8] bg-white px-4 py-3 text-sm font-medium text-[#665548] shadow-sm hover:bg-[#F1EBE2]"
        >
          ← Back to Kitchen
        </button>

        <div className="mb-4 flex items-center justify-between gap-2 sm:gap-4">
        <h1 className="whitespace-nowrap text-xl font-bold tracking-tight text-green-900 sm:text-3xl">
            fridge<span className="text-green-700">PAL</span> 🥬
        </h1>

        <InventoryHeaderButtons />
        </div>

        <KitchenNavigation />
        <h2 className="mb-2 text-2xl font-semibold text-[#665548]">
          🗄️ My Cupboards
        </h2>

        <p className="mb-6 text-sm text-[#897968]">
          Keep track of pantry essentials, snacks and dry goods.
        </p>

        <div id="tutorial-manual-add"
            className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-semibold">
            Add Cupboard Item
          </h3>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border p-3"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border p-3"
              />

              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg border p-3"
              >
                {[
                  "pieces", "packs", "cartons",
                  "bottles", "kg", "g", "L", "mL"
                ].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              {[
                "Dairy", "Vegetables", "Fruits",
                "Meat & Seafood", "Drinks", "Other"
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium">
              Expiry Date
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="mt-1 w-full rounded-lg border p-3"
              />
            </label>

            <button
              type="button"
              onClick={() => void addItem()}
              disabled={saving || !householdId}
              className="w-full rounded-xl bg-[#665548] p-3 font-medium text-white hover:bg-[#514237] disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add to Cupboards"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Cupboard Inventory */}
        <GroceryInventory
        items={items}
        title="🗄️ My Cupboards"
        saving={saving}
        onEdit={startEditing}
        onRemove={(id) => void removeItem(id)}
        />

        {editingItem && (
        <div className="mt-6 rounded-xl border border-[#DED5C8] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-[#665548]">
            ✏️ Edit Cupboard Item
            </h2>

            <div className="space-y-3">
            <label className="block text-sm font-medium">
                Item Name
                <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full rounded-lg border p-3"
                />
            </label>

            <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                Quantity
                <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="mt-1 w-full rounded-lg border p-3"
                />
                </label>

                <label className="block text-sm font-medium">
                Unit
                <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="mt-1 w-full rounded-lg border p-3"
                >
                    {[
                    "pieces", "packs", "cartons", "bottles",
                    "kg", "g", "L", "mL"
                    ].map((value) => (
                    <option key={value} value={value}>
                        {value}
                    </option>
                    ))}
                </select>
                </label>
            </div>

            <label className="block text-sm font-medium">
                Food Category
                <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border p-3"
                >
                {[
                    "Dairy", "Vegetables", "Fruits",
                    "Meat & Seafood", "Drinks", "Other"
                ].map((value) => (
                    <option key={value} value={value}>
                    {value}
                    </option>
                ))}
                </select>
            </label>

            <label className="block text-sm font-medium">
                Storage Location
                <select
                value={editLocation}
                onChange={(e) =>
                    setEditLocation(
                    e.target.value as "fridge" | "cupboards"
                    )
                }
                className="mt-1 w-full rounded-lg border p-3"
                >
                <option value="fridge">🧊 Fridge</option>
                <option value="cupboards">🗄️ Cupboards</option>
                </select>
            </label>

            <label className="block text-sm font-medium">
                Expiry Date
                <input
                type="date"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                className="mt-1 w-full rounded-lg border p-3"
                />
            </label>

            <div className="flex gap-3 pt-3">
                <button
                type="button"
                onClick={() => setEditingItem(null)}
                disabled={saving}
                className="flex-1 rounded-lg border border-[#DED5C8] p-3 text-[#665548]"
                >
                Cancel
                </button>

                <button
                type="button"
                onClick={() => void saveEditedItem()}
                disabled={saving}
                className="flex-1 rounded-lg bg-[#665548] p-3 text-white hover:bg-[#514237] disabled:opacity-50"
                >
                {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
            </div>
        </div>
        )}

        {/* Notification Settings */}
        <div id="tutorial-notifications" className="mt-8">
        <NotificationSettings />
        </div>

        </div> {/* Closes max-w-2xl container */}
    </main>
    );
    }
