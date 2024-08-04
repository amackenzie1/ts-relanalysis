// src/components/SentimentAnalysis.tsx

import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import Sentiment from 'sentiment';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SentimentAnalysis: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<{ week: string; sentiment: number }[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (content) {
        processFileContent(content as string);
      }
    };
    reader.readAsText(file);
  };

  const processFileContent = (content: string) => {
    const lines = content.split('\n');
    const parsedData: { date: string; message: string }[] = [];

    // Parse chat lines
    lines.forEach((line) => {
      const match = line.match(/\[(.*?)\] (.*?): (.*)/);
      if (match) {
        const [_, dateStr, , message] = match;
        parsedData.push({ date: dateStr, message });
      }
    });

    // Analyze sentiment and calculate weekly averages
    const sentimentAnalyzer = new Sentiment();
    const weeklySentiment: { [key: string]: { score: number; count: number } } = {};

    parsedData.forEach(({ date, message }) => {
      const sentimentScore = sentimentAnalyzer.analyze(message).score;
      const week = new Date(date).toISOString().substring(0, 10); // Format as "YYYY-MM-DD"

      if (!weeklySentiment[week]) {
        weeklySentiment[week] = { score: 0, count: 0 };
      }

      weeklySentiment[week].score += sentimentScore;
      weeklySentiment[week].count += 1;
    });

    // Prepare data for the chart
    const chartData = Object.entries(weeklySentiment).map(([week, { score, count }]) => ({
      week,
      sentiment: score / count,
    }));

    setWeeklyData(chartData);
  };

  const chartOptions = {
    responsive: true,
    scales: {
      x: {
        type: 'category' as const, // Use a constant type for category scale
        title: {
          display: true,
          text: 'Week',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Average Sentiment Score',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Weekly Sentiment Score',
      },
    },
  };

  const chartData = {
    labels: weeklyData.map((data) => data.week),
    datasets: [
      {
        label: 'Weekly Sentiment Score',
        data: weeklyData.map((data) => data.sentiment),
        backgroundColor: 'rgba(75,192,192,0.6)',
      },
    ],
  };

  return (
    <div style={{ /* your existing styles */ }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Weekly Sentiment Analysis</h2>
      {weeklyData.length > 0 && (
        <div>
          <h3 style={{ textAlign: 'center', color: '#444' }}>Sentiment by Week</h3>
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
};

export default SentimentAnalysis;