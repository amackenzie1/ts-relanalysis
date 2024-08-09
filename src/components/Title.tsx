import React from 'react';

const Title = () => {
  return (
    <div className="text-center py-4">
      <h1 className="text-4xl font-bold">
        Welcome to{' '}
        <span
          style={{
            position: 'relative',
            fontWeight: '800',
            fontFamily: "'Comfortaa', sans-serif",
            padding: '0.1em 0.2em',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'black',
              borderRadius: '0.1em',
              zIndex: -1,
            }}
          />
          <span
            style={{
              background: 'linear-gradient(to right, #3B82F6, #00C4FF, #60A5FA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Mosaic
          </span>
        </span>
      </h1>
    </div>
  );
};

export default Title;