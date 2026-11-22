import { ClothingCategory } from '../types/clothing';

export const CLOTHING_CATEGORIES: ClothingCategory[] = [
  'T-Shirts',
  'Shirts',
  'Jackets',
  'Pants',
  'Other',
];

export const CATEGORY_FILTERS = ['All', ...CLOTHING_CATEGORIES] as const;
