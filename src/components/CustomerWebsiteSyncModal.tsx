import React, { useState } from 'react';
import { Product, ProductBundle, StoreSettings } from '../types';
import { 
  syncAllToGitHub, 
  downloadAllJsonFiles, 
  downloadJsonFile, 
  generateProductsJson, 
  generateCategoriesJson, 
  generateBundleJson,
  SyncOverallResult 
} from '../services/githubSync';
import { 
  Globe, 
  X, 
  Github, 
  UploadCloud, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  HelpCircle, 
  Key, 
  GitBranch, 
  FolderGit2, 
  ShieldCheck,
  PackageCheck,
  Layers,
  FileCode
} from 'lucide-react';

interface CustomerWebsiteSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  bundles?: ProductBundle[];
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
}

export const CustomerWebsiteSyncModal: React.FC<CustomerWebsiteSyncModalProps> = ({
  isOpen,
  onClose,
  products,
  bundles = [],
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'download' | 'preview'>('sync');
  const [previewSubTab, setPreviewSubTab] = useState<'products' | 'categories' | 'bundle'>('products');

  // Form states
  const [repo, setRepo] = useState(settings.githubRepo || 'bdkhatibazar-sudo/ekdor');
  const [token, setToken] = useState(settings.githubToken || '');
  const [branch, setBranch] = useState(settings.githubBranch || 'main');
  const [showToken, setShowToken] = useState(false);
  const [showTokenGuide, setShowTokenGuide] = useState(false);

  // Syncing states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncOverallResult | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  if (!isOpen) return null;

  // Active metrics
  const activeProducts = products.filter((p) => p.isActive !== false);
  const inStockProducts = products.filter((p) => p.stockQty > 0);
  const uniqueCategories = new Set(products.map((p) => p.category).filter(Boolean));

  // Handle Save Settings
  const handleSaveConfig = () => {
    onUpdateSettings({
      ...settings,
      githubRepo: repo.trim(),
      githubToken: token.trim(),
      githubBranch: branch.trim(),
    });
  };

  // Handle Sync to GitHub
  const handleStartSync = async () => {
    if (!repo.trim()) {
      alert('দয়া করে আপনার কাস্টমার সাইটের গিটহাব রিপোজিটরি নাম দিন (যেমন: bdkhatibazar-sudo/ekdor)');
      return;
    }
    if (!token.trim()) {
      alert('দয়া করে একটি GitHub Personal Access Token (PAT) দিন।');
      return;
    }

    handleSaveConfig();
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await syncAllToGitHub(
        {
          repo: repo.trim(),
          token: token.trim(),
          branch: branch.trim() || 'main',
        },
        products,
        bundles
      );
      setSyncResult(res);
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'সিঙ্ক করতে অপ্রত্যাশিত সমস্যা হয়েছে',
        results: [],
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Preview data
  const productsJson = generateProductsJson(products);
  const categoriesJson = generateCategoriesJson(products);
  const bundleJson = generateBundleJson(bundles);

  const getPreviewText = () => {
    if (previewSubTab === 'products') return JSON.stringify(productsJson, null, 2);
    if (previewSubTab === 'categories') return JSON.stringify(categoriesJson, null, 2);
    return JSON.stringify(bundleJson, null, 2);
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(getPreviewText());
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">কাস্টমার ওয়েবসাইট সিঙ্ক</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  ekdor.net CDN
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                এক ক্লিকে গিটহাবে products.json, categories.json ও bundle.json অটো-আপডেট
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Catalog Summary Stats */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-slate-500">মোট পণ্য:</span>
              <strong className="text-slate-800 font-bold">{products.length} টি</strong>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                ({activeProducts.length} টি সক্রিয়)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4 text-teal-600" />
              <span className="text-slate-500">ক্যাটাগরি:</span>
              <strong className="text-slate-800 font-bold">{categoriesJson.length} টি</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-500">বান্ডেল:</span>
              <strong className="text-slate-800 font-bold">{bundles.length} টি</strong>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>গিটহাব সিঙ্ক (GitHub Push)</span>
          </button>

          <button
            onClick={() => setActiveTab('download')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'download'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>ফাইল ডাউনলোড (JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>লাইভ প্রিভিউ (Live JSON)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">

          {/* TAB 1: GITHUB SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-700 text-xs">
                  <p className="font-bold text-emerald-950 text-sm">
                    চোখের পলকে কাস্টমার সাইট আপডেট
                  </p>
                  <p className="leading-relaxed">
                    এই বাটনে চাপ দিলে আপনার বর্তমান সব পণ্য, দাম, স্টক, বর্ণনা ও বান্ডেল সরাসরি আপনার কাস্টমার সাইটের গিটহাবে পুশ হয়ে যাবে। কাস্টমার সাইটের স্পিড থাকবে সুপার-ফাস্ট ১০০% CDN ক্যাশ।
                  </p>
                </div>
              </div>

              {/* GitHub Repo Input */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Github className="w-4 h-4 text-slate-700" />
                    <span>কাস্টমার সাইট গিটহাব রিপোজিটরি (Owner/Repo)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">উদাহরণ: bdkhatibazar-sudo/ekdor</span>
                </label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="যেমন: bdkhatibazar-sudo/ekdor"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs sm:text-sm bg-slate-50 focus:bg-white"
                />
              </div>

              {/* GitHub Branch Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-slate-700" />
                    <span>শাখা / Branch</span>
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs sm:text-sm bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-slate-700" />
                      <span>গিটহাব টোকেন (PAT)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTokenGuide(!showTokenGuide)}
                      className="text-emerald-700 hover:underline flex items-center gap-0.5 text-[11px] cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>কিভাবে নিবেন?</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 pr-14 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs sm:text-sm bg-slate-50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 px-1 py-0.5"
                    >
                      {showToken ? 'লুকান' : 'দেখান'}
                    </button>
                  </div>
                </div>
              </div>

              {/* GitHub Token Quick Guide Box */}
              {showTokenGuide && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-2">
                  <p className="font-bold flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-blue-700" />
                    <span>গিটহাব টোকেন (Personal Access Token) তৈরি করার সহজ নিয়ম:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    <li>GitHub একাউন্টে ঢুকে ডানপাশের প্রোফাইল আইকন থেকে <strong>Settings</strong>-এ যান।</li>
                    <li>বামে একদম নিচে <strong>Developer settings</strong>-এ ক্লিক করুন।</li>
                    <li><strong>Personal access tokens</strong> → <strong>Tokens (classic)</strong> নির্বাচন করুন।</li>
                    <li><strong>Generate new token (classic)</strong> চাপুন, নোট লিখুন (যেমন: Ekdor Admin)।</li>
                    <li><strong>repo</strong> পারমিশন বক্সে টিক দিন এবং Generate Token চাপুন।</li>
                    <li>টোকেনটি কপি করে উপরের বক্সে পেস্ট করে দিন। এটি ব্রাউজারে নিরাপদভাবে সেভ থাকবে।</li>
                  </ol>
                </div>
              )}

              {/* Sync Status / Results Feedback */}
              {syncResult && (
                <div
                  className={`p-4 rounded-2xl border ${
                    syncResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  } space-y-2`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {syncResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span>{syncResult.message}</span>
                  </div>

                  {syncResult.results && syncResult.results.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {syncResult.results.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-slate-200/60"
                        >
                          <span className="font-mono font-semibold">{r.filename}</span>
                          <span
                            className={`font-semibold ${
                              r.success ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {r.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Main Push Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleStartSync}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSyncing
                      ? 'bg-emerald-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99]'
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>গিটহাবে পুশ ও আপডেট হচ্ছে, অপেক্ষা করুন...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5" />
                      <span>🚀 ১-ক্লিকে গিটহাবে পুশ করুন (Auto-Push to GitHub)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DOWNLOAD JSON */}
          {activeTab === 'download' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  ম্যানুয়াল ব্যাকআপ বা সরাসরি ফাইল ব্যবহার
                </p>
                <p>
                  আপনি চাইলে যেকোনো সময় কাস্টমার ওয়েবসাইটের জন্য একদম প্রস্তুত ৩টি JSON ফাইল ডাউনলোড করে নিতে পারেন।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* products.json */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5 text-center flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-1">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">products.json</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {products.length} টি পণ্য ({inStockProducts.length} স্টকে)
                    </p>
                  </div>
                  <button
                    onClick={() => downloadJsonFile('products.json', productsJson)}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ডাউনলোড করুন</span>
                  </button>
                </div>

                {/* categories.json */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5 text-center flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center mx-auto mb-1">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">categories.json</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {categoriesJson.length} টি ক্যাটাগরি ছবি সহ
                    </p>
                  </div>
                  <button
                    onClick={() => downloadJsonFile('categories.json', categoriesJson)}
                    className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ডাউনলোড করুন</span>
                  </button>
                </div>

                {/* bundle.json */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5 text-center flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center mx-auto mb-1">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">bundle.json</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {bundles.length} টি বান্ডেল প্যাকেজ
                    </p>
                  </div>
                  <button
                    onClick={() => downloadJsonFile('bundle.json', bundleJson)}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ডাউনলোড করুন</span>
                  </button>
                </div>
              </div>

              {/* Download All Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => downloadAllJsonFiles(products, bundles)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>এক ক্লিকে ৩টি ফাইলই একসাথে ডাউনলোড করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                {/* Sub-tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setPreviewSubTab('products')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      previewSubTab === 'products'
                        ? 'bg-white text-emerald-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    products.json ({productsJson.length})
                  </button>
                  <button
                    onClick={() => setPreviewSubTab('categories')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      previewSubTab === 'categories'
                        ? 'bg-white text-teal-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    categories.json ({categoriesJson.length})
                  </button>
                  <button
                    onClick={() => setPreviewSubTab('bundle')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      previewSubTab === 'bundle'
                        ? 'bg-white text-indigo-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    bundle.json ({bundleJson.length})
                  </button>
                </div>

                {/* Copy button */}
                <button
                  type="button"
                  onClick={handleCopyPreview}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedPreview ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>
              </div>

              {/* JSON Code Viewer */}
              <div className="relative">
                <pre className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-[11px] sm:text-xs rounded-2xl overflow-x-auto max-h-80 scrollbar-thin">
                  {getPreviewText()}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>🌐 কাস্টমার সাইট:</span>
            <a
              href="https://ekdor.net"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:underline font-semibold flex items-center gap-0.5"
            >
              <span>ekdor.net</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
