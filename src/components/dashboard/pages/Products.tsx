'use client';

import { useState } from 'react';
import { Search, Plus, Edit3, Trash2, MoreHorizontal } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Products() {
  const { storeData } = useStore();
  const { products } = storeData;
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <p className="text-slate-500 text-sm mt-1">{products.length} products in your store</p>
        </div>
        <Button className="gradient-bg hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />Add Product
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setView('grid')}
            variant={view === 'grid' ? 'default' : 'outline'}
            className={view === 'grid' ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : ''}
          >Grid</Button>
          <Button
            onClick={() => setView('list')}
            variant={view === 'list' ? 'default' : 'outline'}
            className={view === 'list' ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : ''}
          >List</Button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400">No products found</div>
          ) : (
            filtered.map(product => (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-all group">
                <div className="aspect-square bg-slate-50 overflow-hidden relative">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23f1f5f9'/%3E%3C/svg%3E"; }} />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="sm" variant="ghost" className="w-7 h-7 p-0 bg-white hover:bg-slate-50 rounded-lg">
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="w-7 h-7 p-0 bg-white hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                  <Badge className={`absolute top-2 left-2 ${product.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {product.status}
                  </Badge>
                </div>
                <div className="p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{product.category}</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-slate-900">${product.price}</span>
                    <span className="text-xs text-slate-400">{product.stock} in stock</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(product => (
                  <TableRow key={product.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-xl object-cover bg-slate-100" onError={e => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23f1f5f9'/%3E%3C/svg%3E"; }} />
                        <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">{product.category}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-slate-900">${product.price}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{product.stock}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{product.sales}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${product.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="p-1.5 h-auto">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
