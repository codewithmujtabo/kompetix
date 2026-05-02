import { DEV_BYPASS_AUTH } from "@/constants/mock-user";
import { Redirect } from "expo-router";

/**
 * App entry point.
 *
 * ─── To work on Login / Register ──────────────────────────────
 *   Open constants/mock-user.ts  →  set  DEV_BYPASS_AUTH = false
 *
 * ─── To skip auth and build inside screens ────────────────────
 *   Open constants/mock-user.ts  →  set  DEV_BYPASS_AUTH = true
 */
export default function Index() {
  if (DEV_BYPASS_AUTH) {
    return <Redirect href="/(tabs)" />;
  }
  return (
    <Redirect href="/(onboarding)" />
  );
}
