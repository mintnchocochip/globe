import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BoltIcon, PlayIcon } from '@heroicons/react/24/outline';

const API_BASE = 'http://127.0.0.1:6969';

export default function AiQueryPage() {
  const [databases, setDatabases] = useState([]);
  const [databasesLoading, setDatabasesLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [metadataError, setMetadataError] = useState(null);

  const [database, setDatabase] = useState('');
  const [collection, setCollection] = useState('');

  const [prompt, setPrompt] = useState('Find products where price > 100 and name contains faizal');
  const [generatedQuery, setGeneratedQuery] = useState(null);
  const [aiMeta, setAiMeta] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        setDatabase((current) => current || dbNames[0] || '');
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
    if (!database) {
      setCollections([]);
      setCollection('');
      return;
    }

    const controller = new AbortController();
    const loadCollections = async () => {
      setCollectionsLoading(true);
      setMetadataError(null);
      try {
        const response = await fetch(`${API_BASE}/collections/${database}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        const names = data?.collections || [];
        setCollections(names);
        setCollection((current) => {
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
        setCollection('');
      } finally {
        setCollectionsLoading(false);
      }
    };

    loadCollections();
    return () => controller.abort();
  }, [database]);

  useEffect(() => {
    setGeneratedQuery(null);
    setAiMeta(null);
    setResults([]);
    setError(null);
  }, [database, collection]);

  async function generate() {
    if (!database || !collection) {
      setError('Select a database and collection first');
      return;
    }
    if (!prompt.trim()) {
      setError('Enter a description of the documents you want');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedQuery(null);
    setResults([]);

    try {
      const res = await fetch(`${API_BASE}/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ database, collection, prompt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setGeneratedQuery(json.query || null);
      setAiMeta({ source: json.source, usedPrompt: json.used_prompt, rawResponse: json.raw_response });
    } catch (err) {
      setError(err.message || 'Failed to generate query');
    } finally {
      setLoading(false);
    }
  }

  async function execute() {
    if (!generatedQuery) return;
    if (!database || !collection) {
      setError('Select a database and collection first');
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ database, collection, query: generatedQuery }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setResults(json.results || []);
    } catch (err) {
      setError(err.message || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Query Builder</h1>
        <p className="text-gray-600 mt-2">Describe the documents you want; the AI augments your prompt with live schema context to generate a MongoDB filter.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BoltIcon className="h-5 w-5 mr-2" />
            AI Query
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Database</label>
              <select
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              >
                <option value="" disabled>Select database</option>
                {databases.map((db) => (
                  <option key={db} value={db}>{db}</option>
                ))}
              </select>
              {databasesLoading && <p className="text-xs text-gray-500 mt-1">Loading databases…</p>}
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Collection</label>
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              >
                <option value="" disabled>Select collection</option>
                {collections.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              {collectionsLoading && <p className="text-xs text-gray-500 mt-1">Loading collections…</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="mt-1 block w-full h-24 border border-gray-300 rounded-md p-2"
                placeholder="e.g. Orders from last 7 days over $100"
              />
            </div>
          </div>

          {metadataError && (
            <div className="text-sm text-red-500">{metadataError}</div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={generate} disabled={loading}>
              <BoltIcon className="h-4 w-4 mr-2" />
              {loading ? 'Working…' : 'Generate Query'}
            </Button>
            <Button onClick={execute} disabled={!generatedQuery || loading} variant="outline">
              <PlayIcon className="h-4 w-4 mr-2" />
              Execute Query
            </Button>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          {aiMeta && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>Source: {aiMeta.source || 'gemini'}</div>
              <div className="truncate" title={aiMeta.usedPrompt}>Prompt sent: {aiMeta.usedPrompt}</div>
            </div>
          )}

          {generatedQuery && (
            <div>
              <h3 className="font-medium">Generated Query</h3>
              <pre className="mt-2 p-3 bg-gray-100 rounded-md overflow-auto text-sm">{JSON.stringify(generatedQuery, null, 2)}</pre>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <h3 className="font-medium">Results ({results.length})</h3>
              <div className="mt-2 space-y-2">
                {results.map((r, i) => (
                  <pre key={r?._id?.$oid || r?._id || i} className="p-3 bg-white border rounded text-sm overflow-auto">{JSON.stringify(r, null, 2)}</pre>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}