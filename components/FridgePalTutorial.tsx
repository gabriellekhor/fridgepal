
"use client";

import { driver } from "driver.js";

export default function FridgePalTutorial() {
  function startTutorial() {
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

      steps: [
        {
          popover: {
            title: "Welcome to FridgePal! 🥬",
            description:
              "Let's take a quick tour of your fridge and learn how to use its features.",
          },
        },
        {
          element: "#tutorial-household",
          popover: {
            title: "Your Household 🏠",
            description:
              "This shows which household you're currently in. Everyone in the same household shares the same grocery inventory.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tutorial-quick-add",
          popover: {
            title: "Quick Add 📦",
            description:
              "Select a saved product to automatically fill in its details and calculate an expiry date. You can also create your own presets!",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tutorial-manual-add",
          popover: {
            title: "Manually Add Groceries ✍️",
            description:
              "Enter a grocery's name, quantity, category and expiry date, then tap Add Food.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tutorial-expiry",
          popover: {
            title: "Track Expiry Dates 📅",
            description:
              "Switch between Expired, Expiring Soon and Fresh to see which groceries need your attention.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tutorial-grocery-list",
          popover: {
            title: "Manage Your Groceries 📝",
            description:
              "View your groceries here. Use Edit to correct an item or Remove when you've finished using it.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tutorial-notifications",
          popover: {
            title: "Expiry Reminders 🔔",
            description:
              "Enable notifications to receive reminders when groceries are approaching expiry.",
            side: "top",
            align: "center",
          },
        },
        {
          popover: {
            title: "You're all set! 🎉",
            description:
              "That's it! You can restart this tutorial anytime using the Tutorial button.",
          },
        },
      ],
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
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
        </svg>

        <span className="hidden text-sm font-medium sm:inline">
        Tutorial
        </span>
    </button>
    );
}
