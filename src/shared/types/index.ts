// Re-export domain and feature types
export * from './camera';
export * from './pose';
export * from './clothing';
export * from './rendering';

// Navigation & Generic Dashboard Types (from initial UI phase)
export interface Garment {
  id: string;
  name: string;
  category: 'T-Shirts' | 'Shirts' | 'Jackets' | 'Pants';
  price: string;
  image: string;
}

export type Category = 'All' | 'T-Shirts' | 'Shirts' | 'Jackets' | 'Pants';

export interface Product {
  id: string;
  name: string;
  category: 'T-Shirts' | 'Shirts' | 'Jackets' | 'Pants';
  brand: string;
  price: number;
  color: string;
  colorHex: string;
  imageUrl: string;
  description: string;
  isSaved?: boolean;
  dateAdded?: string;
  fitType?: 'Slim Fit' | 'Regular Fit' | 'Oversized';
}

export type PageId = 'dashboard' | 'virtual-mirror' | 'explore' | 'wardrobe' | 'settings';

export interface NavigationItem {
  id: PageId;
  label: string;
  description?: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  change?: string;
  positive?: boolean;
}

export const CLOTHES: Garment[] = [
  {
    id: '1',
    name: 'T-Shirt Noir Minimal',
    category: 'T-Shirts',
    price: '35 €',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    name: 'Chemise Oxford Bleue',
    category: 'Shirts',
    price: '65 €',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '3',
    name: 'Veste Coupe-Vent Grise',
    category: 'Jackets',
    price: '110 €',
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '4',
    name: 'Pantalon Chino Beige',
    category: 'Pants',
    price: '55 €',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
  },
];
