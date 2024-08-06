import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import React from 'react'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface SentimentAnalysisProps {
  data: { week: string; sentiment1: number; sentiment2: number }[]
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
        text: 'Weekly Sentiment Scores',
      },
    },
  }

  const chartData = {
    labels: data.map((entry) => entry.week),
    datasets: [
      {
        label: 'Person 1 Sentiment',
        data: data.map((entry) => entry.sentiment1),
        backgroundColor: 'rgba(255, 99, 132, 0.6)', // Red
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
      {
        label: 'Person 2 Sentiment',
        data: data.map((entry) => entry.sentiment2),
        backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  }

  return (
    <div style={{ height: '100%', width: '90%' }}>
      <Bar data={chartData} options={chartOptions} />
    </div>
  )
}
export default SentimentAnalysis