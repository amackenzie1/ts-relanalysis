import { format, startOfWeek } from 'date-fns'
import { OpenAI } from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import React, { useEffect, useMemo, useState } from 'react'
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
import { z } from 'zod'
import { ChatMessage } from '../utils/types'

interface SentimentChartProps {
  parsedData: ChatMessage[]
}

const client = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

const SalientEvent = z.object({
  event: z.string(),
  salience: z.number(),
})

const SentimentResponse = z.object({
  user1_sentiment: z.number(),
  user2_sentiment: z.number(),
  salient_events: z.array(SalientEvent),
})

type SentimentResponseType = z.infer<typeof SentimentResponse>

const SentimentChart: React.FC<SentimentChartProps> = ({ parsedData }) => {
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weeklyData = useMemo(() => {
    const data: { [key: string]: ChatMessage[] } = {}
    const persons: Set<string> = new Set()

    parsedData.forEach((message) => {
      const weekStart = format(startOfWeek(message.date), 'yyyy-MM-dd')
      if (!data[weekStart]) {
        data[weekStart] = []
      }
      data[weekStart].push(message)
      persons.add(message.user)
    })

    return { data, persons: Array.from(persons) }
  }, [parsedData])

  const getSentiment = async (
    weekMessages: ChatMessage[],
    persons: string[]
  ): Promise<SentimentResponseType> => {
    const prompt = `
      Analyze the sentiment of the following chat messages for each user. 
      Rate the sentiment on a scale from -10 (extremely negative) to 10 (extremely positive).
      Also, identify important [influencing the sentiment] events or topics from the conversation, and rate their salience on a scale from 0 to 10. 0 is completely irrelevant, 10 is a dramatic life change, like getting married, 5 is like a party.
      Aim to include events with a salience of 5 or higher. This might be a completely different number of events depending on the week.
      Finally, note that this is targeted at the users themselves, so assume they have all the context and make your responses match their style. Basically they just need to be reminded of what happened. You're talking to them directly. Be casual.
      Chat transcript:
      ${weekMessages.map((m) => `${m.user}: ${m.message}`).join('\n')}

      Provide your answer in the following JSON format:
      {
        "user1_sentiment": number,
        "user2_sentiment": number,
        "salient_events": [
          {
            "event": "One sentence summary of an important event or topic",
            "salience": number
          },
          ...
        ]
      }
    `

    const response = await client.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that analyzes chat sentiment and identifies important events.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: zodResponseFormat(
        SentimentResponse,
        'sentimentResponse'
      ),
      temperature: 0,
    })

    const message = response.choices[0]?.message
    if (message?.parsed) {
      return message.parsed
    }
    throw new Error('Unexpected response from OpenAI API')
  }

  useEffect(() => {
    const fetchSentiments = async () => {
      setLoading(true)
      setError(null)

      try {
        const sentimentPromises = Object.entries(weeklyData.data).map(
          async ([weekStart, messages]) => {
            // ignore weeks with less than 50 words
            const words = messages.reduce(
              (acc, { message }) => acc + message.split(' ').length,
              0
            )
            if (words < 50) {
              return null
            }
            const sentiment = await getSentiment(messages, weeklyData.persons)
            return { weekStart, messageCount: messages.length, ...sentiment }
          }
        )

        const sentiments = await Promise.all(sentimentPromises)
        setChartData(
          sentiments
            .filter(Boolean)
            .sort((a, b) => a!.weekStart.localeCompare(b!.weekStart))
        )
      } catch (err) {
        setError('Failed to fetch sentiment data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchSentiments()
  }, [weeklyData])

  if (loading) {
    return <div>Loading sentiment data...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (chartData.length === 0) {
    return <div>No data available for the chart.</div>
  }

  const [user1, user2] = weeklyData.persons

  const user1Color = '#8884d8'
  const user2Color = '#82ca9d'

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: '12px',
            maxWidth: '250px',
          }}
        >
          <p
            style={{ fontWeight: 'bold', marginBottom: '5px' }}
          >{`Week of ${format(new Date(label), 'MMM d, yyyy')}`}</p>
          <p
            style={{ margin: '2px 0', color: user1Color }}
          >{`${user1}: ${data.user1_sentiment.toFixed(2)}`}</p>
          <p
            style={{ margin: '2px 0', color: user2Color }}
          >{`${user2}: ${data.user2_sentiment.toFixed(2)}`}</p>
          <p
            style={{
              fontWeight: 'bold',
              marginTop: '5px',
              marginBottom: '3px',
            }}
          >
            Salient Events:
          </p>
          <ul
            style={{ listStyleType: 'disc', paddingLeft: '20px', margin: '0' }}
          >
            {data.salient_events.map((event: any, index: number) => (
              <li key={index} style={{ margin: '2px 0' }}>
                {event.event}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className="sentiment-chart-container"
      style={{ width: '100%', height: '400px' }}
    >
      <h2 className="text-2xl font-bold mb-4">Sentiment Analysis by Week</h2>
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
          <XAxis dataKey="weekStart" />
          <YAxis domain={[-10, 10]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="user1_sentiment"
            name={user1}
            stroke={user1Color}
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="user2_sentiment"
            name={user2}
            stroke={user2Color}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SentimentChart
