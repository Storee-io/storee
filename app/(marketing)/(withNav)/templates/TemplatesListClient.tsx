'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, Shuffle } from 'lucide-react';
import { templates } from '@/src/data/templates';

export default function TemplatesListClient() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const router = useRouter();
  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];
  const filtered = activeCategory === 'All' ? templates : templates.filter(t => t.category === activeCategory);

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-[3.75rem] sm:px-6 lg:px-8 xl:px-20 2xl:px-32">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Store <span className="gradient-text">Templates</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Start with a professionally designed template and customize with AI
          </p>
        </div>

        <div className="flex items-center gap-2 justify-center flex-wrap mb-10">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat ? 'gradient-bg text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm card-hover cursor-pointer"
            >
              <div className="relative h-52 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={template.image} alt={template.name} className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-105" />
                <div className={`absolute inset-0 bg-gradient-to-t ${template.color} opacity-30`} />

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredId === template.id ? 1 : 0 }}
                  transition={{ duration: 0.1 }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                  <button
                    onClick={() => router.push(`/templates/${template.id}?from=/templates`)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-lg"
                  >
                    <Eye className="w-4 h-4" />Preview Template
                  </button>
                </motion.div>

                <div className="absolute top-3 left-3">
                  <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full bg-gradient-to-r ${template.color}`}>
                    {template.category}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{template.name}</h3>
                <p className="text-sm text-slate-500 mb-3">{template.description}</p>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg w-fit">
                  <Shuffle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-600">{template.storeCount.toLocaleString()} remixes</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
