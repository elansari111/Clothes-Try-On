export type AppRoute = 'virtual-mirror' | 'dashboard' | 'wardrobe' | 'explore' | 'settings';

export interface RouteConfig {
  path: AppRoute;
  title: string;
}

export const APP_ROUTES: RouteConfig[] = [
  { path: 'virtual-mirror', title: 'Virtual Mirror' },
  { path: 'dashboard', title: 'Dashboard' },
  { path: 'wardrobe', title: 'Wardrobe' },
  { path: 'explore', title: 'Explore' },
  { path: 'settings', title: 'Settings' },
];
