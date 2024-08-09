import axios from 'axios'
import React, { useEffect, useMemo, useState } from 'react'
import { ChatMessage } from '../utils/types'
import './MetricSwitcher.css'

interface MetricSwitcherProps {
  chatData: ChatMessage[]
}

const parseDuration = (durationStr: string): number => {
  const parts = durationStr.split(' ')
  let totalSeconds = 0
  for (let i = 0; i < parts.length; i += 2) {
    const value = parseInt(parts[i])
    const unit = parts[i + 1].toLowerCase()
    if (unit.startsWith('hr')) totalSeconds += value * 3600
    else if (unit.startsWith('min')) totalSeconds += value * 60
    else if (unit.startsWith('sec')) totalSeconds += value
  }
  return totalSeconds
}

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}:${String(seconds).padStart(2, '0')}`
}

const videoCallPatterns = [
  /video call.*?(\d+\s*(?:hr|min|sec))/i,
  /video chat.*?(\d+\s*(?:hr|min|sec))/i,
]

const voiceCallPatterns = [
  /voice call.*?(\d+\s*(?:hr|min|sec))/i,
  /audio call.*?(\d+\s*(?:hr|min|sec))/i,
  /call.*?(\d+\s*(?:hr|min|sec))/i,
]

const missedCallPatterns = [
  /missed video call/i,
  /missed voice call/i,
  /missed call/i,
  /no answer/i,
  /missed group voice call/i,
]

const MetricSwitcher: React.FC<MetricSwitcherProps> = ({ chatData }) => {
  const [unidentifiedCalls, setUnidentifiedCalls] = useState<string[]>([])
  const [potentialMissedCalls, setPotentialMissedCalls] = useState<string[]>([])
  const [filteredCommonMessages, setFilteredCommonMessages] = useState<
    [string, number][]
  >([])

  const calculateMostCommonMessages = useMemo(() => {
    const commonSystemMessages = [
      'image absente',
      'vidéo absente',
      'audio omis',
      'vous avez supprimé ce message',
      'image omitted',
      'video omitted',
      'audio omitted',
      'you deleted this message',
      '<media omitted>',
      'null',
      'missed video call',
      'missed voice call',
      'missed call',
      'no answer',
      'missed group voice call',
      'sticker omitted',
    ]

    const messageCounts = chatData.reduce((acc, message) => {
      const content = message.message.trim().toLowerCase()
      if (
        content !== '' &&
        content.length > 1 &&
        !commonSystemMessages.some((sysMsg) => content.includes(sysMsg))
      ) {
        acc[content] = (acc[content] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return Object.entries(messageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
  }, [chatData])

  const filterSystemMessages = async (messages: [string, number][]) => {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                "You are an AI assistant that filters out system messages and variations of 'omitted' messages from a list of common chat messages.",
            },
            {
              role: 'user',
              content: `Filter out system messages and variations of "video absent, call missed, supprime message, omitted/omis message" as well as boring words like "yes" or other casual things people say from this list. Return only the filtered list of interest word messages with their counts, separated by newlines:\n\n${messages
                .map(([msg, count]) => `${msg}: ${count}`)
                .join('\n')}`,
            },
          ],
          temperature: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('GPT Response:', response.data.choices[0].message.content)

      // Add a delay to ensure the model has time to process
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const filteredMessages = response.data.choices[0].message.content
        .split('\n')
        .map((line: string) => {
          const [msg, countStr] = line.split(': ')
          return [msg.trim(), parseInt(countStr.trim())] as [string, number]
        })
        .filter(([msg, count]: [string, number]) => msg && !isNaN(count))

      console.log('Filtered Messages:', filteredMessages)

      if (filteredMessages.length === 0) {
        console.warn(
          'GPT filtered out all messages or returned an empty response. Using original list.'
        )
        setFilteredCommonMessages(messages)
      } else {
        setFilteredCommonMessages(filteredMessages)
      }
    } catch (error) {
      console.error('Error filtering system messages:', error)
      setFilteredCommonMessages(messages)
    }
  }

  useEffect(() => {
    filterSystemMessages(calculateMostCommonMessages)
  }, [calculateMostCommonMessages])

  const calculateCallTimes = useMemo(() => {
    let videoCallSeconds = 0
    let voiceCallSeconds = 0
    let missedCalls = 0
    const missedCallMessages: string[] = []

    chatData.forEach((message) => {
      const content = message.message

      for (const pattern of videoCallPatterns) {
        const match = content.match(pattern)
        if (match) {
          videoCallSeconds += parseDuration(match[1])
          break
        }
      }

      for (const pattern of voiceCallPatterns) {
        const match = content.match(pattern)
        if (match) {
          voiceCallSeconds += parseDuration(match[1])
          break
        }
      }

      for (const pattern of missedCallPatterns) {
        if (pattern.test(content)) {
          missedCalls++
          missedCallMessages.push(content)
          break
        }
      }
    })

    setPotentialMissedCalls(missedCallMessages)

    return {
      videoCallTime: formatDuration(videoCallSeconds),
      voiceCallTime: formatDuration(voiceCallSeconds),
      missedCalls,
    }
  }, [chatData])

  useEffect(() => {
    const identifyUnknownCallTypes = async () => {
      const potentialCallMessages = chatData.filter(
        (message) =>
          message.message.toLowerCase().includes('call') &&
          ![
            ...videoCallPatterns,
            ...voiceCallPatterns,
            ...missedCallPatterns,
          ].some((pattern) => pattern.test(message.message))
      )

      if (potentialCallMessages.length > 0) {
        try {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an AI assistant that identifies potential call-related messages in a chat log.',
                },
                {
                  role: 'user',
                  content: `Identify any messages that might be related to calls but aren't captured by our existing patterns. Only return the identified messages, one per line. Here are the messages to analyze:\n\n${potentialCallMessages
                    .map((m) => m.message)
                    .join('\n')}`,
                },
              ],
              temperature: 0,
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          )

          const identifiedCalls = response.data.choices[0].message.content
            .split('\n')
            .filter(Boolean)
          setUnidentifiedCalls(identifiedCalls)
        } catch (error) {
          console.error('Error identifying unknown call types:', error)
        }
      }
    }

    identifyUnknownCallTypes()
  }, [chatData])

  const metrics = useMemo(() => {
    if (filteredCommonMessages.length > 0) {
      return [
        `You spent ${calculateCallTimes.videoCallTime} Video Calling`,
        `You spent ${calculateCallTimes.voiceCallTime} on the Phone`,
        `You missed ${calculateCallTimes.missedCalls} Calls :( `,
        `You said "${filteredCommonMessages[0][0]}" ${filteredCommonMessages[0][1]} times!`,
      ]
    } else {
      return [
        `Total Video Call Time: ${calculateCallTimes.videoCallTime}`,
        `Total Voice Call Time: ${calculateCallTimes.voiceCallTime}`,
        `Missed Calls: ${calculateCallTimes.missedCalls}`,
        'No common messages found',
      ]
    }
  }, [filteredCommonMessages, calculateCallTimes])

  const [currentMetricIndex, setCurrentMetricIndex] = useState(0)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMetricIndex((prevIndex) => (prevIndex + 1) % metrics.length)
    }, 5000)
    return () => clearInterval(intervalId)
  }, [metrics.length])

  // Log all relevant information once
  useEffect(() => {
    console.log('Chat Analysis Results:')
    console.log(
      'Top 20 most common messages (before GPT filtering):',
      calculateMostCommonMessages
    )
    console.log(
      'Top common messages (after GPT filtering):',
      filteredCommonMessages
    )
    console.log('Call Times:', calculateCallTimes)
    console.log('Potential Missed Calls:', potentialMissedCalls)
    console.log('GPT-identified potential call messages:', unidentifiedCalls)
  }, [
    calculateMostCommonMessages,
    filteredCommonMessages,
    calculateCallTimes,
    potentialMissedCalls,
    unidentifiedCalls,
  ])

  return (
    <div className="metric-switcher">
      <div className="fade-in">{metrics[currentMetricIndex]}</div>
    </div>
  )
}

export default MetricSwitcher
