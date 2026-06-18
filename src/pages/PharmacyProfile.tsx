import { useEffect, useState } from 'react';
import { HiOutlineBuildingOffice2, HiOutlinePhone, HiOutlineEnvelope, HiOutlineMapPin, HiOutlineIdentification } from 'react-icons/hi2';
import { saveProfile, loadProfile } from '../lib/storage';
import type { PharmacyProfile } from '../types';

const emptyProfile: PharmacyProfile = {
  name: '',
  address: '',
  phone: '',
  email: '',
  licenseNo: '',
};

export default function PharmacyProfilePage() {
  const [profile, setProfile] = useState<PharmacyProfile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const existing = loadProfile();
    if (existing) {
      setProfile(existing);
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

  if (!isLoaded) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">藥房資料</h2>
        <p className="text-sm text-slate-500 mt-1">
          設定你的藥房或診所資料，這些資料會自動填入每一張標籤。
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField
              icon={HiOutlinePhone}
              label="電話"
              value={profile.phone}
              onChange={(v) => update('phone', v)}
              placeholder="e.g. 1234 5678"
            />
            <FormField
              icon={HiOutlineEnvelope}
              label="電郵"
              value={profile.email}
              onChange={(v) => update('email', v)}
              placeholder="e.g. info@pharmacy.hk"
              type="email"
            />
          </div>

          <FormField
            icon={HiOutlineIdentification}
            label="牌照號碼"
            value={profile.licenseNo}
            onChange={(v) => update('licenseNo', v)}
            placeholder="e.g. P-2024-XXXXX"
          />
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            資料儲存於此瀏覽器的 Local Storage，不會上傳至任何伺服器。
          </p>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? '✓ 已儲存' : '儲存資料'}
          </button>
        </div>
      </div>

      {/* Preview card */}
      {profile.name && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">資料預覽</h3>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm space-y-1">
            <p className="font-semibold text-slate-800">{profile.name}</p>
            <p className="text-slate-600">{profile.address}</p>
            <p className="text-slate-500 text-xs">
              {profile.phone && `📞 ${profile.phone}`}
              {profile.phone && profile.email && ' · '}
              {profile.email && `✉ ${profile.email}`}
            </p>
            {profile.licenseNo && (
              <p className="text-slate-400 text-xs">牌照: {profile.licenseNo}</p>
            )}
          </div>
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
  type,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const inputClass =
    'w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';

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
            className={`${inputClass} resize-none`}
          />
        ) : (
          <input
            type={type || 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
        )}
      </div>
    </div>
  );
}
