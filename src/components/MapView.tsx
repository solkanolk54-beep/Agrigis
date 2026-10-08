import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Farm, GeoPoint, JoinedFarmCrop, GeoPolygon } from '../types/database';
import { stContains, stDistanceKm } from '../lib/spatialEngine';
import {
  MapPin,
  Navigation,
  Compass,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  Maximize2,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

interface MapViewProps {
  farms: Farm[];
  buyerLocation: GeoPoint;
  setBuyerLocation: (point: GeoPoint) => void;
  maxDistanceKm: number;
  selectedFarmId: string | null;
  setSelectedFarmId: (farmId: string | null) => void;
  joinedCrops: JoinedFarmCrop[];
  onSelectCropForDetails?: (crop: JoinedFarmCrop) => void;
}

export type FarmStatusCode = 'AVAILABLE' | 'ORGANIC' | 'PRE_ORDER' | 'SOLD_OUT' | 'INACTIVE';

export interface FarmStatusConfig {
  code: FarmStatusCode;
  label: string;
  color: string;
  strokeColor: string;
  fillColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  emoji: string;
}

/**
 * Determines a farm's operational status and color styling based on its active crops
 */
export function getFarmStatus(farm: Farm, farmCrops: JoinedFarmCrop[]): FarmStatusConfig {
  if (!farm.is_active) {
    return {
      code: 'INACTIVE',
      label: 'مستثمرة غير نشطة حالياً',
      color: '#78716c',
      strokeColor: '#57534e',
      fillColor: '#78716c',
      badgeBg: 'bg-stone-800',
      badgeBorder: 'border-stone-700',
      badgeText: 'text-stone-400',
      emoji: '⚪',
    };
  }

  // Check if farm has organic crops
  const hasOrganic = farmCrops.some((c) => c.crop.is_organic);
  // Check if farm has immediate available crops
  const hasAvailable = farmCrops.some((c) => c.crop.status === 'AVAILABLE');
  // Check if farm has pre-orders
  const hasPreOrder = farmCrops.some((c) => c.crop.status === 'PRE_ORDER');
  const allSoldOut = farmCrops.length > 0 && farmCrops.every((c) => c.crop.status === 'SOLD_OUT');

  if (allSoldOut) {
    return {
      code: 'SOLD_OUT',
      label: 'نفذت الكميات مؤقتاً',
      color: '#f43f5e',
      strokeColor: '#e11d48',
      fillColor: '#f43f5e',
      badgeBg: 'bg-rose-950/80',
      badgeBorder: 'border-rose-500/40',
      badgeText: 'text-rose-300',
      emoji: '🔴',
    };
  }

  if (hasOrganic) {
    return {
      code: 'ORGANIC',
      label: 'عضوي معتمد 100% (Bio)',
      color: '#14b8a6', // Teal
      strokeColor: '#0d9488',
      fillColor: '#14b8a6',
      badgeBg: 'bg-teal-950/80',
      badgeBorder: 'border-teal-500/40',
      badgeText: 'text-teal-300',
      emoji: '🌿',
    };
  }

  if (hasAvailable) {
    return {
      code: 'AVAILABLE',
      label: 'متوفر فوري للتحميل والشحن',
      color: '#10b981', // Emerald
      strokeColor: '#059669',
      fillColor: '#10b981',
      badgeBg: 'bg-emerald-950/80',
      badgeBorder: 'border-emerald-500/40',
      badgeText: 'text-emerald-300',
      emoji: '🟢',
    };
  }

  if (hasPreOrder) {
    return {
      code: 'PRE_ORDER',
      label: 'حجز مسبق للموسم القادم',
      color: '#f59e0b', // Amber
      strokeColor: '#d97706',
      fillColor: '#f59e0b',
      badgeBg: 'bg-amber-950/80',
      badgeBorder: 'border-amber-500/40',
      badgeText: 'text-amber-300',
      emoji: '🟡',
    };
  }

  return {
    code: 'AVAILABLE',
    label: 'متوفر للطلب',
    color: '#10b981',
    strokeColor: '#059669',
    fillColor: '#10b981',
    badgeBg: 'bg-emerald-950/80',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-300',
    emoji: '🟢',
  };
}

/**
 * Calculates approximate polygon land area in Hectares using Projected Shoelace algorithm
 */
function calculatePolygonAreaHectares(coords?: GeoPolygon): number {
  if (!coords || coords.length < 3) return 12.5; // default estimation
  const latFactor = 111320; // meters per degree latitude
  const lonFactor = (40075000 * Math.cos((36.4 * Math.PI) / 180)) / 360; // meters per degree lon
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const x1 = coords[i][0] * lonFactor;
    const y1 = coords[i][1] * latFactor;
    const x2 = coords[i + 1][0] * lonFactor;
    const y2 = coords[i + 1][1] * latFactor;
    area += x1 * y2 - x2 * y1;
  }
  const areaSqMeters = Math.abs(area) / 2;
  return Number((areaSqMeters / 10000).toFixed(1));
}

export const MapView: React.FC<MapViewProps> = ({
  farms,
  buyerLocation,
  setBuyerLocation,
  maxDistanceKm,
  selectedFarmId,
  setSelectedFarmId,
  joinedCrops,
  onSelectCropForDetails,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    farmsLayer: L.FeatureGroup;
    polygonsLayer: L.FeatureGroup;
    activePolygonLayer: L.FeatureGroup;
    truckMarker?: L.Marker;
    radiusCircle?: L.Circle;
    tileLayer: L.TileLayer;
  } | null>(null);

  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'streets'>('dark');
  const [showPolygons, setShowPolygons] = useState(true);
  const [showRadius, setShowRadius] = useState(true);

  // Selected farm object
  const selectedFarm = farms.find((f) => f.id === selectedFarmId);
  const selectedFarmCrops = selectedFarm
    ? joinedCrops.filter((jc) => jc.farm.id === selectedFarm.id)
    : [];
  const selectedFarmStatus = selectedFarm
    ? getFarmStatus(selectedFarm, selectedFarmCrops)
    : null;

  // Check if truck is inside any farm
  const currentContainingFarm = farms.find(
    (f) => f.boundary && stContains(f.boundary, buyerLocation)
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapContainerRef.current, {
      center: [buyerLocation.latitude, buyerLocation.longitude],
      zoom: 11,
      zoomControl: true,
    });

    const tileUrl =
      mapStyle === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : mapStyle === 'streets'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap &copy; CartoDB &copy; AgriGIS PostGIS',
      maxZoom: 19,
    }).addTo(map);

    const farmsLayer = L.featureGroup().addTo(map);
    const polygonsLayer = L.featureGroup().addTo(map);
    const activePolygonLayer = L.featureGroup().addTo(map);

    layersRef.current = {
      farmsLayer,
      polygonsLayer,
      activePolygonLayer,
      tileLayer,
    };

    mapInstanceRef.current = map;

    // Click anywhere on map to reposition truck/buyer
    map.on('click', (e: L.LeafletMouseEvent) => {
      setBuyerLocation({
        longitude: Number(e.latlng.lng.toFixed(5)),
        latitude: Number(e.latlng.lat.toFixed(5)),
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer if style changes
  useEffect(() => {
    if (!layersRef.current || !mapInstanceRef.current) return;
    const tileUrl =
      mapStyle === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : mapStyle === 'streets'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    layersRef.current.tileLayer.setUrl(tileUrl);
  }, [mapStyle]);

  // Render Truck/Buyer Marker and Radius Circle
  useEffect(() => {
    if (!mapInstanceRef.current || !layersRef.current) return;
    const map = mapInstanceRef.current;

    // 1. Truck Marker
    if (layersRef.current.truckMarker) {
      layersRef.current.truckMarker.remove();
    }

    const truckIcon = L.divIcon({
      className: 'custom-truck-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div class="pulse-circle" style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background-color: rgba(245, 158, 11, 0.45);"></div>
          <div style="width: 34px; height: 34px; border-radius: 9999px; background-color: #d97706; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
            🚚
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const truckMarker = L.marker([buyerLocation.latitude, buyerLocation.longitude], {
      icon: truckIcon,
      draggable: true,
      title: 'موقع المشتري / الشاحنة (ST_MakePoint)',
    }).addTo(map);

    truckMarker.on('dragend', (e) => {
      const latlng = e.target.getLatLng();
      setBuyerLocation({
        longitude: Number(latlng.lng.toFixed(5)),
        latitude: Number(latlng.lat.toFixed(5)),
      });
    });

    truckMarker.bindPopup(`
      <div style="direction: rtl; text-align: right; min-width: 190px;">
        <h4 style="font-weight: 700; color: #f59e0b; margin-bottom: 4px; font-size: 13px;">
          🚚 نقطة المشتري / الشاحنة
        </h4>
        <div style="font-size: 11px; color: #a8a29e; font-family: monospace;">
          ST_MakePoint(${buyerLocation.longitude}, ${buyerLocation.latitude})
        </div>
        <p style="font-size: 11px; margin-top: 6px; color: #d6d3d1;">
          انقر أو اسحب لتحديث موقع الشاحنة لفحص تقاطع الحدود الجغرافية ST_Contains.
        </p>
      </div>
    `);

    layersRef.current.truckMarker = truckMarker;

    // 2. ST_DWithin Radius Circle
    if (layersRef.current.radiusCircle) {
      layersRef.current.radiusCircle.remove();
    }

    if (showRadius) {
      const radiusCircle = L.circle([buyerLocation.latitude, buyerLocation.longitude], {
        radius: maxDistanceKm * 1000,
        color: '#06b6d4',
        weight: 1.5,
        dashArray: '5, 8',
        fillColor: '#06b6d4',
        fillOpacity: 0.08,
      }).addTo(map);

      layersRef.current.radiusCircle = radiusCircle;
    }
  }, [buyerLocation, maxDistanceKm, showRadius]);

  // Handle clicking a farm to automatically draw & highlight its boundary Polygon
  const handleSelectFarm = (farm: Farm) => {
    setSelectedFarmId(farm.id);

    // If the farm has a polygon boundary, zoom smoothly into it!
    if (mapInstanceRef.current && farm.boundary && farm.boundary.length >= 3) {
      const latLngs = farm.boundary.map(([lon, lat]) => [lat, lon] as [number, number]);
      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
      });
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([farm.location.latitude, farm.location.longitude], 14, {
        animate: true,
      });
    }
  };

  // Render Farms Markers and Dynamic Polygons based on Farm Status
  useEffect(() => {
    if (!mapInstanceRef.current || !layersRef.current) return;
    const { farmsLayer, polygonsLayer, activePolygonLayer } = layersRef.current;

    farmsLayer.clearLayers();
    polygonsLayer.clearLayers();
    activePolygonLayer.clearLayers();

    farms.forEach((farm) => {
      const distance = stDistanceKm(farm.location, buyerLocation);
      const isInsideRadius = distance <= maxDistanceKm;
      const isSelected = selectedFarmId === farm.id;
      const farmCrops = joinedCrops.filter((jc) => jc.farm.id === farm.id);

      // Determine Farm Status and Color Configuration
      const statusConfig = getFarmStatus(farm, farmCrops);
      const areaHectares = calculatePolygonAreaHectares(farm.boundary);

      // Farm Marker Icon colored by status
      const farmIcon = L.divIcon({
        className: 'custom-farm-marker',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${
              isSelected
                ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 9999px; background-color: ${statusConfig.color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                : ''
            }
            <div style="
              width: ${isSelected ? '32px' : '28px'};
              height: ${isSelected ? '32px' : '28px'};
              border-radius: 9999px;
              background-color: ${statusConfig.color};
              border: ${isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.9)'};
              box-shadow: 0 4px 12px rgba(0,0,0,0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 14px;
              transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
              transition: all 0.25s ease;
            ">
              🌱
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const marker = L.marker([farm.location.latitude, farm.location.longitude], {
        icon: farmIcon,
      }).addTo(farmsLayer);

      const cropsListHtml = farmCrops
        .map(
          (c) =>
            `<li style="font-size: 11px; margin-bottom: 3px; color: #e7e5e4; display: flex; justify-content: space-between;">
              <span>• ${c.crop.title}</span>
              <strong style="color: ${statusConfig.color}; font-family: monospace;">${c.crop.price_per_unit} دج</strong>
            </li>`
        )
        .join('');

      marker.bindPopup(`
        <div style="direction: rtl; text-align: right; min-width: 230px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <h4 style="font-weight: 700; color: #ffffff; font-size: 13px; margin: 0;">${farm.name}</h4>
            <span style="font-size: 10px; background: rgba(0,0,0,0.4); color: ${statusConfig.color}; border: 1px solid ${statusConfig.strokeColor}; padding: 2px 7px; border-radius: 9999px; font-weight: 700;">
              ${statusConfig.label}
            </span>
          </div>

          <div style="font-size: 11px; color: #a8a29e; margin-bottom: 6px;">
            📍 ${farm.wilaya} - ${farm.commune} | <span style="color: #38bdf8;">${distance} كم</span>
          </div>

          <div style="background: #292524; padding: 7px 9px; border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #d6d3d1; margin-bottom: 4px; font-weight: 600;">
              <span>المحاصيل المعروضة:</span>
              <span style="color: #a8a29e;">مساحة: ${areaHectares} هكتار</span>
            </div>
            <ul style="padding-right: 4px; margin: 0; list-style: none;">
              ${cropsListHtml || '<li style="font-size: 10px; color: #78716c;">لا توجد عروض حالياً</li>'}
            </ul>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px;">
            <span style="font-family: monospace; color: #78716c;">GEOMETRY(Polygon)</span>
            <span style="color: #10b981; font-weight: 600;">انقر لتحديد ورسم المضلع الكامل ⤢</span>
          </div>
        </div>
      `);

      marker.on('click', () => {
        handleSelectFarm(farm);
      });

      // ========================================================
      // DRAW POLYGON BOUNDARY:
      // When a farm is selected OR when showPolygons is true,
      // draw the polygon with DISTINCTIVE status-based colors!
      // ========================================================
      if (farm.boundary && farm.boundary.length >= 3) {
        const shouldDrawPolygon = isSelected || showPolygons;

        if (shouldDrawPolygon) {
          const latLngs = farm.boundary.map(([lon, lat]) => [lat, lon] as [number, number]);

          const targetGroup = isSelected ? activePolygonLayer : polygonsLayer;

          const polygon = L.polygon(latLngs, {
            color: isSelected ? statusConfig.color : statusConfig.strokeColor,
            weight: isSelected ? 3.5 : 2,
            dashArray: isSelected ? undefined : '5, 5',
            fillColor: statusConfig.fillColor,
            fillOpacity: isSelected ? 0.45 : 0.2,
          }).addTo(targetGroup);

          polygon.bindTooltip(
            `
              <div style="direction: rtl; text-align: right;">
                <strong>${farm.name}</strong><br/>
                <span style="color: ${statusConfig.color}; font-size: 10px;">${statusConfig.label}</span> •
                <span style="font-size: 10px; color: #a8a29e;">${areaHectares} هكتار</span>
              </div>
            `,
            {
              sticky: true,
              direction: 'top',
              className: 'leaflet-custom-tooltip',
            }
          );

          polygon.on('click', () => {
            handleSelectFarm(farm);
          });
        }
      }
    });
  }, [farms, buyerLocation, maxDistanceKm, selectedFarmId, showPolygons, joinedCrops]);

  // Jump to Preset Locations
  const jumpToLocation = (lon: number, lat: number, zoomLevel = 12) => {
    setBuyerLocation({ longitude: lon, latitude: lat });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], zoomLevel, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-[560px] md:h-[640px] rounded-3xl overflow-hidden border border-stone-800 bg-stone-950 shadow-2xl">
      {/* Map Target Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Floating Status Indicator: ST_Contains & ST_DWithin Status */}
      <div className="absolute top-4 right-4 left-4 md:left-auto md:w-96 z-[400] flex flex-col gap-2">
        {/* Point-in-Polygon ST_Contains Banner */}
        <div
          className={`p-3 rounded-2xl backdrop-blur-md border shadow-lg transition-all ${
            currentContainingFarm
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-stone-900/90 border-stone-700/60 text-stone-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {currentContainingFarm ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Navigation className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider">
                  PostGIS ST_Contains()
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    currentContainingFarm
                      ? 'bg-emerald-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {currentContainingFarm ? 'TRUE (داخل الحدود)' : 'FALSE (خارج الحدود)'}
                </span>
              </div>

              {currentContainingFarm ? (
                <div className="mt-1">
                  <p className="text-xs font-semibold text-white">
                    🚚 الشاحنة تقف داخل مضلع: {currentContainingFarm.name}
                  </p>
                  <p className="text-[11px] text-emerald-300/80">
                    {currentContainingFarm.wilaya} - {currentContainingFarm.commune}
                  </p>
                </div>
              ) : (
                <p className="text-xs mt-1 text-stone-400">
                  الموقع الحالي للشاحنة خارج حدود المزارع المسجلة. انقر على أي مزرعة لرسم مضلع حدودها تلقائياً.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Selected Farm Floating Polygon Card if clicked */}
        {selectedFarm && selectedFarmStatus && (
          <div className="bg-stone-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-stone-700 shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedFarmStatus.color }}
                />
                <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                  {selectedFarm.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedFarmId(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
                title="إلغاء تحديد المزرعة"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-300">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${selectedFarmStatus.badgeBg} ${selectedFarmStatus.badgeBorder} ${selectedFarmStatus.badgeText}`}
              >
                {selectedFarmStatus.label}
              </span>
              <span className="font-mono text-cyan-400">
                المساحة: {calculatePolygonAreaHectares(selectedFarm.boundary)} هكتار
              </span>
            </div>

            <div className="text-[11px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800 font-mono">
              <span>GEOMETRY(Polygon, 4326)</span>
              <button
                onClick={() => handleSelectFarm(selectedFarm)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans text-[10px]"
              >
                <Maximize2 className="w-3 h-3" />
                تكبير المضلع
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Farm Status Color Legend Bar (Top Left) */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        {/* Farm Status Color Legend */}
        <div className="bg-stone-900/95 backdrop-blur-md p-3 rounded-2xl border border-stone-800 shadow-xl space-y-2 text-xs">
          <span className="text-[11px] font-bold text-stone-300 block border-b border-stone-800 pb-1">
            دلالة ألوان حدود المزارع (Status):
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shrink-0"></span>
              <span className="text-stone-300">متوفر فوري</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-500 shadow-sm shrink-0"></span>
              <span className="text-stone-300">عضوي (Bio)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shrink-0"></span>
              <span className="text-stone-300">حجز مسبق</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shrink-0"></span>
              <span className="text-stone-300">نفذت الكمية</span>
            </div>
          </div>

          {/* Layer and Toggles */}
          <div className="border-t border-stone-800 pt-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMapStyle('dark')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  mapStyle === 'dark' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                ليلي (Dark)
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  mapStyle === 'satellite' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                فضائي
              </button>
              <button
                onClick={() => setMapStyle('streets')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  mapStyle === 'streets' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                شوارع
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-stone-300 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPolygons}
                  onChange={(e) => setShowPolygons(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span>رسم كافة المضلعات</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer mr-2">
                <input
                  type="checkbox"
                  checked={showRadius}
                  onChange={(e) => setShowRadius(e.target.checked)}
                  className="rounded accent-cyan-500"
                />
                <span>دائرة القرب</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Quick Coordinates Pill Bar (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-wrap gap-1.5 max-w-xl bg-stone-900/90 backdrop-blur-md p-2 rounded-2xl border border-stone-800 shadow-xl">
        <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1 pl-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          مواقع سريعة للاستعلام:
        </span>

        {/* Mila Prompt specific */}
        <button
          onClick={() => jumpToLocation(6.2625, 36.4501, 13)}
          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-500/40 text-emerald-300 font-medium transition-all"
        >
          📍 ميلة (عين التين: 6.2625, 36.4501)
        </button>

        <button
          onClick={() => jumpToLocation(6.598, 36.402, 12)}
          className="text-xs px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all"
        >
          قسنطينة (حامة بوزيان)
        </button>

        <button
          onClick={() => jumpToLocation(5.385, 34.722, 12)}
          className="text-xs px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all"
        >
          بسكرة (طولقة - تمور)
        </button>

        <button
          onClick={() => jumpToLocation(-0.192, 35.531, 12)}
          className="text-xs px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all"
        >
          معسكر (سيق - زيتون)
        </button>

        <button
          onClick={() => jumpToLocation(2.913, 36.574, 12)}
          className="text-xs px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all"
        >
          البليدة (بوفاريك)
        </button>
      </div>
    </div>
  );
};
