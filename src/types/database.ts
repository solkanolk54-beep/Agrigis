/**
 * Database Schema Types mirroring PostgreSQL + PostGIS tables
 */

export type UserType = 'FARMER' | 'BUYER' | 'TRANSPORTER' | 'ADMIN';

export interface User {
  id: string; // UUID
  full_name: string;
  phone_number: string;
  email: string | null;
  user_type: UserType;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeoPoint {
  longitude: number; // ST_X
  latitude: number;  // ST_Y
}

// Polygon boundary as array of [lng, lat] coordinates (GeoJSON / PostGIS standard)
export type GeoPolygon = [number, number][];

export interface Farm {
  id: string; // UUID
  farmer_id: string;
  name: string;
  description: string;
  wilaya: string;
  commune: string;
  location: GeoPoint; // GEOMETRY(Point, 4326)
  boundary?: GeoPolygon; // GEOMETRY(Polygon, 4326)
  address_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CropCatalog {
  id: number; // SERIAL
  name_ar: string;
  category: string;
  unit_default: string; // كغ، قنطار، لتر، صندوق
}

export type CropStatus = 'AVAILABLE' | 'PRE_ORDER' | 'SOLD_OUT';

export interface FarmCrop {
  id: string; // UUID
  farm_id: string;
  crop_catalog_id: number;
  title: string;
  price_per_unit: number;
  unit: string;
  quantity_available: number;
  is_organic: boolean;
  harvest_date: string; // YYYY-MM-DD
  status: CropStatus;
  created_at: string;
}

export type MediaType = 'IMAGE' | 'CERTIFICATE_PDF' | 'VIDEO';

export interface FarmMedia {
  id: string; // UUID
  farm_id: string | null;
  farm_crop_id: string | null;
  media_url: string;
  media_type: MediaType;
  is_primary: boolean;
  created_at: string;
}

// Joined views for UI rendering
export interface JoinedFarmCrop {
  crop: FarmCrop;
  farm: Farm;
  catalog: CropCatalog;
  farmer: User;
  media: FarmMedia[];
  distance_km?: number;
}
