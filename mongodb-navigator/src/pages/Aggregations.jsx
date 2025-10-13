import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FunnelIcon } from '@heroicons/react/24/outline';

export default function Aggregations() {
  const [mode, setMode] = useState('json');
  const [jsonQuery, setJsonQuery] = useState(`[
  {
    "$match": {
      "status": "active"
    }
  },
  {
    "$group": {
      "_id": "$category",
      "count": { "$sum": 1 },
      "avgPrice": { "$avg": "$price" }
    }
  }
]`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Aggregations</h1>
        <p className="text-gray-600 mt-2">Build MongoDB aggregation pipelines</p>
      </div>
      
      <div className="flex space-x-4">
        <Button 
          variant={mode === 'json' ? 'primary' : 'outline'}
          onClick={() => setMode('json')}
        >
          JSON Editor
        </Button>
        <Button 
          variant={mode === 'visual' ? 'primary' : 'outline'}
          onClick={() => setMode('visual')}
        >
          Visual Builder
        </Button>
      </div>

      {mode === 'json' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2" />
              Aggregation Pipeline (JSON)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={jsonQuery}
              onChange={(e) => setJsonQuery(e.target.value)}
              className="w-full h-64 font-mono text-sm border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your aggregation pipeline..."
            />
            <div className="mt-4 flex justify-end">
              <Button>Execute Pipeline</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500">Visual Pipeline Builder - Coming soon!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}