import React, { useState, useMemo, useEffect } from 'react';
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
import { CropCatalog, FarmCrop, Farm } from '../types/database';
import { stAreaHectares } from '../lib/spatialEngine';
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Coins,
  Calculator,
  Sliders,
  Scale,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';

export interface CropMarketBenchmark {
  cropCatalogId: number;
  cropName: string;
  category: string;
  unit: string;
  defaultAvgPrice: number; // متوسط سعر السوق الافتراضي (دج)
  minPrice: number; // أدنى سعر في السوق (دج)
  maxPrice: number; // أعلى سعر في السوق (دج)
  avgYieldPerHectare: number; // متوسط المردود بالهكتار (بالوحدة)
  estimatedCostPerHectare: number; // تكلفة الإنتاج التقديرية للهكتار (دج)
  notesAr: string;
}

export const CROP_BENCHMARKS: Record<number, CropMarketBenchmark> = {
  1: {
    cropCatalogId: 1,
    cropName: 'زيتون مائدة',
    category: 'أشجار مثمرة',
    unit: 'كغ',
    defaultAvgPrice: 260,
    minPrice: 210,
    maxPrice: 320,
    avgYieldPerHectare: 8500, // 8.5 طن/هكتار
    estimatedCostPerHectare: 750000,
    notesAr: 'مردود مرتفع بسهول سيق ومعسكر، تكلفة الجني تشكل 40% من التكلفة التشغيلية.',
  },
  2: {
    cropCatalogId: 2,
    cropName: 'زيت زيتون بكر ممتاز',
    category: 'صناعة تحويلية وزيوت',
    unit: 'لتر',
    defaultAvgPrice: 950,
    minPrice: 850,
    maxPrice: 1100,
    avgYieldPerHectare: 2100, // 2,100 لتر زيت/هكتار
    estimatedCostPerHectare: 680000,
    notesAr: 'استقرار سعري ممتاز وطلب تصديري متصاعد، العصر على البارد يرفع هامش الربح بـ 20%.',
  },
  3: {
    cropCatalogId: 3,
    cropName: 'تمور دقلة نور',
    category: 'تمور وفاكهة جافة',
    unit: 'كغ',
    defaultAvgPrice: 620,
    minPrice: 500,
    maxPrice: 780,
    avgYieldPerHectare: 7200, // 7.2 طن/هكتار
    estimatedCostPerHectare: 1300000,
    notesAr: 'محصول استراتيجي للتصدير مع هوامش ربح مجزية لصنف العرجون الفاخر بطولقة.',
  },
  4: {
    cropCatalogId: 4,
    cropName: 'طماطم صناعية حقلية',
    category: 'خضروات',
    unit: 'قنطار',
    defaultAvgPrice: 2400,
    minPrice: 2000,
    maxPrice: 2900,
    avgYieldPerHectare: 550, // 55 طن/هكتار
    estimatedCostPerHectare: 620000,
    notesAr: 'استيعاب مصانع التحويل مضمون مع منحة الدعم الحكومية (4 دج/كغ) للمنتجين.',
  },
  5: {
    cropCatalogId: 5,
    cropName: 'بطاطا استهلاك (سبونتا)',
    category: 'خضروات درنية',
    unit: 'قنطار',
    defaultAvgPrice: 5200,
    minPrice: 4200,
    maxPrice: 6800,
    avgYieldPerHectare: 330, // 33 طن/هكتار
    estimatedCostPerHectare: 920000,
    notesAr: 'دورة زراعية سريعة (100-110 يوم) في وادي سوف ومعسكر مع إمكانية دورتين سنوياً.',
  },
  6: {
    cropCatalogId: 6,
    cropName: 'برتقال طومسون نيفال',
    category: 'حمضيات',
    unit: 'كغ',
    defaultAvgPrice: 150,
    minPrice: 120,
    maxPrice: 190,
    avgYieldPerHectare: 22000, // 22 طن/هكتار
    estimatedCostPerHectare: 1150000,
    notesAr: 'طلب استهلاكي مرتفع في فصل الشتاء بسهل متيجة، الري بالتقطير يخفض تكلفة الطاقة.',
  },
  7: {
    cropCatalogId: 7,
    cropName: 'ثوم ميلة الأحمر',
    category: 'خضروات',
    unit: 'قنطار',
    defaultAvgPrice: 36000,
    minPrice: 28000,
    maxPrice: 45000,
    avgYieldPerHectare: 155, // 15.5 طن/هكتار
    estimatedCostPerHectare: 1850000,
    notesAr: 'أعلى عائد مالي للهكتار، ثوم ميلة يتمتع بسمعة وطنية وإمكانية تخزين جاف طويلة.',
  },
  8: {
    cropCatalogId: 8,
    cropName: 'قمح صلب عالي الجودة',
    category: 'حبوب',
    unit: 'قنطار',
    defaultAvgPrice: 6000, // السعر المقنن لديوان الحبوب OAIC
    minPrice: 6000,
    maxPrice: 6000,
    avgYieldPerHectare: 42, // 42 قنطار/هكتار
    estimatedCostPerHectare: 125000,
    notesAr: 'مشتريات حكومية مضمونة بنسبة 100% من ديوان الحبوب (OAIC) مع دعم الأسمدة والبذور.',
  },
  9: {
    cropCatalogId: 9,
    cropName: 'تين مجفف بني معوش',
    category: 'أشجار مثمرة',
    unit: 'كغ',
    defaultAvgPrice: 1350,
    minPrice: 1100,
    maxPrice: 1700,
    avgYieldPerHectare: 2800, // 2.8 طن/هكتار
    estimatedCostPerHectare: 1400000,
    notesAr: 'منتج تقليدي ذو تسمية جغرافية مسجلة وقيمة مضافة استثنائية عند التجفيف والتعليب.',
  },
  10: {
    cropCatalogId: 10,
    cropName: 'تين شوكي (هندي)',
    category: 'فاكهة',
    unit: 'صندوق',
    defaultAvgPrice: 1800,
    minPrice: 1400,
    maxPrice: 2300,
    avgYieldPerHectare: 450, // 450 صندوق/هكتار
    estimatedCostPerHectare: 240000,
    notesAr: 'شديد المقاومة للجفاف وتكاليف خدمة متدنية، وتوجه حديث لاستخلاص زيت البذور الثمين.',
  },
};

interface CropAnalyticsDashboardProps {
  catalog: CropCatalog[];
  crops: FarmCrop[];
  farms?: Farm[];
  selectedFarmId?: string | null;
  onSelectFarmId?: (farmId: string | null) => void;
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
  farms = [],
  selectedFarmId = null,
  onSelectFarmId,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'financial' | 'catalog' | 'production' | 'pie'>('financial');

  // Selected Farm for Financial Yield Simulation
  const [simulatedFarmId, setSimulatedFarmId] = useState<string>(() => {
    if (selectedFarmId) return selectedFarmId;
    return farms.length > 0 ? farms[0].id : '';
  });

  // Keep simulated farm in sync when selectedFarmId updates externally
  useEffect(() => {
    if (selectedFarmId) {
      setSimulatedFarmId(selectedFarmId);
    }
  }, [selectedFarmId]);

  // The active farm object
  const activeFarm = useMemo(() => {
    return farms.find((f) => f.id === simulatedFarmId) || farms[0] || null;
  }, [farms, simulatedFarmId]);

  // ST_Area calculated area in Hectares for active farm
  const farmCalculatedHectares = useMemo(() => {
    if (!activeFarm || !activeFarm.boundary) return 15;
    return stAreaHectares(activeFarm.boundary);
  }, [activeFarm]);

  // Interactive slider/allocated area for the crop (defaults to farm boundary area)
  const [allocatedAreaHa, setAllocatedAreaHa] = useState<number>(farmCalculatedHectares);

  // Sync allocated area when farm changes
  useEffect(() => {
    setAllocatedAreaHa(farmCalculatedHectares);
  }, [farmCalculatedHectares]);

  // Selected Crop Catalog for Simulation
  const [selectedCropCatalogId, setSelectedCropCatalogId] = useState<number>(() => {
    // If active farm has crops, default to its first crop's catalog id
    if (activeFarm) {
      const farmCrop = crops.find((c) => c.farm_id === activeFarm.id);
      if (farmCrop) return farmCrop.crop_catalog_id;
    }
    return catalog.length > 0 ? catalog[0].id : 2; // Default to Olive Oil (id: 2)
  });

  // When active farm changes, optionally adapt selected crop to one of its offerings
  useEffect(() => {
    if (activeFarm) {
      const farmCrop = crops.find((c) => c.farm_id === activeFarm.id);
      if (farmCrop) {
        setSelectedCropCatalogId(farmCrop.crop_catalog_id);
      }
    }
  }, [activeFarm, crops]);

  // Get benchmark info for the selected crop
  const benchmark = useMemo<CropMarketBenchmark>(() => {
    const found = CROP_BENCHMARKS[selectedCropCatalogId];
    if (found) return found;

    // Fallback benchmark if new custom catalog item is introduced
    const catalogItem = catalog.find((c) => c.id === selectedCropCatalogId);
    return {
      cropCatalogId: selectedCropCatalogId,
      cropName: catalogItem?.name_ar || 'محصول زراعي',
      category: catalogItem?.category || 'محاصيل عامة',
      unit: catalogItem?.unit_default || 'كغ',
      defaultAvgPrice: 350,
      minPrice: 250,
      maxPrice: 480,
      avgYieldPerHectare: 5000,
      estimatedCostPerHectare: 600000,
      notesAr: 'بيانات تقديرية استرشادية بناءً على متوسطات القطاع الفلاحي.',
    };
  }, [selectedCropCatalogId, catalog]);

  // Actual farm crop offer for comparison (if this farm produces this crop)
  const farmCropOffer = useMemo(() => {
    if (!activeFarm) return null;
    return (
      crops.find(
        (c) => c.farm_id === activeFarm.id && c.crop_catalog_id === selectedCropCatalogId
      ) || null
    );
  }, [activeFarm, crops, selectedCropCatalogId]);

  // Price adjustment state (defaults to defaultAvgPrice or farm offer price)
  const [customPrice, setCustomPrice] = useState<number>(benchmark.defaultAvgPrice);

  // Update custom price when crop benchmark or farm offer changes
  useEffect(() => {
    if (farmCropOffer) {
      setCustomPrice(farmCropOffer.price_per_unit);
    } else {
      setCustomPrice(benchmark.defaultAvgPrice);
    }
  }, [benchmark, farmCropOffer]);

  // Real-time financial calculations
  const financialEstimates = useMemo(() => {
    const area = Number(allocatedAreaHa) || 1;
    const yieldPerHa = benchmark.avgYieldPerHectare;
    const totalEstimatedProduction = area * yieldPerHa;

    // Gross Revenue at default market average price
    const grossRevenueAtMarketAvg = totalEstimatedProduction * benchmark.defaultAvgPrice;

    // Gross Revenue at user's adjusted/farm price
    const grossRevenueAtCustomPrice = totalEstimatedProduction * customPrice;

    // Gross Revenue at farm offer price (if available)
    const farmOfferPrice = farmCropOffer ? farmCropOffer.price_per_unit : benchmark.defaultAvgPrice;
    const grossRevenueAtFarmPrice = totalEstimatedProduction * farmOfferPrice;

    // Production Cost
    const totalProductionCost = area * benchmark.estimatedCostPerHectare;

    // Net Profit & Margins
    const netProfitAtMarketAvg = grossRevenueAtMarketAvg - totalProductionCost;
    const netProfitAtCustomPrice = grossRevenueAtCustomPrice - totalProductionCost;
    const profitMarginPercent =
      grossRevenueAtMarketAvg > 0
        ? ((netProfitAtMarketAvg / grossRevenueAtMarketAvg) * 100).toFixed(1)
        : '0';

    // Revenue per Hectare
    const revenuePerHectareMarket = yieldPerHa * benchmark.defaultAvgPrice;

    // Difference between farm price & default market average price
    const priceVariancePct =
      farmCropOffer && benchmark.defaultAvgPrice > 0
        ? (
            ((farmCropOffer.price_per_unit - benchmark.defaultAvgPrice) /
              benchmark.defaultAvgPrice) *
            100
          ).toFixed(1)
        : '0';

    return {
      area,
      yieldPerHa,
      totalEstimatedProduction,
      grossRevenueAtMarketAvg,
      grossRevenueAtCustomPrice,
      grossRevenueAtFarmPrice,
      totalProductionCost,
      netProfitAtMarketAvg,
      netProfitAtCustomPrice,
      profitMarginPercent,
      revenuePerHectareMarket,
      priceVariancePct,
    };
  }, [allocatedAreaHa, benchmark, customPrice, farmCropOffer]);

  // Scenarios BarChart data (Conservative -15%, Market Avg, Farm Price, Optimistic +15%)
  const scenarioChartData = useMemo(() => {
    const conservativeRev = financialEstimates.grossRevenueAtMarketAvg * 0.85;
    const optimisticRev = financialEstimates.grossRevenueAtMarketAvg * 1.15;
    const cost = financialEstimates.totalProductionCost;

    return [
      {
        scenario: 'سيناريو متحفظ (-15%)',
        revenueMillion: Number((conservativeRev / 1000000).toFixed(2)),
        netProfitMillion: Number(((conservativeRev - cost) / 1000000).toFixed(2)),
        costMillion: Number((cost / 1000000).toFixed(2)),
        fill: '#f59e0b',
      },
      {
        scenario: 'متوسط سعر السوق الافتراضي',
        revenueMillion: Number((financialEstimates.grossRevenueAtMarketAvg / 1000000).toFixed(2)),
        netProfitMillion: Number((financialEstimates.netProfitAtMarketAvg / 1000000).toFixed(2)),
        costMillion: Number((cost / 1000000).toFixed(2)),
        fill: '#10b981',
      },
      {
        scenario: 'سعر عرض المزرعة الحالية',
        revenueMillion: Number((financialEstimates.grossRevenueAtFarmPrice / 1000000).toFixed(2)),
        netProfitMillion: Number(
          ((financialEstimates.grossRevenueAtFarmPrice - cost) / 1000000).toFixed(2)
        ),
        costMillion: Number((cost / 1000000).toFixed(2)),
        fill: '#06b6d4',
      },
      {
        scenario: 'سيناريو متفائل (+15%)',
        revenueMillion: Number((optimisticRev / 1000000).toFixed(2)),
        netProfitMillion: Number(((optimisticRev - cost) / 1000000).toFixed(2)),
        costMillion: Number((cost / 1000000).toFixed(2)),
        fill: '#8b5cf6',
      },
    ];
  }, [financialEstimates]);

  // Cross-crop comparison: Revenue per Hectare for all catalog items (in thousand DZD / ha)
  const crossCropRevenueComparison = useMemo(() => {
    return catalog.map((item) => {
      const b = CROP_BENCHMARKS[item.id] || {
        defaultAvgPrice: 350,
        avgYieldPerHectare: 5000,
        estimatedCostPerHectare: 600000,
      };
      const grossRevHa = (b.avgYieldPerHectare * b.defaultAvgPrice) / 1000; // in thousand DZD
      const costHa = b.estimatedCostPerHectare / 1000;
      const netHa = grossRevHa - costHa;

      return {
        id: item.id,
        name: item.name_ar,
        category: item.category,
        unit: item.unit_default,
        grossRevHa: Math.round(grossRevHa),
        costHa: Math.round(costHa),
        netHa: Math.round(netHa),
        isSelected: item.id === selectedCropCatalogId,
      };
    }).sort((a, b) => b.grossRevHa - a.grossRevHa);
  }, [catalog, selectedCropCatalogId]);

  // Aggregated data by category for Catalog Distribution view
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

  // Custom Recharts Tooltip for Category Chart
  const CustomCategoryTooltip = ({ active, payload }: any) => {
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

  // Custom Tooltip for Financial Scenarios
  const CustomScenarioTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900/95 border border-stone-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs text-right max-w-xs space-y-2 font-['Cairo',sans-serif]">
          <div className="border-b border-stone-800 pb-1 font-bold text-emerald-400">
            {label}
          </div>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4 text-stone-300">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <strong className="text-white font-mono">{entry.value} مليون دج</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Revenue per Hectare
  const CustomRevHaTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-stone-900/95 border border-stone-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs text-right max-w-xs space-y-1.5 font-['Cairo',sans-serif]">
          <div className="border-b border-stone-800 pb-1 flex justify-between items-center">
            <span className="font-bold text-amber-400 text-sm">{data.name}</span>
            <span className="text-[10px] text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">
              {data.category}
            </span>
          </div>
          <div className="flex justify-between text-stone-300">
            <span>العائد الإجمالي للهكتار:</span>
            <strong className="text-emerald-400 font-mono">
              {(data.grossRevHa * 1000).toLocaleString('ar-DZ')} دج
            </strong>
          </div>
          <div className="flex justify-between text-stone-300">
            <span>تكلفة الهكتار التقديرية:</span>
            <strong className="text-rose-400 font-mono">
              {(data.costHa * 1000).toLocaleString('ar-DZ')} دج
            </strong>
          </div>
          <div className="flex justify-between text-stone-300 border-t border-stone-800 pt-1">
            <span>صافي الهكتار المتوقع:</span>
            <strong className="text-cyan-400 font-mono">
              {(data.netHa * 1000).toLocaleString('ar-DZ')} دج
            </strong>
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
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white">
                لوحة تحليل المحاصيل وتقدير العائد المالي (Financial Yield & Recharts)
              </h2>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                ST_Area + MARKET BENCHMARKS
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              تقدير العائد المالي التقديري بناءً على مساحة مضلع المزرعة ونوع المحصول مقارنة بمتوسط أسعار السوق الافتراضية
            </p>
          </div>
        </div>

        {/* Action controls & View modes */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setViewMode('financial')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'financial'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-1 ring-emerald-400/40'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              تقدير العائد المالي
            </button>
            <button
              onClick={() => setViewMode('catalog')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                viewMode === 'catalog'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              توزيع الكتالوج
            </button>
            <button
              onClick={() => setViewMode('production')}
              className={`hidden md:flex px-3 py-1.5 rounded-lg font-medium transition-all items-center gap-1 ${
                viewMode === 'production'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              مقارنة العرض الفعلي
            </button>
            <button
              onClick={() => setViewMode('pie')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
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
          {/* ========================================================
              VIEW MODE 1: FINANCIAL YIELD & REVENUE ESTIMATION
          ======================================================== */}
          {viewMode === 'financial' && (
            <div className="space-y-6">
              {/* Interactive Simulation Controls Bar */}
              <div className="bg-stone-950/80 border border-stone-800 p-4 sm:p-5 rounded-2xl shadow-inner space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-xs sm:text-sm text-white">
                      محددات محاكاة العائد المالي (المزرعة، المساحة، المحصول وسعر السوق)
                    </h3>
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-lg">
                    Formula: Area(ha) × Yield/ha × Price(DZD)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Farm Selection & ST_Area Boundary Info */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        المزرعة المحددة:
                      </span>
                      {activeFarm?.boundary && (
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                          ST_Area: {farmCalculatedHectares} هكتار
                        </span>
                      )}
                    </label>

                    <select
                      value={simulatedFarmId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSimulatedFarmId(newId);
                        if (onSelectFarmId) onSelectFarmId(newId);
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {farms.map((f) => {
                        const ha = f.boundary ? stAreaHectares(f.boundary) : 15;
                        return (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.wilaya}) - {ha} هكتار
                          </option>
                        );
                      })}
                    </select>

                    {/* Allocated Area Slider */}
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span>المساحة المستغلة للمحصول:</span>
                        <strong className="text-emerald-400 font-mono text-xs">
                          {allocatedAreaHa} هكتار
                        </strong>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max={Math.max(50, Math.ceil(farmCalculatedHectares * 1.5))}
                        step="0.5"
                        value={allocatedAreaHa}
                        onChange={(e) => setAllocatedAreaHa(parseFloat(e.target.value) || 1)}
                        className="w-full accent-emerald-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 2. Crop Type Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                      <span>نوع المحصول الزراعي:</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {benchmark.category}
                      </span>
                    </label>

                    <select
                      value={selectedCropCatalogId}
                      onChange={(e) => setSelectedCropCatalogId(parseInt(e.target.value, 10))}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {catalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name_ar} ({item.category} - {item.unit_default})
                        </option>
                      ))}
                    </select>

                    {/* Agronomic Yield Display */}
                    <div className="p-2 rounded-xl bg-stone-900/90 border border-stone-800 text-[11px] space-y-1">
                      <div className="flex justify-between text-stone-300">
                        <span>معدل المردودية الافتراضي:</span>
                        <strong className="text-cyan-400 font-mono">
                          {benchmark.avgYieldPerHectare.toLocaleString('ar-DZ')} {benchmark.unit}/هكتار
                        </strong>
                      </div>
                      <div className="flex justify-between text-stone-400">
                        <span>تكلفة الهكتار المقدرة:</span>
                        <span className="font-mono text-stone-300">
                          {benchmark.estimatedCostPerHectare.toLocaleString('ar-DZ')} دج/هكتار
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Price Comparison & Simulation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
                      <span>سعر البيع المعتمد للمحاكاة:</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        متوسط السوق: {benchmark.defaultAvgPrice} دج/{benchmark.unit}
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(Math.max(1, parseFloat(e.target.value) || 0))}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute left-3 top-2 text-stone-400 text-xs">
                        دج/{benchmark.unit}
                      </span>
                    </div>

                    {/* Comparison with actual farm offer price */}
                    {farmCropOffer ? (
                      <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] flex items-center justify-between">
                        <span className="text-cyan-300">سعر عرض المزرعة الحالية:</span>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-white font-mono">
                            {farmCropOffer.price_per_unit} دج
                          </strong>
                          <span
                            className={`text-[10px] px-1 py-0.5 rounded font-mono ${
                              Number(financialEstimates.priceVariancePct) >= 0
                                ? 'bg-emerald-950 text-emerald-400'
                                : 'bg-rose-950 text-rose-400'
                            }`}
                          >
                            {Number(financialEstimates.priceVariancePct) >= 0 ? '+' : ''}
                            {financialEstimates.priceVariancePct}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-stone-900/60 border border-stone-800 text-[11px] text-stone-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>هذا المحصول غير مسجل كعرض نشط لهذه المزرعة حالياً.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Total Estimated Production Volume */}
                <div className="bg-stone-950/90 border border-stone-800 p-4 rounded-2xl relative overflow-hidden">
                  <span className="text-[11px] text-stone-400 block mb-1">
                    إجمالي الإنتاج المتوقع للمساحة:
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">
                      {financialEstimates.totalEstimatedProduction.toLocaleString('ar-DZ')}
                    </span>
                    <span className="text-xs text-stone-400">{benchmark.unit}</span>
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    {allocatedAreaHa} هكتار × {benchmark.avgYieldPerHectare} {benchmark.unit}
                  </span>
                </div>

                {/* 2. Gross Revenue at Default Market Average Price */}
                <div className="bg-stone-950/90 border border-stone-800 p-4 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-stone-400">العائد بسعر السوق الافتراضي:</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
                      {benchmark.defaultAvgPrice} دج/{benchmark.unit}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
                      {(financialEstimates.grossRevenueAtMarketAvg / 1000000).toFixed(2)}
                    </span>
                    <span className="text-xs text-stone-300">مليون دج</span>
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block font-mono">
                    {Math.round(financialEstimates.grossRevenueAtMarketAvg).toLocaleString('ar-DZ')} دج
                  </span>
                </div>

                {/* 3. Estimated Production Cost */}
                <div className="bg-stone-950/90 border border-stone-800 p-4 rounded-2xl relative overflow-hidden">
                  <span className="text-[11px] text-stone-400 block mb-1">
                    تكلفة الإنتاج والخدمة المقدرة:
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-rose-400 font-mono">
                      {(financialEstimates.totalProductionCost / 1000000).toFixed(2)}
                    </span>
                    <span className="text-xs text-stone-300">مليون دج</span>
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block font-mono">
                    {allocatedAreaHa} هكتار × {benchmark.estimatedCostPerHectare.toLocaleString('ar-DZ')} دج
                  </span>
                </div>

                {/* 4. Estimated Net Profit & Margin */}
                <div className="bg-gradient-to-br from-stone-950 to-emerald-950/50 border border-emerald-500/30 p-4 rounded-2xl relative overflow-hidden shadow-lg shadow-emerald-950/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-emerald-300 font-bold">
                      صافي الربح التقديري المتوقع:
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 font-mono bg-emerald-900/60 px-1.5 py-0.5 rounded">
                      هامش {financialEstimates.profitMarginPercent}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-white font-mono">
                      {(financialEstimates.netProfitAtMarketAvg / 1000000).toFixed(2)}
                    </span>
                    <span className="text-xs text-emerald-300">مليون دج</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 mt-1 block font-mono">
                    المردود للهكتار: {(financialEstimates.revenuePerHectareMarket / 1000).toFixed(0)} ألف دج/هكتار
                  </span>
                </div>
              </div>

              {/* Recharts Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Chart A: Scenario Financial Comparison (7 cols) */}
                <div className="lg:col-span-7 bg-stone-950/90 border border-stone-800 p-4 sm:p-5 rounded-2xl shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        مقارنة سيناريوهات العائد وصافي الربح لـ ({benchmark.cropName})
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">
                      الوحدة: مليون دينار جزائري (M DZD)
                    </span>
                  </div>

                  <div className="w-full h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={scenarioChartData}
                        margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                        <XAxis
                          dataKey="scenario"
                          stroke="#a8a29e"
                          fontSize={10}
                          tickLine={false}
                          interval={0}
                          angle={-12}
                          textAnchor="end"
                        />
                        <YAxis stroke="#a8a29e" fontSize={11} tickLine={false} />
                        <Tooltip content={<CustomScenarioTooltip />} cursor={{ fill: '#292524', opacity: 0.4 }} />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ paddingBottom: '8px' }}
                          formatter={(val) => (
                            <span className="text-stone-300 text-xs font-semibold mr-1">
                              {val === 'revenueMillion'
                                ? 'العائد الإجمالي (Revenue)'
                                : 'صافي الربح المتوقع (Net Profit)'}
                            </span>
                          )}
                        />
                        <Bar
                          dataKey="revenueMillion"
                          name="revenueMillion"
                          fill="#10b981"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={40}
                        >
                          {scenarioChartData.map((entry, idx) => (
                            <Cell key={`scenario-rev-${idx}`} fill={entry.fill} />
                          ))}
                        </Bar>
                        <Bar
                          dataKey="netProfitMillion"
                          name="netProfitMillion"
                          fill="#06b6d4"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-[11px] text-stone-400 leading-relaxed border-t border-stone-800/80 pt-2">
                    <strong className="text-emerald-400">ملاحظة تقييمية: </strong>
                    {benchmark.notesAr}
                  </p>
                </div>

                {/* Chart B: Benchmark Revenue per Hectare Comparison Across Crops (5 cols) */}
                <div className="lg:col-span-5 bg-stone-950/90 border border-stone-800 p-4 sm:p-5 rounded-2xl shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">
                        مقارنة العائد للهكتار بين محاصيل الكتالوج
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">
                      ألف دج / هكتار
                    </span>
                  </div>

                  <div className="w-full h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={crossCropRevenueComparison}
                        layout="vertical"
                        margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#292524" horizontal={false} />
                        <XAxis type="number" stroke="#a8a29e" fontSize={10} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#a8a29e"
                          fontSize={10}
                          tickLine={false}
                          width={85}
                        />
                        <Tooltip content={<CustomRevHaTooltip />} cursor={{ fill: '#292524', opacity: 0.4 }} />
                        <Bar
                          dataKey="grossRevHa"
                          name="العائد الإجمالي (ألف دج/هكتار)"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={20}
                        >
                          {crossCropRevenueComparison.map((entry) => (
                            <Cell
                              key={`bar-cross-${entry.id}`}
                              fill={entry.isSelected ? '#10b981' : '#f59e0b'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-800 pt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                      المحصول المختار حالياً
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                      بقية محاصيل الكتالوج
                    </span>
                  </div>
                </div>
              </div>

              {/* Economic Recommendations and Market Guidance Panel */}
              <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-xs text-white">
                    توجيهات الجدوى الاقتصادية وقرارات الإنتاج للفلاح
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      مؤشر الأمان المالي
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      محاصيل الحبوب (القمح الصلب) تحظى بضمان الشراء الكامل من ديوان الحبوب بسعر 6,000 دج/قنطار بدون مخاطر تسويقية.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                      أعلى قيمة مضافة
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      تحويل الزيتون إلى زيت زيتون معصور على البارد وثوم ميلة يحققان أعلى صافي عائد للهكتار يتجاوز 1.5 مليون دج/هكتار.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      إدارة تكلفة المدخلات
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      الري بالتقطير واستخدام الطاقة الشمسية يقلصان تكلفة الهكتار بنسبة 25% ويرفعان هامش الربح الصافي.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW MODES 2, 3, 4: CATALOG DISTRIBUTION & RECHARTS
          ======================================================== */}
          {viewMode !== 'financial' && (
            <div className="space-y-6">
              {/* Quick Summary Cards */}
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
                          <Tooltip content={<CustomCategoryTooltip />} />
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
                            {categoryStats.map((_, index) => (
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
                          <Tooltip content={<CustomCategoryTooltip />} cursor={{ fill: '#292524', opacity: 0.4 }} />
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
      )}
    </div>
  );
};
