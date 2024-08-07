import React, { useMemo } from 'react'
import WordCloud from 'react-d3-cloud'

interface WordCloudComponentProps {
  analysisResult: {
    person1: string
    person2: string
    topWords1: { text: string; value: number }[]
    topWords2: { text: string; value: number }[]
  }
  color1: string
  color2: string
}

const WordCloudComponent: React.FC<WordCloudComponentProps> = React.memo(
  ({ analysisResult, color1, color2 }) => {
    const fontSizeMapper = (word: { value: number }) =>
      Math.log2(1 + word.value * 600) * 14 + 2

    const normalizedWords = useMemo(() => {
      const total1 = analysisResult.topWords1.reduce(
        (acc, word) => acc + word.value,
        0
      )
      const total2 = analysisResult.topWords2.reduce(
        (acc, word) => acc + word.value,
        0
      )

      return {
        topWords1: analysisResult.topWords1.map((word) => ({
          text: word.text,
          value: word.value / total1,
        })),
        topWords2: analysisResult.topWords2.map((word) => ({
          text: word.text,
          value: word.value / total2,
        })),
      }
    }, [analysisResult])

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          margin: '20px 0',
        }}
      >
        <div style={{ minWidth: '48%', margin: '10px' }}>
          <h3 style={{ textAlign: 'center', color: '#555' }}>
            {analysisResult.person1}'s Top Words
          </h3>
          <div
            style={{
              width: '100%',
              border: `2px solid ${color1}`,
              borderRadius: '8px',
              padding: '2px',
              boxSizing: 'border-box',
            }}
          >
            <WordCloud
              data={normalizedWords.topWords1}
              fontSize={fontSizeMapper}
              rotate={0}
              padding={2}
            />
          </div>
        </div>
        <div style={{ minWidth: '48%', margin: '10px' }}>
          <h3 style={{ textAlign: 'center', color: '#555' }}>
            {analysisResult.person2}'s Top Words
          </h3>
          <div
            style={{
              width: '100%',
              border: `2px solid ${color2}`,
              borderRadius: '8px',
              padding: '2px',
              boxSizing: 'border-box',
            }}
          >
            <WordCloud
              data={normalizedWords.topWords2}
              fontSize={fontSizeMapper}
              rotate={0}
              padding={2}
            />
          </div>
        </div>
      </div>
    )
  }
)

export default WordCloudComponent
