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
    price: '120 €',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '4',
    name: 'Pantalon Cargo Noir',
    category: 'Pants',
    price: '85 €',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '5',
    name: 'Blouson Bomber Vert',
    category: 'Jackets',
    price: '145 €',
    image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '6',
    name: 'Chemise Blanche Lin',
    category: 'Shirts',
    price: '70 €',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80',
  },
];
