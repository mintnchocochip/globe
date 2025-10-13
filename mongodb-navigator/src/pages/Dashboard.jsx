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
  const [stats, setStats] = useState({
    databases: 5,
    collections: 23,
    documents: 1234567,
    indexes: 89,
    storageSize: '2.3 GB',
    uptime: '15 days',
    connections: 12,
    opsPerSecond: 450
  });

  const [recentQueries] = useState([
    { id: 1, query: 'db.users.find({status: "active"})', timestamp: '2 min ago', results: 245 },
    { id: 2, query: 'db.orders.aggregate([{$match: {date: {$gte: new Date("2024-01-01")}}}])', timestamp: '5 min ago', results: 1024 },
    { id: 3, query: 'db.products.find({category: "electronics"})', timestamp: '12 min ago', results: 89 },
    { id: 4, query: 'db.logs.find({level: "error"})', timestamp: '1 hour ago', results: 15 },
    { id: 5, query: 'db.sessions.countDocuments({active: true})', timestamp: '2 hours ago', results: 56 }
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your MongoDB instance</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.databases}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.collections}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.documents.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.indexes}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.storageSize}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Server Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{stats.uptime}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.connections}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Ops/Second</p>
              <p className="text-2xl font-bold text-gray-900">{stats.opsPerSecond}</p>
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