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

interface IndividualWordCloudProps {
  person: string
  words: { text: string; value: number }[]
  color: string
}

const IndividualWordCloud: React.FC<IndividualWordCloudProps> = ({
  person,
  words,
  color,
}) => {
  const fontSizeMapper = (word: { value: number }) => {
    return word.value * 2000 + 5
    // return Math.sqrt(word.value) * 300 + 5
    // return Math.log(1 + 50 * word.value) * 80 + 5
  }

  return (
    <div style={{ minWidth: '48%', margin: '10px' }}>
      <h3 style={{ textAlign: 'center', color: '#555' }}>
        {person}'s Top Words
      </h3>
      <div
        style={{
          width: '100%',
          border: `2px solid ${color}`,
          borderRadius: '8px',
          padding: '2px',
          boxSizing: 'border-box',
          backgroundColor: 'white',
        }}
      >
        <WordCloud
          data={words}
          fontSize={fontSizeMapper}
          rotate={0}
          padding={2}
        />
      </div>
    </div>
  )
}

const WordCloudComponent: React.FC<WordCloudComponentProps> = React.memo(
  ({ analysisResult, color1, color2 }) => {
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
          justifyContent: 'space-evenly',
          margin: '20px 0',
        }}
      >
        <IndividualWordCloud
          person={analysisResult.person1}
          words={normalizedWords.topWords1}
          color={color1}
        />
        <IndividualWordCloud
          person={analysisResult.person2}
          words={normalizedWords.topWords2}
          color={color2}
        />
      </div>
    )
  }
)

export default WordCloudComponent
