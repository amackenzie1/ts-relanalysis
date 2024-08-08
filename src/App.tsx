import React, { useMemo, useState } from 'react'
import FileUploadAndParse from './components/FileUploadAndParse'
import WordCloudComponent from './components/WordCloudComponent'
import { analyzeText } from './utils/textAnalysis'
import { ChatMessage } from './utils/types'
import BubbleBackground from './components/BubbleBackground'
import Title from './components/Title'

const App: React.FC = () => {
  const [parsedData, setParsedData] = useState<ChatMessage[] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const analysisResult = useMemo(() => {
    if (parsedData) {
      return analyzeText(parsedData)
    }
    return null
  }, [parsedData])

  const handleParseComplete = (data: ChatMessage[]) => {
    setParsedData(data)
    setIsLoading(false)
  }

  const handleUploadStart = () => {
    setUploadStatus('Uploading to S3...')
  }

  const handleUploadComplete = (hash: string) => {
    setUploadStatus(`File uploaded successfully: ${hash}`)
  }

  const handleUploadError = (error: Error) => {
    setUploadStatus(`Upload failed: ${error.message}`)
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div className="spinner" />
      </div>
    )
  }

  return (
    <>
      {parsedData !== null && <BubbleBackground />}
      <div style={{ padding: '10px' }}>
        {parsedData !== null && <Title />}  {/* Add the Title component here */}
        {parsedData === null ? (
          <FileUploadAndParse
            onParseComplete={handleParseComplete}
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        ) : (
          analysisResult && (
            <WordCloudComponent
              analysisResult={analysisResult}
              color1="#007bff"
              color2="#28a745"
            />
          )
        )}
      </div>
    </>
  )
}

const styles = `
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #007bff;
    animation: spin 1s ease infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`

const AppWithStyles = () => (
  <>
    <style>{styles}</style>
    <App />
  </>
)

export default AppWithStyles