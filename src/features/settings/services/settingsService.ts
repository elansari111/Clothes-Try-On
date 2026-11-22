import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';
import { StorageService } from '../../../services/storage/storageService';

const SETTINGS_KEY = 'vto_app_settings_v1';

export class SettingsService {
  static getSettings(): AppSettings {
    return StorageService.get<AppSettings>(SETTINGS_KEY, DEFAULT_APP_SETTINGS);
  }

  static saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    StorageService.set(SETTINGS_KEY, updated);
    return updated;
  }
}
