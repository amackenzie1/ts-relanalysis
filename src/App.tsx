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
          {/* Row 1: Word Clouds for both persons */}
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

          {/* Row 2: Bar Charts for both persons */}
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

          {/* Row 3: Sentiment Analysis for both persons */}
          <div className="segment sentiment-analysis">
            <h3 className="segment-title">{`Sentiment Analysis for ${analysisResult.person1}`}</h3>
            <SentimentAnalysis
              data={analysisResult.sentiment1} // Pass sentiment data
              person={analysisResult.person1}  // Pass person's name
            />
          </div>
          <div className="segment sentiment-analysis">
            <h3 className="segment-title">{`Sentiment Analysis for ${analysisResult.person2}`}</h3>
            <SentimentAnalysis
              data={analysisResult.sentiment2} // Pass sentiment data
              person={analysisResult.person2}  // Pass person's name
            />
          </div>

          {/* Optional Row 4: Placeholder Boxes or Additional Components */}
          <div className="segment placeholder">
            <h3 className="segment-title">Additional Analysis 1</h3>
            <p>Content for additional analysis or metrics</p>
          </div>
          <div className="segment placeholder">
            <h3 className="segment-title">Additional Analysis 2</h3>
            <p>Content for additional analysis or metrics</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
