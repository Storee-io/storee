'use client';

import { useState } from 'react';
import { User, Mail, Lock, Bell, Shield, Trash2, Check, Eye, EyeOff, Phone } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function AccountSettings() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [notifOrders, setNotifOrders] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [notifProduct, setNotifProduct] = useState(true);

  const saveProfile = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const savePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) return;
    setPasswordSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Account Settings</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your personal account information</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-900">Profile Information</h3>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Profile Photo</p>
            <p className="text-xs text-slate-400 mt-0.5">Avatar generated from your initials</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Storia"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. storia@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+62 812 3456 7890"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <button
          onClick={saveProfile}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-900">Change Password</h3>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Current Password', value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
            { label: 'New Password', value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
            { label: 'Confirm New Password', value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
          ].map(({ label, value, set, show, toggle }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                />
                <button onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500">Passwords do not match</p>
          )}
        </div>

        <button
          onClick={savePassword}
          disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
          className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {passwordSaved ? <><Check className="w-4 h-4" /> Password Updated!</> : 'Update Password'}
        </button>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Bell className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-900">Notifications</h3>
        </div>

        {[
          { label: 'Order notifications', desc: 'Get notified when a new order arrives', value: notifOrders, set: setNotifOrders },
          { label: 'Product alerts', desc: 'Low stock and product updates', value: notifProduct, set: setNotifProduct },
          { label: 'Marketing emails', desc: 'Tips, updates, and offers from Storee', value: notifMarketing, set: setNotifMarketing },
        ].map(({ label, desc, value, set }) => (
          <div key={label} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-slate-800">{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
            <button
              onClick={() => set(v => !v)}
              className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${value ? 'bg-emerald-500' : 'bg-slate-200'}`}
              style={{ width: 40, height: 22 }}
            >
              <span
                className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200`}
                style={{ width: 18, height: 18, top: 2, left: value ? 20 : 2 }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-900">Security</h3>
        </div>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-slate-800">Two-factor authentication</p>
            <p className="text-xs text-slate-400">Add an extra layer of security to your account</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full">Coming soon</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <h3 className="font-bold text-slate-900">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Delete Account</p>
            <p className="text-xs text-slate-400">Permanently delete your account and all data</p>
          </div>
          <button className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
