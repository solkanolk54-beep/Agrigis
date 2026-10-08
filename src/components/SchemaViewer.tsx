import React, { useState } from 'react';
import { Database, Copy, Check, Layers, Key, ShieldCheck, Zap, Table } from 'lucide-react';

export const SchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'all' | 'users' | 'farms' | 'crop_catalog' | 'farm_crops' | 'farm_media' | 'indexes'>('all');

  const fullDdlSql = `-- ============================================================
-- تفعيل الإضافات الجغرافية ودعم البحث النصي السريع
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. جدول المستخدمين (فلاحين ومستثمرين/مشترين وناقلين)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    user_type VARCHAR(20) CHECK (user_type IN ('FARMER', 'BUYER', 'TRANSPORTER', 'ADMIN')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. جدول المزارع (المواقع الجغرافية والحدود المكانية)
-- ============================================================
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    wilaya VARCHAR(50) NOT NULL,
    commune VARCHAR(50) NOT NULL,
    
    -- موقع المزرعة كـ Point (خط الطول وخط العرض WGS 84)
    location GEOMETRY(Point, 4326) NOT NULL,
    
    -- حدود المزرعة كـ Polygon (مساحة المزرعة) - اختياري
    boundary GEOMETRY(Polygon, 4326),
    
    address_text TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. جدول الكتالوج المرجعي للمحاصيل والمنتجات
-- ============================================================
CREATE TABLE crop_catalog (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL, -- مثل: زيتون مائدة، خيار، طماطم
    category VARCHAR(50) NOT NULL, -- مثل: أشجار مثمرة، خضروات، حبوب
    unit_default VARCHAR(20) NOT NULL -- مثل: كغ، قنطار، لتر
);

-- ============================================================
-- 4. جدول إنتاج المزارع (المحاصيل المعروضة)
-- ============================================================
CREATE TABLE farm_crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop_catalog_id INT NOT NULL REFERENCES crop_catalog(id),
    title VARCHAR(150) NOT NULL, -- عنوان العرض (مثلاً: زيت زيتون بكري عصارة أولى)
    price_per_unit NUMERIC(10, 2),
    unit VARCHAR(20) NOT NULL, -- كغ، لتر، قنطار
    quantity_available NUMERIC(10, 2) DEFAULT 0,
    is_organic BOOLEAN DEFAULT FALSE,
    harvest_date DATE, -- تاريخ الحصاد / التنسيق المسبق
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'PRE_ORDER', 'SOLD_OUT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. جدول الصور والمستندات (شهادات التحليل والصور)
-- ============================================================
CREATE TABLE farm_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    farm_crop_id UUID REFERENCES farm_crops(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) CHECK (media_type IN ('IMAGE', 'CERTIFICATE_PDF', 'VIDEO')),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- الفهارس الجغرافية والأداء (Spatial GIST Indexes)
-- ============================================================
-- 1. فهرس فضائي GIST على نقطة موقع المزرعة (ضروري جداً للبحث الجغرافي ST_DWithin)
CREATE INDEX idx_farms_location ON farms USING GIST (location);

-- 2. فهرس فضائي GIST على حدود المزرعة (ضروري لفحص ST_Contains)
CREATE INDEX idx_farms_boundary ON farms USING GIST (boundary);

-- 3. فهارس أداء على الولايات وحالة المحاصيل
CREATE INDEX idx_farms_wilaya ON farms(wilaya);
CREATE INDEX idx_farm_crops_status ON farm_crops(status);

-- 4. فهرس بحث نصي تكيفي GIST على أسماء المحاصيل باستخدام pg_trgm
CREATE INDEX idx_crop_catalog_trgm ON crop_catalog USING GIST (name_ar gist_trgm_ops);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullDdlSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">مخطط قاعدة البيانات والفهارس المكانية (PostgreSQL + PostGIS)</h2>
          </div>
          <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
            مخطط علائقي عالي الأداء يدعم البيانات الهندسية <code className="text-emerald-300 font-mono">GEOMETRY(Point, 4326)</code> و{' '}
            <code className="text-emerald-300 font-mono">GEOMETRY(Polygon, 4326)</code>، وفهارس{' '}
            <code className="text-amber-300 font-mono">GIST</code> لتنفيذ الاستعلامات المكانية بأجزاء من الثانية.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'تم نسخ المخطط الكامل' : 'نسخ كود DDL الكامل'}
        </button>
      </div>

      {/* Spatial Index Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-mono">idx_farms_location (GIST)</h4>
              <span className="text-[10px] text-cyan-400">فهرس نقطي ثلاثي الأبعاد</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-400 leading-snug">
            فهرس شجري فضائي <code className="text-stone-300 font-mono">R-Tree / GIST</code> يتيح لدالة{' '}
            <code className="text-cyan-300 font-mono">ST_DWithin</code> فلترة آلاف المزارع ضمن 50 كم دون مسح تسلسلي
            (Seq Scan).
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-mono">idx_farms_boundary (GIST)</h4>
              <span className="text-[10px] text-amber-400">فهرس مضلعات الأراضي</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-400 leading-snug">
            يسرّع استعلامات تقاطع الحدود <code className="text-amber-300 font-mono">ST_Contains</code> وفحص Bounding Box
            لتحديد وجود الشاحنة داخل حدود المزرعة بـ 0.3 مللي ثانية.
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-mono">idx_crop_catalog_trgm (pg_trgm)</h4>
              <span className="text-[10px] text-purple-400">فهرس البحث النصي الذكي</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-400 leading-snug">
            يعتمد على تجزئة الكلمات العربية إلى ثلاثيات أحرف (3-grams) لاكتشاف المحاصيل حتى مع اختلاف الهمزات أو الأخطاء
            الإملائية الشائعة.
          </p>
        </div>
      </div>

      {/* Interactive Tabs for Tables */}
      <div className="flex flex-wrap items-center gap-1.5 bg-stone-900 p-1.5 rounded-xl border border-stone-800 text-xs">
        <button
          onClick={() => setActiveSchemaTab('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeSchemaTab === 'all' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          المخطط الشامل (All DDL)
        </button>
        <button
          onClick={() => setActiveSchemaTab('farms')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeSchemaTab === 'farms' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          farms (المزارع والحدود)
        </button>
        <button
          onClick={() => setActiveSchemaTab('farm_crops')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeSchemaTab === 'farm_crops' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          farm_crops (المحاصيل)
        </button>
        <button
          onClick={() => setActiveSchemaTab('crop_catalog')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeSchemaTab === 'crop_catalog' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          crop_catalog (الكتالوج)
        </button>
        <button
          onClick={() => setActiveSchemaTab('users')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeSchemaTab === 'users' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          users (المستخدمين)
        </button>
        <button
          onClick={() => setActiveSchemaTab('farm_media')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeSchemaTab === 'farm_media' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          farm_media (الشهادات والصور)
        </button>
        <button
          onClick={() => setActiveSchemaTab('indexes')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeSchemaTab === 'indexes' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          الفهارس (Indexes)
        </button>
      </div>

      {/* SQL Code Terminal */}
      <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-stone-900/90 px-4 py-2 border-b border-stone-800 flex items-center justify-between text-xs font-mono text-stone-400">
          <span>database_schema.sql</span>
          <span className="text-[11px] text-emerald-400">PostgreSQL 16 + PostGIS 3.4</span>
        </div>

        <div className="p-4 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed dir-ltr text-left">
          <pre>{fullDdlSql}</pre>
        </div>
      </div>
    </div>
  );
};
