
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type Grocery = {
  name: string;
  expiry: string;
  household_id: string;
};

type Member = {
  user_id: string;
  household_id: string;
};

type Subscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

function singaporeDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysUntil(date: string, today: string) {
  const expiry = Date.parse(date + "T00:00:00Z");
  const current = Date.parse(today + "T00:00:00Z");
  return Math.round((expiry - current) / 86400000);
}

export async function GET(request: NextRequest) {
  // Only our scheduler can trigger this route.
  const secret = process.env.CRON_SECRET;

  if (
    !secret ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!url || !key || !publicKey || !privateKey || !subject) {
      throw new Error("Missing server configuration.");
    }

    const db = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const today = singaporeDate();

    const { data: groceries, error: groceryError } = await db
      .from("groceries")
      .select("name, expiry, household_id")
      .lte("expiry", new Date(
        Date.parse(today + "T00:00:00Z") + 3 * 86400000
      ).toISOString().slice(0, 10));

    if (groceryError) throw groceryError;

    const { data: members, error: memberError } = await db
      .from("household_members")
      .select("user_id, household_id");

    if (memberError) throw memberError;

    const { data: subscriptions, error: subError } = await db
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth_key");

    if (subError) throw subError;

    const householdGroceries = new Map<string, Grocery[]>();

    for (const food of (groceries ?? []) as Grocery[]) {
      const list = householdGroceries.get(food.household_id) ?? [];
      list.push(food);
      householdGroceries.set(food.household_id, list);
    }

    const userHouseholds = new Map<string, string>();

    for (const member of (members ?? []) as Member[]) {
      userHouseholds.set(member.user_id, member.household_id);
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const sub of (subscriptions ?? []) as Subscription[]) {
      const householdId = userHouseholds.get(sub.user_id);
      if (!householdId) continue;

      const foods = householdGroceries.get(householdId) ?? [];
      if (foods.length === 0) continue;

      // Claim today's reminder before sending.
      const { error: claimError } = await db
        .from("notification_history")
        .insert({
          household_id: householdId,
          subscription_id: sub.id,
          reminder_date: today,
        });

      if (claimError) {
        if (claimError.code === "23505") {
          skipped++;
          continue;
        }
        throw claimError;
      }

      const expired = foods.filter(
        (f) => daysUntil(f.expiry, today) < 0
      );

      const expiring = foods.filter(
        (f) => daysUntil(f.expiry, today) >= 0
      );

      const lines = [
        ...expired.map((f) => `${f.name}: expired`),
        ...expiring.map((f) => {
          const days = daysUntil(f.expiry, today);
          return `${f.name}: ${days === 0
            ? "expires today"
            : `expires in ${days} day(s)`}`;
        }),
      ];

      const body = [
        ...lines.slice(0, 4),
        ...(lines.length > 4
          ? [`And ${lines.length - 4} more item(s).`]
          : []),
      ].join("\n");

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_key,
            },
          },
          JSON.stringify({
            title: "🥬 FridgePal Expiry Reminder",
            body,
          })
        );

        sent++;
      } catch (error) {
        failed++;
        console.error("Push delivery failed:", error);

        // Allow a later run to retry a failed send.
        await db
          .from("notification_history")
          .delete()
          .eq("subscription_id", sub.id)
          .eq("reminder_date", today);

        // Remove subscriptions that have permanently expired.
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    console.error("Reminder job failed:", error);

    return NextResponse.json(
      { error: "Reminder job failed." },
      { status: 500 }
    );
  }
}
