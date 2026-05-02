import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

/**
 * Hook to handle push notification permissions and device token registration.
 *
 * Usage:
 * ```tsx
 * const { expoPushToken, notification, error } = usePushNotifications({
 *   onNotificationTap: (data) => handleNavigation(data)
 * });
 * ```
 */
export function usePushNotifications(options?: {
  onNotificationTap?: (data: Record<string, any>) => void;
}) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Request permissions and get token
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          setExpoPushToken(token);
        }
      })
      .catch((err) => {
        const errorMessage = err.message || "Failed to get push token";
        setError(errorMessage);

        // Log but don't throw - push notifications are optional for development
        console.warn("Push notification setup failed:", errorMessage);
        console.warn("This is expected in Expo Go. Use a development build for full push notification support.");
      });

    // T5.1 — Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      console.log("Foreground notification received:", notification.request.content);
    });

    // T5.3 — Listener for when user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped:", data);

      // Call the callback if provided (T5.4, T5.5)
      if (options?.onNotificationTap) {
        options.onNotificationTap(data);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [options?.onNotificationTap]);

  return {
    expoPushToken,
    notification,
    error,
  };
}

/**
 * Register for push notifications and get the Expo Push Token.
 * Handles permission requests for both iOS and Android.
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === "android") {
    // Set up notification channel for Android (required for Android 8.0+)
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4F46E5",
    });
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If permission not granted, request it
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Permission denied (T1.5)
  if (finalStatus !== "granted") {
    console.warn("Push notification permission denied");

    // Show user-friendly alert explaining the impact
    Alert.alert(
      "Notifications Disabled",
      "You won't receive important updates about your registrations, payments, and upcoming competitions. You can enable notifications later in your device settings.",
      [{ text: "OK" }]
    );

    return null;
  }

  // Get the Expo Push Token
  // Note: Push notifications don't work in Expo Go (SDK 53+)
  // For production: run `npx expo init` or add projectId to app.json:
  // "extra": { "eas": { "projectId": "your-project-id" } }
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
  } catch (error: any) {
    // Push notifications not available - this is expected in Expo Go
    console.warn("Push token not available:", error.message);
    console.warn("Push notifications require a development or production build.");
    return null; // Return null instead of throwing - app can still work without push
  }

  return token;
}

/**
 * Configure how notifications are displayed when app is in foreground.
 * T5.1 — Show alert, play sound, and update badge for foreground notifications.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * T5.2 — Clear the app badge count.
 * Call this when user views notifications or when app becomes active.
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * T5.2 — Get current badge count.
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}
