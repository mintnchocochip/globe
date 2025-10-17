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
  const [sampleSize, setSampleSize] = useState(50);
  const [filterString, setFilterString] = useState('');
  const [stats, setStats] = useState(null);
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
    const limit = sampleSize || 50;
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
              <select className="border rounded px-2 py-1" value={sampleSize} onChange={e => setSampleSize(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <Button onClick={() => { setFilterString(''); setStats(null); }}>Clear filter</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => {
                if (!selectedDb || !selectedColl) return;
                fetch(`http://127.0.0.1:6969/collections/${selectedDb}/${selectedColl}/stats?sample=${sampleSize}`)
                  .then(r => r.json())
                  .then(j => setStats(j))
                  .catch(e => console.error('fetch stats', e));
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

          {fieldsPreview.length > 0 && (
            <Card className="p-3">
              <div className="font-medium mb-2">Fields preview (click to filter by sample value)</div>
              <div className="text-sm text-gray-700 space-y-1">
                {fieldsPreview.map(f => (
                  <div key={f.key} className="flex justify-between items-center">
                    <button className="font-mono text-sm text-left truncate" style={{maxWidth: '40%'}} onClick={() => {
                      const val = f.sample;
                      const filterObj = { [f.key]: val };
                      setFilterString(JSON.stringify(filterObj));
                    }}>{f.key}</button>
                    <div className="text-gray-500 truncate max-w-xs">{typeof f.sample === 'object' ? JSON.stringify(f.sample) : String(f.sample)}</div>
                  </div>
                ))}
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

          {stats && (
            <Card className="p-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Collection Stats (sample)</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <pre className="font-mono text-xs bg-gray-50 border rounded p-2 max-h-96 overflow-auto">{JSON.stringify(stats, null, 2)}</pre>
              </CardContent>
            </Card>
          )}

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
    </div>
  );
}