import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BoltIcon } from '@heroicons/react/24/outline';

export default function AiQueryPage() {
  const [collection, setCollection] = useState('products');
  const [prompt, setPrompt] = useState('Find products where price > 100 and name contains faizal');
  const [generatedQuery, setGeneratedQuery] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setGeneratedQuery(null);
    setResults(null);

    try {
      const res = await fetch('http://127.0.0.1:6969/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, prompt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setGeneratedQuery(json.query);
    } catch (err) {
      setError(err.message || 'Failed to generate query');
    } finally {
      setLoading(false);
    }
  }

  async function execute() {
    if (!generatedQuery) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch('http://127.0.0.1:6969/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, query: generatedQuery }),
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
        <p className="text-gray-600 mt-2">Type a natural language prompt and let the AI generate a MongoDB query.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BoltIcon className="h-5 w-5 mr-2" />
            AI Query
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Collection</label>
              <input value={collection} onChange={(e) => setCollection(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Prompt</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-1 block w-full h-24 border border-gray-300 rounded-md p-2" />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={generate} disabled={loading}>Generate Query</Button>
            <Button onClick={execute} disabled={!generatedQuery || loading} variant="outline">Execute Query</Button>
          </div>

          {loading && <div className="mt-4 text-gray-500">Working...</div>}
          {error && <div className="mt-4 text-red-500">{error}</div>}

          {generatedQuery && (
            <div className="mt-4">
              <h3 className="font-medium">Generated Query</h3>
              <pre className="mt-2 p-3 bg-gray-100 rounded-md overflow-auto text-sm">{JSON.stringify(generatedQuery, null, 2)}</pre>
            </div>
          )}

          {results && (
            <div className="mt-4">
              <h3 className="font-medium">Results ({results.length})</h3>
              <div className="mt-2 space-y-2">
                {results.map((r, i) => (
                  <pre key={i} className="p-3 bg-white border rounded text-sm overflow-auto">{JSON.stringify(r, null, 2)}</pre>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}