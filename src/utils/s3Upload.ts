import {
  CognitoIdentityClient,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
} from '@aws-sdk/client-cognito-identity'
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import Hex from 'crypto-js/enc-hex'
import SHA256 from 'crypto-js/sha256'

const REGION = 'us-east-1'
const IDENTITY_POOL_ID = 'us-east-1:58a613d6-6782-4e96-8122-8052d0bd8733'
const BUCKET_NAME = 'relanalysis'

console.log(
  'Initializing S3 client with region:',
  REGION,
  'and identity pool ID:',
  IDENTITY_POOL_ID
)

const getS3Client = async () => {
  console.log('Creating new S3 client...')
  try {
    const cognitoClient = new CognitoIdentityClient({ region: REGION })

    console.log('Getting Identity ID...')
    const { IdentityId } = await cognitoClient.send(
      new GetIdCommand({ IdentityPoolId: IDENTITY_POOL_ID })
    )

    if (!IdentityId) {
      throw new Error('Failed to get IdentityId')
    }

    console.log('Got Identity ID:', IdentityId)

    console.log('Getting credentials for Identity...')
    const { Credentials } = await cognitoClient.send(
      new GetCredentialsForIdentityCommand({ IdentityId })
    )

    if (!Credentials) {
      throw new Error('Failed to get Credentials')
    }

    console.log('Got credentials successfully')

    return new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: Credentials.AccessKeyId!,
        secretAccessKey: Credentials.SecretKey!,
        sessionToken: Credentials.SessionToken,
      },
    })
  } catch (error) {
    console.error('Error creating S3 client:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
    }
    throw error
  }
}

export const calculateHash = async (file: File): Promise<string> => {
  console.log('Calculating hash for file:', file.name)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const binary = e.target?.result
      if (typeof binary === 'string') {
        const hash = SHA256(binary)
        const hashString = hash.toString(Hex)
        console.log('Hash calculated:', hashString)
        resolve(hashString)
      } else {
        console.error('Failed to read file as binary string')
        reject(new Error('Failed to read file as binary string'))
      }
    }
    reader.onerror = (error) => {
      console.error('Error reading file:', error)
      reject(error)
    }
    reader.readAsBinaryString(file)
  })
}

export const getPresignedUrl = async (
  key: string,
  contentType: string
): Promise<string> => {
  console.log(
    'Getting presigned URL for key:',
    key,
    'and content type:',
    contentType
  )
  try {
    const client = await getS3Client()
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })
    const url = await getSignedUrl(client, command, { expiresIn: 3600 })
    console.log('Presigned URL obtained:', url)
    return url
  } catch (error) {
    console.error('Error getting presigned URL:', error)
    throw error
  }
}

export const checkFileExists = async (hash: string): Promise<boolean> => {
  console.log('Checking if file exists with hash:', hash)
  try {
    const client = await getS3Client()
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: hash,
      MaxKeys: 1,
    })
    const response = await client.send(command)

    if (response.Contents && response.Contents.length > 0) {
      console.log('File exists in S3')
      return true
    } else {
      console.log('File does not exist in S3')
      return false
    }
  } catch (error) {
    console.error('Error checking if file exists:', error)
    throw error
  }
}

export const uploadToS3 = async (file: File, hash: string): Promise<string> => {
  console.log('Attempting to upload file:', file.name, 'with hash:', hash)
  const fileExists = await checkFileExists(hash)
  if (fileExists) {
    console.log('File already exists in S3, skipping upload')
    return hash
  }

  try {
    const client = await getS3Client()
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: hash,
      Body: file,
      ContentType: file.type,
      Metadata: {
        'original-filename': file.name,
      },
    })

    console.log('Sending PutObjectCommand...')
    const response = await client.send(command)
    console.log('File uploaded successfully', response)
    return hash
  } catch (err) {
    console.error('Error uploading file to S3:', err)
    throw err
  }
}

// Test function to check Cognito credentials
export const testCognitoCredentials = async () => {
  console.log('Testing Cognito credentials...')
  console.log('Region:', REGION)
  console.log('Identity Pool ID:', IDENTITY_POOL_ID)

  try {
    const client = new CognitoIdentityClient({ region: REGION })

    console.log('Attempting to get Identity ID...')
    const { IdentityId } = await client.send(
      new GetIdCommand({ IdentityPoolId: IDENTITY_POOL_ID })
    )

    if (!IdentityId) {
      throw new Error('Failed to get IdentityId')
    }

    console.log('Successfully obtained IdentityId:', IdentityId)
    console.log('Cognito Identity Pool is correctly configured and accessible.')
    return IdentityId
  } catch (error) {
    console.error('Error obtaining Cognito Identity:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
    }
    throw error
  }
}
