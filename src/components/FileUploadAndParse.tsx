import { Loader2, Upload } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import {
  calculateHash,
  testCognitoCredentials,
  uploadToS3,
} from '../utils/s3Upload'
import { ChatMessage } from '../utils/types'
import { parse } from '../utils/universal'

interface FileUploadAndParseProps {
  onParseComplete: (data: ChatMessage[]) => void
  onUploadStart: () => void
  onUploadComplete: (hash: string) => void
  onUploadError: (error: Error) => void
}

const FileUploadAndParse: React.FC<FileUploadAndParseProps> = ({
  onParseComplete,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const runCognitoTest = async () => {
      try {
        const identityId = await testCognitoCredentials()
      } catch (error) {
        console.error('Cognito credentials test failed:', error)
        setError(
          'Failed to authenticate with Cognito. Please check your configuration.'
        )
      }
    }
    runCognitoTest()
  }, [])

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsLoading(true)
    setError(null)
    try {
      // Calculate hash
      const hash = await calculateHash(file)

      // Parse file contents
      const text = await file.text()
      const parsedData = await parse(text)

      console.log(parsedData)

      // Notify parent that parsing is complete
      onParseComplete(parsedData)

      // Start S3 upload in the background
      onUploadStart()
      uploadToS3(file, hash)
        .then((uploadedHash) => {
          onUploadComplete(uploadedHash)
        })
        .catch((error) => {
          console.error('Error uploading file to S3:', error)
          onUploadError(error)
        })
    } catch (error) {
      console.error('Error processing file:', error)
      setError('Error processing file. Please try again.')
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
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
      )}
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
