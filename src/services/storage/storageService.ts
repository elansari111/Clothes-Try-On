/**
 * Generic Typed Local Storage Service
 */
export class StorageService {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`StorageService.get failed for key "${key}":`, e);
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`StorageService.set failed for key "${key}":`, e);
      return false;
    }
  }

  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`StorageService.remove failed for key "${key}":`, e);
      return false;
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('StorageService.clear failed:', e);
    }
  }
}
