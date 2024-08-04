import React from 'react';
import { Bar } from 'react-chartjs-2';
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

interface SentimentAnalysisProps {
  data: { week: string; sentiment: number }[];
  person: string;
}

const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ data, person }) => {
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
        text: `Weekly Sentiment Score for ${person}`,
      },
    },
  };

  const chartData = {
    labels: data.map((entry) => entry.week),
    datasets: [
      {
        label: 'Weekly Sentiment Score',
        data: data.map((entry) => entry.sentiment),
        backgroundColor: 'rgba(75,192,192,0.6)',
      },
    ],
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Weekly Sentiment Analysis for {person}</h2>
      {data.length > 0 ? (
        <div>
          <h3 style={{ textAlign: 'center', color: '#444' }}>Sentiment by Week</h3>
          <Bar data={chartData} options={chartOptions} />
        </div>
      ) : (
        <p>No sentiment data available.</p>
      )}
    </div>
  );
};

export default SentimentAnalysis;
