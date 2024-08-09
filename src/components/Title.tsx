import React from 'react';

const Title = () => {
  return (
    <div className="text-center py-4">
      <h1 className="text-4xl font-bold">
        Welcome to{' '}
        <span
          style={{
            fontWeight: '800',
            background: 'linear-gradient(to right, #3B82F6, #00C4FF, #60A5FA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            fontFamily: "'Comfortaa', sans-serif",
          }}
        >
          Mosaic
        </span>
      </h1>
    </div>
  );
};

export default Title;