import React, { useState } from 'react'
import Sentiment from 'sentiment'
import { basic, basic_regex } from '../utils/basic'
import { analyzeText } from '../utils/textAnalysis'
import { ChatMessage } from '../utils/types'
import { whatsapp, whatsapp_regex } from '../utils/whatsapp'

// Define the interface for the analysis result
interface AnalysisResult {
  person1: string
  person2: string
  topWords1: { text: string; value: number }[]
  topWords2: { text: string; value: number }[]
}

interface FileUploadProps {
  onAnalysisComplete: (result: AnalysisResult) => void
  onSentimentAnalysisComplete: (
    data: { week: string; sentiment: number }[]
  ) => void
}

const FileUpload: React.FC<FileUploadProps> = ({
  onAnalysisComplete,
  onSentimentAnalysisComplete,
}) => {
  const [error, setError] = useState<string | null>(null)
  const sentiment = new Sentiment()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const content = e.target?.result as string
        let messages: ChatMessage[] = []
        if (content.match(whatsapp_regex)) {
          messages = whatsapp(content)
        } else if (content.match(basic_regex)) {
          messages = basic(content)
        }
        const result = analyzeText(messages)
        setError(null)
        onAnalysisComplete(result)

        // Perform sentiment analysis
        const sentimentData: { week: string; sentiment: number }[] = []
        let currentWeek = ''
        let weekSentiment = 0
        let messageCount = 0

        messages.forEach(({ message, date }) => {
          const week = `${date.getFullYear()}-W${Math.ceil(
            (date.getTime() -
              new Date(date.getFullYear() + '-01-01').getTime()) /
              (1000 * 60 * 60 * 24 * 7)
          )}`
          console.log(week, date)

          if (week !== currentWeek) {
            if (currentWeek !== '') {
              sentimentData.push({
                week: currentWeek,
                sentiment: weekSentiment / messageCount,
              })
            }
            currentWeek = week
            weekSentiment = 0
            messageCount = 0
          }

          const sentimentScore = sentiment.analyze(message).score
          weekSentiment += sentimentScore
          messageCount++
        })

        // Add the last week
        if (messageCount > 10) {
          sentimentData.push({
            week: currentWeek,
            sentiment: weekSentiment / messageCount,
          })
        }
        onSentimentAnalysisComplete(sentimentData)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }
    reader.readAsText(file)
  }

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <h1 style={{ textAlign: 'center', color: '#333' }}>Chat Analysis</h1>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        <input
          type="file"
          onChange={handleFileUpload}
          accept=".txt"
          style={{
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}

export default FileUpload
