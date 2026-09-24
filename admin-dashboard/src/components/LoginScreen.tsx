import React, { useState } from 'react';
import { authApi } from '../api/client';
import type { AuthResponse } from '../types';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (auth: AuthResponse) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both corporate email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const auth = await authApi.login(email.trim(), password);

      // Verify user has ROLE_ADMIN authorization
      if (!auth.roles || !auth.roles.includes('ROLE_ADMIN')) {
        setErrorMessage('Access Denied: You do not possess ROLE_ADMIN operational clearance.');
        setIsLoading(false);
        return;
      }

      // Persist session to localStorage
      localStorage.setItem('rideflow_admin_token', auth.token);
      localStorage.setItem(
        'rideflow_admin_user',
        JSON.stringify({
          id: auth.id,
          name: auth.name,
          email: auth.email,
          roles: auth.roles,
        })
      );

      onLoginSuccess(auth);
    } catch (err) {
      console.error('Login failure:', err);
      const errorObj = err as { response?: { status?: number; data?: { message?: string; error?: string } } };
      let serverMsg = errorObj.response?.data?.message;
      if (!serverMsg && (errorObj.response?.status === 401 || errorObj.response?.status === 403)) {
        serverMsg = 'Invalid corporate email or password. Please verify your credentials.';
      } else if (!serverMsg) {
        serverMsg = errorObj.response?.data?.error;
      }
      setErrorMessage(
        serverMsg || 'Authentication failed. Please verify your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Radial Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 ring-1 ring-emerald-400/40">
            <ShieldCheck className="h-7 w-7 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Ops Fleet Clearance
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">RideFlow Console</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in with your operations administrator credentials</p>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
              Corporate Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rideflow.test"
                disabled={isLoading}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isLoading}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating with Broker...</span>
              </>
            ) : (
              <>
                <span>Access Operations Fleet</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Security Clearance Notice */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <p className="text-[11px] text-slate-500 text-center">
            Clearance strictly restricted to RideFlow Operations Staff & Fleet Dispatchers.
          </p>
        </div>
      </div>
    </div>
  );
};

