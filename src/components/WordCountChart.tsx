import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChatMessage } from '../utils/types';

interface WordCountChartProps {
  parsedData: ChatMessage[];
}

const WordCountChart: React.FC<WordCountChartProps> = ({ parsedData }) => {
  const chartData = useMemo(() => {
    const counters: { [key: string]: { [key: string]: number } } = {};
    let personA: string | null = null;
    let personB: string | null = null;

    parsedData.forEach((message) => {
      const date = new Date(message.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const wordCount = message.message.split(/\s+/).length;

      if (!personA) {
        personA = message.user;
      } else if (!personB && message.user !== personA) {
        personB = message.user;
      }

      const currentPerson = message.user === personA ? 'A' : 'B';

      if (!counters[month]) {
        counters[month] = { A: 0, B: 0 };
      }
      counters[month][currentPerson] += wordCount;
    });

    // Sort the months and fill in any missing months
    const sortedMonths = Object.keys(counters).sort();
    const filledData = [];
    for (let i = 0; i < sortedMonths.length; i++) {
      const currentMonth = sortedMonths[i];
      filledData.push({
        month: currentMonth,
        [personA!]: counters[currentMonth].A || 0,
        [personB!]: counters[currentMonth].B || 0,
      });

      // If it's not the last month, fill in any missing months
      if (i < sortedMonths.length - 1) {
        const nextMonth = new Date(currentMonth + '-01');
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const expectedNextMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

        if (expectedNextMonth !== sortedMonths[i + 1]) {
          filledData.push({
            month: expectedNextMonth,
            [personA!]: 0,
            [personB!]: 0,
          });
        }
      }
    }

    return filledData;
  }, [parsedData]);

  if (chartData.length === 0) {
    return <div>No data available for the chart.</div>;
  }

  const personA = Object.keys(chartData[0]).find(key => key !== 'month' && key !== 'B');
  const personB = Object.keys(chartData[0]).find(key => key !== 'month' && key !== personA);

  return (
    <div className="word-count-chart-container" style={{ width: '100%', height: '400px' }}>
      <h2 className="text-2xl font-bold mb-4">Word Count Per Person by Month</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={personA!} stroke="#8884d8" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey={personB!} stroke="#82ca9d" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WordCountChart;