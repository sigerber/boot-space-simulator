import { IrregularitySeverity } from './enums';

export interface BootMeasurements {
  length: number;
  width: number;
  height: number;
  openingWidth?: number;
  openingHeight?: number;
}

export interface BootIrregularity {
  type: 'wheel_wells' | 'spare_tire_bump' | 'sloped_floor' | 'narrow_opening' | 'side_storage';
  severity: IrregularitySeverity;
}

export interface CabinSpace {
  length: number;
  width: number;
  height: number;
}

export interface CabinOverflowSpaces {
  rearFloor?: CabinSpace;
  rearSeatGap?: CabinSpace;
  frontPassengerFloor?: CabinSpace;
}

export interface Vehicle {
  makeModel: string;
  categoryTags: string[];
  bootMeasurements: BootMeasurements;
  bootIrregularities: BootIrregularity[];
  cabinOverflowSpaces: CabinOverflowSpaces;
  measurementConfidence: 'manufacturer' | 'verified' | 'user_submitted';
  submissionCount: number;
  lastUpdated: string;
  hide?: boolean;
} 