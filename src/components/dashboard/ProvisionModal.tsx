'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Zap, Terminal } from 'lucide-react';

interface ProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

export const ProvisionModal = ({ isOpen, onClose, orgId }: ProvisionModalProps) => {
  const [routerName, setRouterName] = useState('');
  const [script, setScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleProvision = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tunnel/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, routerName }),
      });
      const data = await response.json();
      if (data.script) {
        setScript(data.script);
      }
    } catch (error) {
      console.error('Provisioning failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                  <Zap size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">Provision New Router</h3>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              {!script ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2 uppercase tracking-wider">Router Name</label>
                    <input
                      type="text"
                      value={routerName}
                      onChange={(e) => setRouterName(e.target.value)}
                      placeholder="e.g. London-Branch-GW"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleProvision}
                    disabled={!routerName || isLoading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Generating Script...' : 'Generate Onboarding Script'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                    <Check size={16} />
                    <span>Script Generated Successfully!</span>
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute right-4 top-4 flex gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                      </button>
                    </div>
                    <div className="bg-black rounded-xl p-6 font-mono text-sm text-blue-400 overflow-x-auto max-h-[300px] border border-white/5 shadow-inner">
                      <div className="flex items-center gap-2 mb-4 text-white/40 border-b border-white/5 pb-2">
                        <Terminal size={14} />
                        <span>RouterOS Terminal Script</span>
                      </div>
                      <pre>{script}</pre>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <p className="text-sm text-blue-400 leading-relaxed">
                      <strong>Next Steps:</strong> Paste this script into your MikroTik's New Terminal. Once executed, the router will establish a secure tunnel to Vortex and appear on your dashboard.
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10"
                  >
                    Close & Finish
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
