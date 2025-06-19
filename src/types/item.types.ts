import { ItemRigidity } from './enums';

export interface ItemDimensions {
  length: number;
  width: number;
  height: number;
}

export interface Item {
  name: string;
  dimensions: ItemDimensions;
  weight: number; // kg
  rigidity: ItemRigidity;
  category: 'luggage' | 'baby_gear' | 'sports' | 'shopping' | 'equipment' | 'custom';
  cabinSuitable: boolean;
  compressibility: number; // percentage, 0-30%
  stackable: boolean;
  orientationConstraints: 'any' | 'upright_only' | 'flat_only';
  customItem: boolean;
} 