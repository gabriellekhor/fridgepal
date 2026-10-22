"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import ManagePresets from "../../components/ManagePresets";


export default function QuickAddPage() {
  const router = useRouter();

  const [householdId, setHouseholdId] =
    useState<string | null>(null);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
  const [unit, setUnit] = useState("pieces");
  const [category, setCategory] = useState("Other");
  const [days, setDays] = useState("3");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

        if (!membership) {
          router.replace("/household");
          return;
        }

        if (active) {
          setHouseholdId(membership.household_id);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your household."
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

function handleImageChange(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    setError("Please choose a JPG, PNG or WebP image.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setError("Image must be smaller than 2 MB.");
    return;
  }

  setError("");
  setImageFile(file);

  const reader = new FileReader();

  reader.onload = () => {
    setImagePreview(String(reader.result));
  };

  reader.readAsDataURL(file);
}
  
async function savePreset() {
  if (!householdId || saving) return;

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

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    // 1. Create the preset
    const { data: preset, error: insertError } =
      await supabase
        .from("quick_add_presets")
        .insert({
          household_id: householdId,
          name: name.trim(),
          quantity: amount,
          unit,
          category,
          days_after_opening: storageDays,
        })
        .select("id")
        .single();

    if (insertError) throw insertError;

    // 2. Upload image if one was selected
    if (imageFile) {
      const extension = imageFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "png";

      const imagePath =
        `${householdId}/${preset.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("preset-images")
          .upload(imagePath, imageFile, {
            contentType: imageFile.type,
            upsert: false,
          });

      if (uploadError) throw uploadError;

      // 3. Save the image reference
      const { error: updateError } =
        await supabase
          .from("quick_add_presets")
          .update({ image_path: imagePath })
          .eq("id", preset.id)
          .eq("household_id", householdId);

      if (updateError) throw updateError;
    }

    setSuccess("Quick Add preset created successfully!");

    setName("");
    setQuantity("1");
    setUnit("pieces");
    setCategory("Other");
    setDays("3");
    setImageFile(null);
    setImagePreview("");

  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not save preset."
    );
  } finally {
    setSaving(false);
  }
}

  return (
    <main className="min-h-screen bg-green-50 p-6 text-gray-900">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-3xl font-bold text-green-800">
          🌱 Create Quick Add Preset
        </h1>

        <p className="mb-6 text-gray-600">
          Save products with special storage rules
          for your household.
        </p>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Product Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Almond Milk"
                className="w-full rounded border p-3"
              />
            </div>

            <div>
            <label className="mb-2 block text-sm font-medium">
                Product Picture (Optional)
            </label>

            <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="w-full rounded border p-3 text-sm"
            />

            {imagePreview && (
                <div className="mt-3 rounded-lg bg-green-50 p-4">
                <img
                    src={imagePreview}
                    alt="Product preview"
                    className="mx-auto h-32 w-32 rounded-lg object-contain"
                />
                </div>
            )}

            <p className="mt-2 text-xs text-gray-500">
                JPG, PNG or WebP. Maximum 2 MB.
            </p>
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
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border p-3"
              >
                <option value="Dairy">Dairy</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Meat & Seafood">
                  Meat & Seafood
                </option>
                <option value="Drinks">Drinks</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Days After Opening
              </label>
              <input
                type="number"
                min="1"
                max="365"
                step="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full rounded border p-3"
              />
              <p className="mt-1 text-xs text-gray-500">
                Check the product packaging for the
                recommended storage period.
              </p>
            </div>

            {error && (
              <p className="rounded bg-red-100 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded bg-green-100 p-3 text-sm text-green-700">
                {success}
              </p>
            )}

            <button
              onClick={savePreset}
              disabled={saving || !householdId}
              className="w-full rounded bg-green-700 p-3 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Preset"}
            </button>
          </div>
        </div>

        {householdId && (
            <ManagePresets householdId={householdId} />
        )}

        <button
        onClick={() => router.push("/")}
        className="mt-6 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-green-800 shadow-sm transition hover:bg-green-50 hover:shadow-md"
        >
        <span className="text-lg">←</span>
        <span>Back to FridgePal</span>
        </button>

      </div>
    </main>
  );
}
