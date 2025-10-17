import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

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
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search databases, collections, documents..."
            />
          </div>
        </div>

        {/* Right side - Connection info and actions */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${dot}`}></div>
              <span className="text-sm text-gray-600" title={status.message}>{text}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600">
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

          {/* Notifications */}
          <button className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Profile */}
          <button className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
            <UserCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}