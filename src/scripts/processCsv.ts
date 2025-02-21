import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const SAMPLES_PER_LEVEL = 200;

interface TextData {
  text_corrected: string;
  cefr: string;
  learner_id: string;
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function normalizeCEFR(cefr: string): string | null {
  const normalized = cefr.trim().toUpperCase();
  return CEFR_LEVELS.includes(normalized) ? normalized : null;
}

async function processCsv() {
  try {
    // Read the original CSV file
    const csvContent = fs.readFileSync('public/efcamdat_clean.csv', 'utf-8');
    
    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
    });

    // Group by CEFR level
    const groupedData: Record<string, TextData[]> = {};
    CEFR_LEVELS.forEach(level => groupedData[level] = []);

    parseResult.data.forEach((row: any) => {
      if (row.text_corrected && row.cefr) {
        const normalizedCEFR = normalizeCEFR(row.cefr);
        if (normalizedCEFR && row.text_corrected.trim() !== '') {
          groupedData[normalizedCEFR].push({
            text_corrected: row.text_corrected.trim(),
            cefr: normalizedCEFR,
            learner_id: row.learner_id || ''
          });
        }
      }
    });

    // Sample data for each level
    const sampledData: any[] = [];
    CEFR_LEVELS.forEach(level => {
      const levelData = groupedData[level];
      console.log(`Found ${levelData.length} texts for level ${level}`);
      
      // Randomly sample texts
      const sampled = new Set<number>();
      while (sampled.size < Math.min(SAMPLES_PER_LEVEL, levelData.length)) {
        sampled.add(Math.floor(Math.random() * levelData.length));
      }

      // Add sampled texts
      Array.from(sampled).forEach(index => {
        const text = levelData[index];
        sampledData.push(text);
      });
      
      console.log(`Sampled ${sampled.size} texts for level ${level}`);
    });

    // Convert back to CSV
    const csv = Papa.unparse(sampledData);
    
    // Save to a new file
    fs.writeFileSync('public/sampled_data.csv', csv);
    console.log('Successfully created sampled_data.csv');
    console.log(`Total samples: ${sampledData.length}`);
    
  } catch (error) {
    console.error('Error processing CSV:', error);
  }
}

processCsv(); 