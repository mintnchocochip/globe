import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ChartBarIcon, CpuChipIcon, ServerStackIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../components/ui/Button';

const API_BASE = 'http://127.0.0.1:6969';
const POLL_INTERVAL = 5000;
const OPERATION_LABELS = {
  insert: 'Insert',
  query: 'Query',
  update: 'Update',
  delete: 'Delete',
  getmore: 'GetMore',
  command: 'Command',
};

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return 'Unknown';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

function formatMegabytes(value) {
  if (!Number.isFinite(value)) return '0 MB';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;
}

function formatBytesPerSecond(value) {
  if (!Number.isFinite(value)) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let idx = 0;
  let amount = value;
  while (amount >= 1024 && idx < units.length - 1) {
    amount /= 1024;
    idx += 1;
  }
  const digits = idx === 0 ? 0 : 1;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: digits })} ${units[idx]}`;
}

function toTimeLabel(timestamp) {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (err) {
    return timestamp;
  }
}

export default function Stats() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const refreshControllerRef = useRef(null);

  const loadMetrics = useCallback(async (controller) => {
    try {
      const response = await fetch(`${API_BASE}/monitoring`, {
        signal: controller?.signal,
        cache: 'no-store',
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to load monitoring metrics');
      }
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Failed to load monitoring metrics', err);
      setError(err.message || 'Failed to load monitoring metrics');
    }
  }, []);

  useEffect(() => {
    const controllers = new Set();

    const run = async (showSpinner) => {
      const controller = new AbortController();
      controllers.add(controller);
      if (showSpinner) setLoading(true);
      try {
        await loadMetrics(controller);
      } finally {
        controllers.delete(controller);
        if (showSpinner) setLoading(false);
      }
    };

    run(true);

    if (isLive) {
      const interval = setInterval(() => {
        run(false);
      }, POLL_INTERVAL);
      return () => {
        clearInterval(interval);
        controllers.forEach((controller) => controller.abort());
      };
    }

    return () => {
      controllers.forEach((controller) => controller.abort());
    };
  }, [isLive, loadMetrics]);

  useEffect(() => () => {
    if (refreshControllerRef.current) {
      refreshControllerRef.current.abort();
      refreshControllerRef.current = null;
    }
  }, []);

  const operationsHistory = useMemo(() => {
    return (metrics?.operations?.history || []).map((point) => ({
      time: toTimeLabel(point.timestamp),
      value: point.opsPerSecond ?? 0,
    }));
  }, [metrics]);

  const memoryHistory = useMemo(() => {
    return (metrics?.memory?.history || []).map((point) => ({
      time: toTimeLabel(point.timestamp),
      resident: point.residentMb ?? 0,
      cache: point.cacheMb ?? 0,
      virtual: point.virtualMb ?? 0,
    }));
  }, [metrics]);

  const networkHistory = useMemo(() => {
    return (metrics?.network?.history || []).map((point) => ({
      time: toTimeLabel(point.timestamp),
      inPerSec: point.bytesInPerSecond ?? 0,
      outPerSec: point.bytesOutPerSecond ?? 0,
    }));
  }, [metrics]);

  const perOperationBreakdown = useMemo(() => {
    if (!metrics?.operations?.perOperationPerSecond) return [];
    const totals = metrics.operations.totals || {};
    return Object.entries(metrics.operations.perOperationPerSecond).map(([key, rate]) => ({
      operation: OPERATION_LABELS[key] || key,
      rate: rate ?? 0,
      total: totals[key] ?? 0,
    }));
  }, [metrics]);

  const topDatabases = useMemo(() => {
    if (!metrics?.memory?.databases) return [];
    const dbs = [...metrics.memory.databases];
    dbs.sort((a, b) => (b.dataSizeMb || 0) - (a.dataSizeMb || 0));
    return dbs.slice(0, 5);
  }, [metrics]);

  const topCollections = useMemo(() => {
    if (!metrics?.memory?.databases) return [];
    const all = metrics.memory.databases.flatMap((db) => {
      return (db.collections || []).map((collection) => ({
        database: db.name,
        name: collection.name,
        storage: collection.storageSizeMb ?? 0,
        indexes: collection.totalIndexSizeMb ?? 0,
      }));
    });
    all.sort((a, b) => b.storage - a.storage);
    return all.slice(0, 5);
  }, [metrics]);

  const lastUpdated = metrics?.timestamp
    ? new Date(metrics.timestamp).toLocaleString()
    : null;

  const uptime = metrics?.server?.uptimeSeconds
    ? formatDuration(metrics.server.uptimeSeconds)
    : 'Unknown';

  const handleRefresh = useCallback(async () => {
    if (refreshControllerRef.current) {
      refreshControllerRef.current.abort();
    }
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    setLoading(true);
    try {
      await loadMetrics(controller);
    } finally {
      setLoading(false);
      refreshControllerRef.current = null;
    }
  }, [loadMetrics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stats & Monitoring</h1>
          <p className="text-gray-600 mt-2">Live MongoDB performance metrics collected from the connected instance.</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">Last updated {lastUpdated}</p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex h-3 w-3 rounded-full ${isLive ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">{isLive ? 'Live polling' : 'Paused'}</span>
          </div>
          <Button
            variant={isLive ? 'danger' : 'primary'}
            onClick={() => setIsLive((prev) => !prev)}
          >
            {isLive ? 'Pause Live Updates' : 'Resume Live Updates'}
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={handleRefresh}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent>
            <div className="text-red-600 text-sm">{error}</div>
          </CardContent>
        </Card>
      )}

      {loading && !metrics && (
        <Card>
          <CardContent>
            <div className="py-8 flex items-center justify-center text-gray-500 text-sm">
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              Loading monitoring data...
            </div>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card>
              <CardContent>
                <div className="flex items-center">
                  <ServerStackIcon className="h-8 w-8 text-indigo-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Server</p>
                    <p className="text-lg font-semibold text-gray-900">{metrics.server?.host || 'Unknown host'}</p>
                    <p className="text-xs text-gray-500">Uptime {uptime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="flex items-center">
                  <CpuChipIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ops per Second</p>
                    <p className="text-lg font-semibold text-gray-900">{metrics.operations?.currentOpsPerSecond?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}</p>
                    <p className="text-xs text-gray-500">Rolling average over the last sample</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Connections</p>
                    <p className="text-lg font-semibold text-gray-900">{metrics.connections?.current?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-gray-500">{metrics.connections?.available?.toLocaleString() || '0'} available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="flex items-center">
                  <CpuChipIcon className="h-8 w-8 text-amber-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Memory Resident</p>
                    <p className="text-lg font-semibold text-gray-900">{formatMegabytes(metrics.memory?.residentMb || 0)}</p>
                    <p className="text-xs text-gray-500">Cache {formatMegabytes(metrics.memory?.cacheMb || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Operations per Second</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={operationsHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => value?.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                    <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Operation Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={perOperationBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="operation" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => value?.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                    <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  {perOperationBreakdown.map((item) => (
                    <div key={item.operation} className="flex justify-between">
                      <span>{item.operation}</span>
                      <span>{item.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ops/s ({item.total.toLocaleString()} total)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={memoryHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatMegabytes(value)} />
                    <Area type="monotone" dataKey="resident" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
                    <Area type="monotone" dataKey="cache" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                    <Area type="monotone" dataKey="virtual" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-3 text-sm text-gray-600 mt-4">
                  <div>
                    <p className="font-medium text-gray-700">Resident</p>
                    <p>{formatMegabytes(metrics.memory?.residentMb || 0)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Cache</p>
                    <p>{formatMegabytes(metrics.memory?.cacheMb || 0)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Virtual</p>
                    <p>{formatMegabytes(metrics.memory?.virtualMb || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Network Throughput</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={networkHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatBytesPerSecond} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatBytesPerSecond(value)} />
                    <Line type="monotone" dataKey="inPerSec" stroke="#2563eb" strokeWidth={2} dot={false} name="Bytes In" />
                    <Line type="monotone" dataKey="outPerSec" stroke="#ef4444" strokeWidth={2} dot={false} name="Bytes Out" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mt-4">
                  <div>
                    <p className="font-medium text-gray-700">Inbound</p>
                    <p>{formatBytesPerSecond(metrics.network?.bytesInPerSecond || 0)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Outbound</p>
                    <p>{formatBytesPerSecond(metrics.network?.bytesOutPerSecond || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Databases by Data Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-2 pr-4">Database</th>
                        <th className="py-2 pr-4">Data</th>
                        <th className="py-2 pr-4">Indexes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topDatabases.map((db) => (
                        <tr key={db.name}>
                          <td className="py-2 pr-4 font-medium text-gray-800">{db.name}</td>
                          <td className="py-2 pr-4 text-gray-600">{formatMegabytes(db.dataSizeMb || 0)}</td>
                          <td className="py-2 pr-4 text-gray-600">{formatMegabytes(db.indexSizeMb || 0)}</td>
                        </tr>
                      ))}
                      {topDatabases.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-gray-500">No database statistics available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Collections by Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-2 pr-4">Collection</th>
                        <th className="py-2 pr-4">Storage</th>
                        <th className="py-2 pr-4">Indexes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topCollections.map((collection) => (
                        <tr key={`${collection.database}.${collection.name}`}>
                          <td className="py-2 pr-4 font-medium text-gray-800">
                            <span className="text-gray-500">{collection.database}.</span>
                            {collection.name}
                          </td>
                          <td className="py-2 pr-4 text-gray-600">{formatMegabytes(collection.storage)}</td>
                          <td className="py-2 pr-4 text-gray-600">{formatMegabytes(collection.indexes)}</td>
                        </tr>
                      ))}
                      {topCollections.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-gray-500">No collection statistics available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}