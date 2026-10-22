"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Preset = {
  id: string;
  household_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  days_after_opening: number;
  image_path: string | null;
};

const units = [
  "pieces", "cartons", "bottles", "packs",
  "kg", "g", "L", "mL"
];

const categories = [
  "Dairy", "Vegetables", "Fruits",
  "Meat & Seafood", "Drinks", "Other"
];

export default function ManagePresets({
  householdId,
}: {
  householdId: string;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pieces");
  const [category, setCategory] = useState("Other");
  const [days, setDays] = useState("3");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPresets() {
      const { data, error } = await supabase
        .from("quick_add_presets")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setPresets(data ?? []);
      }
    }

    void loadPresets();

    return () => {
      active = false;
    };
  }, [householdId]);

  function startEditing(preset: Preset) {
    setEditingId(preset.id);
    setDeletingId(null);
    setName(preset.name);
    setQuantity(String(preset.quantity));
    setUnit(preset.unit);
    setCategory(preset.category);
    setDays(String(preset.days_after_opening));
    setImageFile(null);
    setError("");
    setMessage("");
  }

  async function saveChanges() {
    if (!editingId || working) return;

    const amount = Number(quantity);
    const storageDays = Number(days);

    if (
      !name.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(storageDays) ||
      storageDays < 1 ||
      storageDays > 365
    ) {
      setError("Please enter valid product details.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const current = presets.find(
        (preset) => preset.id === editingId
      );

      if (!current) {
        throw new Error("Preset not found.");
      }

      let imagePath = current.image_path;

      if (imageFile) {
        if (
          !["image/jpeg", "image/png", "image/webp"]
            .includes(imageFile.type) ||
          imageFile.size > 2 * 1024 * 1024
        ) {
          throw new Error(
            "Choose a JPG, PNG or WebP image under 2 MB."
          );
        }

        const extension =
          imageFile.type === "image/jpeg"
            ? "jpg"
            : imageFile.type === "image/webp"
            ? "webp"
            : "png";

        const newPath =
          `${householdId}/${editingId}/` +
          `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("preset-images")
            .upload(newPath, imageFile, {
              contentType: imageFile.type,
              upsert: false,
            });

        if (uploadError) throw uploadError;

        imagePath = newPath;
      }

      const { data, error: updateError } =
        await supabase
          .from("quick_add_presets")
          .update({
            name: name.trim(),
            quantity: amount,
            unit,
            category,
            days_after_opening: storageDays,
            image_path: imagePath,
          })
          .eq("id", editingId)
          .eq("household_id", householdId)
          .select("*")
          .single();

      if (updateError) throw updateError;

      setPresets((currentPresets) =>
        currentPresets.map((preset) =>
          preset.id === editingId ? data : preset
        )
      );

      setEditingId(null);
      setImageFile(null);
      setMessage("Preset updated successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update preset."
      );
    } finally {
      setWorking(false);
    }
  }

  async function deletePreset(preset: Preset) {
    if (working) return;

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } =
        await supabase
          .from("quick_add_presets")
          .delete()
          .eq("id", preset.id)
          .eq("household_id", householdId);

      if (deleteError) throw deleteError;

      setPresets((current) =>
        current.filter((item) => item.id !== preset.id)
      );

      setDeletingId(null);
      setMessage("Preset deleted successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete preset."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl bg-white p-6 shadow">
      <h2 className="mb-2 text-xl font-semibold">
        Manage Saved Presets
      </h2>

      <p className="mb-5 text-sm text-gray-500">
        Edit or remove products saved by your household.
      </p>

      {error && (
        <p className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">
          {message}
        </p>
      )}

      <div className="space-y-4">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <p className="font-semibold">{preset.name}</p>
            <p className="mb-3 text-sm text-gray-500">
              {preset.quantity} {preset.unit} ·{" "}
              {preset.days_after_opening} days after opening
            </p>

            {editingId === preset.id ? (
              <div className="space-y-3">
                <label className="block text-sm">
                  Product Name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="mt-1 w-full rounded border p-3"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    Quantity
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="mt-1 w-full rounded border p-3"
                    />
                  </label>

                  <label className="block text-sm">
                    Unit
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="mt-1 w-full rounded border p-3"
                    >
                      {units.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm">
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded border p-3"
                  >
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  Days After Opening
                  <input
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="mt-1 w-full rounded border p-3"
                  />
                </label>

                <label className="block text-sm">
                  Replace Product Picture (Optional)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      setImageFile(e.target.files?.[0] ?? null)
                    }
                    className="mt-1 w-full rounded border p-3"
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={working}
                    className="flex-1 rounded border p-3"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveChanges}
                    disabled={working}
                    className="flex-1 rounded-xl bg-[#665548] p-3 font-medium text-white transition hover:bg-[#514237] disabled:opacity-50"
                  >
                    {working ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : deletingId === preset.id ? (
              <div className="rounded bg-red-50 p-3">
                <p className="mb-3 text-sm">
                  Delete this preset? Existing groceries
                  will not be deleted.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="flex-1 rounded border p-2"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => deletePreset(preset)}
                    disabled={working}
                    className="flex-1 rounded bg-red-600 p-2 text-white"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => startEditing(preset)}
                  className="flex-1 rounded-lg bg-[#F1EBE2] p-3 font-medium text-[#665548] transition hover:bg-[#E5D9CA]"
                >
                  ✏️ Edit
                </button>

                <button
                  onClick={() => setDeletingId(preset.id)}
                  className="flex-1 rounded-lg bg-red-50 p-3 font-medium text-red-700 transition hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
