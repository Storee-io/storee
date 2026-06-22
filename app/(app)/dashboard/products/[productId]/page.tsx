'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useStore } from '@/src/context/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Product } from '@/src/lib/supabase';

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const { activeStore, storeData } = useStore();

  const [product, setProduct] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Find product from store data (generated products)
  useEffect(() => {
    if (!params.productId) return;

    try {
      const found = storeData.products.find(p => p.id === params.productId);
      if (found) {
        setProduct(found);
      }
    } catch (err) {
      console.error('Failed to load product:', err);
    } finally {
      setIsLoading(false);
    }
  }, [params.productId, storeData]);

  const handleSave = async () => {
    if (!product || !activeStore?.id) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/stores/${activeStore.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          description: product.description,
          category: product.category,
          badge: product.badge,
          image: product.image,
          imageFallback: product.imageFallback,
          collectionId: product.collectionId,
          stock: product.stock || 50,
        }),
      });

      if (!response.ok) throw new Error('Failed to save product');
      alert('Product saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-slate-500">Product not found</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gradient-bg text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Product Image */}
        {product.image && (
          <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Name</label>
            <Input
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Price</label>
              <Input
                type="number"
                value={product.price}
                onChange={(e) => setProduct({ ...product, price: parseFloat(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Original Price</label>
              <Input
                type="number"
                value={product.originalPrice || ''}
                onChange={(e) => setProduct({ ...product, originalPrice: parseFloat(e.target.value) })}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <Input
              value={product.category}
              onChange={(e) => setProduct({ ...product, category: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Badge</label>
            <Input
              value={product.badge || ''}
              onChange={(e) => setProduct({ ...product, badge: e.target.value })}
              className="mt-2"
              placeholder="e.g., Hot, New, Sale"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <textarea
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              className="mt-2 w-full p-2 border border-slate-300 rounded-lg text-sm"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Stock</label>
            <Input
              type="number"
              value={product.stock || 50}
              onChange={(e) => setProduct({ ...product, stock: parseInt(e.target.value) })}
              className="mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
