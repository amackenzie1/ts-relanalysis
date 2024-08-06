import axios from 'axios'
import { ChatMessage } from '../utils/types'

interface SentimentResponse {
  sentiment: string
  score: number
}

async function analyzeSentiment(text: string): Promise<SentimentResponse> {
  const apiKey = ''
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables')
  }

  const messages = [
    {
      role: 'system',
      content:
        "You are a sentiment analysis expert. Analyze the sentiment of the given text and respond with a JSON object containing a 'score' (number between -10 and 10, where -10 is extremely negative, 0 is neutral, and 10 is extremely positive) and a 'sentiment' (string describing the sentiment).",
    },
    { role: 'user', content: text },
  ]

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: messages,
        temperature: 0.5,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    const result = JSON.parse(response.data.choices[0].message.content)

    if (
      typeof result.score !== 'number' ||
      result.score < -10 ||
      result.score > 10
    ) {
      throw new Error(`Invalid sentiment score: ${result.score}`)
    }

    if (
      typeof result.sentiment !== 'string' ||
      result.sentiment.trim() === ''
    ) {
      throw new Error(`Invalid sentiment description: ${result.sentiment}`)
    }

    return {
      sentiment: result.sentiment,
      score: result.score,
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    throw error
  }
}

async function analyzeMultipleSentiments(
  msgs: ChatMessage[]
): Promise<SentimentResponse[]> {
  const analysisPromises = msgs.map(async ({ message }) => {
    return await analyzeSentiment(message)
  })

  return Promise.all(analysisPromises)
}

export { analyzeMultipleSentiments, analyzeSentiment }
