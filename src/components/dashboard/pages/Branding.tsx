'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, Loader2, X } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';

interface BrandingSettings {
  logoUrl?: string;
  faviconUrl?: string;
  logoFile?: string;
  faviconFile?: string;
}

const STOREE_FAVICON = '/favicon.ico';

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
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

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!displayStore?.id) return;

    const formData = new FormData(e.currentTarget);
    const logoFile = formData.get('logo') as File | null;
    const faviconFile = formData.get('favicon') as File | null;

    if (!logoFile && !faviconFile) {
      setError('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const updated: BrandingSettings = { ...branding };

      if (logoFile) {
        const logoDataUrl = await fileToDataUrl(logoFile);
        updated.logoUrl = logoDataUrl;
        updated.logoFile = logoFile.name;

        // If favicon not provided, use logo as fallback
        if (!faviconFile) {
          updated.faviconUrl = logoDataUrl;
          updated.faviconFile = 'favicon-from-logo';
        }
      }

      if (faviconFile) {
        const faviconDataUrl = await fileToDataUrl(faviconFile);
        updated.faviconUrl = faviconDataUrl;
        updated.faviconFile = faviconFile.name;
      }

      const response = await fetch(`/api/stores/${displayStore.id}/branding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setBranding(updated);
      setSuccess('Branding updated successfully');

      if (updateActiveStore) {
        updateActiveStore({ branding: updated });
      }

      if (logoInputRef.current) logoInputRef.current.value = '';
      if (faviconInputRef.current) faviconInputRef.current.value = '';

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    const updated = { ...branding, logoUrl: undefined, logoFile: undefined };
    if (branding.faviconFile === 'favicon-from-logo') {
      updated.faviconUrl = undefined;
      updated.faviconFile = undefined;
    }
    setBranding(updated);
    setSuccess('Logo removed');
  };

  const handleRemoveFavicon = () => {
    const updated = { ...branding, faviconUrl: undefined, faviconFile: undefined };
    setBranding(updated);
    setSuccess('Favicon removed');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!displayStore) {
    return <div className="text-center py-12">No store selected</div>;
  }

  const faviconToDisplay = branding.faviconUrl || STOREE_FAVICON;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Branding</h1>
        <p className="text-gray-600">Manage your store's logo and favicon</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-8">
        {/* Logo Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Logo</h2>

          <div className="space-y-4">
            {branding.logoUrl && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <img
                    src={branding.logoUrl}
                    alt="Store Logo"
                    className="h-12 object-contain"
                  />
                  <div className="text-sm text-gray-600">
                    {branding.logoFile || 'logo'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={logoInputRef}
                type="file"
                name="logo"
                accept="image/*"
                className="hidden"
                id="logo-input"
              />
              <label htmlFor="logo-input" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Click to upload logo</span>
                <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
              </label>
            </div>
          </div>
        </div>

        {/* Favicon Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Favicon</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Current favicon:</p>
                <p className="text-xs text-gray-500 mt-1">
                  {branding.faviconUrl ? (branding.faviconFile || 'favicon') : 'Storee default'}
                </p>
              </div>
              <img src={faviconToDisplay} alt="Favicon" className="w-8 h-8 rounded" />
            </div>

            {branding.faviconUrl && (
              <button
                type="button"
                onClick={handleRemoveFavicon}
                disabled={uploading}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Reset to default
              </button>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={faviconInputRef}
                type="file"
                name="favicon"
                accept=".ico,.png"
                className="hidden"
                id="favicon-input"
              />
              <label htmlFor="favicon-input" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Click to upload favicon</span>
                <span className="text-xs text-gray-500">ICO, PNG up to 2MB</span>
              </label>
            </div>

            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
              💡 If you only upload a logo, it will automatically be used as favicon too.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading ? 'Uploading...' : 'Save Branding'}
          </button>
        </div>
      </form>
    </div>
  );
}
