
"use client";

import { driver, type DriveStep } from "driver.js";
import { usePathname, useRouter } from "next/navigation";

export default function FridgePalTutorial() {
  const pathname = usePathname();
  const router = useRouter();

  function startTutorial() {
    // Always start the full tutorial from My Kitchen.
    if (pathname !== "/kitchen") {
      sessionStorage.setItem("fridgepal-start-tour", "true");
      router.push("/kitchen");
      return;
    }

    runTutorial();
  }

  function runTutorial() {
    const steps: DriveStep[] = [
      {
        popover: {
          title: "Welcome to FridgePal! 🥬",
          description:
            "Let's explore your kitchen and learn how to manage your groceries.",
        },
      },
      {
        element: "#tutorial-household",
        popover: {
          title: "Your Household 🏠",
          description:
            "Everyone in your household shares the same kitchen inventory.",
        },
      },
      {
        element: "#tutorial-fridge",
        popover: {
          title: "My Fridge 🧊",
          description:
            "Click the illustrated fridge to open My Fridge. The cupboards work the same way!",
        },
      },
      {
        popover: {
          title: "Navigate Your Kitchen 🧭",
          description:
            "My Fridge and My Cupboards have similar interfaces. Use the navigation tabs to switch between My Kitchen, My Fridge and My Cupboards. Both inventory pages let you manually add, edit and remove groceries, sorted by expiry date.",
        },
      },
      {
        element: "#tutorial-quick-add",
        popover: {
          title: "Quick Add 🌱",
          description:
            "Select a saved product to automatically fill in its details and calculate its expiry date.",
        },
      },
      {
        element: "#kitchen-manual-add",
        popover: {
          title: "Add Groceries ✍️",
          description:
            "Enter your grocery details, choose Fridge or Cupboards, and save your item.",
        },
      },
      {
        element: "#tutorial-expiry",
        popover: {
          title: "Track Expiry Dates 📅",
          description:
            "Switch between Expired, Expiring Soon and Fresh to see which groceries need attention.",
        },
      },
      {
        element: "#tutorial-grocery-list",
        popover: {
          title: "Everything 🧺",
          description:
            "View groceries from both storage locations. Edit, remove or move items between your fridge and cupboards.",
        },
      },
      {
        element: "#tutorial-notifications",
        popover: {
          title: "Expiry Reminders 🔔",
          description:
            "Manage notifications to stay informed about groceries approaching expiry.",
        },
      },
      {
        popover: {
          title: "You're All Set! 🎉",
          description:
            "Enjoy your kitchen! You can restart this tutorial anytime using the Tutorial button.",
        },
      },
    ];

    const tour = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.65,
      stagePadding: 10,
      stageRadius: 12,
      popoverClass: "fridgepal-tour",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Finish 🎉",
      steps,
    });

    tour.drive();
  }

  return (
    <button
      type="button"
      onClick={startTutorial}
      aria-label="Start FridgePal tutorial"
      title="Tutorial"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DED5C8] bg-white text-[#665548] shadow-sm transition hover:bg-[#F1EBE2] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
    >
      <span aria-hidden="true">❔</span>
      <span className="hidden text-sm font-medium sm:inline">
        Tutorial
      </span>
    </button>
  );
}
