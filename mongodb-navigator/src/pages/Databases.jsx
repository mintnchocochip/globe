import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  CircleStackIcon, 
  EyeIcon, 
  InformationCircleIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';

export default function Databases() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);

  useEffect(() => {
    async function fetchDBs() {
      setLoading(true);
      try {
        const res = await fetch('http://127.0.0.1:6969/databases');
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setDatabases(json || []);
      } catch (err) {
        console.error('Failed to fetch databases', err);
        setError(err.message || 'Failed to fetch databases');
      } finally {
        setLoading(false);
      }
    }
    fetchDBs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Databases</h1>
        <p className="text-gray-600 mt-2">Browse and manage your MongoDB databases</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CircleStackIcon className="h-5 w-5 mr-2" />
                Database List ({databases.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading && <div className="text-gray-500">Loading...</div>}
                {error && <div className="text-red-500">{error}</div>}
                {!loading && !error && databases.map((db) => {
                  const name = db.name || db["name"];
                  const collections = db.collections ?? db["collections"] ?? (db.stats && db.stats.collections) ?? 0;
                  const documents = db.documents ?? db["documents"] ?? (db.stats && db.stats.objects) ?? 0;
                  const size = db.storageSize ?? db["storageSize"] ?? 'N/A';
                  return (
                    <div 
                      key={name}
                      className={`border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedDatabase?.name === name ? 'ring-2 ring-indigo-500 border-indigo-500' : 'hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDatabase({ name, collections, documents, size })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">{name}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">{collections}</span> collections
                            </div>
                            <div>
                              <span className="font-medium">{Number(documents).toLocaleString()}</span> docs
                            </div>
                            <div>
                              <span className="font-medium">{size}</span> size
                            </div>
                            <div>
                              Updated N/A
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button size="sm" variant="outline">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <ChartBarIcon className="h-4 w-4 mr-1" />
                            Stats
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Database Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                Database Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDatabase ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedDatabase.name}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collections:</span>
                      <span className="font-medium">{selectedDatabase.collections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Documents:</span>
                      <span className="font-medium">{Number(selectedDatabase.documents).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage Size:</span>
                      <span className="font-medium">{selectedDatabase.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Modified:</span>
                      <span className="font-medium">N/A</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="space-y-2">
                      <Button className="w-full" size="sm">
                        Browse Collections
                      </Button>
                      <Button variant="outline" className="w-full" size="sm">
                        Export Database
                      </Button>
                      <Button variant="outline" className="w-full" size="sm">
                        View Indexes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <CircleStackIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a database to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}