import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  MagnifyingGlassIcon,
  PlayIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const API_BASE = 'http://127.0.0.1:6969';

export default function QueryBuilder() {
  const [databases, setDatabases] = useState([]);
  const [databasesLoading, setDatabasesLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [metadataError, setMetadataError] = useState(null);

  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');

  const [queryFields, setQueryFields] = useState([
    { field: '', operator: 'equals', value: '', type: 'string' }
  ]);
  const [queryResults, setQueryResults] = useState([]);
  const [queryError, setQueryError] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState(null);
  const [aiMeta, setAiMeta] = useState(null);
  const [aiError, setAiError] = useState(null);

  const fieldTypes = ['string', 'number', 'date', 'boolean', 'object'];
  const operators = {
    string: ['equals', 'contains', 'startsWith', 'endsWith', 'regex'],
    number: ['equals', 'greater', 'less'],
    date: ['equals'],
    boolean: ['equals'],
    object: ['exists', 'equals'],
  };

  useEffect(() => {
    const loadDatabases = async () => {
      setDatabasesLoading(true);
      setMetadataError(null);
      try {
        const response = await fetch(`${API_BASE}/databases`);
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        const dbNames = (data || []).map((db) => db.name || db);
        setDatabases(dbNames);
        setSelectedDatabase((current) => current || dbNames[0] || '');
      } catch (err) {
        console.error('load databases', err);
        setMetadataError('Failed to load databases');
      } finally {
        setDatabasesLoading(false);
      }
    };

    loadDatabases();
  }, []);

  useEffect(() => {
    if (!selectedDatabase) {
      setCollections([]);
      setSelectedCollection('');
      setCollectionsLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadCollections = async () => {
      setCollectionsLoading(true);
      setMetadataError(null);
      try {
        const response = await fetch(`${API_BASE}/collections/${selectedDatabase}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        const names = data?.collections || [];
        setCollections(names);
        setSelectedCollection((current) => {
          if (current && names.includes(current)) {
            return current;
          }
          return names[0] || '';
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('load collections', err);
        setMetadataError('Failed to load collections');
        setCollections([]);
        setSelectedCollection('');
      } finally {
        setCollectionsLoading(false);
      }
    };

    loadCollections();
    return () => controller.abort();
  }, [selectedDatabase]);

  useEffect(() => {
    setAiQuery(null);
    setAiMeta(null);
    setAiError(null);
    setQueryResults([]);
    setLastRun(null);
    setQueryError(null);
  }, [selectedDatabase, selectedCollection]);

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

  const manualQuery = useMemo(() => {
    const query = {};
    queryFields.forEach(field => {
      if (!field.field || field.value === '') return;
      const coerceValue = () => {
        if (field.type === 'number') {
          const parsed = Number(field.value);
          return Number.isNaN(parsed) ? field.value : parsed;
        }
        if (field.type === 'boolean') {
          const lower = String(field.value).toLowerCase();
          if (lower === 'true') return true;
          if (lower === 'false') return false;
        }
        return field.value;
      };
      switch (field.operator) {
        case 'equals':
          query[field.field] = coerceValue();
          break;
        case 'contains':
          query[field.field] = { $regex: field.value, $options: 'i' };
          break;
        case 'greater':
          {
            const parsed = Number(field.value);
            if (!Number.isNaN(parsed)) {
              query[field.field] = { $gt: parsed };
            }
          }
          break;
        case 'less':
          {
            const parsed = Number(field.value);
            if (!Number.isNaN(parsed)) {
              query[field.field] = { $lt: parsed };
            }
          }
          break;
        case 'startsWith':
          query[field.field] = { $regex: `^${field.value}`, $options: 'i' };
          break;
        case 'endsWith':
          query[field.field] = { $regex: `${field.value}$`, $options: 'i' };
          break;
        case 'regex':
          query[field.field] = { $regex: field.value };
          break;
        case 'exists':
          query[field.field] = { $exists: true };
          break;
        default:
          break;
      }
    });
    return query;
  }, [queryFields]);

  const executeQuery = async (query, source) => {
    if (!selectedDatabase || !selectedCollection) {
      setQueryError('Select a database and collection first');
      return;
    }
    setIsLoading(true);
    setQueryError(null);
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: selectedDatabase,
          collection: selectedCollection,
          query: query || {},
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const json = await res.json();
      setQueryResults(json.results || []);
      setLastRun({ source, query: query || {} });
    } catch (err) {
      console.error('query error', err);
      setQueryError(err.message || 'Query failed');
    } finally {
      setIsLoading(false);
    }
  };

  const runManualQuery = () => {
    executeQuery(manualQuery, 'manual');
  };

  const requestAiQuery = async () => {
    if (!selectedDatabase || !selectedCollection) {
      setAiError('Select a database and collection first');
      return;
    }
    if (!aiPrompt.trim()) {
      setAiError('Describe what you want to find');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`${API_BASE}/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: selectedDatabase,
          collection: selectedCollection,
          prompt: aiPrompt,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const data = await res.json();
      setAiQuery(data.query || null);
      setAiMeta({
        source: data.source,
        usedPrompt: data.used_prompt,
        rawResponse: data.raw_response,
      });
    } catch (err) {
      console.error('ai query', err);
      setAiQuery(null);
      setAiMeta(null);
      setAiError(err.message || 'Failed to generate query');
    } finally {
      setAiLoading(false);
    }
  };

  const runAiQuery = () => {
    if (!aiQuery) {
      setAiError('Generate a query first');
      return;
    }
    executeQuery(aiQuery, 'ai');
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
                    <option value="" disabled>Select a database</option>
                    {databases.map((db) => (
                      <option key={db} value={db}>{db}</option>
                    ))}
                  </select>
                  {databasesLoading && (
                    <p className="text-xs text-gray-500 mt-1">Loading databases…</p>
                  )}
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
                    <option value="" disabled>Select a collection</option>
                    {collections.map((collection) => (
                      <option key={collection} value={collection}>{collection}</option>
                    ))}
                  </select>
                  {collectionsLoading && (
                    <p className="text-xs text-gray-500 mt-1">Loading collections…</p>
                  )}
                  {metadataError && (
                    <p className="text-xs text-red-500 mt-1">{metadataError}</p>
                  )}
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
            <Button onClick={runManualQuery} disabled={isLoading}>
              <PlayIcon className="h-4 w-4 mr-2" />
              {isLoading ? 'Running…' : 'Run Manual Query'}
            </Button>
          </div>
        </div>

        {/* Query Preview & Results */}
        <div className="space-y-6">
          {/* AI Assistant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe the documents you want
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={4}
                  placeholder="e.g. Orders created in the last week with total over 100"
                  value={aiPrompt}
                  onChange={(e) => {
                    setAiPrompt(e.target.value);
                    if (aiError) setAiError(null);
                  }}
                />
                {aiError && (
                  <p className="text-xs text-red-500 mt-1">{aiError}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={requestAiQuery} disabled={aiLoading}>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  {aiLoading ? 'Generating…' : 'Generate Query'}
                </Button>
                <Button variant="outline" onClick={runAiQuery} disabled={!aiQuery || isLoading}>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {isLoading ? 'Running…' : 'Run AI Query'}
                </Button>
              </div>
              {aiMeta && (
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Source: {aiMeta.source || 'gemini'}</div>
                  <div className="truncate" title={aiMeta.usedPrompt}>
                    Prompt sent: {aiMeta.usedPrompt}
                  </div>
                </div>
              )}
              {aiQuery && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Generated Filter</div>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                    {JSON.stringify(aiQuery, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Query Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Query Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                {JSON.stringify(manualQuery, null, 2)}
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
              {queryError && (
                <p className="text-sm text-red-500 mb-3">{queryError}</p>
              )}
              {lastRun && (
                <p className="text-xs text-gray-500 mb-3">
                  Last run: {lastRun.source === 'ai' ? 'AI assistant' : 'Manual builder'} query
                </p>
              )}
              {queryResults.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {queryResults.map((result, idx) => {
                    const key = result?._id?.$oid || result?._id || idx;
                    return (
                      <div key={key} className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-sm font-mono whitespace-pre-wrap">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    );
                  })}
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