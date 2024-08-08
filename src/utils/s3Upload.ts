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

const getS3Client = async () => {
  try {
    const cognitoClient = new CognitoIdentityClient({ region: REGION })
    const { IdentityId } = await cognitoClient.send(
      new GetIdCommand({ IdentityPoolId: IDENTITY_POOL_ID })
    )

    if (!IdentityId) {
      throw new Error('Failed to get IdentityId')
    }

    const { Credentials } = await cognitoClient.send(
      new GetCredentialsForIdentityCommand({ IdentityId })
    )

    if (!Credentials) {
      throw new Error('Failed to get Credentials')
    }

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
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const binary = e.target?.result
      if (typeof binary === 'string') {
        const hash = SHA256(binary)
        const hashString = hash.toString(Hex)
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
  try {
    const client = await getS3Client()
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })
    const url = await getSignedUrl(client, command, { expiresIn: 3600 })
    return url
  } catch (error) {
    console.error('Error getting presigned URL:', error)
    throw error
  }
}

export const checkFileExists = async (hash: string): Promise<boolean> => {
  try {
    const client = await getS3Client()
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: hash,
      MaxKeys: 1,
    })
    const response = await client.send(command)

    if (response.Contents && response.Contents.length > 0) {
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error('Error checking if file exists:', error)
    throw error
  }
}

export const uploadToS3 = async (file: File, hash: string): Promise<string> => {
  console.log("uploading to s3")
  if (process.env.TESTING === '1') {
    console.log("did not upload because of testing")
    return hash
  }
  const fileExists = await checkFileExists(hash)
  if (fileExists) {
    console.log("did not upload because file exists")
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
    const response = await client.send(command)
    console.log('S3 upload response:', response)
    return hash
  } catch (err) {
    console.error('Error uploading file to S3:', err)
    throw err
  }
}

// Test function to check Cognito credentials
export const testCognitoCredentials = async () => {
  try {
    const client = new CognitoIdentityClient({ region: REGION })

    const { IdentityId } = await client.send(
      new GetIdCommand({ IdentityPoolId: IDENTITY_POOL_ID })
    )

    if (!IdentityId) {
      throw new Error('Failed to get IdentityId')
    }

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
