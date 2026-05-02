/**
 * Analytics wrapper — thin abstraction over whatever product analytics
 * tool we wire up (PostHog, Mixpanel, etc.). Call sites don't change
 * when we swap the underlying provider.
 *
 * To connect PostHog:
 *   1. npm install posthog-react-native
 *   2. Set EXPO_PUBLIC_POSTHOG_KEY in .env.local
 *   3. Uncomment the PostHog section below and call posthog.capture() in track().
 */

const ANALYTICS_ENABLED =
  !!process.env.EXPO_PUBLIC_POSTHOG_KEY &&
  process.env.NODE_ENV !== "test";

export const Analytics = {
  /**
   * Identify the logged-in user so events are attributed correctly.
   * Call after successful login / signup.
   */
  identify(userId: string, traits?: Record<string, any>) {
    if (!ANALYTICS_ENABLED) return;
    // posthog.identify(userId, traits);
    console.debug("[analytics] identify", userId, traits);
  },

  /**
   * Track a product event.
   * Standard events:
   *   signup_completed  — new account created
   *   competition_viewed — detail page opened
   *   registration_started — Register CTA tapped
   *   registration_paid — payment confirmed
   */
  track(event: string, properties?: Record<string, any>) {
    if (!ANALYTICS_ENABLED) return;
    // posthog.capture(event, properties);
    console.debug("[analytics] track", event, properties);
  },

  /** Call on logout to disassociate future events. */
  reset() {
    if (!ANALYTICS_ENABLED) return;
    // posthog.reset();
    console.debug("[analytics] reset");
  },
};
