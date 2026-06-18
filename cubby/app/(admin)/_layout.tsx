import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="create-host" />
      <Stack.Screen name="manage-hosts" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="revenue" />
      <Stack.Screen name="host-payouts" />
    </Stack>
  );
}
