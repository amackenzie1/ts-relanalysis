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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface SentimentAnalysisProps {
  data: { week: string; sentiment: number }[];
}

const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ data }) => {
  const chartOptions = {
    responsive: true,
    scales: {
      x: {
        type: 'category' as const,
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
    <div className="sentiment-chart">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export default SentimentAnalysis;