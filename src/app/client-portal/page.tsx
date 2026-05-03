'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Gauge, Smartphone, Power, Settings } from 'lucide-react';

const MOCK_DEVICES = [
  { id: '1', mac: '00:1A:2B:3C:4D:5E', name: 'Living Room TV', isBlocked: false },
  { id: '2', mac: 'AA:BB:CC:DD:EE:FF', name: "Kid's iPad", isBlocked: true },
  { id: '3', mac: '11:22:33:44:55:66', name: 'Kitchen Sonos', isBlocked: false },
];

export default function ClientPortal() {
  const [devices, setDevices] = useState(MOCK_DEVICES);
  const [wifiSsid, setWifiSsid] = useState('MyHomeNetwork_5G');
  const [wifiPass, setWifiPass] = useState('supersecret123');
  const [isEditingWifi, setIsEditingWifi] = useState(false);

  const togglePause = (id: string) => {
    setDevices(devices.map(d => d.id === id ? { ...d, isBlocked: !d.isBlocked } : d));
    // In a real app, call API to trigger Firewall filter rule via Tunnel Controller
  };

  const handleWifiSave = () => {
    setIsEditingWifi(false);
    // Call API to update /interface/wireless/security-profiles or similar
    alert('Wi-Fi settings updating... Your router may restart its wireless interface.');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 md:p-12 font-sans">
      <header className="max-w-4xl mx-auto mb-12 text-center">
        <div className="inline-block p-4 bg-blue-500/10 rounded-full mb-4">
          <Wifi className="text-blue-500 w-12 h-12" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Your Home Network</h1>
        <p className="text-white/40 mt-2 text-lg">Manage your Wi-Fi, run speed tests, and control devices.</p>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Wi-Fi Management Card */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Settings className="text-blue-400" />
            Wi-Fi Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/40 mb-1 uppercase tracking-wider">Network Name (SSID)</label>
              {isEditingWifi ? (
                <input value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white" />
              ) : (
                <div className="text-xl font-medium">{wifiSsid}</div>
              )}
            </div>
            <div>
              <label className="block text-sm text-white/40 mb-1 uppercase tracking-wider">Password</label>
              {isEditingWifi ? (
                <input value={wifiPass} onChange={e => setWifiPass(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white" />
              ) : (
                <div className="text-xl font-medium font-mono text-white/80">••••••••••</div>
              )}
            </div>
            
            <div className="pt-4">
              {isEditingWifi ? (
                <div className="flex gap-3">
                  <button onClick={handleWifiSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors">Save Changes</button>
                  <button onClick={() => setIsEditingWifi(false)} className="px-6 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setIsEditingWifi(true)} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-colors">Edit Settings</button>
              )}
            </div>
          </div>
        </section>

        {/* Speed Test Card */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl flex flex-col justify-center items-center text-center">
          <Gauge className="w-16 h-16 text-emerald-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Network Speed</h2>
          <p className="text-white/40 mb-6">Test the connection directly from your router to the ISP.</p>
          <button className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 rounded-full font-extrabold tracking-wide transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)]">
            RUN SPEED TEST
          </button>
        </section>

        {/* Device Management */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Smartphone className="text-purple-400" />
              Connected Devices
            </h2>
            <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-bold">{devices.length} Devices</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <motion.div layout key={device.id} className={`p-5 rounded-2xl border ${device.isBlocked ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'} flex flex-col justify-between`}>
                <div className="mb-4">
                  <h3 className={`font-bold text-lg ${device.isBlocked ? 'text-red-300' : 'text-white'}`}>{device.name}</h3>
                  <p className="text-xs text-white/30 font-mono mt-1">{device.mac}</p>
                </div>
                
                <button
                  onClick={() => togglePause(device.id)}
                  className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                    device.isBlocked 
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Power size={16} />
                  {device.isBlocked ? 'Unpause Internet' : 'Pause Internet'}
                </button>
              </motion.div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
