
"use client";

export type Grocery = {
  id: number;
  name: string;
  expiry: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  storage_location?: "fridge" | "cupboards";
};

type GroceryInventoryProps = {
  items: Grocery[];
  title?: string;
  showLocation?: boolean;
  saving?: boolean;
  onEdit: (item: Grocery) => void;
  onRemove: (id: number) => void;
};

function getExpiryStatus(expiry: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(expiry + "T00:00:00");

  const days = Math.round(
    (expiryDate.getTime() - today.getTime()) / 86400000
  );

  if (days < 0) {
    return {
      label: "Expired",
      color: "text-red-600",
    };
  }

  if (days === 0) {
    return {
      label: "Expires today",
      color: "text-orange-600",
    };
  }

  if (days <= 3) {
    return {
      label: `Expiring in ${days} days`,
      color: "text-orange-600",
    };
  }

  return {
    label: `${days} days left`,
    color: "text-green-700",
  };
}

export default function GroceryInventory({
  items,
  title = "My Groceries",
  showLocation = false,
  saving = false,
  onEdit,
  onRemove,
}: GroceryInventoryProps) {
  const sortedItems = [...items].sort((a, b) =>
    a.expiry.localeCompare(b.expiry)
  );

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-2xl font-semibold text-[#353535]">
        {title} ({items.length} items)
      </h2>

      <div
        id="tutorial-grocery-list"
        className="min-h-16 space-y-3 rounded-xl"
      >
        {sortedItems.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
            No groceries here yet!
          </div>
        ) : (
          sortedItems.map((item) => {
            const status = getExpiryStatus(item.expiry);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E0D6] bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#353535]">
                    {item.name}
                  </h3>

                  <p className="text-sm text-gray-600">
                    {item.quantity ?? 1}{" "}
                    {item.unit ?? "pieces"}
                    {" · "}
                    {item.category ?? "Other"}
                  </p>

                  {showLocation && (
                    <p className="mt-1 text-xs text-[#897968]">
                      {item.storage_location === "cupboards"
                        ? "🗄️ Cupboards"
                        : "🧊 Fridge"}
                    </p>
                  )}

                  <p className="mt-1 text-sm text-gray-500">
                    Expiry: {item.expiry}
                  </p>

                  <p
                    className={`text-sm font-medium ${status.color}`}
                  >
                    {status.label}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    disabled={saving}
                    className="rounded-lg bg-[#F1EBE2] px-3 py-2 text-sm font-medium text-[#665548] hover:bg-[#E5D9CA] disabled:opacity-50"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    disabled={saving}
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
