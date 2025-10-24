import { useEffect, useState } from 'react';

export default function Topbar({ overview }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState({ state: 'loading', message: 'Checking backend…' });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        const response = await fetch('http://127.0.0.1:6969/status', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const text = await response.text();
        if (isMounted) {
          setStatus({ state: 'connected', message: text || 'MongoDB is up' });
        }
      } catch (err) {
        if (!isMounted || err.name === 'AbortError') return;
        setStatus({ state: 'error', message: err.message || 'Unable to reach backend' });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const statusStyles = {
    connected: { dot: 'bg-green-400', text: 'Connected' },
    loading: { dot: 'bg-yellow-400 animate-pulse', text: 'Checking…' },
    error: { dot: 'bg-red-400', text: 'Disconnected' },
  };

  const { dot, text } = statusStyles[status.state] || statusStyles.loading;

  const formatCount = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        {/* Right side - Connection info and actions */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${dot}`}></div>
              <span className="text-sm text-gray-600 transition-colors dark:text-slate-300" title={status.message}>{text}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600 transition-colors dark:text-slate-300">
            <div>
              <span className="font-semibold">{formatCount(overview?.totals?.databases)}</span> DBs
            </div>
            <div>
              <span className="font-semibold">{formatCount(overview?.totals?.collections)}</span> Collections
            </div>
            <div>
              <span className="font-semibold">{formatCount(overview?.totals?.documents)}</span> Documents
            </div>
          </div>

          
        </div>
      </div>
    </header>
  );
}