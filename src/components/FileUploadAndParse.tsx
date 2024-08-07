import { Loader2, Upload } from 'lucide-react'
import React, { useState } from 'react'
import { ChatMessage } from '../utils/types'
import { parse } from '../utils/universal'

interface FileUploadAndParseProps {
  onParseComplete: (data: ChatMessage[]) => void
}

const FileUploadAndParse: React.FC<FileUploadAndParseProps> = ({
  onParseComplete,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)

    try {
      const text = await file.text()
      const parsedData = await parse(text)
      onParseComplete(parsedData)
    } catch (error) {
      console.error('Error parsing file:', error)
      // Optionally, you can handle the error here (e.g., show an error message)
    } finally {
      setIsLoading(false)
    }
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
        <Loader2
          className="spinner"
          style={{ width: '3rem', height: '3rem' }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '1.2rem',
        }}
      >
        <Upload
          style={{ width: '3rem', height: '3rem', marginBottom: '1rem' }}
        />
        Upload File
        <input
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </label>
    </div>
  )
}

export default FileUploadAndParse
