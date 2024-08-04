// src/components/WordCloudComponent.tsx

import React from 'react';
import WordCloud from 'react-d3-cloud';

interface WordCloudComponentProps {
  data: { text: string; value: number }[];
  color: string;
  title: string;
}

const fontSizeMapper = (word: { value: number }) => Math.log2(word.value) * 14 + 2;

const WordCloudComponent: React.FC<WordCloudComponentProps> = ({ data, color, title }) => {
  return (
    <div style={{ width: '45%', minWidth: '300px', margin: '10px' }}>
      <h3 style={{ textAlign: 'center', color: '#555' }}>{title}</h3>
      <div
        style={{
          width: '100%',
          height: '500px',
          border: `2px solid ${color}`,
          borderRadius: '8px',
          padding: '10px',
          boxSizing: 'border-box',
        }}
      >
        <WordCloud data={data} fontSize={fontSizeMapper} rotate={0} padding={2} />
      </div>
    </div>
  );
};

export default WordCloudComponent;
