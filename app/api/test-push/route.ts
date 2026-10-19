
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (
      !url || !key || !publicKey ||
      !privateKey || !subject
    ) {
      throw new Error("Missing server configuration.");
    }

    // Create a Supabase client for this request.
    const supabase = createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify the caller's access token.
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid login session." },
        { status: 401 }
      );
    }

    // RLS limits this query to the caller's subscriptions.
    const { data: subscriptions, error: dbError } =
      await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth_key")
        .eq("user_id", authData.user.id);

    if (dbError) throw dbError;

    if (!subscriptions?.length) {
      return NextResponse.json(
        { error: "No subscribed devices found." },
        { status: 404 }
      );
    }

    webpush.setVapidDetails(
      subject,
      publicKey,
      privateKey
    );

    const payload = JSON.stringify({
      title: "🥬 FridgePal Test!",
      body: "Your push notifications are working!",
    });

    let sent = 0;

    for (const item of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: item.endpoint,
            keys: {
              p256dh: item.p256dh,
              auth: item.auth_key,
            },
          },
          payload
        );

        sent++;
      } catch (error) {
        console.error("Push delivery failed:", error);
      }
    }

    if (sent === 0) {
      return NextResponse.json(
        { error: "Could not send the notification." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sent,
    });
  } catch (error) {
    console.error("Test push error:", error);

    return NextResponse.json(
      { error: "Could not send test notification." },
      { status: 500 }
    );
  }
}
