// src/components/FileUpload.tsx

import React, { useState } from 'react';
import WordCloudComponent from './WordCloudComponent';
import BarChart from './BarChart';
import { analyzeText } from '../utils/textAnalysis';

interface AnalysisResult {
  person1: string;
  person2: string;
  topWords1: { text: string; value: number }[];
  topWords2: { text: string; value: number }[];
}

const FileUpload: React.FC = () => {
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const content = e.target?.result as string;
        const result = analyzeText(content);
        setResults(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setResults(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <h1 style={{ textAlign: 'center', color: '#333' }}>Chat Analysis Word Cloud</h1>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        <input
          type="file"
          onChange={handleFileUpload}
          accept=".txt"
          style={{
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      {results && (
        <div>
          <h2 style={{ textAlign: 'center', color: '#444' }}>Results</h2>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
            }}
          >
            <WordCloudComponent
              data={results.topWords1}
              color="#007bff"
              title={`Top words for ${results.person1}`}
            />
            <WordCloudComponent
              data={results.topWords2}
              color="#28a745"
              title={`Top words for ${results.person2}`}
            />
            <BarChart
              data={{
                labels: results.topWords1.map((word) => word.text),
                values: results.topWords1.map((word) => word.value),
              }}
            />
            <BarChart
              data={{
                labels: results.topWords2.map((word) => word.text),
                values: results.topWords2.map((word) => word.value),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
