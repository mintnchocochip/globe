import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Collections() {
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedColl, setSelectedColl] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [fieldsPreview, setFieldsPreview] = useState([]);
  const [sampleSize, setSampleSize] = useState('50');
  const [filterString, setFilterString] = useState('');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [showStatsCard, setShowStatsCard] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newDocText, setNewDocText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('http://127.0.0.1:6969/databases')
      .then(r => r.json())
      .then(j => setDatabases(j))
      .catch(e => console.error('fetch databases', e));
  }, []);

  useEffect(() => {
    if (!selectedDb) return;
    fetch(`http://127.0.0.1:6969/collections/${selectedDb}`)
      .then(r => r.json())
      .then(j => setCollections(j.collections || []))
      .catch(e => console.error('fetch collections', e));
  }, [selectedDb]);

  useEffect(() => {
    if (!selectedDb || !selectedColl) return;
    const parsedSample = parseInt(sampleSize, 10);
    const limit = Number.isFinite(parsedSample) && parsedSample > 0 ? parsedSample : 50;
    const filterParam = filterString ? `&filter=${encodeURIComponent(filterString)}` : '';
    fetch(`http://127.0.0.1:6969/collections/${selectedDb}/${selectedColl}?limit=${limit}${filterParam}`)
      .then(r => r.json())
      .then(j => {
        const docs = j.documents || [];
        setDocuments(docs);
        const samples = {};
        for (const d of docs) {
          if (d && typeof d === 'object') {
            Object.keys(d).forEach(k => {
              if (!(k in samples)) samples[k] = d[k];
            });
          }
        }
        const fields = Object.keys(samples).map(k => ({ key: k, sample: samples[k] }));
        setFieldsPreview(fields);
      })
      .catch(e => console.error('fetch documents', e));
  }, [selectedDb, selectedColl, sampleSize, filterString, refreshKey]);

  const handleDelete = async (doc) => {
    const idField = doc._id;
    let idVal = null;
    if (idField && typeof idField === 'object' && idField.$oid) idVal = idField.$oid;
    else if (typeof idField === 'string') idVal = idField;
    if (!idVal) {
      console.error('cannot determine _id to delete');
      return;
    }
    const res = await fetch(`http://127.0.0.1:6969/documents/${selectedDb}/${selectedColl}/${idVal}`, { method: 'DELETE' });
    if (res.ok) {
      setRefreshKey(k => k + 1);
    } else {
      console.error('delete failed', await res.text());
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h1 className="text-2xl font-bold">Databases</h1>
          <div className="mt-4 space-y-2">
            {databases.map((db) => (
              <Card key={db.name} className={`p-3 ${selectedDb === db.name ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{db.name}</div>
                    <div className="text-sm text-gray-500">{db.collections} collections • {db.documents} docs</div>
                  </div>
                  <div>
                    <Button onClick={() => { setSelectedDb(db.name); setSelectedColl(null); setDocuments([]); }}>Open</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Collections{selectedDb ? ` — ${selectedDb}` : ''}</h1>
          <div className="mt-4 space-y-2">
            {collections.map((c) => (
              <Card key={c} className={`p-3 ${selectedColl === c ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="flex justify-between items-center">
                  <div className="font-medium">{c}</div>
                  <div>
                    <Button onClick={() => { setSelectedColl(c); }}>Open</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Documents{selectedColl ? ` — ${selectedColl}` : ''}</h1>
        <div className="mt-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sample size:</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-20 border rounded px-2 py-1"
                value={sampleSize}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    const sanitized = value.replace(/^0+(?=\d)/, '');
                    setSampleSize(sanitized === '0' ? '' : sanitized);
                  }
                }}
                onBlur={() => {
                  if (!sampleSize) {
                    setSampleSize('50');
                  }
                }}
              />
              <Button onClick={() => { setSampleSize('50'); }}>Reset Size</Button>
              <Button onClick={() => { setFilterString(''); setStats(null); }}>Clear filter</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={async () => {
                if (!selectedDb || !selectedColl) return;
                const parsedSample = parseInt(sampleSize, 10);
                const sampleParam = Number.isFinite(parsedSample) && parsedSample > 0 ? parsedSample : 50;
                setStatsLoading(true);
                setStatsError(null);
                setShowStatsCard(true);
                try {
                  const response = await fetch(`http://127.0.0.1:6969/collections/${selectedDb}/${selectedColl}/stats?sample=${sampleParam}`);
                  if (!response.ok) {
                    throw new Error(await response.text());
                  }
                  const data = await response.json();
                  setStats(data);
                } catch (err) {
                  console.error('fetch stats', err);
                  setStatsError(err.message || 'Failed to load stats');
                  setStats(null);
                } finally {
                  setStatsLoading(false);
                }
              }}>Stats</Button>
              <Button onClick={() => setShowCreate(s => !s)}>{showCreate ? 'Close' : 'Create'}</Button>
            </div>
          </div>

          {showCreate && (
            <Card className="p-3">
              <div className="mb-2">Create a new document (JSON):</div>
              <textarea rows={6} className="w-full border rounded p-2" value={newDocText} onChange={e => setNewDocText(e.target.value)} />
              <div className="mt-2">
                <Button onClick={async () => {
                  try {
                    const parsed = JSON.parse(newDocText);
                    const res = await fetch(`http://127.0.0.1:6969/documents/${selectedDb}/${selectedColl}`, {
                      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(parsed)
                    });
                    if (res.ok) {
                      setShowCreate(false);
                      setNewDocText('');
                      setRefreshKey(k => k + 1);
                    } else {
                      console.error('create failed', await res.text());
                    }
                  } catch(err) { console.error('invalid json', err); }
                }}>Insert</Button>
              </div>
            </Card>
          )}

          {documents.length === 0 && (
            <Card className="p-4 text-sm text-gray-500">No documents matched the current sample/filter.</Card>
          )}

          {documents.map((d, i) => (
            <Card key={i} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm text-gray-500">Document #{i + 1}</div>
                <Button onClick={() => handleDelete(d)}>Delete</Button>
              </div>
              <pre className="font-mono text-sm bg-gray-50 border rounded p-3 max-h-96 overflow-auto whitespace-pre-wrap break-words">
                {JSON.stringify(d, null, 2)}
              </pre>
            </Card>
          ))}

          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium">Raw output</div>
              <div>
                <Button onClick={() => {
                  const text = JSON.stringify(documents, null, 2);
                  navigator.clipboard && navigator.clipboard.writeText(text);
                }}>Copy</Button>
              </div>
            </div>
            <textarea readOnly value={JSON.stringify(documents, null, 2)} rows={12} className="w-full font-mono text-sm p-2 border rounded bg-gray-50" />
          </div>
        </div>
      </div>

      {showStatsCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Collection Stats</h2>
                {selectedDb && selectedColl && (
                  <p className="text-sm text-gray-500">{selectedDb} / {selectedColl}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowStatsCard(false)}>Close</Button>
            </div>
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {statsLoading && (
                <div className="text-sm text-gray-500">Loading stats…</div>
              )}
              {statsError && (
                <div className="text-sm text-red-600">{statsError}</div>
              )}
              {!statsLoading && !statsError && stats && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
                      <tr>
                        <th className="px-3 py-2">Field</th>
                        <th className="px-3 py-2">Sample Value</th>
                        <th className="px-3 py-2">Types</th>
                        <th className="px-3 py-2 text-right">Count in Sample</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(stats).map(([field, info]) => {
                        const types = Array.isArray(info?.types) ? info.types.join(', ') : '—';
                        const sampleValue = info?.sample ?? null;
                        const renderSample = sampleValue === null || sampleValue === undefined
                          ? '—'
                          : typeof sampleValue === 'object'
                            ? JSON.stringify(sampleValue)
                            : String(sampleValue);
                        const count = typeof info?.count === 'number' ? info.count : 0;
                        return (
                          <tr key={field} className="align-top">
                            <td className="px-3 py-2 font-mono text-xs text-indigo-600 break-words">{field}</td>
                            <td className="px-3 py-2 text-gray-700 break-words max-w-xs">
                              {renderSample}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{types}</td>
                            <td className="px-3 py-2 text-right text-gray-800 font-medium">{count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {!statsLoading && !statsError && !stats && (
                <div className="text-sm text-gray-500">No statistics available for this collection.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}