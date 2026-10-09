import React, { useState, useMemo } from 'react';
import { Farm, JoinedFarmCrop, GeoPoint } from '../types/database';
import { generateFarmsGeoJson, downloadGeoJsonFile } from '../lib/geoJsonExport';
import {
  Download,
  Copy,
  Check,
  X,
  FileCode,
  Layers,
  MapPin,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Database,
} from 'lucide-react';

interface GeoJsonExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredFarms: Farm[];
  joinedCrops: JoinedFarmCrop[];
  buyerLocation?: GeoPoint;
}

export const GeoJsonExportModal: React.FC<GeoJsonExportModalProps> = ({
  isOpen,
  onClose,
  filteredFarms,
  joinedCrops,
  buyerLocation,
}) => {
  const [geometryMode, setGeometryMode] = useState<'polygons' | 'points' | 'both'>('polygons');
  const [includeCrops, setIncludeCrops] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate GeoJSON payload
  const geoJson = useMemo(() => {
    return generateFarmsGeoJson(filteredFarms, joinedCrops, {
      geometryMode,
      includeCropsData: includeCrops,
      buyerLocation,
    });
  }, [filteredFarms, joinedCrops, geometryMode, includeCrops, buyerLocation]);

  const geoJsonString = useMemo(() => {
    return JSON.stringify(geoJson, null, 2);
  }, [geoJson]);

  const fileSizeKb = useMemo(() => {
    const bytes = new Blob([geoJsonString]).size;
    return (bytes / 1024).toFixed(1);
  }, [geoJsonString]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    downloadGeoJsonFile(geoJson, `agrigis_algeria_farms_${geometryMode}_${dateStr}.geojson`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(geoJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shadow-md">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                تصدير البيانات المكانية كملف GeoJSON (RFC 7946)
              </h3>
              <p className="text-xs text-stone-400">
                متوافق تماماً مع برمجيات ونظم المعلومات الجغرافية QGIS و ArcGIS و PostGIS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800">
              <span className="text-[10px] text-stone-400 block mb-0.5">المزارع المشمولة:</span>
              <strong className="text-sm font-bold text-emerald-400 font-mono">
                {filteredFarms.length} مزارع
              </strong>
            </div>

            <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800">
              <span className="text-[10px] text-stone-400 block mb-0.5">العناصر الهندسية (Features):</span>
              <strong className="text-sm font-bold text-cyan-400 font-mono">
                {geoJson.features.length} معالم
              </strong>
            </div>

            <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800">
              <span className="text-[10px] text-stone-400 block mb-0.5">حجم الملف التقديري:</span>
              <strong className="text-sm font-bold text-amber-400 font-mono">
                {fileSizeKb} KB
              </strong>
            </div>
          </div>

          {/* Export Geometry Configuration */}
          <div className="bg-stone-950/70 p-3.5 rounded-2xl border border-stone-800 space-y-2.5">
            <span className="font-bold text-stone-200 block text-xs">
              نوع الهندسة الفضائية المراد تصديرها (Geometry Type):
            </span>

            <div className="grid grid-cols-3 gap-2 font-medium">
              <button
                type="button"
                onClick={() => setGeometryMode('polygons')}
                className={`py-2 px-3 rounded-xl border text-center transition-all ${
                  geometryMode === 'polygons'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                📐 مضلعات الحدود (Polygon)
              </button>

              <button
                type="button"
                onClick={() => setGeometryMode('points')}
                className={`py-2 px-3 rounded-xl border text-center transition-all ${
                  geometryMode === 'points'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                📍 نقاط المراكز (Point)
              </button>

              <button
                type="button"
                onClick={() => setGeometryMode('both')}
                className={`py-2 px-3 rounded-xl border text-center transition-all ${
                  geometryMode === 'both'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                🔀 كلاهما معاً (Both)
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1 text-stone-300">
              <input
                type="checkbox"
                checked={includeCrops}
                onChange={(e) => setIncludeCrops(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>تضمين جداول المحاصيل والأسعار في خصائص المعالم (Feature Properties)</span>
            </label>
          </div>

          {/* Compatibility Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
            <span className="font-bold text-stone-300">متوافق مع:</span>
            <span className="bg-stone-800/80 px-2 py-0.5 rounded-lg border border-stone-700 text-emerald-300">
              ✓ QGIS 3.x
            </span>
            <span className="bg-stone-800/80 px-2 py-0.5 rounded-lg border border-stone-700 text-cyan-300">
              ✓ ArcGIS Pro
            </span>
            <span className="bg-stone-800/80 px-2 py-0.5 rounded-lg border border-stone-700 text-amber-300">
              ✓ Google Earth
            </span>
            <span className="bg-stone-800/80 px-2 py-0.5 rounded-lg border border-stone-700 text-purple-300 font-mono">
              ✓ PostGIS ST_GeomFromGeoJSON
            </span>
          </div>

          {/* Live Code Preview */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-inner">
            <div className="bg-stone-900/90 px-3 py-1.5 border-b border-stone-800 flex items-center justify-between font-mono text-[11px] text-stone-400">
              <span>preview.geojson</span>
              <span className="text-emerald-400">WGS84 (SRID 4326)</span>
            </div>

            <div className="p-3 max-h-48 overflow-y-auto text-[11px] font-mono text-emerald-300/90 dir-ltr text-left leading-relaxed">
              <pre>{geoJsonString.slice(0, 1500)}...</pre>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-stone-400">
            <span>الصيغة: </span>
            <strong className="text-white font-mono">application/geo+json</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'تم نسخ GeoJSON' : 'نسخ النص'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
            >
              <Download className="w-4 h-4" />
              تحميل ملف GeoJSON (.geojson)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
