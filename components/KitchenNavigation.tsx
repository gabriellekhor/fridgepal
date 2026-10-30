
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function KitchenNavigation() {
  const pathname = usePathname();

  const tabs = [
    {
      label: "My Kitchen",
      href: "/kitchen",
      icon: "🏡",
    },
    {
      label: "My Fridge",
      href: "/",
      icon: "🧊",
    },
    {
      label: "My Cupboards",
      href: "/cupboards",
      icon: "🗄️",
    },
  ];

  return (
    <nav
    id="tutorial-navigation"
      aria-label="Kitchen navigation"
      className="my-5 grid grid-cols-3 gap-2"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition ${
              active
                ? "border-[#B5A58F] bg-[#EDE5DA] text-[#665548]"
                : "border-[#DED5C8] bg-white text-[#897968] hover:bg-[#F7F3ED]"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>

            <span className="text-xs font-semibold sm:text-sm">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
