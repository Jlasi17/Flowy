import { useState, useRef, useContext } from 'react';
import { AudioContext } from '../AudioPlayerProvider';
import './KaraokeButton.css';

export default function KaraokeButton({ isActive, onClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const starsRef = useRef([]);
  
  // AudioContext might be undefined if used outside provider (though unlikely here)
  const context = useContext(AudioContext);
  const isProcessingBg = context?.karaokeStatus === 'processing' && context?.isKaraokeMinimized;

  // Pre-calculate random positions for burst stars
  if (starsRef.current.length === 0) {
    starsRef.current = Array.from({ length: 8 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 40; // travel distance
      
      const dx = (Math.cos(angle) * distance).toFixed(1) + 'px';
      const dy = (Math.sin(angle) * distance).toFixed(1) + 'px';
      const rot = Math.floor(Math.random() * 360) + 'deg';
      const delay = (Math.random() * 0.2).toFixed(2) + 's';

      return {
        id: i,
        style: {
          '--dx': dx,
          '--dy': dy,
          '--rot': rot,
          animationDelay: delay
        }
      };
    });
  }

  return (
    <div 
      className="karaoke-btn-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isProcessingBg && (
        <div className="karaoke-bg-badge">
          <div className="karaoke-bg-badge-pulse" />
        </div>
      )}
      
      {/* Shoot burst stars from center on hover */}
      <div className="karaoke-burst-container">
        {starsRef.current.map(star => (
          <div 
            key={star.id} 
            className={`karaoke-burst-star ${isHovered ? 'shoot' : ''}`}
            style={star.style}
          >
            ✦
          </div>
        ))}
      </div>

      <button className={`karaoke-uiverse-btn ${isActive ? 'toggled-off' : ''}`} onClick={onClick}>
        <div className="dots_border"></div>

        {/* Restored permanent SVG Sparkles */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="sparkle"
        >
          <path
            className="path"
            strokeLinejoin="round"
            strokeLinecap="round"
            stroke="black"
            fill="black"
            d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z"
          ></path>
          <path
            className="path"
            strokeLinejoin="round"
            strokeLinecap="round"
            stroke="black"
            fill="black"
            d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z"
          ></path>
          <path
            className="path"
            strokeLinejoin="round"
            strokeLinecap="round"
            stroke="black"
            fill="black"
            d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z"
          ></path>
        </svg>

        {/* Instead of "Karaoke Mode", show "exit karaoke" if active */}
        <span className="text_button">
          <span className="karaoke-text">
            {isActive ? 'exit karaoke' : 'karaoke mode'}
          </span>
          <span className="karaoke-icon">
            <svg viewBox="0 0 206.886 206.886" width="20" height="20" fill="currentColor">
              <path d="M52.396,206.886c-8.4,0-16.298-3.271-22.237-9.211c-5.94-5.94-9.211-13.837-9.211-22.237c0-8.4,3.271-16.297,9.211-22.237 l7.604-7.604l-2.872-2.872c-5.27-5.27-5.443-13.692-0.394-19.173l49.225-53.438c-1.568-2.716-1.303-6.235,0.854-8.692l24.493-27.883 c1.11-8.494,4.894-16.174,10.967-22.248c15.052-15.052,39.544-15.052,54.596,0c7.292,7.292,11.308,16.986,11.308,27.298 c0,10.312-4.016,20.006-11.308,27.298c-6.073,6.074-13.754,9.857-22.248,10.968l-27.883,24.492 c-2.457,2.158-5.976,2.423-8.691,0.854L62.37,151.424c-5.481,5.049-13.903,4.876-19.173-0.394l-2.606-2.606l-7.604,7.604 c-10.702,10.702-10.702,28.116,0,38.818c5.185,5.184,12.077,8.04,19.409,8.04c7.332,0,14.225-2.855,19.409-8.04l55.149-55.149 c9.824-9.824,25.81-9.824,35.634,0c9.825,9.824,9.825,25.81,0,35.634l-15.229,15.229c-0.78,0.781-2.047,0.781-2.828,0 c-0.781-0.781-0.781-2.047,0-2.828l15.229-15.229c4.003-4.004,6.208-9.327,6.208-14.989c0-5.662-2.205-10.985-6.208-14.988 c-8.264-8.264-21.712-8.265-29.978,0l-55.149,55.149C68.693,203.615,60.796,206.886,52.396,206.886z M42.023,144.2l4.002,4.002 c3.747,3.746,9.737,3.871,13.635,0.279l54.664-50.353c0.79-0.726,2.011-0.702,2.769,0.057c1.297,1.296,3.39,1.364,4.768,0.154 l26.997-23.714l-37.563-37.563L87.581,64.06c-1.209,1.377-1.142,3.472,0.154,4.767c0.759,0.759,0.784,1.98,0.057,2.77L37.439,126.26 c-3.591,3.898-3.468,9.887,0.28,13.635l4.268,4.268c0.006,0.006,0.012,0.012,0.018,0.018 C42.012,144.188,42.017,144.194,42.023,144.2z M113.148,33.258l39.515,39.515c7.295-1.122,13.889-4.464,19.141-9.716 c13.493-13.493,13.493-35.447,0-48.94c-13.494-13.493-35.448-13.492-48.94,0C117.612,19.37,114.27,25.964,113.148,33.258z M92.884,101.044c-2.036,0-3.951-0.793-5.391-2.233l-0.383-0.383c-2.972-2.972-2.972-7.808,0-10.78l19.687-19.687 c2.972-2.972,7.809-2.973,10.78,0l0.383,0.382c2.973,2.973,2.973,7.809,0.001,10.781L98.274,98.81h0 C96.835,100.25,94.92,101.044,92.884,101.044z M112.187,69.729c-0.928,0-1.855,0.353-2.562,1.06L89.939,90.475 c-1.413,1.413-1.413,3.711,0,5.124l0.383,0.383c1.369,1.369,3.755,1.369,5.124,0h0l19.687-19.687 c0.684-0.685,1.061-1.594,1.061-2.562s-0.377-1.877-1.061-2.562l-0.383-0.382C114.043,70.083,113.115,69.729,112.187,69.729z M93.103,94.818c-0.512,0-1.024-0.195-1.414-0.586c-0.781-0.781-0.781-2.047,0-2.828l3.181-3.181c0.78-0.781,2.048-0.781,2.828,0 c0.781,0.781,0.781,2.047,0,2.828l-3.181,3.181C94.127,94.622,93.615,94.818,93.103,94.818z M164.868,22.684 c-0.512,0-1.024-0.195-1.414-0.586c-8.99-8.989-23.618-8.991-32.609,0c-0.78,0.781-2.048,0.781-2.828,0 c-0.781-0.781-0.781-2.047,0-2.828c10.551-10.55,27.717-10.549,38.266,0c0.781,0.781,0.781,2.047,0,2.828 C165.892,22.489,165.38,22.684,164.868,22.684z"/>
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}
