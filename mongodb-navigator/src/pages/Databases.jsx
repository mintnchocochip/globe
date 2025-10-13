import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  CircleStackIcon, 
  EyeIcon, 
  InformationCircleIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';

export default function Databases() {
  const [databases] = useState([
    { 
      name: 'ecommerce', 
      collections: 8, 
      size: '1.2 GB', 
      documents: 845230,
      lastModified: '2 hours ago'
    },
    { 
      name: 'users', 
      collections: 3, 
      size: '256 MB', 
      documents: 12450,
      lastModified: '5 minutes ago'
    },
    { 
      name: 'logs', 
      collections: 2, 
      size: '4.8 GB', 
      documents: 2845671,
      lastModified: '1 minute ago'
    },
    { 
      name: 'analytics', 
      collections: 5, 
      size: '890 MB', 
      documents: 156782,
      lastModified: '1 day ago'
    },
    { 
      name: 'sessions', 
      collections: 1, 
      size: '45 MB', 
      documents: 8934,
      lastModified: '3 hours ago'
    }
  ]);

  const [selectedDatabase, setSelectedDatabase] = useState(null);

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
                {databases.map((db) => (
                  <div 
                    key={db.name}
                    className={`border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedDatabase?.name === db.name ? 'ring-2 ring-indigo-500 border-indigo-500' : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDatabase(db)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{db.name}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">{db.collections}</span> collections
                          </div>
                          <div>
                            <span className="font-medium">{db.documents.toLocaleString()}</span> docs
                          </div>
                          <div>
                            <span className="font-medium">{db.size}</span> size
                          </div>
                          <div>
                            Updated {db.lastModified}
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
                ))}
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
                      <span className="font-medium">{selectedDatabase.documents.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage Size:</span>
                      <span className="font-medium">{selectedDatabase.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Modified:</span>
                      <span className="font-medium">{selectedDatabase.lastModified}</span>
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