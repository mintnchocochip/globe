import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DocumentArrowUpIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';

export default function SchemaUpload() {
  const [schema, setSchema] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const file = files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          setSchema(parsed);
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const sampleSchema = {
    "users": {
      "type": "object",
      "properties": {
        "name": { "type": "string", "required": true },
        "email": { "type": "string", "format": "email", "required": true },
        "age": { "type": "number", "minimum": 0, "maximum": 150 },
        "status": { 
          "type": "string", 
          "enum": ["active", "inactive", "pending"],
          "default": "pending"
        },
        "created_at": { "type": "string", "format": "date-time" },
        "preferences": {
          "type": "object",
          "properties": {
            "newsletter": { "type": "boolean", "default": false },
            "theme": { "type": "string", "enum": ["light", "dark"] }
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Schema Upload</h1>
        <p className="text-gray-600 mt-2">Upload and manage collection schemas for dynamic form generation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              Upload Schema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <DocumentArrowUpIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your schema file here
              </p>
              <p className="text-gray-500 mb-4">
                or click to browse (JSON files only)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInput}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                Browse Files
              </Button>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Sample Schema Format:</h4>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                {JSON.stringify(sampleSchema, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Schema Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DocumentCheckIcon className="h-5 w-5 mr-2" />
              Schema Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schema ? (
              <div>
                <div className="mb-4">
                  <Button size="sm" variant="outline" className="mr-2">
                    Save Schema
                  </Button>
                  <Button size="sm" variant="outline">
                    Generate Forms
                  </Button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(schema, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <DocumentCheckIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Upload a schema file to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Existing Schemas */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Schemas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p>No saved schemas yet. Upload your first schema to get started!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}