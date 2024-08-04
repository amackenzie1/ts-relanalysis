import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import WordCloudComponent from './components/WordCloudComponent';
import BarChart from './components/BarChart';
import SentimentAnalysis from './components/SentimentAnalysis';

interface AnalysisResult {
  person1: string;
  person2: string;
  topWords1: { text: string; value: number }[];
  topWords2: { text: string; value: number }[];
}

const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [sentimentData, setSentimentData] = useState<{ week: string; sentiment: number }[]>([]);

  const handleAnalysisResults = (result: AnalysisResult) => {
    console.log('Analysis Result:', result);
    setAnalysisResult(result);
  };

  const handleSentimentData = (data: { week: string; sentiment: number }[]) => {
    console.log('Sentiment Data:', data);
    setSentimentData(data);
  };

  return (
    <div className="app-container">
      {!analysisResult ? (
        <div className="file-upload-centered">
          <FileUpload 
            onAnalysisComplete={handleAnalysisResults} 
            onSentimentAnalysisComplete={handleSentimentData}
          />
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="segment word-cloud">
            <h3 className="segment-title">{`Word Cloud for ${analysisResult.person1}`}</h3>
            <WordCloudComponent
              data={analysisResult.topWords1}
              color="#007bff"
              title={`Top words for ${analysisResult.person1}`}
            />
          </div>
          <div className="segment word-cloud">
            <h3 className="segment-title">{`Word Cloud for ${analysisResult.person2}`}</h3>
            <WordCloudComponent
              data={analysisResult.topWords2}
              color="#28a745"
              title={`Top words for ${analysisResult.person2}`}
            />
          </div>

          <div className="segment bar-chart">
            <h3 className="segment-title">{`Bar Chart for ${analysisResult.person1}`}</h3>
            <BarChart
              data={{
                labels: analysisResult.topWords1.map((word) => word.text),
                values: analysisResult.topWords1.map((word) => word.value),
              }}
            />
          </div>
          <div className="segment bar-chart">
            <h3 className="segment-title">{`Bar Chart for ${analysisResult.person2}`}</h3>
            <BarChart
              data={{
                labels: analysisResult.topWords2.map((word) => word.text),
                values: analysisResult.topWords2.map((word) => word.value),
              }}
            />
          </div>

          <div className="segment sentiment-analysis">
            <h3 className="segment-title">Cumulative Sentiment Analysis</h3>
            {sentimentData.length > 0 ? (
              <SentimentAnalysis data={sentimentData} />
            ) : (
              <p>No sentiment data available</p>
            )}
          </div>
          <div className="segment placeholder">
            <h3 className="segment-title">Additional Analysis</h3>
            <p>Space for future analysis components</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;