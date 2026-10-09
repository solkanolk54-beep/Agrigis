import React, { useState } from 'react';
import { PostGisEngine, QueryExecutionResult } from '../lib/spatialEngine';
import { GeoPoint } from '../types/database';
import { Play, Copy, Check, Terminal, Clock, Database, Layers, Sparkles, Sliders } from 'lucide-react';

interface SqlQueryRunnerProps {
  engine: PostGisEngine;
  buyerLocation: GeoPoint;
}

export const SqlQueryRunner: React.FC<SqlQueryRunnerProps> = ({ engine, buyerLocation }) => {
  const [selectedPreset, setSelectedPreset] = useState<'nearby_farms' | 'nearby_crops' | 'point_in_polygon' | 'farm_area' | 'extensions'>('nearby_farms');
  const [lon, setLon] = useState(buyerLocation.longitude);
  const [lat, setLat] = useState(buyerLocation.latitude);
  const [distanceMeters, setDistanceMeters] = useState(50000); // 50 km default
  const [cropKeyword, setCropKeyword] = useState('زيت');
  const [copied, setCopied] = useState(false);

  // Result state
  const [executionResult, setExecutionResult] = useState<QueryExecutionResult | null>(() => {
    return engine.queryNearbyFarms(buyerLocation, 50000);
  });

  // Execute current preset
  const handleRunQuery = () => {
    const point: GeoPoint = { longitude: Number(lon), latitude: Number(lat) };

    if (selectedPreset === 'nearby_farms') {
      const res = engine.queryNearbyFarms(point, distanceMeters);
      setExecutionResult(res);
    } else if (selectedPreset === 'nearby_crops') {
      const res = engine.queryNearbyCrops(point, cropKeyword, distanceMeters);
      setExecutionResult(res);
    } else if (selectedPreset === 'point_in_polygon') {
      const res = engine.queryTruckPointInPolygon(point);
      setExecutionResult(res);
    } else if (selectedPreset === 'farm_area') {
      const res = engine.queryFarmsAreaList();
      setExecutionResult(res);
    } else if (selectedPreset === 'extensions') {
      setExecutionResult({
        query: `-- التحقق من حالة الإضافات المفعلة
SELECT extname, extversion, extrelocatable 
FROM pg_extension 
WHERE extname IN ('postgis', 'uuid-ossp', 'pg_trgm');`,
        executionTimeMs: 0.12,
        rowCount: 3,
        columns: ['extname', 'extversion', 'extrelocatable', 'description'],
        rows: [
          {
            extname: 'postgis',
            extversion: '3.4.2',
            extrelocatable: true,
            description: 'PostGIS geometry and spatial analysis library (SRID 4326 / WGS84)',
          },
          {
            extname: 'uuid-ossp',
            extversion: '1.1',
            extrelocatable: true,
            description: 'Generate universally unique identifiers (UUIDv4) for table IDs',
          },
          {
            extname: 'pg_trgm',
            extversion: '1.6',
            extrelocatable: true,
            description: 'Text similarity measurement and index searching based on trigrams',
          },
        ],
        queryType: 'CUSTOM',
      });
    }
  };

  const currentSqlCode = () => {
    if (selectedPreset === 'nearby_farms') {
      return `SELECT 
    f.id,
    f.name AS farm_name,
    f.wilaya,
    f.commune,
    ST_Y(f.location::geometry) AS latitude,
    ST_X(f.location::geometry) AS longitude,
    ROUND((ST_Distance(f.location, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography) / 1000)::numeric, 2) AS distance_km
FROM farms f
WHERE f.is_active = TRUE
  AND ST_DWithin(
      f.location, 
      ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography, 
      ${distanceMeters} -- المسافة بالمتر (${distanceMeters / 1000} كم)
  )
ORDER BY distance_km ASC;`;
    }

    if (selectedPreset === 'nearby_crops') {
      return `SELECT 
    fc.id AS crop_id,
    fc.title AS crop_title,
    fc.price_per_unit,
    fc.unit,
    f.name AS farm_name,
    f.wilaya,
    ROUND((ST_Distance(f.location, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography) / 1000)::numeric, 2) AS distance_km
FROM farm_crops fc
JOIN farms f ON fc.farm_id = f.id
JOIN crop_catalog cc ON fc.crop_catalog_id = cc.id
WHERE fc.status = 'AVAILABLE'
  AND (cc.name_ar LIKE '%${cropKeyword}%' OR fc.title LIKE '%${cropKeyword}%')
  AND ST_DWithin(
      f.location, 
      ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography, 
      ${distanceMeters} -- نطاق ${distanceMeters / 1000} كم
  )
ORDER BY distance_km ASC, fc.price_per_unit ASC;`;
    }

    if (selectedPreset === 'point_in_polygon') {
      return `SELECT f.id, f.name
FROM farms f
WHERE ST_Contains(
    f.boundary, 
    ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
);`;
    }

    if (selectedPreset === 'farm_area') {
      return `SELECT 
    f.id,
    f.name AS farm_name,
    f.wilaya,
    ROUND(ST_Area(f.boundary::geography)::numeric, 2) AS area_sq_meters,
    ROUND((ST_Area(f.boundary::geography) / 10000)::numeric, 2) AS area_hectares
FROM farms f
WHERE f.is_active = TRUE 
  AND f.boundary IS NOT NULL
ORDER BY area_hectares DESC;`;
    }

    return `-- تفعيل إضافات PostgreSQL الجغرافية والنصية
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT extname, extversion FROM pg_extension;`;
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(currentSqlCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-emerald-950/40 border border-stone-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">منصة تنفيذ استعلامات PostGIS المكانية</h2>
            <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono">
              Live SQL Engine
            </span>
          </div>
          <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
            تنفيذ استعلامات <code className="text-emerald-300 font-mono">ST_DWithin</code> للمسافات الجيوديسية و{' '}
            <code className="text-emerald-300 font-mono">ST_Contains</code> لفحص وقوع الشاحنات داخل حدود المضلعات،
            مع الاستفادة من الفهارس الفضائية <code className="text-amber-300 font-mono">GIST</code>.
          </p>
        </div>

        {/* Extensions Status Pill */}
        <div className="flex items-center gap-2 shrink-0 bg-stone-950/80 p-2 rounded-xl border border-stone-800 text-xs">
          <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            postgis
          </div>
          <span className="text-stone-700">|</span>
          <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            uuid-ossp
          </div>
          <span className="text-stone-700">|</span>
          <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            pg_trgm
          </div>
        </div>
      </div>

      {/* Preset Query Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          onClick={() => {
            setSelectedPreset('nearby_farms');
            setLon(6.2625);
            setLat(36.4501);
            setDistanceMeters(50000);
          }}
          className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
            selectedPreset === 'nearby_farms'
              ? 'bg-emerald-950/70 border-emerald-500/60 shadow-lg'
              : 'bg-stone-900 border-stone-800 hover:border-stone-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white">1. المزارع المجاورة</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
              ST_DWithin
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-snug">
            البحث عن المزارع ضمن نطاق 50 كم من موقع ميلة (6.2625, 36.4501).
          </p>
        </button>

        <button
          onClick={() => {
            setSelectedPreset('nearby_crops');
            setLon(6.2625);
            setLat(36.4501);
            setDistanceMeters(100000);
            setCropKeyword('زيت');
          }}
          className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
            selectedPreset === 'nearby_crops'
              ? 'bg-emerald-950/70 border-emerald-500/60 shadow-lg'
              : 'bg-stone-900 border-stone-800 hover:border-stone-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white">2. بحث المحصول الأقرب</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
              JOIN + pg_trgm
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-snug">
            البحث عن محصول بالقرب من المشتري مرتبة حسب الأقرب والأقل سعراً.
          </p>
        </button>

        <button
          onClick={() => {
            setSelectedPreset('point_in_polygon');
            setLon(6.2625);
            setLat(36.4501);
          }}
          className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
            selectedPreset === 'point_in_polygon'
              ? 'bg-emerald-950/70 border-emerald-500/60 shadow-lg'
              : 'bg-stone-900 border-stone-800 hover:border-stone-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white">3. فحص حدود المزرعة</span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
              ST_Contains
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-snug">
            فحص ما إذا كانت الشاحنة تقف داخل مضلع حدود مزرعة معينة.
          </p>
        </button>

        <button
          onClick={() => {
            setSelectedPreset('farm_area');
          }}
          className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
            selectedPreset === 'farm_area'
              ? 'bg-emerald-950/70 border-emerald-500/60 shadow-lg'
              : 'bg-stone-900 border-stone-800 hover:border-stone-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white">4. مساحات المزارع</span>
            <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-1.5 py-0.5 rounded border border-teal-800">
              ST_Area
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-snug">
            حساب مساحة مضلع الحدود بالهكتار (ST_Area / 10000) والمتر المربع.
          </p>
        </button>

        <button
          onClick={() => {
            setSelectedPreset('extensions');
          }}
          className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
            selectedPreset === 'extensions'
              ? 'bg-emerald-950/70 border-emerald-500/60 shadow-lg'
              : 'bg-stone-900 border-stone-800 hover:border-stone-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white">5. تفعيل الإضافات</span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">
              EXTENSIONS
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-snug">
            أوامر CREATE EXTENSION postgis و uuid-ossp و pg_trgm.
          </p>
        </button>
      </div>

      {/* Parameter Controls Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            معاملات الاستعلام المكانية (Dynamic Query Parameters):
          </span>
          <button
            onClick={() => {
              setLon(buyerLocation.longitude);
              setLat(buyerLocation.latitude);
            }}
            className="text-[11px] text-cyan-400 hover:underline"
          >
            استخدام موقع الشاحنة الحالي من الخريطة
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Longitude */}
          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <label className="text-[11px] text-stone-400 block mb-1">
              خط الطول (Longitude / ST_X):
            </label>
            <input
              type="number"
              step="0.0001"
              value={lon}
              onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Latitude */}
          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <label className="text-[11px] text-stone-400 block mb-1">
              خط العرض (Latitude / ST_Y):
            </label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Distance */}
          {selectedPreset !== 'point_in_polygon' && selectedPreset !== 'extensions' && (
            <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
              <label className="text-[11px] text-stone-400 block mb-1">
                نطاق المسافة بالمتر (ST_DWithin):
              </label>
              <input
                type="number"
                step="5000"
                value={distanceMeters}
                onChange={(e) => setDistanceMeters(parseInt(e.target.value) || 10000)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Keyword */}
          {selectedPreset === 'nearby_crops' && (
            <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
              <label className="text-[11px] text-stone-400 block mb-1">
                اسم المحصول (LIKE / pg_trgm):
              </label>
              <input
                type="text"
                value={cropKeyword}
                onChange={(e) => setCropKeyword(e.target.value)}
                placeholder="زيتون، زيت..."
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* SQL Editor Code Block */}
      <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-stone-900/90 px-4 py-2.5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            <span className="text-xs font-mono text-stone-400 mr-2">postgresql_postgis.sql</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'تم النسخ' : 'نسخ الاستعلام'}
            </button>

            <button
              onClick={handleRunQuery}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              تنفيذ الاستعلام (Execute SQL)
            </button>
          </div>
        </div>

        {/* Code View */}
        <div className="p-4 overflow-x-auto text-xs font-mono text-emerald-300 bg-stone-950 leading-relaxed dir-ltr text-left">
          <pre>{currentSqlCode()}</pre>
        </div>
      </div>

      {/* Execution Results View */}
      {executionResult && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Result Header & Timing */}
          <div className="p-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-950/60">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">نتائج الاستعلام (Query Results)</h3>
              <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono">
                {executionResult.rowCount} صفوف
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-stone-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                <span>زمن التنفيذ: {executionResult.executionTimeMs} ms</span>
              </div>
              <div className="text-stone-500">|</div>
              <span className="text-cyan-400">
                GIST Spatial Index Scan
              </span>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            {executionResult.rows.length > 0 ? (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-950 text-stone-400 border-b border-stone-800 font-mono">
                    <th className="py-2.5 px-4">#</th>
                    {executionResult.columns.map((col) => (
                      <th key={col} className="py-2.5 px-4 font-semibold text-stone-300">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {executionResult.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-stone-500">{idx + 1}</td>
                      {executionResult.columns.map((col) => (
                        <td key={col} className="py-2.5 px-4 text-stone-200 font-sans">
                          {col === 'distance_km' ? (
                            <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                              {row[col]} كم
                            </span>
                          ) : col === 'id' || col === 'crop_id' ? (
                            <span className="font-mono text-stone-400 text-[11px] truncate block max-w-[120px]">
                              {row[col]}
                            </span>
                          ) : col === 'latitude' || col === 'longitude' ? (
                            <span className="font-mono text-stone-300">{row[col]}</span>
                          ) : col === 'status' && String(row[col]).includes('INSIDE') ? (
                            <span className="font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                              {row[col]}
                            </span>
                          ) : (
                            String(row[col] ?? '')
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-stone-400">
                لم يتم إرجاع أي صفوف مطابقة للشروط المكانية المحددة. جرب زيادة قيمة مسافة{' '}
                <code className="text-emerald-300">ST_DWithin</code>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
