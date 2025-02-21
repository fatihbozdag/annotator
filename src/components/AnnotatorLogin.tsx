'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface AnnotatorLoginProps {
  onLogin: (annotatorId: string) => void;
}

const AnnotatorLogin = ({ onLogin }: AnnotatorLoginProps) => {
  const [annotatorId, setAnnotatorId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (annotatorId.trim()) {
      onLogin(annotatorId);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Annotator Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Annotator ID:
              </label>
              <input
                type="text"
                value={annotatorId}
                onChange={(e) => setAnnotatorId(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter your annotator ID"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Start Annotation
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnotatorLogin;