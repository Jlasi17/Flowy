import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArtGallerySymbol, RED_SHADES } from "./QuestComponents";

const groups = [
  {
    id: "bts",
    img: "/homeimage/btsopening.jpg",
    bg: "/homeimage/btsbackground.webp",
    audio: "/openingaudio/btsopening.mp3",
  },
  {
    id: "txt",
    img: "/homeimage/txtopening.jpg",
    bg: "/homeimage/txtbg.jpg",
    audio: "/openingaudio/txtopening.mp3",
  },
  {
    id: "enhypen",
    img: "/homeimage/enopening.jpg",
    bg: "/homeimage/enbg.jpeg",
    audio: "/openingaudio/enopening.mp3",
  },
  {
    id: "seventeen",
    img: "/homeimage/seventeenopening.jpg",
    bg: "/homeimage/seventeenbg.jpg",
    audio: "/openingaudio/seventeen.mp3",
  },
  {
    id: "lesserafim",
    img: "/homeimage/lesserafimopening.jpg",
    bg: "/homeimage/lesserafimbg.webp",
    audio: "/openingaudio/lesserafim.mp3",
  },
  {
    id: "katseye",
    img: "/homeimage/katseyeopening.jpg",
    bg: "/homeimage/katseyebg.jpg",
    audio: "/openingaudio/katseye.mp3",
  },
  {
    id: "illit",
    img: "/homeimage/illitopening.jpg",
    bg: "/homeimage/illitbg.jpg",
    audio: "/openingaudio/illit.mp3",
  },
  {
    id: "newjeans",
    img: "/homeimage/newjeansopening.jpg",
    bg: "/homeimage/newjeansbg.jpg",
    audio: "/openingaudio/newjeans.mp3",
  },
];

function CardSection() {
  const [bgImage, setBgImage] = useState("");
  const audioRef = useRef(null);
  const navigate = useNavigate();

  const handleEnter = (bg, audioSrc) => {
    setBgImage(bg);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(audioSrc);
    audio.loop = true;
    audio.volume = 0.4;
    audio.play();
    audioRef.current = audio;
  };

  const handleLeave = () => {
    setBgImage("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handleClick = (id) => {
    setBgImage("");

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch { }
      audioRef.current = null;
    }

    navigate(`/dashboard/${id}`);
  };

  return (
    <section className="card-section">
      {/* Art Gallery Quest Symbol - Top Right */}
      <div 
        className="home-gallery-btn"
        style={{
          position: 'absolute',
          top: '25px',
          right: '40px',
          zIndex: 1000,
          animation: 'mFadeUp 0.8s ease 0.2s both'
        }}
      >
        <ArtGallerySymbol 
          onClick={() => navigate("/gallery")}
          style={{ 
            boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
            transform: 'rotate(2deg)'
          }} 
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)';
            e.currentTarget.style.background = RED_SHADES[5];
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'rotate(2deg) scale(1)';
            e.currentTarget.style.background = RED_SHADES[4];
          }}
        />
      </div>

      <div
        className={`bg-layer ${bgImage ? "active" : ""}`}
        style={{ backgroundImage: bgImage ? `url(${bgImage})` : "none" }}
      />

      <div className="card-grid">
        {groups.map((group) => (
          <div
            key={group.id}
            className="card"
            onMouseEnter={() => handleEnter(group.bg, group.audio)}
            onMouseLeave={handleLeave}
            onClick={() => handleClick(group.id)}
          >
            <img src={group.img} alt={group.id} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default CardSection;