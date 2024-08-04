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
  sentiment1: { week: string; sentiment: number }[];
  sentiment2: { week: string; sentiment: number }[];
}

const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalysisResults = (result: AnalysisResult) => {
    console.log('Analysis Result:', result); // Debug: Check the data here
    setAnalysisResult(result);
  };

  return (
    <div className="app-container">
      {!analysisResult ? (
        // Centered File Upload component
        <div className="file-upload-centered">
          <FileUpload onAnalysisComplete={handleAnalysisResults} />
        </div>
      ) : (
        // Dashboard Grid Layout
        <div className="dashboard-grid">
          {/* Column 1: Person 1 */}
          <div className="column">
            <h2 style={{ textAlign: 'center', color: '#333' }}>{`Analysis for ${analysisResult.person1}`}</h2>
            <div className="segment word-cloud">
              <WordCloudComponent
                data={analysisResult.topWords1}
                color="#007bff"
                title={`Top words for ${analysisResult.person1}`}
              />
            </div>
            <div className="segment bar-chart">
              <BarChart
                data={{
                  labels: analysisResult.topWords1.map((word) => word.text),
                  values: analysisResult.topWords1.map((word) => word.value),
                }}
              />
            </div>
            <div className="segment sentiment-analysis">
              <SentimentAnalysis
                data={analysisResult.sentiment1} // Pass sentiment data
                person={analysisResult.person1}  // Pass person's name
              />
            </div>
          </div>

          {/* Column 2: Person 2 */}
          <div className="column">
            <h2 style={{ textAlign: 'center', color: '#333' }}>{`Analysis for ${analysisResult.person2}`}</h2>
            <div className="segment word-cloud">
              <WordCloudComponent
                data={analysisResult.topWords2}
                color="#28a745"
                title={`Top words for ${analysisResult.person2}`}
              />
            </div>
            <div className="segment bar-chart">
              <BarChart
                data={{
                  labels: analysisResult.topWords2.map((word) => word.text),
                  values: analysisResult.topWords2.map((word) => word.value),
                }}
              />
            </div>
            <div className="segment sentiment-analysis">
              <SentimentAnalysis
                data={analysisResult.sentiment2} // Pass sentiment data
                person={analysisResult.person2}  // Pass person's name
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
