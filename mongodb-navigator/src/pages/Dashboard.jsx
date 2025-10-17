import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  CircleStackIcon, 
  RectangleGroupIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  ClockIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [recentQueries] = useState([
    { id: 1, query: 'db.users.find({status: "active"})', timestamp: '2 min ago', results: 245 },
    { id: 2, query: 'db.orders.aggregate([{$match: {date: {$gte: new Date("2024-01-01")}}}])', timestamp: '5 min ago', results: 1024 },
    { id: 3, query: 'db.products.find({category: "electronics"})', timestamp: '12 min ago', results: 89 },
    { id: 4, query: 'db.logs.find({level: "error"})', timestamp: '1 hour ago', results: 15 },
    { id: 5, query: 'db.sessions.countDocuments({active: true})', timestamp: '2 hours ago', results: 56 }
  ]);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const response = await fetch('http://127.0.0.1:6969/dashboard');
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const json = await response.json();
        if (!isMounted) {
          return;
        }
        setStats(json);
        setError(null);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to load dashboard stats', err);
        setError(err.message || 'Unable to load dashboard stats');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const totals = stats?.totals ?? {};
  const server = stats?.server ?? {};
  const placeholder = loading ? '…' : '—';

  const formatCount = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : placeholder;

  const formatBytes = (bytes) => {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
      return placeholder;
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    const decimals = exponent === 0 ? 0 : 1;
    return `${value.toFixed(decimals)} ${units[exponent]}`;
  };

  const formatUptime = (seconds) => {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
      return placeholder;
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${Math.floor(seconds)}s`;
  };

  const formatOps = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return placeholder;
    }
    return value.toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your MongoDB instance</p>
        {stats?.connectedTo && (
          <p className="text-sm text-gray-500 mt-1">Connected to {stats.connectedTo}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CircleStackIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Databases</p>
                <p className="text-2xl font-bold text-gray-900">{formatCount(totals.databases)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <RectangleGroupIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Collections</p>
                <p className="text-2xl font-bold text-gray-900">{formatCount(totals.collections)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-gray-900">{formatCount(totals.documents)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MagnifyingGlassIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Indexes</p>
                <p className="text-2xl font-bold text-gray-900">{formatCount(totals.indexes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Storage Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(totals.storageSizeBytes)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Server Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{formatUptime(server.uptimeSeconds)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-gray-900">{formatCount(server.connectionsCurrent)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Ops/Second</p>
              <p className="text-2xl font-bold text-gray-900">{formatOps(server.opsPerSecond)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Queries Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Recent Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentQueries.map((query) => (
              <div key={query.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-800 block mb-2">
                      {query.query}
                    </code>
                    <div className="flex items-center text-sm text-gray-600">
                      <span>{query.timestamp}</span>
                      <span className="mx-2">•</span>
                      <span>{query.results} results</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="ml-4">
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Re-run
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}