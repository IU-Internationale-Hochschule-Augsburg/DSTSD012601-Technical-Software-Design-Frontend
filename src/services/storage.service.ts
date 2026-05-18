import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Basic wrapper over AsyncStorage with generic JSON parsing/stringifying.
 */
export const StorageService = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (e) {
      console.error(`Error writing ${key} to storage:`, e);
      return false;
    }
  },

  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`Error removing ${key} from storage:`, e);
      return false;
    }
  },

  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (e) {
      console.error('Error clearing storage:', e);
      return false;
    }
  },
};
