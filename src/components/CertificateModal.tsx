import React from 'react';
import { JoinedFarmCrop } from '../types/database';
import { X, Award, CheckCircle2, ShieldAlert, FileText, Calendar, Building } from 'lucide-react';

interface CertificateModalProps {
  crop: JoinedFarmCrop | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ crop, onClose }) => {
  if (!crop) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">بطاقة التحليل المخبري وشهادة الجودة</h3>
              <p className="text-[11px] text-stone-400">وثائق الاعتماد والتحاليل الفيزيوكيميائية المرفقة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Certificate Header Banner */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                CERT-DZ-2026-9812
              </span>
              <span className="text-[10px] text-stone-400">تاريخ الإصدار: {crop.crop.harvest_date}</span>
            </div>

            <div>
              <h4 className="font-bold text-sm text-white mb-0.5">{crop.crop.title}</h4>
              <p className="text-[11px] text-stone-400 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-stone-500" />
                {crop.farm.name} - {crop.farm.wilaya}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800 text-[11px]">
              <div className="bg-stone-900 p-2 rounded-lg">
                <span className="text-stone-400 block text-[10px]">المخبر المعتمد:</span>
                <strong className="text-white">المخبر الوطني للرقابة الفلاحية</strong>
              </div>
              <div className="bg-stone-900 p-2 rounded-lg">
                <span className="text-stone-400 block text-[10px]">حالة المطابقة:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  مطابق للمعايير الجزائرية (Codex)
                </span>
              </div>
            </div>
          </div>

          {/* Test Parameters */}
          <div className="space-y-2">
            <span className="font-bold text-stone-300 block">نتائج الفحوصات والتحاليل المسجلة:</span>
            <div className="bg-stone-950 rounded-xl border border-stone-800 divide-y divide-stone-850">
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-stone-400">نسبة الحموضة (Acidity):</span>
                <span className="font-mono text-emerald-400 font-bold">0.32% (بكر ممتاز &lt; 0.8%)</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-stone-400">رقم البيروكسيد (Peroxide value):</span>
                <span className="font-mono text-emerald-400 font-bold">6.8 meq O2/kg</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-stone-400">تحليل متبقيات المبيدات (Pesticides):</span>
                <span className="font-mono text-emerald-400 font-bold">غير قابلة للكشف (خالي 100%)</span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-stone-400">التصنيف العضوي (Bio/Organic):</span>
                <span className="text-emerald-400 font-bold">معتمد بيولوجي (AB)</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
            تم فحص العينة وفق المنهجية المعيارية المنصوص عليها في التشريع الفلاحي الجزائري وتم ربط الشهادة جغرافياً بسجل
            المزرعة في جدول <code className="font-mono text-white">farm_media</code>.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
