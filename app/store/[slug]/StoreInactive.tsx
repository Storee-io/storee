import { ShoppingBag, Clock } from 'lucide-react';

interface Props {
  name: string;
}

export default function StoreInactive({ name }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-300" />
        </div>

        {/* Store name */}
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{name}</h1>

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Clock className="w-4 h-4" />
          Store is currently unavailable
        </div>

        {/* Message */}
        <p className="text-slate-500 text-sm leading-relaxed">
          This store has been temporarily taken offline by the owner.
          Please check back later or contact the store directly.
        </p>

        {/* Divider */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Powered by{' '}
            <a
              href="/"
              className="text-emerald-500 hover:text-emerald-600 font-medium transition-colors"
            >
              Storee
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
