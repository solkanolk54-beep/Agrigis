/**
 * AgriGIS Algérie - منصة المزارع والمحاصيل الجغرافية
 * PostgreSQL 16 + PostGIS 3.4 Spatial Platform
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  SEED_USERS,
  SEED_FARMS,
  SEED_CATALOG,
  SEED_CROPS,
  SEED_MEDIA,
} from './data/seedData';
import { Farm, FarmCrop, CropCatalog, User, FarmMedia, GeoPoint, UserType, JoinedFarmCrop } from './types/database';
import { stDistanceKm, PostGisEngine } from './lib/spatialEngine';
import { Navbar } from './components/Navbar';
import { MapView } from './components/MapView';
import { CropSearch } from './components/CropSearch';
import { SqlQueryRunner } from './components/SqlQueryRunner';
import { SchemaViewer } from './components/SchemaViewer';
import { AddFarmModal } from './components/AddFarmModal';
import { CertificateModal } from './components/CertificateModal';
import { CropAnalyticsDashboard } from './components/CropAnalyticsDashboard';
import { GeoJsonExportModal } from './components/GeoJsonExportModal';
import { MapPin, Compass, Sparkles, Terminal, Database, RefreshCw, Layers, ShieldCheck, BarChart3, Download } from 'lucide-react';

export default function App() {
  // Navigation & User Role
  const [activeTab, setActiveTab] = useState<'map' | 'analytics' | 'sql' | 'schema' | 'add'>('map');
  const [userType, setUserType] = useState<UserType>('BUYER');

  // Relational Dataset State with LocalStorage persistence
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('agrigis_users');
    return saved ? JSON.parse(saved) : SEED_USERS;
  });

  const [farms, setFarms] = useState<Farm[]>(() => {
    const saved = localStorage.getItem('agrigis_farms');
    return saved ? JSON.parse(saved) : SEED_FARMS;
  });

  const [catalog, setCatalog] = useState<CropCatalog[]>(() => {
    const saved = localStorage.getItem('agrigis_catalog');
    return saved ? JSON.parse(saved) : SEED_CATALOG;
  });

  const [crops, setCrops] = useState<FarmCrop[]>(() => {
    const saved = localStorage.getItem('agrigis_crops');
    return saved ? JSON.parse(saved) : SEED_CROPS;
  });

  const [media, setMedia] = useState<FarmMedia[]>(() => {
    const saved = localStorage.getItem('agrigis_media');
    return saved ? JSON.parse(saved) : SEED_MEDIA;
  });

  // Buyer / Truck Location (Defaulting to user's Mila sample coordinates: 6.2625, 36.4501)
  const [buyerLocation, setBuyerLocation] = useState<GeoPoint>({
    longitude: 6.2625,
    latitude: 36.4501,
  });

  // Search & Filter State
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(50); // 50 km default as in prompt
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCertificateCrop, setSelectedCertificateCrop] = useState<JoinedFarmCrop | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('agrigis_farms', JSON.stringify(farms));
    localStorage.setItem('agrigis_crops', JSON.stringify(crops));
  }, [farms, crops]);

  // Spatial PostGIS Engine
  const spatialEngine = useMemo(() => {
    return new PostGisEngine(users, farms, catalog, crops, media);
  }, [users, farms, catalog, crops, media]);

  // Joined dataset for high-level UI
  const joinedCrops = useMemo(() => {
    return spatialEngine.getJoinedCrops(buyerLocation);
  }, [spatialEngine, buyerLocation]);

  // Filtered Farms matching current spatial & search criteria for GeoJSON export
  const filteredFarmsForExport = useMemo(() => {
    return farms.filter((farm) => {
      if (selectedFarmId) {
        return farm.id === selectedFarmId;
      }
      const dist = stDistanceKm(farm.location, buyerLocation);
      if (dist > maxDistanceKm) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const farmCrops = crops.filter((c) => c.farm_id === farm.id);
        const matchesCrop = farmCrops.some((c) => c.title.toLowerCase().includes(term));
        const matchesFarm =
          farm.name.toLowerCase().includes(term) || farm.wilaya.toLowerCase().includes(term);
        if (!matchesCrop && !matchesFarm) return false;
      }
      if (selectedCategory) {
        const farmCrops = crops.filter((c) => c.farm_id === farm.id);
        const matchesCat = farmCrops.some((c) => {
          const cat = catalog.find((catItem) => catItem.id === c.crop_catalog_id);
          return cat?.category === selectedCategory;
        });
        if (!matchesCat) return false;
      }
      return true;
    });
  }, [farms, crops, catalog, selectedFarmId, buyerLocation, maxDistanceKm, searchTerm, selectedCategory]);

  // Handle adding a new farm
  const handleAddFarm = (newFarm: Farm) => {
    setFarms((prev) => [newFarm, ...prev]);
    setSelectedFarmId(newFarm.id);
  };

  // Handle adding a new crop
  const handleAddCrop = (newCrop: FarmCrop) => {
    setCrops((prev) => [newCrop, ...prev]);
  };

  // Reset to default seed dataset
  const handleResetData = () => {
    localStorage.removeItem('agrigis_farms');
    localStorage.removeItem('agrigis_crops');
    setFarms(SEED_FARMS);
    setCrops(SEED_CROPS);
    setBuyerLocation({ longitude: 6.2625, latitude: 36.4501 });
    setMaxDistanceKm(50);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userType={userType}
        setUserType={setUserType}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onResetData={handleResetData}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Info Bar & Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-stone-400 block">المزارع المسجلة:</span>
              <span className="text-lg font-bold text-white font-mono">{farms.length} مستثمرة</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              <Compass className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-stone-400 block">عروض المحاصيل المتاحة:</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{crops.length} عرض</span>
            </div>
            <div className="p-2 rounded-xl bg-teal-950/80 text-teal-400 border border-teal-800/40">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-stone-400 block">نطاق البحث المكاني:</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">{maxDistanceKm} كم</span>
            </div>
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
              <MapPin className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-stone-400 block">محرك البيانات المكانية:</span>
              <span className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                PostGIS (SRID 4326)
              </span>
            </div>
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/40">
              <Database className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Dynamic Tab Views */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {/* Recharts Crop Analytics & Financial Yield Dashboard (In the upper section) */}
            <CropAnalyticsDashboard
              catalog={catalog}
              crops={crops}
              farms={farms}
              selectedFarmId={selectedFarmId}
              onSelectFarmId={setSelectedFarmId}
            />

            {/* Interactive Map View */}
            <MapView
              farms={farms}
              buyerLocation={buyerLocation}
              setBuyerLocation={setBuyerLocation}
              maxDistanceKm={maxDistanceKm}
              selectedFarmId={selectedFarmId}
              setSelectedFarmId={setSelectedFarmId}
              joinedCrops={joinedCrops}
              catalog={catalog}
              onSelectCropForDetails={(c) => setSelectedCertificateCrop(c)}
              onOpenExport={() => setIsExportModalOpen(true)}
            />

            {/* Crop Exploration Studio */}
            <CropSearch
              joinedCrops={joinedCrops}
              catalog={catalog}
              maxDistanceKm={maxDistanceKm}
              setMaxDistanceKm={setMaxDistanceKm}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedFarmId={selectedFarmId}
              setSelectedFarmId={setSelectedFarmId}
              onViewCertificate={(c) => setSelectedCertificateCrop(c)}
              onOpenExport={() => setIsExportModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Dedicated Full Analytics Dashboard */}
            <CropAnalyticsDashboard
              catalog={catalog}
              crops={crops}
              farms={farms}
              selectedFarmId={selectedFarmId}
              onSelectFarmId={setSelectedFarmId}
            />

            {/* Catalog breakdown table for production planning */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">
                    جدول الأصناف المرجعية في الكتالوج (crop_catalog)
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
                  {catalog.length} أصناف مسجلة
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-stone-950 text-stone-400 border-b border-stone-800 font-mono">
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">اسم المحصول (name_ar)</th>
                      <th className="py-2.5 px-4">الفئة (category)</th>
                      <th className="py-2.5 px-4">وحدة القياس القياسية (unit_default)</th>
                      <th className="py-2.5 px-4">توصية الإنتاج للمزارع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850">
                    {catalog.map((item) => {
                      const countOffers = crops.filter(c => c.crop_catalog_id === item.id).length;
                      return (
                        <tr key={item.id} className="hover:bg-stone-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-stone-500">{item.id}</td>
                          <td className="py-2.5 px-4 font-bold text-white">{item.name_ar}</td>
                          <td className="py-2.5 px-4">
                            <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-[11px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-emerald-400">{item.unit_default}</td>
                          <td className="py-2.5 px-4 text-[11px]">
                            {countOffers === 0 ? (
                              <span className="text-amber-400 bg-amber-950/70 border border-amber-500/30 px-2 py-0.5 rounded">
                                فرصة ندرة (لا توجد عروض كافية حالياً)
                              </span>
                            ) : countOffers === 1 ? (
                              <span className="text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                                طلب مستقر ونشط (عرض واحد مسجل)
                              </span>
                            ) : (
                              <span className="text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded">
                                معروض نشط ومتعدد ({countOffers} عروض)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <SqlQueryRunner engine={spatialEngine} buyerLocation={buyerLocation} />
        )}

        {activeTab === 'schema' && <SchemaViewer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-400">AgriGIS Algérie</span>
            <span>•</span>
            <span>نظام المعلومات الجغرافية الفلاحي للجمهورية الجزائرية</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>PostGIS Extension</span>
            <span>•</span>
            <span>ST_DWithin</span>
            <span>•</span>
            <span>ST_Contains</span>
            <span>•</span>
            <span>GIST Index</span>
            <span>•</span>
            <button
              onClick={handleResetData}
              className="text-stone-400 hover:text-emerald-400 flex items-center gap-1 transition-colors font-sans"
            >
              <RefreshCw className="w-3 h-3" />
              إعادة تعيين البيانات الافتراضية
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddFarmModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        farms={farms}
        catalog={catalog}
        users={users}
        currentLocation={buyerLocation}
        onAddFarm={handleAddFarm}
        onAddCrop={handleAddCrop}
      />

      <CertificateModal
        crop={selectedCertificateCrop}
        onClose={() => setSelectedCertificateCrop(null)}
      />

      <GeoJsonExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredFarms={filteredFarmsForExport}
        joinedCrops={joinedCrops}
        buyerLocation={buyerLocation}
      />
    </div>
  );
}
