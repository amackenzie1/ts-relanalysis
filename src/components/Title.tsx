import React from 'react'

const Title: React.FC = () => {
  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'black' }}>
        Welcome to{' '}
        <span
          style={{
            display: 'inline-block',
            padding: '0 10px',
            backgroundColor: 'black',
            borderRadius: '4px',
          }}
        >
          <span
            style={{
              background: 'linear-gradient(to right, #A78BFA, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Mosaic
          </span>
        </span>
      </h1>
    </div>
  )
}

export default Title
