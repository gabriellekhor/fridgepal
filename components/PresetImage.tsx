
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  imagePath: string | null;
  name: string;
};

export default function PresetImage({
  imagePath,
  name,
}: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) {
      setImageUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    async function loadImage() {
        const { data: authData } = await supabase.auth.getUser();
        console.log("Preset image debug:", {
            signedIn: !!authData.user,
            imagePath,
        });
      const { data, error } = await supabase.storage
        .from("preset-images")
        .download(imagePath!);
      
        if (error || !data) {
        console.warn("Preset image download failed:", {
            message: error?.message,
            statusCode: error && "statusCode" in error
            ? error.statusCode
            : undefined,
        });
        return;
        }

      const url = URL.createObjectURL(data);
      objectUrl = url;

      if (active) {
        setImageUrl(url);
      } else {
        URL.revokeObjectURL(url);
      }
    }

    setImageUrl(null);
    void loadImage();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imagePath]);

  if (!imageUrl) {
    return <span className="mb-3 text-4xl">📦</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="mb-3 h-24 w-24 object-contain"
    />
  );
}
