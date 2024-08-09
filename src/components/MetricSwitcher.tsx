import React, { useEffect, useMemo, useState } from 'react'
import { ChatMessage } from '../utils/types'

interface MetricSwitcherProps {
  chatData: ChatMessage[]
}

// Helper functions moved outside the component
const parseDuration = (durationStr: string): number => {
  const parts = durationStr.split(' ')
  let totalSeconds = 0
  for (let i = 0; i < parts.length; i += 2) {
    const value = parseInt(parts[i])
    const unit = parts[i + 1]
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

const MetricSwitcher: React.FC<MetricSwitcherProps> = ({ chatData }) => {
  const calculateMostCommonMessage = useMemo(() => {
    const messageCounts = chatData.reduce((acc, message) => {
      const content = message.message.toLowerCase().trim()
      acc[content] = (acc[content] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(messageCounts).reduce(
      (acc, [message, count]) => (count > acc.count ? { message, count } : acc),
      { message: '', count: 0 }
    )
  }, [chatData])

  const calculateTotalVideoCallTime = useMemo(() => {
    const totalSeconds = chatData.reduce((acc, message) => {
      if (
        message.message.toLowerCase().includes('video call') &&
        message.message.toLowerCase().includes('min')
      ) {
        const timeString = message.message.split('‎').pop()?.trim() || ''
        return acc + parseDuration(timeString)
      }
      return acc
    }, 0)
    return formatDuration(totalSeconds)
  }, [chatData])

  const calculateMissedCalls = useMemo(() => {
    return chatData.reduce(
      (acc, message) =>
        message.message.toLowerCase().includes('missed') ? acc + 1 : acc,
      0
    )
  }, [chatData])

  const metrics = useMemo(
    () => [
      `Most Common Message: "${calculateMostCommonMessage.message}" (${calculateMostCommonMessage.count} times)`,
      `Total Video Call Time: ${calculateTotalVideoCallTime}`,
      `Missed Calls: ${calculateMissedCalls}`,
    ],
    [
      calculateMostCommonMessage,
      calculateTotalVideoCallTime,
      calculateMissedCalls,
    ]
  )

  const [currentMetricIndex, setCurrentMetricIndex] = useState(0)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMetricIndex((prevIndex) => (prevIndex + 1) % metrics.length)
    }, 5000)
    return () => clearInterval(intervalId)
  }, [metrics.length])

  return (
    <div className="metric-switcher">
      <div className="fade-in">{metrics[currentMetricIndex]}</div>
    </div>
  )
}

export default MetricSwitcher
