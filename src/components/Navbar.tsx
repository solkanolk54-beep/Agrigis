import React from 'react';
import { Database, MapPin, Compass, PlusCircle, ShieldCheck, Layers, Terminal, BarChart3 } from 'lucide-react';
import { UserType } from '../types/database';

interface NavbarProps {
  activeTab: 'map' | 'analytics' | 'sql' | 'schema' | 'add';
  setActiveTab: (tab: 'map' | 'analytics' | 'sql' | 'schema' | 'add') => void;
  userType: UserType;
  setUserType: (type: UserType) => void;
  onOpenAddModal: () => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userType,
  setUserType,
  onOpenAddModal,
  onResetData,
}) => {
  return (
    <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/20">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-wide">AgriGIS Algérie</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-mono">
                  PostGIS 3.4 (SRID 4326)
                </span>
              </div>
              <p className="text-xs text-stone-400">منصة المزارع والمحاصيل الجغرافية بالجزائر</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              الخريطة والمحاصيل
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              توجيه الإنتاج (Recharts)
            </button>

            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sql'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              استعلامات PostGIS
            </button>

            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'schema'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              مخطط الجداول والفهارس
            </button>
          </nav>

          {/* Role selector & Actions */}
          <div className="flex items-center gap-3">
            {/* User role switch */}
            <div className="flex items-center gap-1.5 bg-stone-950/80 px-2.5 py-1 rounded-lg border border-stone-800 text-xs">
              <span className="text-stone-400">الدور:</span>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value as UserType)}
                aria-label="نوع المستخدم"
                className="bg-transparent text-emerald-400 font-medium focus:outline-none cursor-pointer"
              >
                <option value="BUYER" className="bg-stone-900 text-white">مشتري / تاجر جملة</option>
                <option value="TRANSPORTER" className="bg-stone-900 text-white">ناقل / سائق شاحنة</option>
                <option value="FARMER" className="bg-stone-900 text-white">فلاح / صاحب مزرعة</option>
                <option value="ADMIN" className="bg-stone-900 text-white">مهندس GIS / مدير</option>
              </select>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إضافة مزرعة / محصول</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-stone-800/80 text-xs">
          <button
            onClick={() => setActiveTab('map')}
            className={`py-1 px-2 rounded font-medium ${
              activeTab === 'map' ? 'text-emerald-400' : 'text-stone-400'
            }`}
          >
            الخريطة والمحاصيل
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-1 px-2 rounded font-medium ${
              activeTab === 'analytics' ? 'text-emerald-400' : 'text-stone-400'
            }`}
          >
            توجيه الإنتاج
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-1 px-2 rounded font-medium ${
              activeTab === 'sql' ? 'text-emerald-400' : 'text-stone-400'
            }`}
          >
            استعلامات SQL
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-1 px-2 rounded font-medium ${
              activeTab === 'schema' ? 'text-emerald-400' : 'text-stone-400'
            }`}
          >
            مخطط الجداول
          </button>
        </div>
      </div>
    </header>
  );
};
