import React, { useState, useEffect, useRef } from 'react';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';

export default function ScrambleText({ text, speed = 30, maxIterations = 15 }) {
  const [displayText, setDisplayText] = useState(text);
  const textRef = useRef(text);

  useEffect(() => {
    // If the text hasn't actually changed, do nothing to prevent unnecessary scrambles
    if (textRef.current === text && displayText === text) return;
    textRef.current = text;
    
    if (!text) {
      setDisplayText('');
      return;
    }

    let iteration = 0;
    const length = text.length;
    let interval = null;

    clearInterval(interval);
    
    interval = setInterval(() => {
      setDisplayText(text.split('').map((char, index) => {
        if (index < iteration) {
          return char;
        }
        if (char === ' ') return ' ';
        return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      }).join(''));

      if (iteration >= length) {
        clearInterval(interval);
        setDisplayText(text); // Ensure exact match at the end
      }
      
      iteration += length / maxIterations;
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, maxIterations]);

  return <span>{displayText}</span>;
}
