import { Stack } from 'expo-router';

// Eigener Stack für die Subscription-Routen ohne Default-Header
// (sonst zeigt expo-router den Routennamen "subscription/add" oben an).
export default function SubscriptionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
