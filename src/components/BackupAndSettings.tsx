import React, { useState, useRef } from 'react';
import { StoreSettings, AppStateData } from '../types';
import { exportDataBackup, importDataBackup, resetToDemoData } from '../services/storage';
import { 
  testSupabaseConnection, 
  syncToSupabase, 
  fetchFromSupabase, 
  SUPABASE_SQL_SCHEMA 
} from '../services/supabase';
import { 
  pingSteadfast, 
  getSteadfastBalance 
} from '../services/steadfast';
import { 
  Save, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  ShieldCheck, 
  Cloud, 
  Smartphone, 
  Monitor, 
  Printer, 
  Store, 
  HelpCircle,
  Database,
  FileCheck2,
  HardDrive,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Truck,
  Eye,
  EyeOff,
  Zap,
  QrCode,
  Link2,
  Share2
} from 'lucide-react';

interface BackupAndSettingsProps {
  settings: StoreSettings;
  appState: AppStateData;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  onRestoreState: (newState: AppStateData) => void;
}

export const BackupAndSettings: React.FC<BackupAndSettingsProps> = ({
  settings,
  appState,
  onUpdateSettings,
  onRestoreState,
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [isFetchingSupabase, setIsFetchingSupabase] = useState(false);
  const [supabaseFeedback, setSupabaseFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedQuickLink, setCopiedQuickLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Courier states (Steadfast / Packzy)
  const [courierApiKey, setCourierApiKey] = useState(settings.courierApiKey || 'ic4pg2oo3xdnruhyalv7yy4qfgxyoytl');
  const [courierSecretKey, setCourierSecretKey] = useState(settings.courierSecretKey || 'rheawkurrnuoyznnfypbpjfs');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isTestingCourier, setIsTestingCourier] = useState(false);
  const [courierFeedback, setCourierFeedback] = useState<{ success: boolean; message: string; balance?: number } | null>(null);

  const handleTestCourier = async () => {
    setIsTestingCourier(true);
    setCourierFeedback(null);
    try {
      const pingOk = await pingSteadfast();
      if (!pingOk) {
        setCourierFeedback({
          success: false,
          message: 'কুরিয়ার সার্ভারে পিং ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ বা প্রক্সি চেক করুন।',
        });
        return;
      }

      const balRes = await getSteadfastBalance({
        ...formData,
        courierApiKey: courierApiKey.trim(),
        courierSecretKey: courierSecretKey.trim(),
      });

      if (balRes.success) {
        setCourierFeedback({
          success: true,
          balance: balRes.balance,
          message: `কানেকশন সফল! সার্ভার রেসপন্স: OK (Pong) • বর্তমান কুরিয়ার ব্যালেন্স: ৳${balRes.balance ?? 0}`,
        });
      } else {
        setCourierFeedback({
          success: false,
          message: balRes.message || 'API Key বা Secret Key সঠিক নয়।',
        });
      }
    } catch (err: any) {
      setCourierFeedback({
        success: false,
        message: err.message || 'টেস্টে ত্রুটি হয়েছে।',
      });
    } finally {
      setIsTestingCourier(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...formData,
      courierApiKey: courierApiKey.trim(),
      courierSecretKey: courierSecretKey.trim(),
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    };
    onUpdateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadBackup = () => {
    exportDataBackup(appState);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('সতর্কতা: ব্যাকআপ ফাইল রিস্টোর করলে বর্তমান ডাটা ব্যাকআপ ফাইলের ডাটা দিয়ে প্রতিস্থাপিত হবে। আপনি কি এগিয়ে যেতে চান?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    setImportStatus('ডাটা লোড করা হচ্ছে...');
    try {
      const restored = await importDataBackup(file);
      onRestoreState(restored);
      setImportStatus('অভিনন্দন! ডাটা সফলভাবে রিস্টোর হয়েছে।');
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err: any) {
      alert(`রিস্টোর ব্যর্থ হয়েছে: ${err}`);
      setImportStatus(null);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetDemo = () => {
    if (confirm('আপনি কি নিশ্চিত যে ডেমো ডাটা রিসেট করতে চান? আপনার নতুন যোগ করা তথ্য মুছে যাবে।')) {
      const demo = resetToDemoData();
      onRestoreState(demo);
      alert('সফলভাবে ডেমো ডাটা লোড করা হয়েছে!');
    }
  };

  // Test Supabase Connection
  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseFeedback(null);
    const testConfig: StoreSettings = {
      ...formData,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    };
    const res = await testSupabaseConnection(testConfig);
    setIsTestingSupabase(false);
    setSupabaseFeedback(res);
  };

  // Sync Current App State to Supabase
  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    setSupabaseFeedback(null);
    const updatedSettings = {
      ...formData,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    };
    onUpdateSettings(updatedSettings);

    const res = await syncToSupabase({
      ...appState,
      settings: updatedSettings,
    });
    setIsSyncingSupabase(false);
    setSupabaseFeedback(res);
  };

  // Pull All Records from Supabase
  const handleFetchFromSupabase = async () => {
    if (!confirm('আপনি কি Supabase ক্লাউড থেকে ডাটা নিয়ে লোকাল ডিভাইসে রিস্টোর করতে চান?')) {
      return;
    }
    setIsFetchingSupabase(true);
    setSupabaseFeedback(null);
    const updatedSettings = {
      ...formData,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    };
    const res = await fetchFromSupabase(updatedSettings);
    setIsFetchingSupabase(false);
    if (res.success && res.data) {
      onRestoreState({
        ...appState,
        ...res.data,
        settings: updatedSettings,
      });
      setSupabaseFeedback({ success: true, message: res.message });
    } else {
      setSupabaseFeedback({ success: false, message: res.message });
    }
  };

  // Copy SQL script to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div id="backup-settings-view" className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Banner: 100% Free & Offline Ready Guarantee */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">১০০% ফ্রি, অফলাইন এবং সুরক্ষিত সিস্টেম</h2>
              <span className="bg-emerald-500/30 text-emerald-100 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                লাইফটাইম ফ্রি
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              আপনার সমস্ত বিক্রি, স্টক ও কাস্টমার বাকি খাতা সম্পূর্ণ আপনার ব্রাউজারে সংরক্ষিত থাকে। ক্লাউড ব্যাকআপের জন্য নিচে বিনামূল্যে Supabase ডাটাবেজ যুক্ত করতে পারেন।
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Data Backup (Left) & Store Profile (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Local Database & Supabase (Span 6) */}
        <div className="lg:col-span-6 space-y-5">
          {/* LOCAL OFFLINE-FIRST DATABASE (Active, 100% Free) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-3.5 border border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>লোকাল ডাটাবেজ (অফলাইন ও ফ্রি)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      সক্রিয় ও প্রস্তুত
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">কোনো ক্লাউড বা সার্ভার খরচের প্রয়োজন নেই (১০০% ফ্রি)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-white/10 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">ডাটা সংরক্ষণের স্থান:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    আপনার ডিভাইসে নিরাপদে সংরক্ষিত
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">মাসিক খরচ:</span>
                  <span className="font-bold text-emerald-300">৳০ (আজীবন সম্পূর্ণ বিনামূল্যে)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">মোট আইটেম সংরক্ষিত:</span>
                  <span className="font-bold text-white">
                    {appState.products.length} পণ্য • {appState.customers.length} গ্রাহক • {appState.orders.length} বিক্রয় চালান
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>এখনই সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন</span>
                </button>
              </div>
            </div>
          </div>

          {/* SUPABASE CLOUD DATABASE INTEGRATION (Free Tier - User Designated) */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <span>সুপারবেস (Supabase) ফ্রি ক্লাউড ডাটাবেজ</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">আজীবন ফ্রি</span>
                  </h3>
                  <p className="text-xs text-slate-500">প্রজেক্ট তৈরি শেষে অনলাইনে সিঙ্ক ও ব্যাকআপের জন্য</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supabase Project URL:
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupabaseUrl(val);
                    const updated = { ...formData, supabaseUrl: val.trim() };
                    setFormData(updated);
                    onUpdateSettings(updated);
                  }}
                  onBlur={() => {
                    const updated = { ...formData, supabaseUrl: supabaseUrl.trim(), supabaseAnonKey: supabaseAnonKey.trim() };
                    onUpdateSettings(updated);
                  }}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supabase Anon Public Key:
                </label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupabaseAnonKey(val);
                    const updated = { ...formData, supabaseAnonKey: val.trim() };
                    setFormData(updated);
                    onUpdateSettings(updated);
                  }}
                  onBlur={() => {
                    const updated = { ...formData, supabaseUrl: supabaseUrl.trim(), supabaseAnonKey: supabaseAnonKey.trim() };
                    onUpdateSettings(updated);
                  }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>

              {/* Realtime Multi-device Auto Sync Switch */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm block">স্বয়ংক্রিয় রিয়েলটাইম সিঙ্ক (Multi-device Realtime Sync)</span>
                      <span className="text-[11px] text-slate-500">এক ডিভাইসে পণ্য বা অর্ডার সেভ হলে অন্য সব ডিভাইসে সাথে সাথে আপডেট হবে</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoSyncSupabase !== false}
                    onChange={(e) => {
                      const updated = { ...formData, autoSyncSupabase: e.target.checked };
                      setFormData(updated);
                      onUpdateSettings(updated);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Action Buttons: Test, Sync, Fetch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTestingSupabase || !supabaseUrl || !supabaseAnonKey}
                  onClick={handleTestSupabase}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 text-[11px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isTestingSupabase ? 'টেস্ট হচ্ছে...' : 'কানেকশন টেস্ট'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncingSupabase || !supabaseUrl || !supabaseAnonKey}
                  onClick={handleSyncToSupabase}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 text-[11px] shadow-2xs"
                >
                  <Upload className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-bounce' : ''}`} />
                  <span>{isSyncingSupabase ? 'সিঙ্ক হচ্ছে...' : 'ডাটা সিঙ্ক (Save)'}</span>
                </button>

                <button
                  type="button"
                  disabled={isFetchingSupabase || !supabaseUrl || !supabaseAnonKey}
                  onClick={handleFetchFromSupabase}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 text-[11px] shadow-2xs"
                >
                  <Download className={`w-3.5 h-3.5 ${isFetchingSupabase ? 'animate-bounce' : ''}`} />
                  <span>{isFetchingSupabase ? 'আসছে...' : 'ডাটা নামান (Pull)'}</span>
                </button>
              </div>

              {/* Status/Feedback message */}
              {supabaseFeedback && (
                <div className={`p-2.5 rounded-lg border text-xs font-medium flex items-start gap-2 ${
                  supabaseFeedback.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {supabaseFeedback.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{supabaseFeedback.message}</span>
                </div>
              )}

              {/* One-device Multi-device Connect Helper Card */}
              {supabaseUrl && supabaseAnonKey && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-slate-800 text-xs sm:text-sm">
                        অন্যান্য ডিভাইস অটো-কানেক্ট (এক ডিভাইসে বসালেই যথেষ্ট)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-full">
                      সার্ভার অটো-সেভ সক্রিয়
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">
                    ✨ <strong>জিরো-সেটআপ সুবিধা:</strong> এই ডিভাইসে আপনি যে Supabase URL ও Key দিয়েছেন, তা এই অ্যাপের সার্ভার স্বয়ংক্রিয়ভাবে মনে রেখেছে। ফলে আপনার ফোন, ট্যাবলেট বা অন্য কম্পিউটারে <strong>শুধু এই সাইটটি ব্রাউজারে খুললেই হলো—কোনো URL বা Key লিখতে হবে না</strong>, সব হিসাব অটো-লোড হয়ে যাবে!
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/?sb_url=${encodeURIComponent(supabaseUrl.trim())}&sb_key=${encodeURIComponent(supabaseAnonKey.trim())}`;
                        navigator.clipboard.writeText(link);
                        setCopiedQuickLink(true);
                        setTimeout(() => setCopiedQuickLink(false), 2500);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      {copiedQuickLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">লিংক কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>কুইক কানেক্ট লিংক কপি</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQrModal(!showQrModal)}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{showQrModal ? 'QR কোড লুকান' : 'মোবাইলে ক্যামেরা দিয়ে স্ক্যান (QR)'}</span>
                    </button>
                  </div>

                  {showQrModal && (
                    <div className="mt-2 p-3 bg-white border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-2xs shrink-0">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            `${window.location.origin}/?sb_url=${encodeURIComponent(supabaseUrl.trim())}&sb_key=${encodeURIComponent(supabaseAnonKey.trim())}`
                          )}`}
                          alt="Quick Connect QR Code"
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <h5 className="font-bold text-slate-800 flex items-center gap-1.5 justify-center sm:justify-start">
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                          <span>মোবাইলের ক্যামেরা দিয়ে স্ক্যান করুন</span>
                        </h5>
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          যেকোনো স্মার্টফোনের ক্যামেরা বা কিউআর কোড স্ক্যানার দিয়ে স্ক্যান করলে সফটওয়্যারটি সরাসরি ফোনে কানেক্ট হয়ে যাবে এবং মুহূর্তের মধ্যে সমস্ত পণ্য ও বাকি খাতা লাইভ দেখা যাবে।
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Supabase SQL Schema Generator */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSqlSchema(!showSqlSchema)}
                  className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 font-semibold text-xs py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Database className="w-3.5 h-3.5" />
                    <span>Supabase SQL টেবিল স্ক্রিপ্ট দেখুন ও কপি করুন</span>
                  </span>
                  {showSqlSchema ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showSqlSchema && (
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] text-slate-500">
                      আপনার Supabase ড্যাশবোর্ডে গিয়ে <b>SQL Editor</b>-এ নিচের কোডটি পেস্ট করে <b>Run</b> চাপলে পণ্য, অর্ডার, খরচ ও ক্রয়ের সব টেবিল তৈরি হয়ে যাবে:
                    </p>
                    <div className="relative">
                      <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                        {SUPABASE_SQL_SCHEMA}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="absolute top-2 right-2 px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer backdrop-blur-xs"
                      >
                        {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSql ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LOCAL FILE BACKUP & RESTORE */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">ফ্রি লোকাল ব্যাকআপ ও রিস্টোর</h3>
                  <p className="text-xs text-slate-500">ইন্টারনেট ছাড়াই কম্পিউটারে সেভ রাখা ও অন্য ডিভাইসে স্থানান্তর</p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800">১. সম্পূর্ণ ব্যাকআপ ডাউনলোড (Export)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    এক ক্লিকে আপনার সমস্ত পণ্য, বিক্রয় হিসাব, খরচ, ক্রয় ও বাকি খাতার ফাইল ডাউনলোড করুন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>ব্যাকআপ ডাউনলোড করুন</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800">২. ব্যাকআপ ফাইল রিস্টোর (Import)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    পূর্বের সেভ করা `.json` ব্যাকআপ ফাইল সিলেক্ট করলেই সমস্ত হিসাব ফিরে আসবে
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isImporting ? 'রিস্টোর হচ্ছে...' : 'ডাটা রিস্টোর করুন'}</span>
                  </button>
                </div>
              </div>

              {importStatus && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800">পরীক্ষামূলক ডেমো ডাটা</h4>
              <p className="text-[11px] text-slate-500">অ্যাপ টেস্ট করতে চাইলে পূর্বের নমুনা ডাটা লোড করুন</p>
            </div>
            <button
              onClick={handleResetDemo}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              ডেমো লোড
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Courier API & Store Profile (Span 6) */}
        <div className="lg:col-span-6 space-y-5">
          {/* STEADFAST / PACKZY COURIER API CARD */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-indigo-100 ring-1 ring-indigo-500/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>স্টেডফাস্ট / প্যাকজি কুরিয়ার এপিআই</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      সরাসরি বুকিং
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    portal.packzy.com এপিআই ইন্টিগ্রেশন (১ ক্লিকে পার্সেল বুকিং ও ট্র্যাকিং)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Api-Key (কুরিয়ার এপিআই কি):
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Packzy/Steadfast Headers</span>
                </div>
                <input
                  type="text"
                  value={courierApiKey}
                  onChange={(e) => setCourierApiKey(e.target.value)}
                  placeholder="যেমন: ic4pg2oo3xdnruhyalv7yy4qfgxyoytl"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Secret-Key (কুরিয়ার সিক্রেট কি):
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {showSecretKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecretKey ? 'লুকান' : 'দেখুন'}</span>
                  </button>
                </div>
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  value={courierSecretKey}
                  onChange={(e) => setCourierSecretKey(e.target.value)}
                  placeholder="যেমন: rheawkurrnuoyznnfypbpjfs"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              {/* Courier Actions & Test Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTestingCourier || !courierApiKey || !courierSecretKey}
                  onClick={handleTestCourier}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingCourier ? 'animate-spin' : ''}`} />
                  <span>{isTestingCourier ? 'কানেকশন টেস্ট হচ্ছে...' : 'কানেকশন ও ব্যালেন্স টেস্ট'}</span>
                </button>

                <a
                  href="https://portal.packzy.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-[11px] font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>প্যাকজি পোর্টাল ওপেন করুন</span>
                </a>
              </div>

              {/* Status / Feedback */}
              {courierFeedback && (
                <div className={`p-2.5 rounded-lg border text-xs font-medium flex items-start gap-2 ${
                  courierFeedback.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {courierFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{courierFeedback.message}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">দোকানের তথ্য ও রসিদ সেটিংস</h3>
                  <p className="text-xs text-slate-500">চালান বা এ৫ রসিদে প্রদর্শিত দোকান প্রোফাইল</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  দোকানের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="যেমন: বিসমিল্লাহ জেনারেল স্টোর"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  স্লোগান বা ব্যবসা ধরণ
                </label>
                <input
                  type="text"
                  value={formData.storeTagline}
                  onChange={(e) => setFormData({ ...formData, storeTagline: e.target.value })}
                  placeholder="যেমন: পাইকারী ও খুচরা বিক্রেতা"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  প্রোপাইটর / স্বত্বাধিকারীর নাম
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="যেমন: মো: আব্দুল আলিম"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    প্রধান মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01712-345678"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    বিকল্প মোবাইল (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={formData.alternatePhone || ''}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    placeholder="01812-345678"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  দোকানের পূর্ণাঙ্গ ঠিকানা <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="দোকান নং, মার্কেট, রোড, এলাকা, জেলা"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ওয়েবসাইট / ডোমেইন
                  </label>
                  <input
                    type="text"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="যেমন: ekdor.net"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    লোগো ইমেজ লিঙ্ক (URL)
                  </label>
                  <input
                    type="text"
                    value={formData.logoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://.../logo.png"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  রসিদ প্রিন্ট পেপার সাইজ
                </label>
                <select
                  value={formData.printPaperSize}
                  onChange={(e) => setFormData({ ...formData, printPaperSize: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="A5">এ৫ (A5 পেজ - হাফ শিট সাইজ, সবচেয়ে জনপ্রিয়)</option>
                  <option value="POS-80mm">থার্মাল পিওএস স্লিপ (80mm Thermal Paper)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  রসিদের নিচের ধন্যবাদ বার্তা / শর্তাবলী
                </label>
                <input
                  type="text"
                  value={formData.invoiceFooter}
                  onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                  placeholder="আমাদের সাথে থাকার জন্য ধন্যবাদ! বিক্রিত মাল ফেরত নেওয়া হয়।"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>দোকানের তথ্য সফলভাবে সংরক্ষিত হয়েছে!</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>সেটিংস পরিবর্তন সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
