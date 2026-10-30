
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function InventoryHeaderButtons() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          aria-label="Log out"
          title="Log Out"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DED5C8] bg-white text-[#665548] shadow-sm transition hover:bg-[#F1EBE2] disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
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
            {loggingOut ? "Logging out..." : "Log Out"}
          </span>
        </button>
      </div>

      {error && (
        <p role="alert" className="max-w-48 text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
