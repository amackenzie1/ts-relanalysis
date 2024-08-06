import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import SentimentAnalysis from './components/SentimentAnalysis'
import WordCloudComponent from './components/WordCloudComponent'

interface WordData {
  text: string
  value: number
}

interface AnalysisResult {
  person1: string
  person2: string
  topWords1: WordData[]
  topWords2: WordData[]
}

interface CellProps {
  title: string
  children: React.ReactNode
  fullWidth?: boolean
}

const Cell: React.FC<CellProps> = ({ title, children, fullWidth = false }) => (
  <div style={{ ...cellStyle, ...(fullWidth ? fullWidthCellStyle : {}) }}>
    <h3 style={{ textAlign: 'center', marginBottom: '5px' }}>{title}</h3>
    {children}
  </div>
)

const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  )
  const [sentimentData, setSentimentData] = useState<
    { week: string; sentiment: number }[]
  >([])

  const handleAnalysisResults = (result: AnalysisResult) => {
    console.log('Analysis Result:', result)
    setAnalysisResult(result)
  }

  const handleSentimentData = (data: { week: string; sentiment: number }[]) => {
    console.log('Sentiment Data:', data)
    setSentimentData(data)
  }

  if (!analysisResult) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <FileUpload
          onAnalysisComplete={handleAnalysisResults}
          onSentimentAnalysisComplete={handleSentimentData}
        />
      </div>
    )
  }

  return (
      <div style={containerStyle}>
        {(['person1', 'person2'] as const).map((person, index) => (
          <div key={person} style={columnStyle}>
            <Cell title={`${analysisResult[person]}'s Word Cloud`}>
              <WordCloudComponent
                data={
                  analysisResult[
                    `topWords${index + 1}` as 'topWords1' | 'topWords2'
                  ]
                }
                color={index === 0 ? '#007bff' : '#28a745'}
                title={`Top words for ${analysisResult[person]}`}
              />
            </Cell>
          </div>
        ))}
        <Cell title="Analysis" fullWidth={true}>
          <SentimentAnalysis data={sentimentData} />
        </Cell>
      </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  height: '100vh',
  padding: '2px',
}

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 0 50%',
}

const cellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
  margin: '2px',
  padding: '2px',
  backgroundColor: '#f0f0f0',
  borderRadius: '8px',
}

const fullWidthCellStyle: React.CSSProperties = {
  flex: '1 0 100%',
}

export default App
