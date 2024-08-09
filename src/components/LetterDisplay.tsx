import { useState } from 'react'

const LetterDisplay = ({
  letter,
  type,
  significance,
}: {
  letter: string
  type: string
  significance: string[]
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const getLetterColor = (
    letter: string,
    type: string,
    significance: string[]
  ) => {
    const colors = {
      certain: '#3B82F6',
      likelyCertain: '#00C4FF',
      somewhatCertain: '#60A5FA',
      uncertain: '#82ca9d',
    }
    if (significance.includes(letter)) return colors.uncertain
    if (letter === type[0] || letter === type[3]) return colors.certain
    if (letter === type[1]) return colors.likelyCertain
    return colors.somewhatCertain
  }

  return (
    <div
      style={{
        color: getLetterColor(letter, type, significance),
        position: 'relative',
        display: 'inline-block',
      }}
      onMouseEnter={() => {
        console.log('Hovered!')
        setIsHovered(true)
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {letter}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '0%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          Certainty: {significance.find((s) => s.includes(letter))?.split('-')[1]}
        </div>
      )}
    </div>
  )
}

export default LetterDisplay
