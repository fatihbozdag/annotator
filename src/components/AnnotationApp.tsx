'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sampleData } from '@/data/sampleData';
import Papa from 'papaparse';
import { debounce } from 'lodash';

interface Annotation {
  target_tense: string;
  sentence: string;
  is_correct: boolean;
  notes: string;
  annotator_id: string;
  created_at?: string;
  updated_at?: string;
}

interface AnnotationAppProps {
  annotatorId: string;
}

interface SentenceData {
  originalText: string;
  sentence: string;
  sentenceIndex: number;
  cefr: string;
  text_corrected: string;
  learner_id: string;
  [key: string]: any;
}

interface TenseOption {
  category: string;
  value: string;
  example?: string;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const TENSE_OPTIONS: TenseOption[] = [
  // Standard Tenses - Present
  { category: "Present Tenses", value: "Present Simple", example: "He works" },
  { category: "Present Tenses", value: "Present Continuous", example: "He is working" },
  { category: "Present Tenses", value: "Present Perfect", example: "He has worked" },
  { category: "Present Tenses", value: "Present Perfect Continuous", example: "He has been working" },
  
  // Standard Tenses - Past
  { category: "Past Tenses", value: "Past Simple", example: "He worked" },
  { category: "Past Tenses", value: "Past Continuous", example: "He was working" },
  { category: "Past Tenses", value: "Past Perfect", example: "He had worked" },
  { category: "Past Tenses", value: "Past Perfect Continuous", example: "He had been working" },
  
  // Standard Tenses - Future
  { category: "Future Tenses", value: "Future Simple (will)", example: "He will work" },
  { category: "Future Tenses", value: "Future Simple (going to)", example: "He is going to work" },
  { category: "Future Tenses", value: "Future Continuous", example: "He will be working" },
  { category: "Future Tenses", value: "Future Perfect", example: "He will have worked" },
  { category: "Future Tenses", value: "Future Perfect Continuous", example: "He will have been working" },
  
  // Conditional Tenses
  { category: "Conditionals", value: "Zero Conditional", example: "If ice melts, it becomes water" },
  { category: "Conditionals", value: "First Conditional", example: "If it rains, I will stay home" },
  { category: "Conditionals", value: "Second Conditional", example: "If I had money, I would travel" },
  { category: "Conditionals", value: "Third Conditional", example: "If I had studied, I would have passed" },
  { category: "Conditionals", value: "Mixed Conditional", example: "If I had studied, I would be passing" },
  
  // Modal Structures
  { category: "Modal Structures", value: "Modal Simple (can/could)", example: "He can work" },
  { category: "Modal Structures", value: "Modal Simple (may/might)", example: "He may work" },
  { category: "Modal Structures", value: "Modal Simple (must/have to)", example: "He must work" },
  { category: "Modal Structures", value: "Modal Simple (should/ought to)", example: "He should work" },
  { category: "Modal Structures", value: "Modal Continuous", example: "He must be working" },
  { category: "Modal Structures", value: "Modal Perfect", example: "He must have worked" },
  { category: "Modal Structures", value: "Modal Perfect Continuous", example: "He must have been working" },
  
  // Other
  { category: "Other", value: "Other", example: "Any other structure" }
];

const AnnotationApp = ({ annotatorId }: AnnotationAppProps) => {
  const [allData, setAllData] = useState<SentenceData[]>([]);
  const [filteredData, setFilteredData] = useState<SentenceData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState<SentenceData | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sampleSize, setSampleSize] = useState(200);
  const [selectedCEFR, setSelectedCEFR] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Function to split text into sentences
  const splitIntoSentences = (text: string): string[] => {
    // More precise sentence splitting with exclamation marks and periods
    const sentences = text.split(/(?<=[.!])\s+/);
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  // Function to validate and normalize CEFR level
  const normalizeCEFR = (cefr: string): string | null => {
    const normalized = cefr.trim().toUpperCase();
    return CEFR_LEVELS.includes(normalized) ? normalized : null;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingProgress(0);

      const response = await fetch('/sampled_data.csv');
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      
      // Use PapaParse to handle CSV parsing
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
      });
      
      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing errors:', parseResult.errors);
      }
      
      const allSentences: SentenceData[] = [];
      
      parseResult.data.forEach((row: any) => {
        if (row.text_corrected && row.cefr) {
          const normalizedCEFR = normalizeCEFR(row.cefr);
          if (!normalizedCEFR) {
            console.warn(`Invalid CEFR level found: ${row.cefr}`);
            return;
          }

          const sentences = splitIntoSentences(row.text_corrected);
          sentences.forEach((sentence, idx) => {
            if (sentence.trim()) {
              allSentences.push({
                originalText: row.text_corrected,
                sentence: sentence.trim(),
                sentenceIndex: idx,
                cefr: normalizedCEFR,
                text_corrected: row.text_corrected,
                learner_id: row.learner_id || ''
              });
            }
          });
        }
      });
      
      if (allSentences.length === 0) {
        throw new Error('No valid sentences found in the CSV file');
      }
      
      console.log(`Loaded ${allSentences.length} sentences from CSV`);
      setAllData(allSentences);
      setError(null);
    } catch (error) {
      console.error('Failed to load CSV:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      // Process sample data as fallback
      const allSentences: SentenceData[] = [];
      
      sampleData.forEach((row) => {
        const textCorrected = row.text_corrected;
        const cefr = row.cefr;
        
        if (textCorrected && typeof textCorrected === 'string' && textCorrected.trim() !== '' && cefr) {
          const normalizedCEFR = normalizeCEFR(cefr);
          if (!normalizedCEFR) return;

          const sentences = splitIntoSentences(textCorrected);
          sentences.forEach((sentence, idx) => {
            allSentences.push({
              originalText: textCorrected,
              sentence: sentence.trim(),
              sentenceIndex: idx,
              cefr: normalizedCEFR,
              text_corrected: textCorrected,
              ...row
            });
          });
        }
      });
      
      setAllData(allSentences);
    } finally {
      setIsLoading(false);
      setLoadingProgress(100);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Function to filter and sample data by CEFR level
  const filterByCEFR = useCallback((cefr: string) => {
    try {
      if (!cefr) {
        setFilteredData([]);
        setAnnotations([]);
        return;
      }

      setIsFiltering(true);
      setError(null);

      const normalizedCEFR = normalizeCEFR(cefr);
      if (!normalizedCEFR) {
        throw new Error(`Invalid CEFR level: ${cefr}`);
      }

      console.log(`Filtering by CEFR level: ${normalizedCEFR}`);
      console.log(`Total data available: ${allData.length}`);

      const cefrData = allData.filter(item => item.cefr === normalizedCEFR);
      console.log(`Found ${cefrData.length} items for CEFR level ${normalizedCEFR}`);
      
      if (cefrData.length === 0) {
        throw new Error(`No data found for CEFR level: ${normalizedCEFR}`);
      }

      // Random sampling from filtered data
      const sampledData: SentenceData[] = [];
      const totalSize = Math.min(sampleSize, cefrData.length);
      const indices = new Set<number>();
      
      while (indices.size < totalSize) {
        indices.add(Math.floor(Math.random() * cefrData.length));
      }
      
      Array.from(indices).sort().forEach(index => {
        sampledData.push(cefrData[index]);
      });
      
      console.log(`Sampled ${sampledData.length} items for display`);
      setFilteredData(sampledData);
      setAnnotations(new Array(sampledData.length).fill(null).map(() => ({
        target_tense: '',
        sentence: '',
        is_correct: false,
        notes: '',
        annotator_id: annotatorId,
        created_at: new Date().toISOString()
      })));
      setCurrentIndex(0);
      setError(null);
    } catch (err) {
      console.error('Error filtering data:', err);
      setError(err instanceof Error ? err.message : 'Error filtering data');
      setFilteredData([]);
      setAnnotations([]);
    } finally {
      setIsFiltering(false);
    }
  }, [allData, sampleSize, annotatorId]);

  const handleCEFRChange = (newCefr: string) => {
    setSelectedCEFR(newCefr);
    filterByCEFR(newCefr);
  };

  const handleSampleSizeChange = (value: string) => {
    const size = parseInt(value);
    if (!isNaN(size) && size > 0) {
      setSampleSize(size);
      if (selectedCEFR) {
        filterByCEFR(selectedCEFR);
      }
    }
  };

  const handleNext = async () => {
    try {
      if (currentIndex >= filteredData.length - 1) {
        alert('You have reached the end of the dataset.');
        return;
      }

      if (!currentItem || !annotations[currentIndex]) {
        setCurrentIndex(currentIndex + 1);
        return;
      }

      setIsLoading(true);
      
      // Only save if there are actual changes
      if (annotations[currentIndex].target_tense || annotations[currentIndex].notes || annotations[currentIndex].is_correct) {
        const currentAnnotation = {
          annotator_id: annotatorId,
          sentence: currentItem.sentence,
          target_tense: annotations[currentIndex].target_tense,
          is_correct: annotations[currentIndex].is_correct,
          notes: annotations[currentIndex].notes || '',
          cefr_level: currentItem.cefr,
          original_text: currentItem.originalText,
          learner_id: currentItem.learner_id
        };

        const { error: saveError } = await supabase
          .from('annotations')
          .upsert([currentAnnotation], {
            onConflict: 'annotator_id,sentence',
          });

        if (saveError) {
          throw new Error(`Failed to save annotation: ${saveError.message}`);
        }
      }

      // Update state after successful save or if no save was needed
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentItem(filteredData[nextIndex]);
      
    } catch (err) {
      console.error('Error in handleNext:', err);
      setError(err instanceof Error ? err.message : 'Error navigating to next item');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = async () => {
    try {
      if (currentIndex <= 0) {
        alert('You are at the beginning of the dataset.');
        return;
      }

      if (!currentItem || !annotations[currentIndex]) {
        setCurrentIndex(currentIndex - 1);
        return;
      }

      setIsLoading(true);

      // Only save if there are actual changes
      if (annotations[currentIndex].target_tense || annotations[currentIndex].notes || annotations[currentIndex].is_correct) {
        const currentAnnotation = {
          annotator_id: annotatorId,
          sentence: currentItem.sentence,
          target_tense: annotations[currentIndex].target_tense,
          is_correct: annotations[currentIndex].is_correct,
          notes: annotations[currentIndex].notes || '',
          cefr_level: currentItem.cefr,
          original_text: currentItem.originalText,
          learner_id: currentItem.learner_id
        };

        const { error: saveError } = await supabase
          .from('annotations')
          .upsert([currentAnnotation], {
            onConflict: 'annotator_id,sentence',
          });

        if (saveError) {
          throw new Error(`Failed to save annotation: ${saveError.message}`);
        }
      }

      // Update state after successful save or if no save was needed
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setCurrentItem(filteredData[prevIndex]);
      
    } catch (err) {
      console.error('Error in handlePrevious:', err);
      setError(err instanceof Error ? err.message : 'Error navigating to previous item');
    } finally {
      setIsLoading(false);
    }
  };

  // Add debounced auto-save with proper debouncing
  const debouncedSave = useCallback(
    debounce(async (annotation: any) => {
      try {
        const { error: saveError } = await supabase
          .from('annotations')
          .upsert([annotation], {
            onConflict: 'annotator_id,sentence',
          });

        if (saveError) {
          console.error('Error auto-saving:', saveError);
        }
      } catch (err) {
        console.error('Error in auto-save:', err);
      }
    }, 1000), // Wait 1 second after last change before saving
    [supabase]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Update annotation change handler to include auto-save
  const handleAnnotationChange = (field: string, value: any) => {
    setAnnotations(prev => {
      const newAnnotations = [...prev];
      const updatedAnnotation = {
        ...newAnnotations[currentIndex],
        [field]: value
      };
      newAnnotations[currentIndex] = updatedAnnotation;

      // Trigger auto-save if we have meaningful data
      if (updatedAnnotation.target_tense || updatedAnnotation.notes || updatedAnnotation.is_correct) {
        const saveData = {
          annotator_id: annotatorId,
          sentence: currentItem?.sentence || '',
          target_tense: updatedAnnotation.target_tense || '',
          is_correct: updatedAnnotation.is_correct || false,
          notes: updatedAnnotation.notes || '',
          cefr_level: currentItem?.cefr || '',
          original_text: currentItem?.originalText || '',
          learner_id: currentItem?.learner_id || ''
        };
        debouncedSave(saveData);
      }

      return newAnnotations;
    });
  };

  const saveAnnotations = async () => {
    try {
      setIsLoading(true);
      
      // Create array of annotation records with simplified structure
      const annotationRecords = filteredData.map((item, index) => ({
        annotator_id: annotatorId,
        sentence: item.sentence,
        target_tense: annotations[index]?.target_tense || '',
        is_correct: annotations[index]?.is_correct || false,
        notes: annotations[index]?.notes || '',
        cefr_level: item.cefr,
        original_text: item.originalText,
        learner_id: item.learner_id,
        created_at: new Date().toISOString()
      }));

      // Insert annotations into Supabase
      const { data, error } = await supabase
        .from('annotations')
        .insert(annotationRecords);

      if (error) throw error;

      setError(null);
      alert('Annotations saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving annotations');
    } finally {
      setIsLoading(false);
    }
  };

  // Update currentItem when filteredData or currentIndex changes
  useEffect(() => {
    if (filteredData.length > 0 && currentIndex >= 0 && currentIndex < filteredData.length) {
      setCurrentItem(filteredData[currentIndex]);
    } else {
      setCurrentItem(null);
    }
  }, [filteredData, currentIndex]);

  // Function to navigate between sentences in the current text
  const navigateToSentence = (direction: 'next' | 'previous') => {
    if (!currentItem) return;

    const sentences = splitIntoSentences(currentItem.originalText);
    const newIndex = direction === 'next'
      ? (currentItem.sentenceIndex + 1) % sentences.length
      : (currentItem.sentenceIndex - 1 + sentences.length) % sentences.length;

    setCurrentItem({
      ...currentItem,
      sentence: sentences[newIndex],
      sentenceIndex: newIndex
    });
  };

  if (error) {
    return (
      <Alert variant="destructive" className="w-full max-w-4xl mx-auto mt-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="px-4 max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Tense Annotation Tool</span>
              <div className="flex items-center gap-2">
                {isLoading && (
                  <span className="text-sm text-muted-foreground animate-pulse">
                    Saving...
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  Annotator ID: {annotatorId}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Instructions Panel */}
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium mb-2">Instructions for Annotators:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Select a <span className="font-medium">CEFR Level</span> to start annotation.</li>
                <li>Read the complete <span className="font-medium">Original Text</span> to understand the context.</li>
                <li>Focus on the <span className="font-medium">Current Sentence</span> being annotated.</li>
                <li>Select the correct tense and mark whether it's used correctly.</li>
                <li>Add any relevant notes if needed.</li>
                <li>Use Next/Previous to navigate (annotations auto-save).</li>
              </ol>
            </div>

            {/* Settings Section */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sample Size:
                  </label>
                  <input
                    type="number"
                    value={sampleSize}
                    onChange={(e) => handleSampleSizeChange(e.target.value)}
                    className="p-2 border rounded w-24"
                    min="1"
                    max="1000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    CEFR Level:
                  </label>
                  <select
                    value={selectedCEFR}
                    onChange={(e) => handleCEFRChange(e.target.value)}
                    className="p-2 border rounded w-24"
                    disabled={isLoading || isFiltering}
                  >
                    <option value="">Select...</option>
                    {CEFR_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoading && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-center mb-2">Loading data...</div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {isFiltering && (
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  Filtering data...
                </div>
              )}
            </div>
            
            {/* Navigation and Progress */}
            {selectedCEFR && (
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0 || isLoading}
                  className={`px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLoading ? 'cursor-wait' : ''
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {filteredData.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentIndex >= filteredData.length - 1 || isLoading}
                  className={`px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLoading ? 'cursor-wait' : ''
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Main Content */}
            {!selectedCEFR ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Please select a CEFR level to start annotation.</p>
              </div>
            ) : currentItem ? (
              <div className="space-y-6">
                {/* Current Sentence */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Current Sentence:</h3>
                  <p className="text-lg">{currentItem.sentence}</p>
                </div>
                
                {/* Original Context */}
                <div className="p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-medium mb-2">Original Text:</h3>
                  <p>{currentItem.originalText}</p>
                </div>

                {/* Annotation Form */}
                <div className="space-y-4">
                  {/* Target Tense */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Target Tense:
                    </label>
                    <select
                      value={annotations[currentIndex]?.target_tense || ''}
                      onChange={(e) => handleAnnotationChange('target_tense', e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select tense...</option>
                      {Object.entries(
                        TENSE_OPTIONS.reduce((acc, option) => {
                          if (!acc[option.category]) {
                            acc[option.category] = [];
                          }
                          acc[option.category].push(option);
                          return acc;
                        }, {} as Record<string, TenseOption[]>)
                      ).map(([category, options]) => (
                        <optgroup key={category} label={category}>
                          {options.map(option => (
                            <option key={option.value} value={option.value} title={option.example}>
                              {option.value}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Correct Usage */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={annotations[currentIndex]?.is_correct || false}
                        onChange={(e) => handleAnnotationChange('is_correct', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Correct Usage</span>
                    </label>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Notes:
                    </label>
                    <textarea
                      value={annotations[currentIndex]?.notes || ''}
                      onChange={(e) => handleAnnotationChange('notes', e.target.value)}
                      className="w-full p-2 border rounded"
                      rows={3}
                      placeholder="Add any additional notes..."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No sentences available for annotation.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Export with user's ID from auth
export default function AnnotationAppWrapper() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get the current user's ID from Supabase auth
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };

    getCurrentUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!userId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <AnnotationApp annotatorId={userId} />;
}