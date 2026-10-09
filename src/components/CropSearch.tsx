import React, { useState } from 'react';
import { JoinedFarmCrop, CropCatalog } from '../types/database';
import { calculateTrigramSimilarity } from '../lib/spatialEngine';
import { Search, SlidersHorizontal, MapPin, Phone, Award, Sparkles, Calendar, ArrowUpDown, ChevronRight, Check, Download, FileCode } from 'lucide-react';

interface CropSearchProps {
  joinedCrops: JoinedFarmCrop[];
  catalog: CropCatalog[];
  maxDistanceKm: number;
  setMaxDistanceKm: (dist: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedFarmId: string | null;
  setSelectedFarmId: (id: string | null) => void;
  onViewCertificate: (crop: JoinedFarmCrop) => void;
  onOpenExport?: () => void;
}

export const CropSearch: React.FC<CropSearchProps> = ({
  joinedCrops,
  catalog,
  maxDistanceKm,
  setMaxDistanceKm,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedFarmId,
  setSelectedFarmId,
  onViewCertificate,
  onOpenExport,
}) => {
  const [organicOnly, setOrganicOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'PRE_ORDER'>('ALL');
  const [sortBy, setSortBy] = useState<'distance' | 'price_asc' | 'quantity'>('distance');

  // Filter crops
  const filteredCrops = joinedCrops.filter((item) => {
    // 1. Distance filter (ST_DWithin)
    if (item.distance_km !== undefined && item.distance_km > maxDistanceKm) {
      return false;
    }

    // 2. Farm ID filter if selected on map
    if (selectedFarmId && item.farm.id !== selectedFarmId) {
      return false;
    }

    // 3. Category filter
    if (selectedCategory && item.catalog.category !== selectedCategory) {
      return false;
    }

    // 4. Organic filter
    if (organicOnly && !item.crop.is_organic) {
      return false;
    }

    // 5. Status filter
    if (statusFilter !== 'ALL' && item.crop.status !== statusFilter) {
      return false;
    }

    // 6. Search term (pg_trgm fuzzy & LIKE)
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const inTitle = item.crop.title.toLowerCase().includes(term);
      const inCatalog = item.catalog.name_ar.toLowerCase().includes(term);
      const inFarm = item.farm.name.toLowerCase().includes(term);
      const inWilaya = item.farm.wilaya.toLowerCase().includes(term);
      const trigramScore = Math.max(
        calculateTrigramSimilarity(item.crop.title, term),
        calculateTrigramSimilarity(item.catalog.name_ar, term)
      );

      if (!inTitle && !inCatalog && !inFarm && !inWilaya && trigramScore < 0.25) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  filteredCrops.sort((a, b) => {
    if (sortBy === 'distance') {
      return (a.distance_km ?? 999) - (b.distance_km ?? 999);
    }
    if (sortBy === 'price_asc') {
      return a.crop.price_per_unit - b.crop.price_per_unit;
    }
    if (sortBy === 'quantity') {
      return b.crop.quantity_available - a.crop.quantity_available;
    }
    return 0;
  });

  const categories = Array.from(new Set(catalog.map((c) => c.category)));

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Spatial Distance Slider */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search (pg_trgm) */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن محصول (مثال: زيتون، زيت زيتون، دقلة نور، طماطم)..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <span className="absolute left-3 top-3 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                pg_trgm ACTIVE
              </span>
            )}
          </div>

          {/* Spatial Proximity Slider (ST_DWithin) */}
          <div className="md:col-span-6 bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-stone-300 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                نطاق البحث المكاني (ST_DWithin):
              </span>
              <span className="text-cyan-400 font-bold font-mono text-xs">
                {maxDistanceKm} كم ({maxDistanceKm * 1000} متر)
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="350"
              step="5"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              aria-label="نطاق البحث المكاني بالكيلومتر"
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-stone-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-stone-500 font-mono mt-0.5">
              <span>10 كم</span>
              <span>50 كم (ميلة)</span>
              <span>100 كم</span>
              <span>200 كم</span>
              <span>350 كم</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-stone-800 text-xs">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                selectedCategory === ''
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mr-auto flex items-center gap-2">
            {/* Organic filter */}
            <button
              onClick={() => setOrganicOnly(!organicOnly)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                organicOnly
                  ? 'bg-green-700/80 border border-green-500/50 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-green-300" />
              عضوي (Organic)
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-lg border border-stone-800 text-xs">
              <ArrowUpDown className="w-3 h-3 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="ترتيب النتائج"
                className="bg-transparent text-stone-300 focus:outline-none cursor-pointer"
              >
                <option value="distance" className="bg-stone-900">الأقرب مسافة (ST_Distance)</option>
                <option value="price_asc" className="bg-stone-900">الأقل سعراً</option>
                <option value="quantity" className="bg-stone-900">الأكبر كمية متوفرة</option>
              </select>
            </div>

            {/* Reset Farm filter if active */}
            {selectedFarmId && (
              <button
                onClick={() => setSelectedFarmId(null)}
                className="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-900"
              >
                إلغاء فلتر المزرعة ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Count & Geo Query summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400 px-1">
        <div className="flex items-center gap-2">
          <span>
            تم العثور على <strong className="text-emerald-400 font-bold">{filteredCrops.length}</strong> محصول زراعي متاح ضمن نطاق{' '}
            <strong className="text-cyan-400 font-mono">{maxDistanceKm} كم</strong>
          </span>
          <span className="font-mono text-[10px] text-stone-500 hidden md:inline">
            • GIST Index ST_DWithin
          </span>
        </div>

        {onOpenExport && (
          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40"
            title="تصدير المزارع والمحاصيل المفلترة الحالية إلى ملف GeoJSON لبرامج GIS"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير النتائج كـ GeoJSON (QGIS / ArcGIS)</span>
          </button>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCrops.map((item) => {
          const primaryImage = item.media.find((m) => m.media_type === 'IMAGE')?.media_url;
          const hasCert = item.media.some((m) => m.media_type === 'CERTIFICATE_PDF');

          return (
            <div
              key={item.crop.id}
              className="bg-stone-900 border border-stone-800 hover:border-emerald-500/40 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col group"
            >
              {/* Image banner */}
              <div className="relative h-44 w-full bg-stone-950 overflow-hidden">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={item.crop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-600">
                    <MapPin className="w-8 h-8" />
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-stone-950/80 backdrop-blur-md text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-mono shadow">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    {item.distance_km ?? 0} كم
                  </span>

                  {item.crop.is_organic && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      منتوج عضوي 100%
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow ${
                      item.crop.status === 'AVAILABLE'
                        ? 'bg-emerald-600 text-white'
                        : item.crop.status === 'PRE_ORDER'
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-700 text-stone-300'
                    }`}
                  >
                    {item.crop.status === 'AVAILABLE'
                      ? 'متوفر فوري'
                      : item.crop.status === 'PRE_ORDER'
                      ? 'حجز مسبق'
                      : 'نفذت الكمية'}
                  </span>
                </div>

                {/* Price pill at bottom of image */}
                <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between bg-stone-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800">
                  <span className="text-xs text-stone-300">السعر بالجملة:</span>
                  <span className="text-emerald-400 font-extrabold text-sm font-mono">
                    {item.crop.price_per_unit.toLocaleString('ar-DZ')} دج / {item.crop.unit}
                  </span>
                </div>
              </div>

              {/* Body Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-1 text-[11px] text-stone-400 mb-1">
                    <span className="bg-stone-800 px-2 py-0.5 rounded text-stone-300 font-medium">
                      {item.catalog.category}
                    </span>
                    <span>•</span>
                    <span>{item.catalog.name_ar}</span>
                  </div>

                  <h3 className="font-bold text-sm text-white line-clamp-2 mb-2 group-hover:text-emerald-300 transition-colors">
                    {item.crop.title}
                  </h3>

                  {/* Farm & Wilaya */}
                  <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-200">{item.farm.name}</span>
                      <button
                        onClick={() => setSelectedFarmId(item.farm.id)}
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        عرض بالموقع
                      </button>
                    </div>

                    <div className="text-[11px] text-stone-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-500" />
                      <span>{item.farm.wilaya}</span>
                      <span>-</span>
                      <span>{item.farm.commune}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-300 pt-1 border-t border-stone-800/60">
                      <span>الكمية المعروضة:</span>
                      <strong className="text-white font-mono">
                        {item.crop.quantity_available.toLocaleString('ar-DZ')} {item.crop.unit}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-500" />
                      <span>الحصاد: {item.crop.harvest_date}</span>
                    </div>

                    {hasCert && (
                      <button
                        onClick={() => onViewCertificate(item)}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium text-[11px]"
                      >
                        <Award className="w-3 h-3" />
                        شهادة التحليل المخبري
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${item.farmer.phone_number.replace(/\s+/g, '')}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      اتصال بالفلاح ({item.farmer.full_name})
                    </a>

                    <button
                      onClick={() => setSelectedFarmId(item.farm.id)}
                      title="تحديد على الخريطة"
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCrops.length === 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-10 text-center space-y-3">
          <MapPin className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-base font-bold text-white">لم يتم العثور على محاصيل مطابقة</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            جرب زيادة نطاق المسافة (ST_DWithin) من شريط التمرير أو تغيير كلمة البحث لتغطية مناطق ومزارع إضافية في الجزائر.
          </p>
          <button
            onClick={() => {
              setMaxDistanceKm(250);
              setSearchTerm('');
              setSelectedCategory('');
              setSelectedFarmId(null);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            توسيع نطاق البحث إلى 250 كم
          </button>
        </div>
      )}
    </div>
  );
};
