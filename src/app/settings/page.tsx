'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    timezone: 'UTC',
    language: 'en',
    defaultVpnConnection: 'webrtc',
    theme: 'dark'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const savedSettings = localStorage.getItem('user_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('user_settings', JSON.stringify(settings));
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Failed to save settings. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-gray-400">Configure your preferences and settings</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">General Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                <select 
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Timezone</label>
                <select 
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Amsterdam">Amsterdam</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Website Theme</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={settings.theme === 'dark'}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-white">Dark Theme</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={settings.theme === 'light'}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-white">Light Theme</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Network Settings</h2>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Default VPN Connection</label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="vpnConnection"
                    value="webrtc"
                    checked={settings.defaultVpnConnection === 'webrtc'}
                    onChange={(e) => handleSettingChange('defaultVpnConnection', e.target.value)}
                    className="text-blue-600"
                  />
                  <div>
                    <span className="text-white font-medium">WebRTC</span>
                    <p className="text-sm text-gray-400">Browser-based connection (Recommended)</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="vpnConnection"
                    value="wireguard"
                    checked={settings.defaultVpnConnection === 'wireguard'}
                    onChange={(e) => handleSettingChange('defaultVpnConnection', e.target.value)}
                    className="text-blue-600"
                  />
                  <div>
                    <span className="text-white font-medium">WireGuard</span>
                    <p className="text-sm text-gray-400">Traditional VPN tunnel</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Save Changes</h3>
                <p className="text-gray-400 text-sm">Changes will be applied immediately</p>
              </div>
              <div className="flex items-center space-x-4">
                {saveMessage && (
                  <span className={saveMessage.includes('successfully') ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
                    {saveMessage}
                  </span>
                )}
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-2 px-6 rounded-md transition-colors flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Settings</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
