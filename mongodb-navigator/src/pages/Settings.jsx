import { useEffect, useState } from 'react';
import { Cog6ToothIcon, KeyIcon, MoonIcon, ShieldCheckIcon, SunIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { applyTheme, getStoredTheme, persistTheme } from '../utils/theme';

const API_BASE = 'http://127.0.0.1:6969';

const fieldClasses =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400';

export default function Settings() {
  const [connectionInfo, setConnectionInfo] = useState({
    connectionString: '',
    shortenedConnectionString: '',
    authEnabledDefault: true,
    hasGeminiKey: false,
  });
  const [authEnforced, setAuthEnforced] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => getStoredTheme());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/settings`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();

        if (isMounted) {
          setConnectionInfo({
            connectionString: data.connectionString,
            shortenedConnectionString: data.shortenedConnectionString,
            authEnabledDefault: data.authEnabledDefault,
            hasGeminiKey: data.hasGeminiKey,
          });
          setAuthEnforced(Boolean(data.authEnabledDefault));
          setError('');
        }
      } catch (err) {
        if (isMounted && err.name !== 'AbortError') {
          setError(err.message || 'Unable to load settings');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    applyTheme(isDarkMode);
    persistTheme(isDarkMode);
  }, [isDarkMode]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          geminiApiKey: geminiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      setSaveMessage('Settings saved successfully. Gemini key is now registered for this session.');
      setGeminiKey('');
      setConnectionInfo((prev) => ({
        ...prev,
        hasGeminiKey: Boolean(data.hasGeminiKey),
      }));
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const connectionStringDisplay =
    connectionInfo.connectionString || (isLoading ? 'Loading connection string…' : 'Not available');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 transition-colors dark:text-white">Settings</h1>
        <p className="mt-2 text-gray-600 transition-colors dark:text-slate-300">
          Manage environment-backed configuration and runtime preferences for globe🌏.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition-colors dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 transition-colors dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cog6ToothIcon className="mr-2 h-5 w-5" />
              Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 transition-colors dark:text-slate-300">
                Active Connection String
              </label>
              <input
                type="text"
                value={connectionStringDisplay}
                readOnly
                className={`${fieldClasses} cursor-not-allowed opacity-75`}
              />
              {connectionInfo.shortenedConnectionString && (
                <p className="mt-1 text-xs text-gray-500 transition-colors dark:text-slate-400">
                  Preview: {connectionInfo.shortenedConnectionString}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 transition-colors dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200">
              The connection string is sourced from the `MONGODB_URI` environment variable loaded at startup.
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 transition-colors dark:border-slate-700">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 transition-colors dark:text-slate-100">
                    Authentication Enforced
                  </p>
                  <p className="text-xs text-gray-600 transition-colors dark:text-slate-400">
                    New sessions require credentials by default.
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                authEnforced
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
              }`}>
                {authEnforced ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <KeyIcon className="mr-2 h-5 w-5" />
              Gemini API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 transition-colors dark:text-slate-300">
                Enter Gemini API key
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(event) => setGeminiKey(event.target.value)}
                className={fieldClasses}
                placeholder={connectionInfo.hasGeminiKey ? '••••••••••••••••' : 'AI token starts with AIza...'}
              />
            </div>

            <p className="text-xs text-gray-500 transition-colors dark:text-slate-400">
              Keys are stored in-memory for the running server process. Restarting will require re-entry unless the
              `GEMINI_API_KEY` environment variable is set.
            </p>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 transition-colors dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-gray-900 transition-colors dark:text-slate-100">
                  Status
                </p>
                <p className="text-xs text-gray-600 transition-colors dark:text-slate-400">
                  {connectionInfo.hasGeminiKey ? 'Requests can use Gemini right away.' : 'AI features require a valid Gemini key.'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                connectionInfo.hasGeminiKey
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
              }`}>
                {connectionInfo.hasGeminiKey ? 'Configured' : 'Missing'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {isDarkMode ? <MoonIcon className="mr-2 h-5 w-5" /> : <SunIcon className="mr-2 h-5 w-5" />}
              Interface Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 transition-colors dark:text-slate-100">
                  Dark mode
                </p>
                <p className="text-xs text-gray-600 transition-colors dark:text-slate-400">
                  Applies immediately and persists in this browser.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDarkMode((value) => !value)}
                className={`relative inline-flex h-6 w-12 items-center rounded-full border transition-colors ${
                  isDarkMode
                    ? 'border-indigo-500 bg-indigo-600'
                    : 'border-gray-300 bg-gray-200 dark:border-slate-600 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-700 transition-transform dark:bg-slate-100 ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                >
                  {isDarkMode ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}