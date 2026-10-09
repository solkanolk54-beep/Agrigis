import { Farm, JoinedFarmCrop, GeoPoint } from '../types/database';
import { stAreaHectares, stAreaSqMeters, stDistanceKm } from './spatialEngine';

export interface GeoJsonExportOptions {
  geometryMode: 'polygons' | 'points' | 'both';
  includeCropsData: boolean;
  buyerLocation?: GeoPoint;
}

/**
 * Generates standard RFC 7946 GeoJSON FeatureCollection
 * Ready for import into QGIS, ArcGIS, Mapbox, or PostGIS via ST_GeomFromGeoJSON()
 */
export function generateFarmsGeoJson(
  farms: Farm[],
  joinedCrops: JoinedFarmCrop[],
  options: GeoJsonExportOptions = {
    geometryMode: 'polygons',
    includeCropsData: true,
  }
) {
  const features: any[] = [];

  farms.forEach((farm) => {
    const farmCrops = joinedCrops.filter((jc) => jc.farm.id === farm.id);
    const distanceKm = options.buyerLocation
      ? stDistanceKm(farm.location, options.buyerLocation)
      : undefined;

    const areaHectares = stAreaHectares(farm.boundary);
    const areaSqMeters = stAreaSqMeters(farm.boundary);

    // Crops payload formatted for GIS attribute tables
    const cropsProperties = options.includeCropsData
      ? {
          crops_count: farmCrops.length,
          crops_summary: farmCrops.map((c) => c.crop.title).join(' | '),
          crops_categories: Array.from(new Set(farmCrops.map((c) => c.catalog.category))).join(', '),
          crops_details: farmCrops.map((c) => ({
            id: c.crop.id,
            title: c.crop.title,
            catalog_name: c.catalog.name_ar,
            category: c.catalog.category,
            price_per_unit_dzd: c.crop.price_per_unit,
            unit: c.crop.unit,
            quantity_available: c.crop.quantity_available,
            is_organic: c.crop.is_organic,
            harvest_date: c.crop.harvest_date,
            status: c.crop.status,
          })),
        }
      : {};

    const commonProperties = {
      farm_id: farm.id,
      farm_name: farm.name,
      description: farm.description,
      wilaya: farm.wilaya,
      commune: farm.commune,
      address_text: farm.address_text,
      is_active: farm.is_active,
      centroid_longitude: farm.location.longitude,
      centroid_latitude: farm.location.latitude,
      area_hectares: areaHectares,
      area_sq_meters: areaSqMeters,
      distance_from_query_point_km: distanceKm,
      srid: 4326,
      created_at: farm.created_at,
      ...cropsProperties,
    };

    // 1. Polygon Feature (Boundary)
    if (
      (options.geometryMode === 'polygons' || options.geometryMode === 'both') &&
      farm.boundary &&
      farm.boundary.length >= 3
    ) {
      // Ensure polygon is closed for GeoJSON compliance
      const ring = [...farm.boundary];
      if (
        ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1]
      ) {
        ring.push(ring[0]);
      }

      features.push({
        type: 'Feature',
        id: `${farm.id}_polygon`,
        geometry: {
          type: 'Polygon',
          coordinates: [ring], // GeoJSON standard format: [[[lon, lat], ...]]
        },
        properties: {
          ...commonProperties,
          feature_type: 'farm_boundary_polygon',
        },
      });
    }

    // 2. Point Feature (Centroid location)
    if (options.geometryMode === 'points' || options.geometryMode === 'both') {
      features.push({
        type: 'Feature',
        id: `${farm.id}_point`,
        geometry: {
          type: 'Point',
          coordinates: [farm.location.longitude, farm.location.latitude],
        },
        properties: {
          ...commonProperties,
          feature_type: 'farm_centroid_point',
        },
      });
    }
  });

  return {
    type: 'FeatureCollection',
    name: 'AgriGIS_Algeria_Farms_Export',
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
      },
    },
    metadata: {
      exported_at: new Date().toISOString(),
      generator: 'AgriGIS Algérie Spatial Platform',
      source_srid: 4326,
      datum: 'WGS84',
      total_farms: farms.length,
      total_features: features.length,
      postgis_import_command:
        "INSERT INTO farms (name, boundary) SELECT (json_build_object(...)) ... OR use ogr2ogr -f PostgreSQL PG:\"dbname=agridb\" export.geojson",
    },
    features,
  };
}

/**
 * Initiates browser download of GeoJSON file
 */
export function downloadGeoJsonFile(geoJsonData: any, filename?: string) {
  const jsonStr = JSON.stringify(geoJsonData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/geo+json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = filename || `agrigis_algeria_farms_${dateStr}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
