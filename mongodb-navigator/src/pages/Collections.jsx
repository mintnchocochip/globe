import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Collections() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
        <p className="text-gray-600 mt-2">Browse collections within your databases</p>
      </div>
      
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">Collections page - Coming soon!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}