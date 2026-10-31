
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FridgePal",
    short_name: "FridgePal",
    description:
      "Track your household groceries and reduce food waste.",
    start_url: "/kitchen",
    scope: "/",
    display: "standalone",
    background_color: "#f0fdf4",
    theme_color: "#15803d",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
