import React from 'react'

const Title: React.FC = () => {
  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
        Welcome to{' '}
        <span
          style={{
            fontWeight: '800',
            background: 'linear-gradient(to right, #A78BFA, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Mosaic
        </span>
      </h1>
    </div>
  )
}

export default Title
