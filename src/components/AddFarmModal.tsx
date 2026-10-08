import React, { useState } from 'react';
import { Farm, FarmCrop, CropCatalog, User, GeoPoint, GeoPolygon } from '../types/database';
import { X, MapPin, Plus, Sparkles, Building2, Sprout } from 'lucide-react';

interface AddFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  farms: Farm[];
  catalog: CropCatalog[];
  users: User[];
  currentLocation: GeoPoint;
  onAddFarm: (newFarm: Farm) => void;
  onAddCrop: (newCrop: FarmCrop) => void;
}

export const AddFarmModal: React.FC<AddFarmModalProps> = ({
  isOpen,
  onClose,
  farms,
  catalog,
  users,
  currentLocation,
  onAddFarm,
  onAddCrop,
}) => {
  const [tab, setTab] = useState<'farm' | 'crop'>('farm');

  // Farm Form State
  const [farmName, setFarmName] = useState('');
  const [farmWilaya, setFarmWilaya] = useState('ميلة (Mila)');
  const [farmCommune, setFarmCommune] = useState('');
  const [farmDesc, setFarmDesc] = useState('');
  const [farmLon, setFarmLon] = useState(currentLocation.longitude);
  const [farmLat, setFarmLat] = useState(currentLocation.latitude);
  const [farmFarmerId, setFarmFarmerId] = useState(users[0]?.id || '');

  // Crop Form State
  const [cropFarmId, setCropFarmId] = useState(farms[0]?.id || '');
  const [cropCatalogId, setCropCatalogId] = useState(catalog[0]?.id || 1);
  const [cropTitle, setCropTitle] = useState('');
  const [cropPrice, setCropPrice] = useState(900);
  const [cropUnit, setCropUnit] = useState('كغ');
  const [cropQty, setCropQty] = useState(1000);
  const [cropOrganic, setCropOrganic] = useState(true);
  const [cropHarvest, setCropHarvest] = useState('2026-05-01');
  const [cropStatus, setCropStatus] = useState<'AVAILABLE' | 'PRE_ORDER'>('AVAILABLE');

  if (!isOpen) return null;

  // Handle adding a new farm with valid polygon boundary
  const handleSaveFarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim()) return;

    // Generate a bounding box polygon (+/- 0.008 degrees ~ 800m)
    const offset = 0.008;
    const boundary: GeoPolygon = [
      [farmLon - offset, farmLat - offset],
      [farmLon + offset, farmLat - offset],
      [farmLon + offset, farmLat + offset],
      [farmLon - offset, farmLat + offset],
      [farmLon - offset, farmLat - offset], // Close loop
    ];

    const newFarm: Farm = {
      id: crypto.randomUUID ? crypto.randomUUID() : `farm-${Date.now()}`,
      farmer_id: farmFarmerId || users[0].id,
      name: farmName,
      description: farmDesc || 'مستثمرة فلاحية مسجلة في السجل الجغرافي الوطني',
      wilaya: farmWilaya,
      commune: farmCommune || 'المركز الفلاحي',
      location: { longitude: Number(farmLon), latitude: Number(farmLat) },
      boundary,
      address_text: `${farmCommune}، ${farmWilaya}`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onAddFarm(newFarm);
    onClose();
  };

  // Handle adding a new crop
  const handleSaveCrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropTitle.trim()) return;

    const newCrop: FarmCrop = {
      id: crypto.randomUUID ? crypto.randomUUID() : `crop-${Date.now()}`,
      farm_id: cropFarmId || farms[0].id,
      crop_catalog_id: Number(cropCatalogId),
      title: cropTitle,
      price_per_unit: Number(cropPrice),
      unit: cropUnit,
      quantity_available: Number(cropQty),
      is_organic: cropOrganic,
      harvest_date: cropHarvest,
      status: cropStatus,
      created_at: new Date().toISOString(),
    };

    onAddCrop(newCrop);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800">
              {tab === 'farm' ? <Building2 className="w-5 h-5" /> : <Sprout className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {tab === 'farm' ? 'تسجيل مزرعة فلاحية جديدة (PostGIS Farm)' : 'إضافة عرض محصول زراعي جديد'}
              </h3>
              <p className="text-xs text-stone-400">
                إدخال إحداثيات WGS84 وحدود المزرعة Polygon في قاعدة البيانات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-800 text-xs">
          <button
            onClick={() => setTab('farm')}
            className={`flex-1 py-3 font-bold transition-colors ${
              tab === 'farm'
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-stone-950/40'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            1. إضافة مزرعة وموقع جغرافي (Point & Polygon)
          </button>
          <button
            onClick={() => setTab('crop')}
            className={`flex-1 py-3 font-bold transition-colors ${
              tab === 'crop'
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-stone-950/40'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            2. إضافة محصول أو منتج زراعي (Farm Crop)
          </button>
        </div>

        {/* Form Body */}
        {tab === 'farm' ? (
          <form onSubmit={handleSaveFarm} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block text-stone-300 font-semibold mb-1">اسم المزرعة أو المستثمرة *</label>
              <input
                type="text"
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="مثال: مزرعة التلال الخضراء للزيتون"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">الولاية (Wilaya) *</label>
                <select
                  value={farmWilaya}
                  onChange={(e) => setFarmWilaya(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ميلة (Mila)">ميلة (Mila)</option>
                  <option value="قسنطينة (Constantine)">قسنطينة (Constantine)</option>
                  <option value="سطيف (Setif)">سطيف (Setif)</option>
                  <option value="بسكرة (Biskra)">بسكرة (Biskra)</option>
                  <option value="معسكر (Mascara)">معسكر (Mascara)</option>
                  <option value="البليدة (Blida)">البليدة (Blida)</option>
                  <option value="تيبازة (Tipaza)">تيبازة (Tipaza)</option>
                  <option value="الوادي (El Oued)">الوادي (El Oued)</option>
                  <option value="جيجل (Jijel)">جيجل (Jijel)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">البلدية (Commune) *</label>
                <input
                  type="text"
                  required
                  value={farmCommune}
                  onChange={(e) => setFarmCommune(e.target.value)}
                  placeholder="عين التين، شلغوم العيد..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  موقع المزرعة (PostGIS GEOMETRY Point, 4326):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFarmLon(currentLocation.longitude);
                    setFarmLat(currentLocation.latitude);
                  }}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  استيراد موقع الشاحنة الحالي
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="text-[11px] text-stone-400 block mb-0.5">خط الطول (Longitude / ST_X):</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={farmLon}
                    onChange={(e) => setFarmLon(parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-400 block mb-0.5">خط العرض (Latitude / ST_Y):</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={farmLat}
                    onChange={(e) => setFarmLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <p className="text-[10px] text-stone-500">
                * سيتم تلقائياً توليد مضلع حدودي (Polygon) بمساحة تقريبية لفحص تقاطع الشاحنات باستعمال ST_Contains.
              </p>
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1">وصف المزرعة وطبيعة الإنتاج</label>
              <textarea
                rows={2}
                value={farmDesc}
                onChange={(e) => setFarmDesc(e.target.value)}
                placeholder="أشجار مثمرة، ري قطرة قطرة، عصر على البارد..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
              >
                حفظ المزرعة في PostGIS
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveCrop} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block text-stone-300 font-semibold mb-1">المزرعة المنتجة *</label>
              <select
                value={cropFarmId}
                onChange={(e) => setCropFarmId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.wilaya})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">الصنف من الكتالوج (crop_catalog) *</label>
                <select
                  value={cropCatalogId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setCropCatalogId(id);
                    const item = catalog.find((c) => c.id === id);
                    if (item) {
                      setCropUnit(item.unit_default);
                      if (!cropTitle) setCropTitle(`${item.name_ar} ممتاز`);
                    }
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">وحدة القياس *</label>
                <select
                  value={cropUnit}
                  onChange={(e) => setCropUnit(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="كغ">كغ (Kilogram)</option>
                  <option value="لتر">لتر (Litre)</option>
                  <option value="قنطار">قنطار (Quintal = 100 kg)</option>
                  <option value="صندوق">صندوق</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1">عنوان العرض والمحصول *</label>
              <input
                type="text"
                required
                value={cropTitle}
                onChange={(e) => setCropTitle(e.target.value)}
                placeholder="مثال: زيت زيتون بكر ممتاز عصارة أولى سد بني هارون"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div>
                <label className="block text-stone-300 font-semibold mb-1 font-sans">
                  السعر للوحدة (دج / {cropUnit}) *
                </label>
                <input
                  type="number"
                  step="10"
                  required
                  value={cropPrice}
                  onChange={(e) => setCropPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1 font-sans">
                  الكمية المتوفرة ({cropUnit}) *
                </label>
                <input
                  type="number"
                  step="10"
                  required
                  value={cropQty}
                  onChange={(e) => setCropQty(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">تاريخ الحصاد / التنسيق</label>
                <input
                  type="date"
                  value={cropHarvest}
                  onChange={(e) => setCropHarvest(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">حالة العرض</label>
                <select
                  value={cropStatus}
                  onChange={(e) => setCropStatus(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="AVAILABLE">متوفر فوري (AVAILABLE)</option>
                  <option value="PRE_ORDER">حجز مسبق (PRE_ORDER)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-stone-950 p-2.5 rounded-xl border border-stone-800">
              <input
                type="checkbox"
                checked={cropOrganic}
                onChange={(e) => setCropOrganic(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span className="text-stone-300 font-semibold">منتوج عضوي 100% (بدون مبيدات أو أسمدة كيميائية)</span>
            </label>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
              >
                إدراج المحصول في المنصة
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
