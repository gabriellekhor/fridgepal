
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import PresetImage from "../../components/PresetImage";
import GroceryInventory, {
  type Grocery,
} from "../../components/GroceryInventory";
import FridgePalTutorial from "../../components/FridgePalTutorial";
import NotificationSettings from "../../components/NotificationSettings";


export default function KitchenPage() {
  const router = useRouter();

    type QuickAddPreset = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: string;
    days_after_opening: number;
    image_path: string | null;
    };

    const [quickAddPresets, setQuickAddPresets] =
    useState<QuickAddPreset[]>([]);

    const [selectedPreset, setSelectedPreset] =
    useState<QuickAddPreset | null>(null);

    const [presetExpiry, setPresetExpiry] = useState("");
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState("pieces");
    const [category, setCategory] = useState("Other");
    const [expiry, setExpiry] = useState("");

    const [storageLocation, setStorageLocation] =
    useState<"fridge" | "cupboards">("fridge");

    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [householdName, setHouseholdName] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [allGroceries, setAllGroceries] = useState<Grocery[]>([]);

    const [activeExpiryTab, setActiveExpiryTab] = useState<
    "expired" | "expiring" | "fresh"
    >("expiring");


    const [editingItem, setEditingItem] = useState<Grocery | null>(null);
    const [editName, setEditName] = useState("");
    const [editQuantity, setEditQuantity] = useState("1");
    const [editUnit, setEditUnit] = useState("pieces");
    const [editCategory, setEditCategory] = useState("Other");
    const [editExpiry, setEditExpiry] = useState("");
    const [editLocation, setEditLocation] =
    useState<"fridge" | "cupboards">("fridge");


    const [presetError, setPresetError] = useState("");

    useEffect(() => {
    let active = true;

    async function loadPresets() {
        const { data: auth, error: authError } =
        await supabase.auth.getUser();

        if (authError || !auth.user) return;

        const { data: membership, error: memberError } =
        await supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", auth.user.id)
            .limit(1)
            .maybeSingle();

        if (memberError || !membership) {
        if (active) {
            setPresetError("Could not load household presets.");
        }
        return;
        }

        if (active) {
        setHouseholdId(membership.household_id);
        void loadAllGroceries(membership.household_id);
        }

        const { data: household, error: householdError } =
        await supabase
            .from("households")
            .select("name")
            .eq("id", membership.household_id)
            .single();

        if (!active) return;

        if (householdError) {
        setPresetError(householdError.message);
        } else {
        setHouseholdName(household.name);
        }

        const { data, error } = await supabase
        .from("quick_add_presets")
        .select(
            "id, name, quantity, unit, category, days_after_opening, image_path"
        )
        .eq("household_id", membership.household_id)
        .order("created_at", { ascending: true });

        if (!active) return;

        if (error) {
        setPresetError(error.message);
        } else {
        setQuickAddPresets(data ?? []);
        }
    }

    void loadPresets();

    return () => {
        active = false;
    };
    }, []);

    async function loadAllGroceries(id: string) {
    const { data, error } = await supabase
        .from("groceries")
        .select(
        "id, name, expiry, quantity, unit, category, storage_location"
        )
        .eq("household_id", id)
        .order("expiry", { ascending: true });

    if (error) {
        setPresetError(error.message);
        return;
    }

    setAllGroceries(data ?? []);
    }

    function choosePreset(preset: QuickAddPreset) {
    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Singapore",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

    const date = new Date(today + "T12:00:00Z");

    date.setUTCDate(
        date.getUTCDate() + preset.days_after_opening
    );

    const calculatedExpiry = date.toISOString().slice(0, 10);

    setSelectedPreset(preset);
    setPresetExpiry(calculatedExpiry);

    setName(preset.name);
    setQuantity(String(preset.quantity));
    setUnit(preset.unit);
    setCategory(preset.category);
    setExpiry(calculatedExpiry);
    setSaveMessage("");

    window.requestAnimationFrame(() => {
        document.getElementById("kitchen-manual-add")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        });
    });
    }

    async function addKitchenGrocery() {
    if (!householdId || saving) return;

    const amount = Number(quantity);

    if (
        !name.trim() ||
        !expiry ||
        !quantity.trim() ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        setSaveMessage("Please enter valid grocery details.");
        return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
        const { error } = await supabase
        .from("groceries")
        .insert({
            household_id: householdId,
            name: name.trim(),
            quantity: amount,
            unit,
            category,
            expiry,
            storage_location: storageLocation,
        });

        if (error) throw error;
        await loadAllGroceries(householdId);

        setSaveMessage(
        `Successfully added ${name.trim()} to ${
            storageLocation === "fridge" ? "My Fridge" : "My Cupboards"
        }!`
        );

        setName("");
        setQuantity("1");
        setUnit("pieces");
        setCategory("Other");
        setExpiry("");
        setSelectedPreset(null);
        setPresetExpiry("");
    } catch (err) {
        setSaveMessage(
        err instanceof Error
            ? err.message
            : "Could not add grocery. Please try again."
        );
    } finally {
        setSaving(false);
    }
    }

    function getExpiryCategory(expiry: string) {
    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Singapore",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

    const todayUTC = Date.parse(today + "T00:00:00Z");
    const expiryUTC = Date.parse(expiry + "T00:00:00Z");

    const daysLeft = Math.round(
        (expiryUTC - todayUTC) / 86400000
    );

    if (daysLeft < 0) return "expired";
    if (daysLeft <= 3) return "expiring";
    return "fresh";
    }

    const expiredGroceries = allGroceries.filter(
    (item) => getExpiryCategory(item.expiry) === "expired"
    );

    const expiringGroceries = allGroceries.filter(
    (item) => getExpiryCategory(item.expiry) === "expiring"
    );

    const freshGroceries = allGroceries.filter(
    (item) => getExpiryCategory(item.expiry) === "fresh"
    );

    const filteredGroceries =
    activeExpiryTab === "expired"
        ? expiredGroceries
        : activeExpiryTab === "expiring"
        ? expiringGroceries
        : freshGroceries;

    function startEditing(item: Grocery) {
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(String(item.quantity ?? 1));
    setEditUnit(item.unit ?? "pieces");
    setEditCategory(item.category ?? "Other");
    setEditExpiry(item.expiry);
    setEditLocation(item.storage_location ?? "fridge");
    setSaveMessage("");

    window.requestAnimationFrame(() => {
        document.getElementById("kitchen-edit-grocery")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        });
    });
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
        setSaveMessage("Please enter valid grocery details.");
        return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
        const { error } = await supabase
        .from("groceries")
        .update({
            name: editName.trim(),
            quantity: amount,
            unit: editUnit,
            category: editCategory,
            expiry: editExpiry,
            storage_location: editLocation,
        })
        .eq("id", editingItem.id)
        .eq("household_id", householdId);

        if (error) throw error;

        await loadAllGroceries(householdId);
        setEditingItem(null);
        setSaveMessage("Grocery updated successfully!");
    } catch (err) {
        setSaveMessage(
        err instanceof Error ? err.message : "Could not update grocery."
        );
    } finally {
        setSaving(false);
    }
    }

    async function removeItem(id: number) {
    if (!householdId || saving) return;

    if (!window.confirm("Remove this grocery from your kitchen?")) {
        return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
        const { error } = await supabase
        .from("groceries")
        .delete()
        .eq("id", id)
        .eq("household_id", householdId);

        if (error) throw error;

        setAllGroceries((current) =>
        current.filter((item) => item.id !== id)
        );

        if (editingItem?.id === id) {
        setEditingItem(null);
        }
    } catch (err) {
        setSaveMessage(
        err instanceof Error ? err.message : "Could not remove grocery."
        );
    } finally {
        setSaving(false);
    }
    }

  function openFridge() {
    router.push("/");
  }

    async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        setSaveMessage("Could not log out. Please try again.");
        return;
    }

    router.replace("/login");
    router.refresh();
    }


  return (
    <main className="min-h-dvh bg-[#F6F2E9] px-4 py-6 text-[#665548]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">

        {/* FridgePal logo and tagline */}
        <div className="min-w-0">
        <h1 className="whitespace-nowrap text-xl font-bold tracking-tight text-green-900 sm:text-3xl">
            fridge<span className="text-green-700">PAL</span> 🥬
        </h1>

        </div>


            {/* Header buttons */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">

            {/* Household */}
            <button
                type="button"
                onClick={() => router.push("/household")}
                aria-label="Household"
                title="Household"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DED5C8] bg-white text-[#665548] shadow-sm transition hover:bg-[#F1EBE2] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
            >
                <span aria-hidden="true">🏠</span>
                <span className="hidden text-sm font-medium sm:inline">
                Household
                </span>
            </button>

            {/* Tutorial */}
            <FridgePalTutorial />

            {/* Log Out */}
            <button
                type="button"
                onClick={() => void handleLogout()}
                aria-label="Log out"
                title="Log Out"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DED5C8] bg-white text-[#665548] shadow-sm transition hover:bg-[#F1EBE2] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
            >
                <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
                </svg>

                <span className="hidden text-sm font-medium sm:inline">
                Log Out
                </span>
            </button>

            </div>
        </div>

        <p className="mt-2 text-center text-sm text-[#897968]">
            Your kitchen, all in one place.
        </p>
        </header>

        {/* Current Household */}
        {householdId && (
        <div id="tutorial-household"
        className="mb-5 flex items-center gap-3 rounded-xl border border-[#DED5C8] bg-[#F1EBE2] p-4 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl">
            🏡
            </div>

            <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[#897968]">
                Current Household
            </p>

            <p className="truncate text-lg font-semibold text-[#665548]">
                {householdName || "Loading household..."}
            </p>

            <p className="text-xs text-[#897968]">
                Your shared kitchen space ♡
            </p>
            </div>
        </div>
        )}


        <div className="relative overflow-hidden rounded-2xl shadow-lg">
          <img
            src="/kitchen-scene.png"
            alt="Your cosy FridgePal kitchen"
            className="block h-auto w-full"
          />
            
            {/* Clickable fridge */}
            <button
            type="button"
            id="tutorial-fridge"
            aria-label="Open your fridge"
            onClick={openFridge}
            className="group absolute left-[16%] top-[14%] h-[64%] w-[26%] cursor-pointer rounded-xl focus-visible:outline-4 focus-visible:outline-[#665548]"
            >
            {/* Highlight effect */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-xl border-2 border-transparent transition-all duration-300 group-hover:border-[#E8F5C8] group-hover:bg-[#FFF9D6]/20 group-hover:shadow-[0_0_28px_10px_rgba(255,249,180,0.45)] group-focus-visible:border-[#E8F5C8]"
            />

            {/* Click to open label */}
            <span className="absolute bottom-[18%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#DED5C8] bg-[#FFF9E9]/95 px-3 py-1.5 text-[10px] font-semibold text-[#665548] shadow-md transition-transform duration-300 group-hover:scale-110 sm:text-sm">
                My Fridge
            </span>
            </button>

            {/* Clickable cupboards and drawers */}
            <button
            type="button"
            id="tutorial-cupboards"
            aria-label="Open your cupboards"
            title="Open Cupboards"
            onClick={() => router.push("/cupboards")}
            className="group absolute left-[65%] top-[58%] h-[24%] w-[26%] cursor-pointer rounded-xl focus-visible:outline-4 focus-visible:outline-[#665548]"
            >
            {/* Highlight effect */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-xl border-2 border-transparent transition-all duration-300 group-hover:border-[#E8F5C8] group-hover:bg-[#FFF9D6]/20 group-hover:shadow-[0_0_28px_10px_rgba(255,249,180,0.45)] group-focus-visible:border-[#E8F5C8]"
            />

            {/* Click to open label */}
            <span className="absolute bottom-[25%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#DED5C8] bg-[#FFF9E9]/95 px-3 py-1.5 text-[10px] font-semibold text-[#665548] shadow-md transition-transform duration-300 group-hover:scale-110 sm:text-sm">
                My Cupboards
            </span>
            </button>

        </div>

        {/* QUICK ADD */}
        <section id="tutorial-quick-add"
                className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-2 text-2xl font-semibold text-[#353535]">
            🌱 Quick Add
        </h2>

        <p className="mb-5 text-sm text-[#897968]">
            Your household's saved products.
            Select one to fill in its grocery details.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {quickAddPresets.map((preset) => (
            <button
                key={preset.id}
                type="button"
                onClick={() => choosePreset(preset)}
                className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-[#D8CFC3] bg-[#F7F3ED] p-4 text-center transition hover:border-[#B5A58F] hover:bg-[#EFE7DC]"
            >
                <PresetImage
                imagePath={preset.image_path}
                name={preset.name}
                />

                <p className="mt-2 text-sm font-semibold text-[#353535]">
                {preset.name}
                </p>

                <p className="mt-1 text-xs text-[#897968]">
                {preset.days_after_opening} days after opening
                </p>
            </button>
            ))}

            <button
            type="button"
            onClick={() => router.push("/quick-add")}
            className="flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C9BDAF] bg-white p-4 text-center transition hover:bg-[#F7F3ED]"
            >
            <span className="mb-2 text-3xl text-[#897968]">
                +
            </span>
            <span className="text-sm font-medium text-[#665548]">
                Create Preset
            </span>
            </button>
        </div>

        {presetError && (
            <p className="mt-3 text-sm text-red-600">
            {presetError}
            </p>
        )}
        </section>

    {/* MANUAL ADD GROCERY */}
    <section
    id="kitchen-manual-add"
    className="mt-8 scroll-mt-6 rounded-xl bg-white p-5 shadow-sm sm:p-6"
    >
    <h2 className="mb-2 text-2xl font-semibold text-[#353535]">
        ➕ Manually Add Grocery
    </h2>

    <p className="mb-5 text-sm text-[#897968]">
        Add a grocery to your fridge or cupboards.
        You can also select a Quick Add preset above.
    </p>

    <form
        onSubmit={(e) => {
        e.preventDefault();
        void addKitchenGrocery();
        }}
        className="space-y-4"
    >
        <div>
        <label htmlFor="kitchen-name" className="mb-1 block text-sm font-medium">
            Food Name
        </label>
        <input
            id="kitchen-name"
            type="text"
            required
            placeholder="e.g. Oat Milk"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[#DED5C8] p-3"
        />
        </div>

        <div className="grid grid-cols-2 gap-3">
        <div>
            <label htmlFor="kitchen-quantity" className="mb-1 block text-sm font-medium">
            Quantity
            </label>
            <input
            id="kitchen-quantity"
            type="number"
            min="0.01"
            step="any"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-[#DED5C8] p-3"
            />
        </div>

        <div>
            <label htmlFor="kitchen-unit" className="mb-1 block text-sm font-medium">
            Unit
            </label>
            <select
            id="kitchen-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg border border-[#DED5C8] bg-white p-3"
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
        </div>
        </div>

        <div>
        <label htmlFor="kitchen-category" className="mb-1 block text-sm font-medium">
            Food Category
        </label>
        <select
            id="kitchen-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-[#DED5C8] bg-white p-3"
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
        </div>

        <div>
        <label htmlFor="kitchen-expiry" className="mb-1 block text-sm font-medium">
            Expiry Date
        </label>
        <input
            id="kitchen-expiry"
            type="date"
            required
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full rounded-lg border border-[#DED5C8] p-3"
        />
        </div>

        <div>
        <label htmlFor="kitchen-location" className="mb-1 block text-sm font-medium">
            Storage Location
        </label>
        <select
            id="kitchen-location"
            value={storageLocation}
            onChange={(e) =>
            setStorageLocation(
                e.target.value as "fridge" | "cupboards"
            )
            }
            className="w-full rounded-lg border border-[#DED5C8] bg-white p-3"
        >
            <option value="fridge">🧊 My Fridge</option>
            <option value="cupboards">🗄️ My Cupboards</option>
        </select>
        </div>

        <button
        type="submit"
        disabled={saving || !householdId}
        className="w-full rounded-xl bg-[#665548] p-3 font-medium text-white transition hover:bg-[#514237] disabled:opacity-50"
        >
        {saving ? "Adding..." : "Add Grocery"}
        </button>
    </form>

    {saveMessage && (
        <p
        role="status"
        className="mt-4 rounded-lg bg-[#F1EBE2] p-3 text-sm text-[#665548]"
        >
        {saveMessage}
        </p>
    )}
    </section>

    {/* EVERYTHING INVENTORY */}

    {/* Expiry filters - Kitchen only */}
    <div id="tutorial-expiry"
        className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
    {[
        {
        id: "expired",
        label: "Expired",
        count: expiredGroceries.length,
        color: "text-red-600",
        },
        {
        id: "expiring",
        label: "Expiring Soon",
        count: expiringGroceries.length,
        color: "text-orange-600",
        },
        {
        id: "fresh",
        label: "Fresh",
        count: freshGroceries.length,
        color: "text-green-700",
        },
    ].map((tab) => (
        <button
        key={tab.id}
        type="button"
        onClick={() =>
            setActiveExpiryTab(
            tab.id as "expired" | "expiring" | "fresh"
            )
        }
        aria-pressed={activeExpiryTab === tab.id}
        className={`rounded-xl border p-3 text-center transition sm:p-4 ${
            activeExpiryTab === tab.id
            ? "border-[#B5A58F] bg-[#EDE5DA] shadow-sm"
            : "border-[#DED5C8] bg-white hover:bg-[#F7F3ED]"
        }`}
        >
        <p className={`text-xl font-bold sm:text-2xl ${tab.color}`}>
            {tab.count}
        </p>
        <p className="mt-1 text-xs font-medium text-[#665548] sm:text-sm">
            {tab.label}
        </p>
        </button>
    ))}
    </div>

    <GroceryInventory
    items={filteredGroceries}
    title="🧺 Everything"
    showLocation={true}
    saving={saving}
    onEdit={startEditing}
    onRemove={(id) => void removeItem(id)}
    />

    {/* EDIT GROCERY */}
    {editingItem && (
    <section
        id="kitchen-edit-grocery"
        className="mt-6 scroll-mt-6 rounded-xl border border-[#DED5C8] bg-white p-5 shadow-sm sm:p-6"
    >
        <h2 className="mb-4 text-xl font-semibold text-[#665548]">
        ✏️ Edit Grocery
        </h2>

        <div className="space-y-3">
        <label className="block text-sm font-medium">
            Food Name
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
            Expiry Date
            <input
            type="date"
            value={editExpiry}
            onChange={(e) => setEditExpiry(e.target.value)}
            className="mt-1 w-full rounded-lg border p-3"
            />
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
    </section>
    )}

    {/* Notification Settings */}
    <div id="tutorial-notifications" className="mt-8">
    <NotificationSettings />
    </div>

      </div>
    </main>
  );
}
