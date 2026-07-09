'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Image as ImageIcon, Check, Loader2, Upload, X } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';

interface BrandingSettings {
  logoUrl?: string;
  faviconUrl?: string;
  logoFile?: string;
  faviconFile?: string;
}

const STOREE_FAVICON = '/favicon.ico';

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function Branding() {
  const searchParams = useSearchParams();
  const storeId = searchParams?.get('storeId');
  const { activeStore, updateActiveStore, stores, setActiveStore } = useStore();

  const displayStore = storeId && stores.length > 0
    ? stores.find(s => s.id === storeId) ?? activeStore
    : activeStore;

  const isLoading = !!(storeId && activeStore?.id !== storeId);

  useEffect(() => {
    if (displayStore && displayStore.id !== activeStore?.id) {
      setActiveStore(displayStore);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, stores]);

  const [branding, setBranding] = useState<BrandingSettings>({});
  const [pendingLogo, setPendingLogo] = useState<{ file: File; dataUrl: string } | null>(null);
  const [pendingFavicon, setPendingFavicon] = useState<{ file: File; dataUrl: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Fetch current branding
  useEffect(() => {
    if (!displayStore?.id) return;

    const fetchBranding = async () => {
      try {
        const response = await fetch(`/api/stores/${displayStore.id}/branding`);
        if (response.ok) {
          const data = await response.json();
          setBranding(data);
        }
      } catch (err) {
        console.error('Failed to fetch branding:', err);
      }
    };

    fetchBranding();
  }, [displayStore?.id]);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setPendingLogo({ file, dataUrl });
  };

  const handleFaviconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (ICO, PNG, etc.)');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setPendingFavicon({ file, dataUrl });
  };

  const save = async () => {
    if (!displayStore?.id) return;
    if (!pendingLogo && !pendingFavicon) {
      toast.error('Please select at least one file to upload');
      return;
    }

    setIsSaving(true);
    try {
      const updated: BrandingSettings = { ...branding };

      if (pendingLogo) {
        updated.logoUrl = pendingLogo.dataUrl;
        updated.logoFile = pendingLogo.file.name;

        // If favicon not provided, use logo as fallback
        if (!pendingFavicon) {
          updated.faviconUrl = pendingLogo.dataUrl;
          updated.faviconFile = 'favicon-from-logo';
        }
      }

      if (pendingFavicon) {
        updated.faviconUrl = pendingFavicon.dataUrl;
        updated.faviconFile = pendingFavicon.file.name;
      }

      await new Promise(resolve => setTimeout(resolve, 300)); // minimum visual feedback

      const response = await fetch(`/api/stores/${displayStore.id}/branding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${response.status} ${errorData.error || response.statusText}`);
      }

      setBranding(updated);
      if (updateActiveStore) {
        updateActiveStore({ branding: updated });
      }

      setPendingLogo(null);
      setPendingFavicon(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      if (faviconInputRef.current) faviconInputRef.current.value = '';

      toast.success('Branding saved successfully');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save branding';
      console.error('Save error:', err);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    if (pendingLogo) {
      setPendingLogo(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }
    const updated = { ...branding, logoUrl: undefined, logoFile: undefined };
    if (branding.faviconFile === 'favicon-from-logo') {
      updated.faviconUrl = undefined;
      updated.faviconFile = undefined;
    }
    setBranding(updated);
    if (updateActiveStore) {
      updateActiveStore({ branding: updated });
    }
    toast.success('Logo removed');
  };

  const handleRemoveFavicon = () => {
    if (pendingFavicon) {
      setPendingFavicon(null);
      if (faviconInputRef.current) faviconInputRef.current.value = '';
      return;
    }
    const updated = { ...branding, faviconUrl: undefined, faviconFile: undefined };
    setBranding(updated);
    if (updateActiveStore) {
      updateActiveStore({ branding: updated });
    }
    toast.success('Favicon reset to default');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!displayStore) {
    return <div className="p-6 text-center text-slate-500">No store selected</div>;
  }

  const logoPreview = pendingLogo?.dataUrl ?? branding.logoUrl;
  const logoLabel = pendingLogo?.file.name ?? branding.logoFile;
  const faviconPreview = pendingFavicon?.dataUrl ?? branding.faviconUrl ?? STOREE_FAVICON;
  const faviconLabel = pendingFavicon
    ? pendingFavicon.file.name
    : branding.faviconUrl
      ? (branding.faviconFile === 'favicon-from-logo' ? 'Using logo as favicon' : branding.faviconFile)
      : 'Storee default';
  const hasPending = !!(pendingLogo || pendingFavicon);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Branding</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your store&apos;s logo and favicon</p>
        </div>
        <button
          onClick={save}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
          ) : saved ? (
            <><Check className="w-4 h-4" />Saved!</>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Logo</h3>
            <p className="text-xs text-slate-400 mt-0.5">Displayed in your store header</p>
          </div>
        </div>

        <div className="space-y-4">
          {logoPreview && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src={logoPreview} alt="Store Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <p className="text-sm font-medium text-slate-700 truncate">{logoLabel}</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={isSaving}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <label
            htmlFor="logo-input"
            className="flex flex-col items-center gap-2 px-4 py-6 rounded-xl border border-dashed border-slate-300 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
          >
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Click to upload logo</span>
            <span className="text-xs text-slate-400">PNG, JPG up to 5MB</span>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleLogoSelect}
              className="hidden"
              id="logo-input"
            />
          </label>
        </div>
      </div>

      {/* Favicon */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Favicon</h3>
            <p className="text-xs text-slate-400 mt-0.5">Shown in browser tabs and bookmarks</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={faviconPreview} alt="Favicon" className="w-6 h-6 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">Current favicon</p>
                <p className="text-xs text-slate-400 truncate">{faviconLabel}</p>
              </div>
            </div>
            {(pendingFavicon || branding.faviconUrl) && (
              <button
                type="button"
                onClick={handleRemoveFavicon}
                disabled={isSaving}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <label
            htmlFor="favicon-input"
            className="flex flex-col items-center gap-2 px-4 py-6 rounded-xl border border-dashed border-slate-300 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
          >
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Click to upload favicon</span>
            <span className="text-xs text-slate-400">ICO, PNG up to 2MB</span>
            <input
              ref={faviconInputRef}
              type="file"
              accept=".ico,image/x-icon,image/png"
              onChange={handleFaviconSelect}
              className="hidden"
              id="favicon-input"
            />
          </label>

          <p className="text-xs text-slate-500 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            💡 If you only upload a logo, it will automatically be used as favicon too.
          </p>
        </div>
      </div>
    </div>
  );
}
