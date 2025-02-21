'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';

interface AnnotationStats {
  total_annotations: number;
  total_annotators: number;
  annotations_by_cefr: Record<string, number>;
  annotations_by_tense: Record<string, number>;
}

interface Annotation {
  annotator_id: string;
  sentence: string;
  target_tense: string;
  is_correct: boolean;
  notes: string;
  cefr_level: string;
  original_text: string;
  learner_id: string;
  annotation_timestamp: string;
}

const AdminDashboard = () => {
  const router = useRouter();
  const [stats, setStats] = useState<AnnotationStats | null>(null);
  const [recentAnnotations, setRecentAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, check if the table exists and has data
      const { count, error: tableCheckError } = await supabase
        .from('annotations')
        .select('*', { count: 'exact', head: true });

      if (tableCheckError) {
        if (tableCheckError.code === 'PGRST116') {
          throw new Error('Annotations table does not exist. Please ensure the database is properly set up.');
        }
        throw tableCheckError;
      }

      // If table exists but is empty, return early with zeros
      if (count === 0) {
        setStats({
          total_annotations: 0,
          total_annotators: 0,
          annotations_by_cefr: {},
          annotations_by_tense: {}
        });
        setRecentAnnotations([]);
        return;
      }

      // Get all annotations in a single query for efficiency
      const { data: allAnnotations, error: fetchError } = await supabase
        .from('annotations')
        .select('*')
        .order('annotation_timestamp', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (!allAnnotations) {
        throw new Error('Failed to fetch annotations data');
      }

      // Process the data
      const uniqueAnnotators = new Set(allAnnotations.map(a => a.annotator_id));
      
      const cefrCounts = allAnnotations.reduce((acc, curr) => {
        if (curr.cefr_level) {
          acc[curr.cefr_level] = (acc[curr.cefr_level] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const tenseCounts = allAnnotations.reduce((acc, curr) => {
        if (curr.target_tense) {
          acc[curr.target_tense] = (acc[curr.target_tense] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Update state with processed data
      setStats({
        total_annotations: allAnnotations.length,
        total_annotators: uniqueAnnotators.size,
        annotations_by_cefr: cefrCounts,
        annotations_by_tense: tenseCounts
      });
      
      // Set recent annotations (first 10)
      setRecentAnnotations(allAnnotations.slice(0, 10));

    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      setStats(null);
      setRecentAnnotations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const exportToCSV = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .order('annotation_timestamp', { ascending: false });

      if (error) throw error;

      const csv = Papa.unparse(data || []);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `annotations_export_${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="px-4 max-w-6xl mx-auto space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fetchStats()}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={exportToCSV}
            disabled={isLoading}
            className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Logout
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Annotations</p>
                    <p className="text-2xl font-bold">{stats?.total_annotations || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Annotators</p>
                    <p className="text-2xl font-bold">{stats?.total_annotators || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Annotations by CEFR Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats?.annotations_by_cefr || {}).map(([level, count]) => (
                    <div key={level} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{level || 'Not set'}</span>
                      <span className="text-sm">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Annotations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Annotations</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAnnotations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Annotator</th>
                        <th className="text-left py-2">Sentence</th>
                        <th className="text-left py-2">Tense</th>
                        <th className="text-left py-2">CEFR</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAnnotations.map((annotation, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{annotation.annotator_id}</td>
                          <td className="py-2 max-w-xs truncate">{annotation.sentence}</td>
                          <td className="py-2">{annotation.target_tense || 'Not set'}</td>
                          <td className="py-2">{annotation.cefr_level}</td>
                          <td className="py-2">{annotation.is_correct ? 'Correct' : 'Incorrect'}</td>
                          <td className="py-2">{new Date(annotation.annotation_timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No annotations found</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;