import React, { useState } from 'react';
import WordCloudComponent from './WordCloudComponent';
import BarChart from './BarChart';
import { analyzeText } from '../utils/textAnalysis';
import Sentiment from 'sentiment';

// Define the interface for the analysis result
interface AnalysisResult {
  person1: string;
  person2: string;
  topWords1: { text: string; value: number }[];
  topWords2: { text: string; value: number }[];
}

interface FileUploadProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onSentimentAnalysisComplete: (data: { week: string; sentiment: number }[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onAnalysisComplete, onSentimentAnalysisComplete }) => {
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sentiment = new Sentiment();

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
        onAnalysisComplete(result);

        // Perform sentiment analysis
        const lines = content.split('\n');
        const sentimentData: { week: string; sentiment: number }[] = [];
        let currentWeek = '';
        let weekSentiment = 0;
        let messageCount = 0;

        lines.forEach((line) => {
          const match = line.match(/\[(.*?)\] (.*?): (.*)/);
          if (match) {
            const [_, dateStr, , message] = match;
            const date = new Date(dateStr);
            const week = `${date.getFullYear()}-W${Math.ceil((date.getDate() + date.getDay()) / 7)}`;

            if (week !== currentWeek) {
              if (currentWeek !== '') {
                sentimentData.push({ week: currentWeek, sentiment: weekSentiment / messageCount });
              }
              currentWeek = week;
              weekSentiment = 0;
              messageCount = 0;
            }

            const sentimentScore = sentiment.analyze(message).score;
            weekSentiment += sentimentScore;
            messageCount++;
          }
        });

        // Add the last week
        if (messageCount > 0) {
          sentimentData.push({ week: currentWeek, sentiment: weekSentiment / messageCount });
        }

        onSentimentAnalysisComplete(sentimentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setResults(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Chat Analysis</h1>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <input
          type="file"
          onChange={handleFileUpload}
          accept=".txt"
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
    </div>
  );
};

export default FileUpload;