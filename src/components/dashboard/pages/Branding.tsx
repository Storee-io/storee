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

// Target data URL sizes the compressor aims to fit within — matches the
// limits shown in the upload dropzones. Files over these get progressively
// compressed instead of rejected; only truly unreasonable uploads (see
// ABSOLUTE_MAX_UPLOAD_BYTES) are turned away outright.
const LOGO_TARGET_BYTES = 2 * 1024 * 1024;
const FAVICON_TARGET_BYTES = 500 * 1024;
const ABSOLUTE_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Compress image to reduce data URL size. Keeps PNG (with alpha) for
// sources that may have transparency (png/webp/gif) so logos with a
// transparent background don't get flattened to black by JPEG's lack
// of an alpha channel; only flattens to JPEG for opaque JPEG sources.
// `square: true` (used for favicons) center-crops to the image's shortest
// side first, so a non-1:1 source doesn't get letterboxed inside the
// square favicon preview/browser-tab slot.
//
// `maxBytes`, if given, makes this a best-effort "compress to fit": after
// the initial render, if the output data URL is still over budget it keeps
// stepping down JPEG quality (opaque sources) then physical dimensions
// (any source, including PNGs where quality doesn't apply) until it fits
// or hits a sane floor — so large uploads get shrunk instead of rejected.
const compressImage = (
  file: File,
  quality: number = 0.7,
  maxWidth: number = 1200,
  square: boolean = false,
  maxBytes?: number
): Promise<string> => {
  const preserveAlpha = file.type !== 'image/jpeg' && file.type !== 'image/jpg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const render = (width: number, q: number): string => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (square) {
            const side = Math.min(img.width, img.height);
            const sx = (img.width - side) / 2;
            const sy = (img.height - side) / 2;
            const outSide = Math.min(side, width);
            canvas.width = outSide;
            canvas.height = outSide;
            ctx?.drawImage(img, sx, sy, side, side, 0, 0, outSide, outSide);
          } else {
            let w = img.width;
            let h = img.height;
            if (w > width) {
              h = (width / w) * h;
              w = width;
            }
            canvas.width = w;
            canvas.height = h;
            ctx?.drawImage(img, 0, 0, w, h);
          }

          return preserveAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', q);
        };

        let width = maxWidth;
        let q = quality;
        let dataUrl = render(width, q);

        if (maxBytes) {
          let attempts = 0;
          while (dataUrl.length > maxBytes && attempts < 14 && width >= 32) {
            if (!preserveAlpha && q > 0.4) {
              q = Math.max(0.4, q - 0.1);
            } else {
              width = Math.round(width * 0.85);
            }
            dataUrl = render(width, q);
            attempts++;
          }
        }

        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
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
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);
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
          setRemoveLogo(false);
          setRemoveFavicon(false);
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

    // Only reject truly unreasonable uploads — anything up to the target
    // gets compressed to fit instead of being turned away.
    if (file.size > ABSOLUTE_MAX_UPLOAD_BYTES) {
      toast.error('File is too large to process (max 25MB)');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 0.8, 1200, false, LOGO_TARGET_BYTES);
      if (compressedDataUrl.length > LOGO_TARGET_BYTES) {
        toast.error('Could not compress this image small enough — try a simpler image');
        return;
      }
      if (file.size > LOGO_TARGET_BYTES) {
        toast.success('Logo compressed to fit the size limit');
      }
      setPendingLogo({ file, dataUrl: compressedDataUrl });
      setRemoveLogo(false);
    } catch (err) {
      toast.error('Failed to process image');
    }
  };

  const handleFaviconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (ICO, PNG, etc.)');
      return;
    }

    // Only reject truly unreasonable uploads — anything up to the target
    // gets compressed to fit instead of being turned away.
    if (file.size > ABSOLUTE_MAX_UPLOAD_BYTES) {
      toast.error('File is too large to process (max 25MB)');
      return;
    }

    try {
      // Compressed and center-cropped to a square
      const compressedDataUrl = await compressImage(file, 0.9, 256, true, FAVICON_TARGET_BYTES);
      if (compressedDataUrl.length > FAVICON_TARGET_BYTES) {
        toast.error('Could not compress this image small enough — try a simpler image');
        return;
      }
      if (file.size > FAVICON_TARGET_BYTES) {
        toast.success('Favicon compressed to fit the size limit');
      }
      setPendingFavicon({ file, dataUrl: compressedDataUrl });
      setRemoveFavicon(false);
    } catch (err) {
      toast.error('Failed to process image');
    }
  };

  const save = async () => {
    if (!displayStore?.id) return;
    if (!pendingLogo && !pendingFavicon && !removeLogo && !removeFavicon) {
      toast.error('Please make a change before saving');
      return;
    }

    setIsSaving(true);
    try {
      const updated: BrandingSettings = { ...branding };

      // Removals staged by the X button only take effect here, on save
      if (removeLogo) {
        updated.logoUrl = undefined;
        updated.logoFile = undefined;
        if (branding.faviconFile === 'favicon-from-logo') {
          updated.faviconUrl = undefined;
          updated.faviconFile = undefined;
        }
      }
      if (removeFavicon) {
        updated.faviconUrl = undefined;
        updated.faviconFile = undefined;
      }

      if (pendingLogo) {
        updated.logoUrl = pendingLogo.dataUrl;
        updated.logoFile = pendingLogo.file.name;

        // If favicon not provided, use a square-cropped version of the logo
        // as fallback so it doesn't get letterboxed in the square favicon slot
        if (!pendingFavicon && !removeFavicon) {
          updated.faviconUrl = await compressImage(pendingLogo.file, 0.9, 256, true, FAVICON_TARGET_BYTES);
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
      setRemoveLogo(false);
      setRemoveFavicon(false);
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
    // Stage removal only — actual delete happens on Save Changes
    setRemoveLogo(true);
    toast.success('Logo will be removed', { description: 'Click Save Changes to confirm.' });
  };

  const handleRemoveFavicon = () => {
    if (pendingFavicon) {
      setPendingFavicon(null);
      if (faviconInputRef.current) faviconInputRef.current.value = '';
      return;
    }
    // Stage removal only — actual delete happens on Save Changes
    setRemoveFavicon(true);
    toast.success('Favicon will reset to default', { description: 'Click Save Changes to confirm.' });
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

  const logoPreview = pendingLogo?.dataUrl ?? (removeLogo ? undefined : branding.logoUrl);
  const logoLabel = pendingLogo?.file.name ?? (removeLogo ? undefined : branding.logoFile);
  const faviconPreview = pendingFavicon?.dataUrl ?? (removeFavicon ? STOREE_FAVICON : branding.faviconUrl) ?? STOREE_FAVICON;
  const faviconLabel = pendingFavicon
    ? pendingFavicon.file.name
    : removeFavicon
      ? 'Storee default (pending)'
      : branding.faviconUrl
        ? (branding.faviconFile === 'favicon-from-logo' ? 'Using logo as favicon' : branding.faviconFile)
        : 'Storee default';
  const hasPending = !!(pendingLogo || pendingFavicon || removeLogo || removeFavicon);

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
            <span className="text-xs text-slate-400">PNG, JPG up to 2MB</span>
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
            {(pendingFavicon || (branding.faviconUrl && !removeFavicon)) && (
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
            <span className="text-xs text-slate-400">ICO, PNG up to 500KB</span>
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
