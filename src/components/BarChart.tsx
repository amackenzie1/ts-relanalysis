// src/components/BarChart.tsx

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

// Register the required components for Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  data: {
    labels: string[];
    values: number[];
  };
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  // Prepare the data and options for the chart
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Frequency',
        data: data.values,
        backgroundColor: 'rgba(75,192,192,0.6)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <h3 style={{ textAlign: 'center' }}>Word Frequency Bar Chart</h3>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChart;
