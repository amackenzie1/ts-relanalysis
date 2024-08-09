import { format, startOfWeek } from 'date-fns'
import React, { useMemo } from 'react'
import {
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
  const { chartData, persons } = useMemo(() => {
    const weeklyData: { [key: string]: { [key: string]: number } } = {}
    const personSet: Set<string> = new Set()

    parsedData.forEach((message) => {
      const weekStart = format(startOfWeek(message.date), 'yyyy-MM-dd')
      const wordCount = message.message.split(/\s+/).length
      personSet.add(message.user)

      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = {}
      }
      weeklyData[weekStart][message.user] =
        (weeklyData[weekStart][message.user] || 0) + wordCount
    })

    const sortedWeeks = Object.keys(weeklyData).sort()
    const filledData = sortedWeeks.map((weekStart) => {
      const weekData: any = { weekStart }
      personSet.forEach((person) => {
        weekData[person] = weeklyData[weekStart][person] || 0
      })
      return weekData
    })

    return { chartData: filledData, persons: Array.from(personSet) }
  }, [parsedData])

  if (chartData.length === 0) {
    return <div>No data available for the chart.</div>
  }

  const [user1, user2] = persons
  const user1Color = '#8884d8'
  const user2Color = '#82ca9d'

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '15px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            fontSize: '14px',
          }}
        >
          <p
            style={{
              fontWeight: 'bold',
              marginBottom: '10px',
              fontSize: '16px',
            }}
          >
            {`Week of ${format(new Date(label), 'MMM d, yyyy')}`}
          </p>
          <p
            style={{ margin: '5px 0', color: user1Color }}
          >{`${user1}: ${data[user1]} words`}</p>
          <p
            style={{ margin: '5px 0', color: user2Color }}
          >{`${user2}: ${data[user2]} words`}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className="word-count-chart-container"
      style={{
        width: '100%',
        height: '400px',
        paddingBottom: '80px',
        color: 'black',
      }}
    >
      <h2 className="text-2xl font-bold mb-4">Engagement</h2>
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
          <XAxis
            dataKey="weekStart"
            stroke="black"
            strokeWidth={2}
            tick={{ fill: 'black' }}
          />
          <YAxis stroke="black" strokeWidth={2} tick={{ fill: 'black' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey={user1}
            name={user1}
            stroke={user1Color}
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey={user2}
            name={user2}
            stroke={user2Color}
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WordCountChart
