#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const raw = readFileSync(resolve(".env.local"), "utf8");
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: targets, error } = await admin
  .from("bookings")
  .select("id, reference, status")
  .is("deleted_at", null)
  .or(
    "notes_internal.ilike.%Repeat dispatch test%,reference.in.(CB-001027,CB-001028,CB-001029,CB-001025,CB-001026)"
  );

if (error) throw error;
if (!targets?.length) {
  console.log("Nothing active to stop");
  process.exit(0);
}

const ids = targets.map((b) => b.id);
const now = new Date().toISOString();

const { error: runErr } = await admin
  .from("job_dispatch_runs")
  .update({ status: "cancelled", released_at: now, updated_at: now })
  .in("booking_id", ids)
  .eq("status", "active");
if (runErr) throw runErr;

const { error: legErr } = await admin
  .from("booking_legs")
  .update({ status: "CANCELLED", updated_at: now })
  .in("booking_id", ids)
  .is("deleted_at", null)
  .neq("status", "CANCELLED");
if (legErr) throw legErr;

const { data: stopped, error: bookErr } = await admin
  .from("bookings")
  .update({
    status: "CANCELLED",
    deleted_at: now,
    updated_at: now,
    notes_internal: "Repeat dispatch test | stopped by request",
  })
  .in("id", ids)
  .select("reference");
if (bookErr) throw bookErr;

console.log("Stopped:", (stopped || []).map((b) => b.reference).sort().join(", "));
