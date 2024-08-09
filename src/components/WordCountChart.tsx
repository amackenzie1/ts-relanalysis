import { format } from 'date-fns'
import React, { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChatMessage } from '../utils/types'

interface WordCountChartProps {
  parsedData: ChatMessage[]
}

const WordCountChart: React.FC<WordCountChartProps> = ({ parsedData }) => {
  const chartData = useMemo(() => {
    const counters: { [key: string]: { [key: string]: number } } = {}
    const persons: Set<string> = new Set()

    parsedData.forEach((message) => {
      const monthYear = format(message.date, 'yyyy-MM')
      const wordCount = message.message.split(/\s+/).length

      persons.add(message.user)

      if (!counters[monthYear]) {
        counters[monthYear] = {}
      }
      counters[monthYear][message.user] =
        (counters[monthYear][message.user] || 0) + wordCount
    })

    const sortedMonths = Object.keys(counters).sort()

    const filledData = sortedMonths.map((monthYear) => {
      const monthData: any = { monthYear }
      persons.forEach((person) => {
        monthData[person] = counters[monthYear][person] || 0
      })
      return monthData
    })

    return filledData
  }, [parsedData])

  if (chartData.length === 0) {
    return <div>No data available for the chart.</div>
  }

  const persons = Object.keys(chartData[0]).filter((key) => key !== 'monthYear')

  return (
    <div
      className="word-count-chart-container"
      style={{ width: '100%', height: '400px', paddingBottom: '80px' }}
    >
      <h2 className="text-2xl font-bold mb-4">
        Engagement Chart
      </h2>
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
          <XAxis dataKey="monthYear" />
          <YAxis />
          <Tooltip />
          <Legend />
          {persons.map((person, index) => (
            <Line
              key={person}
              type="monotone"
              dataKey={person}
              stroke={index === 0 ? '#8884d8' : '#82ca9d'}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WordCountChart
