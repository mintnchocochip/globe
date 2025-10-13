import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ChartBarIcon, CpuChipIcon, ServerIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = {
  operations: [
    { time: '10:00', ops: 450 },
    { time: '10:05', ops: 520 },
    { time: '10:10', ops: 380 },
    { time: '10:15', ops: 670 },
    { time: '10:20', ops: 590 },
    { time: '10:25', ops: 720 },
    { time: '10:30', ops: 480 },
  ],
  memory: [
    { time: '10:00', used: 65, available: 35 },
    { time: '10:05', used: 67, available: 33 },
    { time: '10:10', used: 63, available: 37 },
    { time: '10:15', used: 71, available: 29 },
    { time: '10:20', used: 69, available: 31 },
    { time: '10:25', used: 74, available: 26 },
    { time: '10:30', used: 66, available: 34 },
  ],
  connections: [
    { database: 'ecommerce', active: 45, total: 60 },
    { database: 'users', active: 23, total: 30 },
    { database: 'logs', active: 12, total: 20 },
    { database: 'analytics', active: 8, total: 15 },
    { database: 'sessions', active: 5, total: 10 },
  ]
};

export default function Stats() {
  const [stats, setStats] = useState({
    uptime: '15 days, 6 hours',
    totalConnections: 135,
    activeConnections: 93,
    memoryUsage: 66,
    diskUsage: 78,
    opsPerSecond: 480,
    networkin: '1.2 MB/s',
    networkOut: '850 KB/s'
  });

  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        // Simulate live data updates
        setStats(prev => ({
          ...prev,
          opsPerSecond: Math.floor(Math.random() * 200) + 400,
          activeConnections: Math.floor(Math.random() * 20) + 85,
          memoryUsage: Math.floor(Math.random() * 10) + 60
        }));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stats & Monitoring</h1>
          <p className="text-gray-600 mt-2">Real-time MongoDB performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isLive ? 'Live' : 'Paused'}
            </span>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLive 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isLive ? 'Stop Live Updates' : 'Start Live Updates'}
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center">
              <ServerIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Server Uptime</p>
                <p className="text-lg font-bold text-gray-900">{stats.uptime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <CpuChipIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ops/Second</p>
                <p className="text-lg font-bold text-gray-900">{stats.opsPerSecond}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-lg font-bold text-gray-900">{stats.activeConnections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 rounded-full h-2 transition-all duration-300"
                    style={{ width: `${stats.memoryUsage}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-gray-900 mt-1">{stats.memoryUsage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operations Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Operations per Second</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData.operations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ops" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Memory Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Memory Usage (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockData.memory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="used" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="available" stackId="1" stroke="#10b981" fill="#10b981" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Connections by Database */}
      <Card>
        <CardHeader>
          <CardTitle>Connections by Database</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData.connections}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="database" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="active" fill="#4f46e5" />
              <Bar dataKey="total" fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Disk Usage</p>
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 rounded-full h-2"
                    style={{ width: `${stats.diskUsage}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-gray-900 mt-1">{stats.diskUsage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Network In</p>
              <p className="text-lg font-bold text-gray-900">{stats.networkin}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Network Out</p>
              <p className="text-lg font-bold text-gray-900">{stats.networkOut}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}