import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { CropCatalog, FarmCrop } from '../types/database';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface CropAnalyticsDashboardProps {
  catalog: CropCatalog[];
  crops: FarmCrop[];
}

const PALETTE = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#f97316', // orange
];

export const CropAnalyticsDashboard: React.FC<CropAnalyticsDashboardProps> = ({
  catalog,
  crops,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'catalog' | 'production' | 'pie'>('catalog');

  // Aggregated data by category
  const categoryStats = useMemo(() => {
    const statsMap: Record<
      string,
      {
        category: string;
        catalogCount: number;
        offerCount: number;
        totalQuantity: number;
        cropsSample: string[];
        totalValueDzd: number;
      }
    > = {};

    // 1. Process catalog items
    catalog.forEach((item) => {
      const cat = item.category || 'أخرى';
      if (!statsMap[cat]) {
        statsMap[cat] = {
          category: cat,
          catalogCount: 0,
          offerCount: 0,
          totalQuantity: 0,
          cropsSample: [],
          totalValueDzd: 0,
        };
      }
      statsMap[cat].catalogCount += 1;
      if (!statsMap[cat].cropsSample.includes(item.name_ar)) {
        statsMap[cat].cropsSample.push(item.name_ar);
      }
    });

    // 2. Process active farm crops
    crops.forEach((crop) => {
      const catItem = catalog.find((c) => c.id === crop.crop_catalog_id);
      const cat = catItem?.category || 'أخرى';
      if (!statsMap[cat]) {
        statsMap[cat] = {
          category: cat,
          catalogCount: 0,
          offerCount: 0,
          totalQuantity: 0,
          cropsSample: [],
          totalValueDzd: 0,
        };
      }
      statsMap[cat].offerCount += 1;
      statsMap[cat].totalQuantity += Number(crop.quantity_available) || 0;
      statsMap[cat].totalValueDzd +=
        (Number(crop.quantity_available) || 0) * (Number(crop.price_per_unit) || 0);
    });

    return Object.values(statsMap).sort((a, b) => b.catalogCount - a.catalogCount);
  }, [catalog, crops]);

  // Total metrics
  const totalCatalogItems = catalog.length;
  const totalCategories = categoryStats.length;
  const totalActiveOffers = crops.length;

  // Custom Recharts Tooltip with dark theme and Arabic styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-stone-900/95 border border-stone-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs text-right max-w-xs space-y-1.5 font-['Cairo',sans-serif]">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1">
            <span className="font-bold text-emerald-400 text-sm">{data.category}</span>
            <span className="text-[10px] text-stone-400 font-mono">crop_catalog</span>
          </div>

          <div className="flex items-center justify-between text-stone-300">
            <span>عدد الأصناف بالكتالوج:</span>
            <strong className="text-white font-mono text-sm">{data.catalogCount} صنف</strong>
          </div>

          <div className="flex items-center justify-between text-stone-300">
            <span>عروض المزارع المعروضة:</span>
            <strong className="text-cyan-400 font-mono text-sm">{data.offerCount} عرض</strong>
          </div>

          <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-800/80">
            <span>أمثلة: </span>
            <span className="text-stone-300">{data.cropsSample.slice(0, 3).join('، ')}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl transition-all">
      {/* Dashboard Top Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-900 to-emerald-950/40 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                لوحة توجيه الإنتاج الفلاحي (Recharts Analytics)
              </h2>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                crop_catalog DISTRIBUTION
              </span>
            </div>
            <p className="text-xs text-stone-400">
              تحليل توزيع أصناف المحاصيل حسب الفئات الزراعية لمساعدة المزارعين في اتخاذ قرارات الغرس والإنتاج
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Chart View Mode Buttons */}
          <div className="hidden sm:flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setViewMode('catalog')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'catalog'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              أعمدة الكتالوج
            </button>
            <button
              onClick={() => setViewMode('production')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'production'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              مقارنة العرض الفعلي
            </button>
            <button
              onClick={() => setViewMode('pie')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'pie'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              دائري (Pie)
            </button>
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
            title={isCollapsed ? 'توسيع لوحة التحكم' : 'طي لوحة التحكم'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>إظهار التحليل</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>طي اللوحة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Top Quick Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-stone-950/70 border border-stone-800 p-3.5 rounded-2xl">
              <span className="text-[11px] text-stone-400 block mb-0.5">الفئات الزراعية المسجلة:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-white font-mono">{totalCategories}</span>
                <span className="text-xs text-stone-400">فئات رئيسية</span>
              </div>
            </div>

            <div className="bg-stone-950/70 border border-stone-800 p-3.5 rounded-2xl">
              <span className="text-[11px] text-stone-400 block mb-0.5">أصناف الكتالوج المرجعي:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-emerald-400 font-mono">
                  {totalCatalogItems}
                </span>
                <span className="text-xs text-stone-400">صنف نباتي</span>
              </div>
            </div>

            <div className="bg-stone-950/70 border border-stone-800 p-3.5 rounded-2xl">
              <span className="text-[11px] text-stone-400 block mb-0.5">عروض المزارع المعروضة:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-cyan-400 font-mono">{totalActiveOffers}</span>
                <span className="text-xs text-stone-400">عرض نشط</span>
              </div>
            </div>

            <div className="bg-stone-950/70 border border-stone-800 p-3.5 rounded-2xl">
              <span className="text-[11px] text-stone-400 block mb-0.5">أعلى فئة تنوعاً:</span>
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="text-sm font-bold text-amber-400 truncate">
                  {categoryStats[0]?.category || 'أشجار مثمرة'}
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  ({categoryStats[0]?.catalogCount} أصناف)
                </span>
              </div>
            </div>
          </div>

          {/* Main Visual Chart Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Chart Container (8 cols) */}
            <div className="lg:col-span-8 bg-stone-950/90 border border-stone-800 p-4 sm:p-5 rounded-2xl shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    {viewMode === 'catalog'
                      ? 'رسم بياني: عدد الأصناف المسجلة في كل فئة بجدول crop_catalog'
                      : viewMode === 'production'
                      ? 'مقارنة أصناف الكتالوج مقابل عروض المزارع الحالية في السوق'
                      : 'التوزيع النسبي المئوي للفئات الزراعية'}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 font-mono hidden sm:inline">
                  Recharts Responsive Container
                </span>
              </div>

              {/* Chart Rendering */}
              <div className="w-full h-64 sm:h-72">
                {viewMode === 'pie' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(val) => <span className="text-stone-300 text-xs">{val}</span>}
                      />
                      <Pie
                        data={categoryStats}
                        dataKey="catalogCount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        paddingAngle={3}
                        label={({ name, percent }: any) =>
                          `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PALETTE[index % PALETTE.length]}
                            stroke="#1c1917"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryStats}
                      margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                      <XAxis
                        dataKey="category"
                        stroke="#a8a29e"
                        fontSize={11}
                        tickLine={false}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                      />
                      <YAxis stroke="#a8a29e" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#292524', opacity: 0.4 }} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: '8px' }}
                        formatter={(val) => (
                          <span className="text-stone-300 text-xs font-semibold mr-1">
                            {val === 'catalogCount'
                              ? 'أصناف الكتالوج (Catalog)'
                              : 'عروض المزارع النشطة (Farm Offers)'}
                          </span>
                        )}
                      />
                      <Bar
                        dataKey="catalogCount"
                        name="catalogCount"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={45}
                      >
                        {categoryStats.map((_, index) => (
                          <Cell key={`bar-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Bar>

                      {viewMode === 'production' && (
                        <Bar
                          dataKey="offerCount"
                          name="offerCount"
                          fill="#06b6d4"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Strategic Farmer Decision Panel (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-xs text-white">
                    توجيهات وقرارات الإنتاج للمزارعين
                  </h3>
                </div>

                <p className="text-[11px] text-stone-400 leading-relaxed">
                  تساعد هذه المؤشرات الفلاحين على اختيار المحاصيل الأقل تشبعاً في السوق وذات الهوامش الربحية
                  المرتفعة:
                </p>

                <div className="space-y-2 text-xs">
                  {/* Opportunity 1: Processing & Oils */}
                  <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-300 font-bold block text-xs">
                        فرصة توسع: الصناعات التحويلية وزيت الزيتون
                      </strong>
                      <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                        طلب متزايد واستقرار سعري مرتفع (900-1100 دج/لتر). يُنصح بالتوسع في عصر الزيت وتخزينه.
                      </p>
                    </div>
                  </div>

                  {/* Opportunity 2: Cereals */}
                  <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-cyan-300 font-bold block text-xs">
                        محاصيل إستراتيجية: الحبوب والقمح الصلب
                      </strong>
                      <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                        دعم حكومي ومشتريات مضمونة من ديوان الحبوب (OAIC)، مناسبة لسهول ميلة وسطيف.
                      </p>
                    </div>
                  </div>

                  {/* Caution: High perishable vegetables */}
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300 font-bold block text-xs">
                        تنبيه تسويقي: الخضروات سريعة التلف
                      </strong>
                      <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                        احرص على إبرام عقود حجز مسبق (PRE_ORDER) مع المصانع وشاحنات الجملة قبل موسم الجني.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Summary of Categories */}
              <div className="bg-stone-950/60 border border-stone-800 p-3 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-500" />
                  مصدر البيانات:
                </span>
                <span className="text-emerald-400 font-mono text-[11px]">
                  SELECT category, count(*) FROM crop_catalog GROUP BY category;
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
