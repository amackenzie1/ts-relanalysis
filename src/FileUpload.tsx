// src/ChatAnalysis.tsx

import React, { useState } from 'react';
import WordCloud from 'react-d3-cloud';
import BarChart from './components/BarChart'; // Import the BarChart component

interface AnalysisResult {
  person1: string;
  person2: string;
  topWords1: { text: string; value: number }[];
  topWords2: { text: string; value: number }[];
}

const LIMIT = 100;

const ChatAnalysis: React.FC = () => {
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeText = (content: string): AnalysisResult => {
    const lines = content.split('\n');
    const names = new Set<string>();
    const wordRegex = /\b\w+\b/gi;

    lines.forEach((line) => {
      const match = line.match(/\] (.+?):/);
      if (match) names.add(match[1]);
    });

    if (names.size < 2) {
      throw new Error('Could not identify two distinct persons in the chat');
    }

    const [person1, person2] = Array.from(names);
    const words1: string[] = [];
    const words2: string[] = [];

    lines.forEach((line) => {
      const match = line.match(/\] (.+?): (.+)/);
      if (match) {
        const [, name, message] = match;
        const extractedWords = message.toLowerCase().match(wordRegex) || [];
        if (name === person1) {
          words1.push(...extractedWords);
        } else if (name === person2) {
          words2.push(...extractedWords);
        }
      }
    });

    const count1 = words1.reduce(
      (acc, word) => ({ ...acc, [word]: (acc[word] || 0) + 1 }),
      {} as Record<string, number>
    );
    const count2 = words2.reduce(
      (acc, word) => ({ ...acc, [word]: (acc[word] || 0) + 1 }),
      {} as Record<string, number>
    );

    const allWords = new Set([...Object.keys(count1), ...Object.keys(count2)]);
    const ratios: Record<string, number> = {};

    allWords.forEach((word) => {
      const c1 = count1[word] || 0;
      const c2 = count2[word] || 0;
      ratios[word] = (c1 + 1) / (c2 + 1);
    });

    const sortedRatios = Object.entries(ratios).sort((a, b) => b[1] - a[1]);
    const topWords1 = sortedRatios.slice(0, LIMIT).map(([text, value]) => ({ text, value }));
    const topWords2 = sortedRatios.slice(-LIMIT).reverse().map(([text, value]) => ({ text, value: 1 / value }));

    return { person1, person2, topWords1, topWords2 };
  };

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

  const fontSizeMapper = (word: { value: number }) => Math.log2(word.value) * 14 + 2;

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
            <div style={{ width: '45%', minWidth: '300px', margin: '10px' }}>
              <h3 style={{ textAlign: 'center', color: '#555' }}>Top words for {results.person1}</h3>
              <div
                style={{
                  width: '100%',
                  height: '500px',
                  border: '2px solid #007bff',
                  borderRadius: '8px',
                  padding: '10px',
                  boxSizing: 'border-box',
                }}
              >
                <WordCloud
                  data={results.topWords1}
                  fontSize={fontSizeMapper}
                  rotate={0}
                  padding={2}
                />
              </div>
              <BarChart
                data={{
                  labels: results.topWords1.map((word) => word.text),
                  values: results.topWords1.map((word) => word.value),
                }}
              />
            </div>
            <div style={{ width: '45%', minWidth: '300px', margin: '10px' }}>
              <h3 style={{ textAlign: 'center', color: '#555' }}>Top words for {results.person2}</h3>
              <div
                style={{
                  width: '100%',
                  height: '500px',
                  border: '2px solid #28a745',
                  borderRadius: '8px',
                  padding: '10px',
                  boxSizing: 'border-box',
                }}
              >
                <WordCloud
                  data={results.topWords2}
                  fontSize={fontSizeMapper}
                  rotate={0}
                  padding={2}
                />
              </div>
              <BarChart
                data={{
                  labels: results.topWords2.map((word) => word.text),
                  values: results.topWords2.map((word) => word.value),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAnalysis;
