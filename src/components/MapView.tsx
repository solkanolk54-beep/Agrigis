import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { Farm, GeoPoint, JoinedFarmCrop, GeoPolygon, CropCatalog } from '../types/database';
import { stContains, stDistanceKm, stAreaHectares, stAreaSqMeters } from '../lib/spatialEngine';
import { CROP_BENCHMARKS, CropMarketBenchmark } from './CropAnalyticsDashboard';
import {
  MapPin,
  Navigation,
  Compass,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Minimize2,
  Maximize2,
  X,
  Sparkles,
  Info,
  Scale,
  Copy,
  Check,
  Download,
  LocateFixed,
  Locate,
  Loader2,
  Coins,
  TrendingUp,
  Sliders,
  Calculator,
} from 'lucide-react';

interface MapViewProps {
  farms: Farm[];
  buyerLocation: GeoPoint;
  setBuyerLocation: (point: GeoPoint) => void;
  maxDistanceKm: number;
  selectedFarmId: string | null;
  setSelectedFarmId: (farmId: string | null) => void;
  joinedCrops: JoinedFarmCrop[];
  catalog?: CropCatalog[];
  onSelectCropForDetails?: (crop: JoinedFarmCrop) => void;
  onOpenExport?: () => void;
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

export const MapView: React.FC<MapViewProps> = ({
  farms,
  buyerLocation,
  setBuyerLocation,
  maxDistanceKm,
  selectedFarmId,
  setSelectedFarmId,
  joinedCrops,
  catalog = [],
  onSelectCropForDetails,
  onOpenExport,
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
  const [copiedAreaSql, setCopiedAreaSql] = useState(false);

  // Banner & Card visibility states (with Close 'X' and Collapse/Expand controls)
  const [showContainsBanner, setShowContainsBanner] = useState(true);
  const [farmCardTab, setFarmCardTab] = useState<'financial' | 'st_area'>('financial');

  // Overlay collapse & reopen states (User request: تنظيم التداخلات كزر طي وآخر إعادة فتح)
  const [allOverlaysCollapsed, setAllOverlaysCollapsed] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isFarmCardCollapsed, setIsFarmCardCollapsed] = useState(false);
  const [isPresetsCollapsed, setIsPresetsCollapsed] = useState(false);

  // On-Map Financial Simulation State
  const [mapSelectedCropId, setMapSelectedCropId] = useState<number>(2); // Default to olive oil (id: 2)
  const [mapSimulatedAreaHa, setMapSimulatedAreaHa] = useState<number>(15);
  const [mapCustomPrice, setMapCustomPrice] = useState<number>(950);

  // Geolocation API State
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccessMessage, setGeoSuccessMessage] = useState<string | null>(null);

  // Request browser Geolocation and update buyerLocation automatically
  const handleGetCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('المتصفح الحالي لا يدعم واجهة تحديد الموقع الجغرافي (Geolocation API).');
      return;
    }

    setIsLocating(true);
    setGeoError(null);
    setGeoSuccessMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;

        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          setGeoError('إحداثيات الموقع المستلمة من المتصفح غير صالحة.');
          return;
        }

        const newLocation: GeoPoint = {
          latitude: Number(latitude.toFixed(5)),
          longitude: Number(longitude.toFixed(5)),
        };

        // 1. Update buyerLocation in parent application state
        setBuyerLocation(newLocation);

        // 2. Center map smoothly using setView with safe animation (prevents Leaflet flyTo NaN errors)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          mapInstanceRef.current.setView([newLocation.latitude, newLocation.longitude], 13, {
            animate: true,
          });
        }

        const accuracyText = accuracy ? ` (بدقة ±${Math.round(accuracy)} متر)` : '';
        setGeoSuccessMessage(
          `تم تحديد موقعك الجغرافي بنجاح${accuracyText}: [خط العرض: ${newLocation.latitude}، خط الطول: ${newLocation.longitude}] وتم تحديث موقع الشاحنة ونطاق القرب.`
        );

        setTimeout(() => {
          setGeoSuccessMessage(null);
        }, 6000);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = 'تعذر الحصول على الموقع الجغرافي من المتصفح.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg =
              'تم رفض الإذن للوصول إلى الموقع الجغرافي. يرجى السماح بالوصول للموقع في إعدادات المتصفح.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'بيانات الموقع الجغرافي غير متوفرة حالياً من جهازك.';
            break;
          case error.TIMEOUT:
            errorMsg = 'انتهت مهلة طلب تحديد الموقع الجغرافي (Timeout). يرجى إعادة المحاولة.';
            break;
        }
        setGeoError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Selected farm object
  const selectedFarm = farms.find((f) => f.id === selectedFarmId);
  const selectedFarmCrops = selectedFarm
    ? joinedCrops.filter((jc) => jc.farm.id === selectedFarm.id)
    : [];
  const selectedFarmStatus = selectedFarm
    ? getFarmStatus(selectedFarm, selectedFarmCrops)
    : null;

  // Synchronize on-map financial simulation parameters when selectedFarm changes
  useEffect(() => {
    if (selectedFarm) {
      const ha = selectedFarm.boundary ? stAreaHectares(selectedFarm.boundary) : 15;
      setMapSimulatedAreaHa(ha);
      if (selectedFarmCrops.length > 0) {
        const primaryCrop = selectedFarmCrops[0].crop;
        setMapSelectedCropId(primaryCrop.crop_catalog_id);
        setMapCustomPrice(primaryCrop.price_per_unit);
      } else {
        const b = CROP_BENCHMARKS[mapSelectedCropId];
        if (b) setMapCustomPrice(b.defaultAvgPrice);
      }
    }
  }, [selectedFarm?.id]);

  // Active benchmark for on-map financial calculator
  const mapActiveBenchmark = useMemo<CropMarketBenchmark>(() => {
    return (
      CROP_BENCHMARKS[mapSelectedCropId] || {
        cropCatalogId: mapSelectedCropId,
        cropName: 'محصول زراعي',
        category: 'محاصيل عامة',
        unit: 'كغ',
        defaultAvgPrice: 350,
        minPrice: 250,
        maxPrice: 480,
        avgYieldPerHectare: 5000,
        estimatedCostPerHectare: 600000,
        notesAr: 'بيانات تقديرية استرشادية',
      }
    );
  }, [mapSelectedCropId]);

  // Farm offer for this crop (if produced by the selected farm)
  const mapFarmOffer = useMemo(() => {
    if (!selectedFarm) return null;
    return (
      selectedFarmCrops.find((jc) => jc.crop.crop_catalog_id === mapSelectedCropId)?.crop || null
    );
  }, [selectedFarm, selectedFarmCrops, mapSelectedCropId]);

  // Calculations for on-map financial simulation
  const mapFinancialStats = useMemo(() => {
    const area = Number(mapSimulatedAreaHa) || 1;
    const yieldPerHa = mapActiveBenchmark.avgYieldPerHectare;
    const totalProd = area * yieldPerHa;
    const grossRevMarket = totalProd * mapActiveBenchmark.defaultAvgPrice;
    const grossRevCustom = totalProd * mapCustomPrice;
    const farmOfferPrice = mapFarmOffer
      ? mapFarmOffer.price_per_unit
      : mapActiveBenchmark.defaultAvgPrice;
    const grossRevFarm = totalProd * farmOfferPrice;
    const cost = area * mapActiveBenchmark.estimatedCostPerHectare;
    const netProfitMarket = grossRevMarket - cost;
    const netProfitCustom = grossRevCustom - cost;
    const marginPct =
      grossRevMarket > 0 ? ((netProfitMarket / grossRevMarket) * 100).toFixed(1) : '0';
    const variancePct = mapFarmOffer
      ? (
          ((mapFarmOffer.price_per_unit - mapActiveBenchmark.defaultAvgPrice) /
            mapActiveBenchmark.defaultAvgPrice) *
          100
        ).toFixed(1)
      : null;

    return {
      area,
      totalProd,
      grossRevMarket,
      grossRevCustom,
      grossRevFarm,
      cost,
      netProfitMarket,
      netProfitCustom,
      marginPct,
      variancePct,
    };
  }, [mapSimulatedAreaHa, mapActiveBenchmark, mapCustomPrice, mapFarmOffer]);

  // Copy SQL query for the selected farm's ST_Area
  const handleCopyFarmAreaSql = (farm: Farm) => {
    const sql = `SELECT 
    f.name,
    f.wilaya,
    f.commune,
    ROUND(ST_Area(f.boundary::geography)::numeric, 2) AS area_sq_meters,
    ROUND((ST_Area(f.boundary::geography) / 10000)::numeric, 2) AS area_hectares
FROM farms f
WHERE f.id = '${farm.id}';`;
    navigator.clipboard.writeText(sql);
    setCopiedAreaSql(true);
    setTimeout(() => setCopiedAreaSql(false), 2000);
  };

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

    const safeLat = Number.isFinite(buyerLocation.latitude) ? buyerLocation.latitude : 36.4501;
    const safeLon = Number.isFinite(buyerLocation.longitude) ? buyerLocation.longitude : 6.2625;

    const map = L.map(mapContainerRef.current, {
      center: [safeLat, safeLon],
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

    // Invalidate size once rendered
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    // Click anywhere on map to reposition truck/buyer
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (e.latlng && Number.isFinite(e.latlng.lat) && Number.isFinite(e.latlng.lng)) {
        setBuyerLocation({
          longitude: Number(e.latlng.lng.toFixed(5)),
          latitude: Number(e.latlng.lat.toFixed(5)),
        });
      }
    });

    return () => {
      clearTimeout(resizeTimer);
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

    if (!Number.isFinite(buyerLocation.latitude) || !Number.isFinite(buyerLocation.longitude)) {
      return;
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
      if (latlng && Number.isFinite(latlng.lat) && Number.isFinite(latlng.lng)) {
        setBuyerLocation({
          longitude: Number(latlng.lng.toFixed(5)),
          latitude: Number(latlng.lat.toFixed(5)),
        });
      }
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
    setIsFarmCardCollapsed(false); // Uncollapse to display selected farm details

    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.invalidateSize();

    // If the farm has a polygon boundary, zoom smoothly into it!
    if (farm.boundary && farm.boundary.length >= 3) {
      const validPoints = farm.boundary.filter(
        ([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat)
      );
      if (validPoints.length >= 3) {
        try {
          const latLngs = validPoints.map(([lon, lat]) => [lat, lon] as [number, number]);
          const bounds = L.latLngBounds(latLngs);
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, {
              padding: [60, 60],
              maxZoom: 15,
              animate: true,
            });
            return;
          }
        } catch (e) {
          console.warn('fitBounds error', e);
        }
      }
    }
    
    if (
      farm.location &&
      Number.isFinite(farm.location.latitude) &&
      Number.isFinite(farm.location.longitude)
    ) {
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
      const areaHectares = stAreaHectares(farm.boundary);
      const areaSqMeters = stAreaSqMeters(farm.boundary);

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
            <div style="display: flex; justify-content: space-between; align-items: center; background: #1c1917; padding: 4px 8px; border-radius: 6px; margin-bottom: 6px; border: 1px solid #383431;">
              <span style="color: #6ee7b7; font-weight: 700; font-size: 11px;">📐 مساحة المزرعة (ST_Area):</span>
              <span style="color: #38bdf8; font-family: monospace; font-size: 11px; font-weight: 700;">${areaHectares} هكتار</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #d6d3d1; margin-bottom: 4px; font-weight: 600;">
              <span>المحاصيل المعروضة:</span>
              <span style="color: #a8a29e; font-family: monospace;">${areaSqMeters.toLocaleString('ar-DZ')} م²</span>
            </div>
            <ul style="padding-right: 4px; margin: 0; list-style: none;">
              ${cropsListHtml || '<li style="font-size: 10px; color: #78716c;">لا توجد عروض حالياً</li>'}
            </ul>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px;">
            <span style="font-family: monospace; color: #78716c;">ROUND(ST_Area/10000)</span>
            <span style="color: #10b981; font-weight: 600;">انقر لتكبير مضلع الحدود ⤢</span>
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
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    setBuyerLocation({ longitude: lon, latitude: lat });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView([lat, lon], zoomLevel, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-[560px] md:h-[640px] rounded-3xl overflow-hidden border border-stone-800 bg-stone-950 shadow-2xl">
      {/* Map Target Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Geolocation Feedback Notifications (Toasts) */}
      {(geoSuccessMessage || geoError) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] max-w-lg w-[90%] transition-all animate-in fade-in slide-in-from-top-3 duration-200">
          {geoSuccessMessage && (
            <div className="p-3 rounded-2xl bg-emerald-950/95 border border-emerald-500/70 text-emerald-100 shadow-2xl flex items-start gap-2.5 backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed font-medium">
                <span className="font-bold text-white block mb-0.5">تم تحديث الموقع بنجاح:</span>
                <p className="text-emerald-200">{geoSuccessMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setGeoSuccessMessage(null)}
                className="text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-emerald-900/50 transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {geoError && (
            <div className="p-3 rounded-2xl bg-rose-950/95 border border-rose-500/70 text-rose-100 shadow-2xl flex items-start gap-2.5 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-bold text-white block mb-0.5">تنبيه تحديد الموقع الجغرافي:</span>
                <p className="text-rose-200 leading-relaxed">{geoError}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="px-2.5 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white font-bold text-[11px] border border-rose-700 transition-colors"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeoError(null)}
                className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-900/50 transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MASTER OVERLAYS TOGGLE: طي وإعادة فتح جميع التداخلات (User Request 5) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[420] pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            const next = !allOverlaysCollapsed;
            setAllOverlaysCollapsed(next);
            setIsLegendCollapsed(next);
            setIsFarmCardCollapsed(next);
            setIsPresetsCollapsed(next);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all border ${
            allOverlaysCollapsed
              ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-300 ring-2 ring-amber-400/50 animate-pulse'
              : 'bg-stone-900/90 hover:bg-stone-850 text-stone-200 border-stone-700/80 hover:text-white'
          }`}
          title={
            allOverlaysCollapsed
              ? 'إعادة فتح جميع تداخلات ولوحات الخريطة'
              : 'طي جميع التداخلات واللوحات لرؤية كامل الخريطة بدون حجب'
          }
        >
          {allOverlaysCollapsed ? (
            <>
              <Eye className="w-3.5 h-3.5 text-amber-200" />
              <span>إعادة فتح التداخلات ⤢</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-stone-400" />
              <span>طي التداخلات (خريطة كاملة) ⌃</span>
            </>
          )}
        </button>
      </div>

      {/* Top Floating Status & Selected Farm Panels (Right Side) */}
      <div className="absolute top-4 right-4 left-4 md:left-auto md:w-96 z-[400] flex flex-col gap-2">
        {/* Point-in-Polygon ST_Contains Banner */}
        {!allOverlaysCollapsed && (
          showContainsBanner ? (
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
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          currentContainingFarm
                            ? 'bg-emerald-500 text-stone-950'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {currentContainingFarm ? 'TRUE (داخل الحدود)' : 'FALSE (خارج الحدود)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowContainsBanner(false)}
                        className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800/80 transition-colors"
                        title="إغلاق التنبيه (x)"
                        aria-label="إغلاق"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

                  {/* Geolocation Button inside ST_Contains Banner */}
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-stone-800/90 hover:bg-stone-750 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-stone-700/80 transition-all shadow-sm disabled:opacity-60"
                    title="تحديث إحداثيات buyerLocation تلقائياً لموقعك الحقيقي عبر Geolocation API"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span className="text-amber-300">جارٍ قراءة إحداثيات GPS...</span>
                      </>
                    ) : (
                      <>
                        <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تحديث موقع الشاحنة بموقعي الحالي (GPS)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setShowContainsBanner(true)}
                className="py-1 px-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-emerald-400 border border-stone-700 text-[10px] font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all"
                title="إظهار بطاقة ST_Contains"
              >
                <Navigation className="w-3 h-3 text-emerald-400" />
                <span>إظهار فحص ST_Contains</span>
              </button>
            </div>
          )
        )}

        {/* Selected Farm Floating Polygon Card & Financial Yield Calculator */}
        {selectedFarm && selectedFarmStatus && (() => {
          const farmAreaHa = stAreaHectares(selectedFarm.boundary);
          const farmAreaM2 = stAreaSqMeters(selectedFarm.boundary);
          const vertices = selectedFarm.boundary?.length || 0;
          const benchmarkList = Object.values(CROP_BENCHMARKS);

          // If Farm Card is Collapsed (Individual or All), render a sleek compact pill
          if (allOverlaysCollapsed || isFarmCardCollapsed) {
            return (
              <div className="bg-stone-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-emerald-500/50 shadow-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full ring-2 ring-white/20 shrink-0"
                    style={{ backgroundColor: selectedFarmStatus.color }}
                  />
                  <div className="truncate">
                    <span className="font-bold text-white text-xs block truncate">{selectedFarm.name}</span>
                    <span className="text-[10px] text-emerald-300 font-mono">
                      {farmAreaHa} هكتار • {selectedFarmStatus.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFarmCardCollapsed(false);
                      setAllOverlaysCollapsed(false);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                    title="إعادة فتح بطاقة المزرعة وتفاصيل العائد المالي"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>إعادة فتح ⤡</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFarmId(null)}
                    className="flex items-center justify-center w-6 h-6 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-300 transition-colors"
                    title="إغلاق بطاقة المزرعة (x)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          // Full Expanded Farm Card
          return (
            <div className="bg-stone-900/95 backdrop-blur-md p-4 rounded-3xl border border-stone-700 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header with Title, Collapse 'طي', and Prominent 'x' Close Button */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20 shrink-0"
                    style={{ backgroundColor: selectedFarmStatus.color }}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[170px]">
                      {selectedFarm.name}
                    </h4>
                    <span className="text-[10px] text-stone-400">
                      {selectedFarm.wilaya} - {selectedFarm.commune}
                    </span>
                  </div>
                </div>

                {/* Control Actions: طي (Collapse) and Close (x) */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsFarmCardCollapsed(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white text-[11px] font-medium transition-all shadow-sm"
                    title="طي بطاقة المزرعة لرؤية الخريطة بدون حجب"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>طي ⌃</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFarmId(null)}
                    className="flex items-center justify-center w-7 h-7 rounded-xl bg-stone-800 hover:bg-rose-950/80 hover:border-rose-500/50 border border-stone-700 text-stone-300 hover:text-rose-300 transition-all shadow-sm group"
                    title="إغلاق بطاقة المزرعة بالكامل (x)"
                    aria-label="إغلاق"
                  >
                    <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Status Badge & Polygon Zoom Action */}
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${selectedFarmStatus.badgeBg} ${selectedFarmStatus.badgeBorder} ${selectedFarmStatus.badgeText}`}
                >
                  {selectedFarmStatus.label}
                </span>
                <button
                  onClick={() => handleSelectFarm(selectedFarm)}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-bold"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  تكبير المضلع
                </button>
              </div>

              {/* Card Sub-Tabs: Financial Yield vs ST_Area */}
              <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFarmCardTab('financial')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 text-[11px] transition-all ${
                    farmCardTab === 'financial'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-1 ring-emerald-400/30'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>العائد المالي والأسعار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFarmCardTab('st_area')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 text-[11px] transition-all ${
                    farmCardTab === 'st_area'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>مساحة ST_Area</span>
                </button>
              </div>

              {/* TAB 1: FINANCIAL YIELD ESTIMATION & ON-MAP MODIFICATION */}
              {farmCardTab === 'financial' && (
                <div className="space-y-3 text-xs">
                  {/* Crop Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-stone-300 font-semibold flex items-center justify-between">
                      <span>المحصول الزراعي:</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {mapActiveBenchmark.category}
                      </span>
                    </label>
                    <select
                      value={mapSelectedCropId}
                      onChange={(e) => {
                        const newId = parseInt(e.target.value, 10);
                        setMapSelectedCropId(newId);
                        const b = CROP_BENCHMARKS[newId];
                        const offer = selectedFarmCrops.find(
                          (jc) => jc.crop.crop_catalog_id === newId
                        );
                        if (offer) {
                          setMapCustomPrice(offer.crop.price_per_unit);
                        } else if (b) {
                          setMapCustomPrice(b.defaultAvgPrice);
                        }
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {benchmarkList.map((b) => (
                        <option key={b.cropCatalogId} value={b.cropCatalogId}>
                          {b.cropName} (متوسط: {b.defaultAvgPrice} دج/{b.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cultivated Area Modification (Slider & Value) */}
                  <div className="bg-stone-950 p-2.5 rounded-2xl border border-stone-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-300 font-semibold">تعديل المساحة المستغلة:</span>
                      <div className="flex items-center gap-1 font-mono">
                        <strong className="text-emerald-400 text-xs">
                          {mapFinancialStats.area}
                        </strong>
                        <span className="text-stone-400 text-[10px]">
                          / {farmAreaHa} هكتار (مضلع)
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max={Math.max(50, Math.ceil(farmAreaHa * 1.5))}
                      step="0.5"
                      value={mapSimulatedAreaHa}
                      onChange={(e) => setMapSimulatedAreaHa(parseFloat(e.target.value) || 1)}
                      className="w-full accent-emerald-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Price Modification & Benchmark Comparison */}
                  <div className="bg-stone-950 p-2.5 rounded-2xl border border-stone-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-300 font-semibold">سعر البيع المعتمد:</span>
                      <span className="text-stone-400 font-mono text-[10px]">
                        متوسط السوق: {mapActiveBenchmark.defaultAvgPrice} دج
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          value={mapCustomPrice}
                          onChange={(e) =>
                            setMapCustomPrice(Math.max(1, parseFloat(e.target.value) || 0))
                          }
                          className="w-full bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute left-2.5 top-1 text-stone-400 text-[10px]">
                          دج/{mapActiveBenchmark.unit}
                        </span>
                      </div>
                      {mapFarmOffer && (
                        <div
                          className={`text-[10px] px-2 py-1 rounded-xl font-mono shrink-0 border ${
                            Number(mapFinancialStats.variancePct) >= 0
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-950 text-rose-300 border-rose-500/30'
                          }`}
                          title="فارق سعر عرض المزرعة عن متوسط السوق"
                        >
                          عرض المزرعة: {mapFarmOffer.price_per_unit} دج (
                          {Number(mapFinancialStats.variancePct) >= 0 ? '+' : ''}
                          {mapFinancialStats.variancePct}%)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Results KPI Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Gross Revenue at Default Market Price */}
                    <div className="bg-stone-950/90 p-2.5 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block mb-0.5">
                        العائد بسعر السوق الافتراضي:
                      </span>
                      <div className="flex items-baseline gap-1">
                        <strong className="text-sm font-bold text-emerald-400 font-mono">
                          {(mapFinancialStats.grossRevMarket / 1000000).toFixed(2)}
                        </strong>
                        <span className="text-[10px] text-stone-400">مليون دج</span>
                      </div>
                      <span className="text-[9px] text-stone-500 font-mono block mt-0.5">
                        الإنتاج: {mapFinancialStats.totalProd.toLocaleString('ar-DZ')} {mapActiveBenchmark.unit}
                      </span>
                    </div>

                    {/* Net Profit & Margin */}
                    <div className="bg-gradient-to-br from-stone-950 to-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-300 font-semibold block mb-0.5">
                        صافي الربح المتوقع:
                      </span>
                      <div className="flex items-baseline gap-1">
                        <strong className="text-sm font-bold text-white font-mono">
                          {(mapFinancialStats.netProfitMarket / 1000000).toFixed(2)}
                        </strong>
                        <span className="text-[10px] text-emerald-300">مليون دج</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 font-mono block mt-0.5">
                        هامش {mapFinancialStats.marginPct}%
                      </span>
                    </div>
                  </div>

                  {/* Dual Action Row: طي البطاقة + إغلاق (x) */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFarmCardCollapsed(true)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                      title="طي بطاقة المزرعة"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                      <span>طي البطاقة ⌃</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFarmId(null)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-stone-800/90 hover:bg-rose-950/60 hover:border-rose-500/40 border border-stone-700 text-stone-300 hover:text-rose-200 text-xs font-semibold transition-all shadow-sm"
                      title="إغلاق بطاقة المزرعة (x)"
                    >
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span>إغلاق البطاقة (x)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: ST_AREA CALCULATION PANEL */}
              {farmCardTab === 'st_area' && (
                <div className="space-y-2.5 text-xs">
                  <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-400" />
                        مساحة المزرعة (PostGIS ST_Area):
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/80">
                        SRID 4326
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between bg-stone-900/80 px-3 py-2 rounded-xl border border-stone-800">
                      <div>
                        <span className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                          {farmAreaHa}
                        </span>
                        <span className="text-xs text-stone-300 font-bold mr-1.5">
                          هكتار (Hectares)
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {farmAreaM2.toLocaleString('ar-DZ')} م²
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-stone-850 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                      <span className="text-cyan-400/90 truncate max-w-[190px]">
                        ST_Area(boundary::geography) / 10000
                      </span>
                      <span className="text-stone-400">
                        {vertices} نقاط مضلع (Vertices)
                      </span>
                    </div>
                  </div>

                  {/* Copy ST_Area SQL Button */}
                  <button
                    onClick={() => handleCopyFarmAreaSql(selectedFarm)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white text-[11px] font-mono transition-all border border-stone-750"
                  >
                    {copiedAreaSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">تم نسخ استعلام ST_Area للمزرعة</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ استعلام SQL ST_Area للمزرعة</span>
                      </>
                    )}
                  </button>

                  {/* Dual Action Row: طي البطاقة + إغلاق (x) */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFarmCardCollapsed(true)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                      title="طي بطاقة المزرعة"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                      <span>طي البطاقة ⌃</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFarmId(null)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-stone-800/90 hover:bg-rose-950/60 hover:border-rose-500/40 border border-stone-700 text-stone-300 hover:text-rose-200 text-xs font-semibold transition-all shadow-sm"
                      title="إغلاق بطاقة المزرعة"
                    >
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span>إغلاق البطاقة (x)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Farm Status Color Legend Bar (Top Left) with Collapse / Reopen */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 max-w-[260px] md:max-w-xs">
        {allOverlaysCollapsed || isLegendCollapsed ? (
          <button
            type="button"
            onClick={() => {
              setIsLegendCollapsed(false);
              setAllOverlaysCollapsed(false);
            }}
            className="bg-stone-900/95 hover:bg-stone-850 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-stone-700 text-stone-200 hover:text-white text-xs font-bold flex items-center gap-2 shadow-xl transition-all"
            title="إعادة فتح لوحة أدوات ودلالات الخريطة"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>⚙️ أدوات ودلالات الخريطة</span>
            <span className="text-[10px] text-emerald-400 font-normal">⤡ إعادة فتح</span>
          </button>
        ) : (
          <div className="bg-stone-900/95 backdrop-blur-md p-3 rounded-2xl border border-stone-800 shadow-xl space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1">
              <span className="text-[11px] font-bold text-stone-300 block">
                دلالة ألوان حدود المزارع (Status):
              </span>
              <button
                type="button"
                onClick={() => setIsLegendCollapsed(true)}
                className="text-stone-400 hover:text-white flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg hover:bg-stone-800 border border-stone-800 hover:border-stone-700 transition-colors"
                title="طي لوحة الدلالات والأدوات"
              >
                <ChevronUp className="w-3 h-3" />
                <span>طي ⌃</span>
              </button>
            </div>
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

              {/* Geolocation GPS Button in Map Control Box */}
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-sm disabled:opacity-60"
                title="تحديد الموقع الجغرافي الفعلي للمشتري/الشاحنة عبر المتصفح"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ جلب إحداثيات GPS...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>تحديد موقعي الفعلي (GPS)</span>
                  </>
                )}
              </button>

              {onOpenExport && (
                <button
                  type="button"
                  onClick={onOpenExport}
                  className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold transition-all shadow-sm"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>تصدير الخريطة الحالية كـ GeoJSON</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preset Quick Coordinates Pill Bar (Bottom Right) with Collapse / Reopen */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-wrap items-center gap-1.5 max-w-2xl">
        {allOverlaysCollapsed || isPresetsCollapsed ? (
          <button
            type="button"
            onClick={() => {
              setIsPresetsCollapsed(false);
              setAllOverlaysCollapsed(false);
            }}
            className="bg-stone-900/90 hover:bg-stone-800 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-stone-800 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all"
            title="إعادة فتح شريط المواقع السريعة والمحاكاة"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>📍 مواقع سريعة وGPS</span>
            <span className="text-[10px] text-emerald-400 font-normal">⤡ إعادة فتح</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 bg-stone-900/90 backdrop-blur-md p-2 rounded-2xl border border-stone-800 shadow-xl">
            {/* Primary Geolocation GPS Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md ${
                isLocating
                  ? 'bg-amber-600 text-white cursor-wait animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 ring-2 ring-emerald-400/40'
              }`}
              title="تحديد موقعك الجغرافي الفعلي وتحديث buyerLocation تلقائياً عبر المتصفح"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
              <span>{isLocating ? 'جارٍ تحديد موقعك...' : '🎯 موقعي الحالي (GPS)'}</span>
            </button>

            {/* On-Map Financial Yield Simulation Quick Button */}
            <button
              type="button"
              onClick={() => {
                if (!selectedFarmId && farms.length > 0) {
                  setSelectedFarmId(farms[0].id);
                }
                setIsFarmCardCollapsed(false);
                setAllOverlaysCollapsed(false);
                setFarmCardTab('financial');
              }}
              className="text-xs px-2.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white flex items-center gap-1.5 shadow-sm border border-emerald-500/40 transition-all"
              title="فتح وتعديل العائد المالي على الخريطة مباشرة مع إمكانية الإغلاق بعلامة X أو الطي"
            >
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span>💰 محاكاة العائد المالي</span>
            </button>

            <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1 pr-1 pl-1 border-r border-stone-800">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              مواقع سريعة:
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

            {/* Quick collapse button for bottom presets */}
            <button
              type="button"
              onClick={() => setIsPresetsCollapsed(true)}
              className="text-[10px] px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center gap-0.5 transition-all mr-1"
              title="طي شريط المواقع السريعة"
            >
              <ChevronDown className="w-3 h-3" />
              <span>طي</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
