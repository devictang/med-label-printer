import { useEffect, useState } from 'react';
import {
  HiOutlineBuildingOffice2,
  HiOutlineMapPin,
  HiOutlineCheckCircle,
  HiOutlineUser,
} from 'react-icons/hi2';
import { saveProfile, loadProfile } from '../lib/storage';
import type { PharmacyProfile } from '../types';

const emptyProfile: PharmacyProfile = {
  name: '',
  address: '',
};

export default function PharmacyProfilePage() {
  const [profile, setProfile] = useState<PharmacyProfile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const existing = loadProfile();
    if (existing) {
      // Migrate: new profile only needs name + address
      setProfile({
        name: existing.name || '',
        address: existing.address || '',
      });
    }
    setIsLoaded(true);
  }, []);

  const update = (field: keyof PharmacyProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasData = profile.name || profile.address;

  if (!isLoaded) return null;

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <HiOutlineUser className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">藥房資料</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            設定藥房或診所名稱及地址，這些資料會印在每一張標籤上。
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="card-elevated overflow-hidden animate-fade-in-up">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
              <HiOutlineBuildingOffice2 className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">標籤資料</h3>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <FormField
            icon={HiOutlineBuildingOffice2}
            label="藥房 / 醫生名稱"
            value={profile.name}
            onChange={(v) => update('name', v)}
            placeholder="e.g. 仁安藥房 / 陳醫生診所"
          />

          <FormField
            icon={HiOutlineMapPin}
            label="地址"
            value={profile.address}
            onChange={(v) => update('address', v)}
            placeholder="e.g. 香港九龍旺角彌敦道 123 號"
            multiline
          />
        </div>

        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-slate-400">
            資料只儲存於此瀏覽器，不會上傳至任何伺服器。
          </p>
          <button
            onClick={handleSave}
            className={`btn-modern transition-all ${
              saved
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20'
            }`}
          >
            {saved ? (
              <>
                <HiOutlineCheckCircle className="w-4 h-4" />
                已儲存
              </>
            ) : (
              '儲存資料'
            )}
          </button>
        </div>
      </div>

      {/* Preview card */}
      {hasData && (
        <div className="card-elevated overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500" />
              標籤預覽
            </h3>
          </div>
          <div className="p-6">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200/80 p-5 text-sm space-y-1">
              {profile.name && (
                <p className="font-bold text-slate-800 text-base">{profile.name}</p>
              )}
              {profile.address && (
                <p className="text-slate-500 text-xs">{profile.address}</p>
              )}
              {!hasData && (
                <p className="text-slate-400 text-xs italic">尚未填寫資料</p>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 text-center">
              以上資料會以細字顯示在每張標籤的頂部（名稱）及底部（地址）
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <div className="card-elevated px-12 py-14 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <HiOutlineBuildingOffice2 className="w-8 h-8 text-indigo-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">填寫藥房資料</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            名稱會印在標籤左上角，地址則顯示在底部，方便病人辨識。
          </p>
        </div>
      )}
    </div>
  );
}

function FormField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="input-modern pl-10 pr-3.5 resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="input-modern pl-10 pr-3.5"
          />
        )}
      </div>
    </div>
  );
}
