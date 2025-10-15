import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  MagnifyingGlassIcon, 
  PlayIcon, 
  DocumentTextIcon,
  AdjustmentsHorizontalIcon 
} from '@heroicons/react/24/outline';

export default function QueryBuilder() {
  const [selectedDatabase, setSelectedDatabase] = useState('ecommerce');
  const [selectedCollection, setSelectedCollection] = useState('products');
  const [queryFields, setQueryFields] = useState([
    { field: '', operator: 'equals', value: '', type: 'string' }
  ]);
  const [queryResults, setQueryResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const databases = ['ecommerce', 'users', 'logs', 'analytics'];
  const collections = {
    ecommerce: ['products', 'orders', 'customers', 'categories'],
    users: ['profiles', 'sessions', 'preferences'],
    logs: ['access_logs', 'error_logs'],
    analytics: ['events', 'metrics', 'reports']
  };

  const fieldTypes = ['string', 'number', 'date', 'boolean', 'object'];
  const operators = {
    string: ['equals', 'contains', 'startsWith', 'endsWith', 'regex'],
    number: ['equals', 'greater', 'less', 'between'],
    date: ['equals', 'after', 'before', 'between'],
    boolean: ['equals'],
    object: ['exists', 'equals']
  };

  const addQueryField = () => {
    setQueryFields([...queryFields, { field: '', operator: 'equals', value: '', type: 'string' }]);
  };

  const removeQueryField = (index) => {
    setQueryFields(queryFields.filter((_, i) => i !== index));
  };

  const updateQueryField = (index, key, value) => {
    const updated = [...queryFields];
    updated[index] = { ...updated[index], [key]: value };
    setQueryFields(updated);
  };

  const buildQuery = () => {
    const query = {};
    queryFields.forEach(field => {
      if (field.field && field.value) {
        switch (field.operator) {
          case 'equals':
            query[field.field] = field.value;
            break;
          case 'contains':
            query[field.field] = { $regex: field.value, $options: 'i' };
            break;
          case 'greater':
            query[field.field] = { $gt: Number(field.value) };
            break;
          case 'less':
            query[field.field] = { $lt: Number(field.value) };
            break;
          // Add more operators as needed
        }
      }
    });
    return query;
  };

  const executeQuery = async () => {
    setIsLoading(true);
    const query = buildQuery();
    try {
      const res = await fetch('http://127.0.0.1:6969/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: selectedCollection, query }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const json = await res.json();
      setQueryResults(json.results || []);
    } catch (err) {
      console.error('Query error', err);
      alert('Query failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Query Builder</h1>
        <p className="text-gray-600 mt-2">Build and execute schema-driven queries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Builder Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Database & Collection Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Target Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database
                  </label>
                  <select
                    value={selectedDatabase}
                    onChange={(e) => setSelectedDatabase(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {databases.map(db => (
                      <option key={db} value={db}>{db}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection
                  </label>
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {collections[selectedDatabase]?.map(collection => (
                      <option key={collection} value={collection}>{collection}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Query Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                  Query Conditions
                </span>
                <Button size="sm" onClick={addQueryField}>Add Field</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queryFields.map((field, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field
                      </label>
                      <input
                        type="text"
                        value={field.field}
                        onChange={(e) => updateQueryField(index, 'field', e.target.value)}
                        placeholder="e.g., name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) => updateQueryField(index, 'type', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {fieldTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Operator
                      </label>
                      <select
                        value={field.operator}
                        onChange={(e) => updateQueryField(index, 'operator', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {operators[field.type]?.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={field.value}
                        onChange={(e) => updateQueryField(index, 'value', e.target.value)}
                        placeholder="Enter value"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="col-span-1">
                      {queryFields.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeQueryField(index)}
                          className="w-full"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Execute Button */}
          <div className="flex justify-end">
            <Button onClick={executeQuery} disabled={isLoading}>
              <PlayIcon className="h-4 w-4 mr-2" />
              {isLoading ? 'Executing...' : 'Execute Query'}
            </Button>
          </div>
        </div>

        {/* Query Preview & Results */}
        <div className="space-y-6">
          {/* Query Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Query Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                {JSON.stringify(buildQuery(), null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Results ({queryResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queryResults.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {queryResults.map((result) => (
                    <div key={result._id} className="bg-gray-50 p-3 rounded-lg">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Execute a query to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}