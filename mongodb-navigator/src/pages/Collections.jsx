import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import JSONViewer from '@uiw/react-json-view';

export default function Collections() {
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedColl, setSelectedColl] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [selectedDoc, setSelectedDoc] = useState(null);

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
    const skip = page * limit;
    // no filter by default
    fetch(`http://127.0.0.1:6969/collections/${selectedDb}/${selectedColl}?skip=${skip}&limit=${limit}`)
      .then(r => r.json())
      .then(j => setDocuments(j.documents || []))
      .catch(e => console.error('fetch documents', e));
  }, [selectedDb, selectedColl, page, limit]);

  return (
    <div className="grid grid-cols-3 gap-6">
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
                  <Button onClick={() => { setSelectedDb(db.name); setSelectedColl(null); setDocuments([]); setPage(0); }}>Open</Button>
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
                  <Button onClick={() => { setSelectedColl(c); setPage(0); setSelectedDoc(null); }}>Open</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Documents{selectedColl ? ` — ${selectedColl}` : ''}</h1>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center mb-2">
            <div>
              <Button onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</Button>
              <Button onClick={() => setPage(p => p + 1)} className="ml-2">Next</Button>
            </div>
            <div className="text-sm text-gray-500">page {page + 1}</div>
          </div>

          {documents.map((d, i) => (
            <Card key={i} className="p-2">
              <div className="flex justify-between items-start">
                <div className="truncate max-w-xs">
                  <JSONViewer src={d} name={false} collapsed={true} enableClipboard={false} displayDataTypes={false} />
                </div>
                <div>
                  <Button onClick={() => setSelectedDoc(d)}>View</Button>
                </div>
              </div>
            </Card>
          ))}

          {selectedDoc && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Document</CardTitle>
              </CardHeader>
              <CardContent>
                <JSONViewer src={selectedDoc} collapsed={false} enableClipboard={true} displayDataTypes={true} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}