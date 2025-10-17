import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Cog6ToothIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';

export default function Settings() {
  const [settings, setSettings] = useState({
    connectionString: 'mongodb://localhost:27017',
    database: 'admin',
    authEnabled: false,
    username: '',
    password: '',
    darkMode: false,
    autoRefresh: true,
    refreshInterval: 5,
    maxResults: 100,
    enableNotifications: true
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    // Simulate saving settings
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your globe🌏 preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Connection Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connection String
              </label>
              <input
                type="text"
                value={settings.connectionString}
                onChange={(e) => handleSettingChange('connectionString', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="mongodb://localhost:27017"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Database
              </label>
              <input
                type="text"
                value={settings.database}
                onChange={(e) => handleSettingChange('database', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="admin"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="authEnabled"
                checked={settings.authEnabled}
                onChange={(e) => handleSettingChange('authEnabled', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="authEnabled" className="ml-2 block text-sm text-gray-900">
                Enable Authentication
              </label>
            </div>

            {settings.authEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={settings.username}
                    onChange={(e) => handleSettingChange('username', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={settings.password}
                    onChange={(e) => handleSettingChange('password', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* UI Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>UI Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Dark Mode
                </label>
                <p className="text-sm text-gray-600">Switch between light and dark themes</p>
              </div>
              <button
                onClick={() => handleSettingChange('darkMode', !settings.darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.darkMode ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Auto Refresh
                </label>
                <p className="text-sm text-gray-600">Automatically refresh data</p>
              </div>
              <button
                onClick={() => handleSettingChange('autoRefresh', !settings.autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoRefresh ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.autoRefresh && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refresh Interval (seconds)
                </label>
                <select
                  value={settings.refreshInterval}
                  onChange={(e) => handleSettingChange('refreshInterval', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={1}>1 second</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Results per Query
              </label>
              <input
                type="number"
                value={settings.maxResults}
                onChange={(e) => handleSettingChange('maxResults', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min="10"
                max="1000"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableNotifications"
                checked={settings.enableNotifications}
                onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="enableNotifications" className="ml-2 block text-sm text-gray-900">
                Enable Notifications
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings}>
          Save Settings
        </Button>
      </div>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About globe🌏</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Version Information</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Version: 1.0.0</p>
                <p>Build: 2024.10.01</p>
                <p>Node.js: {typeof window !== 'undefined' ? 'Browser' : 'N/A'}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Features</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Database & Collection Explorer</li>
                <li>• Dynamic Query Builder</li>
                <li>• Aggregation Pipeline Builder</li>
                <li>• Real-time Monitoring</li>
                <li>• Schema Management</li>
                <li>• Export Capabilities</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}