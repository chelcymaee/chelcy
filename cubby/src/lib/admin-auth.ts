import AsyncStorage from '@react-native-async-storage/async-storage';

export async function checkAdminSession(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('cubby_admin_session');
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw);
    if (!expiresAt || Date.now() > expiresAt) {
      await AsyncStorage.removeItem('cubby_admin_session');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearAdminSession() {
  await AsyncStorage.removeItem('cubby_admin_session');
}
