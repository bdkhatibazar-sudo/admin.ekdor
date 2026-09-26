import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Database,
  ArrowUpRight,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { StoreSettings } from '../types';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'pending_sync' | 'unconfigured' | 'error';

interface SupabaseSyncStatusBadgeProps {
  settings: StoreSettings;
  syncState: SyncState;
  lastSyncedAt?: string;
  errorMessage?: string;
  isOnline: boolean;
  onManualSync: () => void;
  onOpenSettings: () => void;
}

export const SupabaseSyncStatusBadge: React.FC<SupabaseSyncStatusBadgeProps> = ({
  settings,
  syncState,
  lastSyncedAt,
  errorMessage,
  isOnline,
  onManualSync,
  onOpenSettings,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeAgo, setTimeAgo] = useState<string>('কিছুক্ষণ আগে');

  const hasConfig = Boolean(settings.supabaseUrl && settings.supabaseAnonKey);

  // Format relative time in Bengali
  useEffect(() => {
    if (!lastSyncedAt) {
      setTimeAgo('এখনো হয়নি');
      return;
    }

    const updateTime = () => {
      try {
        const diffMs = Date.now() - new Date(lastSyncedAt).getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);

        if (diffSec < 15) {
          setTimeAgo('এইমাত্র');
        } else if (diffSec < 60) {
          setTimeAgo(`${diffSec} সেকেন্ড আগে`);
        } else if (diffMin < 60) {
          setTimeAgo(`${diffMin} মিনিট আগে`);
        } else if (diffHour < 24) {
          setTimeAgo(`${diffHour} ঘণ্টা আগে`);
        } else {
          setTimeAgo(new Date(lastSyncedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch {
        setTimeAgo('এইমাত্র');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  if (!hasConfig) {
    return (
      <div className="relative">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          title="সুপাবেস ডাটাবেজ কনফিগার করুন (ডিভাইস হারালেও হিসাব সুরক্ষিত থাকবে)"
        >
          <Database className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">সুপাবেস সেটআপ করুন</span>
          <span className="sm:hidden text-[11px]">ক্লাউড সেটআপ</span>
        </button>
      </div>
    );
  }

  // Not online
  if (!isOnline || syncState === 'offline') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          title="অফলাইন মোড - ডাটা এই ডিভাইসে সুরক্ষিত আছে, নেট এলেই ক্লাউডে যাবে"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span className="hidden sm:inline">অফলাইন (লোকাল সুরক্ষিত)</span>
          <span className="sm:hidden text-[11px]">অফলাইন</span>
        </button>

        {showTooltip && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold">
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span>ইন্টারনেট সংযোগ নেই</span>
            </div>
            <p className="text-slate-600">
              আপনি নিরবচ্ছিন্নভাবে বিক্রি ও হিসাব করতে পারেন। সব তথ্য এই ডিভাইসে জমা থাকছে। <strong>ইন্টারনেট আসা মাত্রই স্বয়ংক্রিয়ভাবে সুপাবেসে জমা হবে।</strong>
            </p>
            <button
              onClick={() => setShowTooltip(false)}
              className="w-full py-1 text-center text-slate-500 hover:text-slate-700 font-medium"
            >
              বুঝেছি
            </button>
          </div>
        )}
      </div>
    );
  }

  // Syncing state
  if (syncState === 'syncing') {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-300 text-blue-800 rounded-xl text-xs font-semibold cursor-wait shadow-2xs"
        title="সুপাবেসে ক্লাউড সিঙ্ক চলছে..."
      >
        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
        <span className="hidden sm:inline">ক্লাউড সিঙ্ক হচ্ছে...</span>
        <span className="sm:hidden text-[11px]">সিঙ্ক হচ্ছে</span>
      </button>
    );
  }

  // Pending offline data to sync
  if (syncState === 'pending_sync') {
    return (
      <button
        onClick={onManualSync}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 text-yellow-900 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
        title="অফলাইন ডাটা ক্লাউডে পাঠানোর অপেক্ষায় - ক্লিক করে সিঙ্ক করুন"
      >
        <RefreshCw className="w-3.5 h-3.5 text-yellow-600" />
        <span className="hidden sm:inline">সিঙ্ক বাকি • ক্লিক করুন</span>
        <span className="sm:hidden text-[11px]">সিঙ্ক করুন</span>
      </button>
    );
  }

  // Error state
  if (syncState === 'error') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          title="সুপাবেস কানেকশনে ত্রুটি - ক্লিক করে দেখুন"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span className="hidden sm:inline">সিঙ্ক ত্রুটি</span>
          <span className="sm:hidden text-[11px]">ত্রুটি</span>
        </button>

        {showTooltip && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>ক্লাউড সিঙ্ক সমস্যা</span>
            </div>
            <p className="text-slate-600">
              {errorMessage || 'সুপাবেসে কানেক্ট করতে সমস্যা হচ্ছে। URL বা Public Key ঠিক আছে কিনা দেখুন।'}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowTooltip(false);
                  onManualSync();
                }}
                className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-center"
              >
                আবার চেষ্টা করুন
              </button>
              <button
                onClick={() => {
                  setShowTooltip(false);
                  onOpenSettings();
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
              >
                সেটিংস
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Synced state (Normal & Green)
  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
        title={`সুপাবেস ক্লাউডে সম্পূর্ণ হিসাব রিয়েলটাইমে সংরক্ষিত (${timeAgo})`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
        </span>
        <Cloud className="w-3.5 h-3.5 text-emerald-700" />
        <span className="hidden sm:inline">ক্লাউডে সুরক্ষিত</span>
        <span className="sm:hidden text-[11px]">সুরক্ষিত</span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>সুপাবেস ক্লাউড লাইভ ও সিঙ্কড</span>
            </div>
            <span className="text-[10px] text-slate-400">{timeAgo}</span>
          </div>

          <div className="text-slate-600 space-y-1 leading-relaxed">
            <p>
              ✅ আপনার যেকোনো ডিভাইস হারালেও কোনো তথ্য হারাবে না।
            </p>
            <p>
              ✅ অন্য কোনো ডিভাইসে বা ব্রাউজারে এই অ্যাপ খুলে একই সুপাবেস URL বসালেই সব হিসাব অটো চলে আসবে।
            </p>
            <p className="text-[11px] text-slate-500">
              সর্বশেষ সফল সিঙ্ক: <strong className="text-slate-700">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('bn-BD') : 'এইমাত্র'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => {
                setShowTooltip(false);
                onManualSync();
              }}
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-center flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>এখনই সিঙ্ক করুন</span>
            </button>
            <button
              onClick={() => {
                setShowTooltip(false);
                onOpenSettings();
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              সেটিংস
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
