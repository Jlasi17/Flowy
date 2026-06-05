/* eslint-disable */
import { useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ArtGallerySymbol, RED_SHADES } from "./QuestComponents";
import { useAuth } from "../contexts/AuthContext";
import { DataContext } from "../contexts/DataContext";
import GroupAdminModal from "./GroupAdminModal";
import "./GroupAdminModal.css";

const defaultGroups = [
  { id: "bts", img: "/homeimage/btsopening.jpg", bg: "/homeimage/btsbackground.webp", audio: "/openingaudio/btsopening.mp3" },
  { id: "txt", img: "/homeimage/txtopening.jpg", bg: "/homeimage/txtbg.jpg", audio: "/openingaudio/txtopening.mp3" },
  { id: "enhypen", img: "/homeimage/enopening.jpg", bg: "/homeimage/enbg.jpeg", audio: "/openingaudio/enopening.mp3" },
  { id: "seventeen", img: "/homeimage/seventeenopening.jpg", bg: "/homeimage/seventeenbg.jpg", audio: "/openingaudio/seventeen.mp3" },
  { id: "lesserafim", img: "/homeimage/lesserafimopening.jpg", bg: "/homeimage/lesserafimbg.webp", audio: "/openingaudio/lesserafim.mp3" },
  { id: "katseye", img: "/homeimage/katseyeopening.jpg", bg: "/homeimage/katseyebg.jpg", audio: "/openingaudio/katseye.mp3" },
  { id: "illit", img: "/homeimage/illitopening.jpg", bg: "/homeimage/illitbg.jpg", audio: "/openingaudio/illit.mp3" },
  { id: "newjeans", img: "/homeimage/newjeansopening.jpg", bg: "/homeimage/newjeansbg.jpg", audio: "/openingaudio/newjeans.mp3" }
];

function CardSection() {
  const [bgImage, setBgImage] = useState("");
  const audioRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { data, refreshData, loading } = useContext(DataContext);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  // Compute dynamic groups from context + fallbacks
  const groupsList = [];
  if (data) {
    Object.keys(data).forEach(key => {
      const gData = data[key];
      const fallback = defaultGroups.find(g => g.id === key) || {};
      groupsList.push({
        id: key,
        title: gData.title || key,
        img: gData.homeImg || fallback.img || "",
        bg: gData.homeBg || fallback.bg || "",
        audio: gData.homeAudio || fallback.audio || ""
      });
    });
  } else {
    // fallback if data not loaded yet
    defaultGroups.forEach(g => groupsList.push(g));
  }

  const handleEnter = (bg, audioSrc) => {
    setBgImage(bg);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioSrc) {
      const audio = new Audio(audioSrc);
      audio.loop = true;
      audio.volume = 0.4;
      audio.play().catch(e => console.log("Audio play prevented:", e));
      audioRef.current = audio;
    }
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

  const handleSaveGroup = async (formData) => {
    // Merge new group data into existing data
    const newData = { ...data };
    const groupId = formData.id;
    
    if (!newData[groupId]) {
      newData[groupId] = { albums: [], soloists: [], soloAlbums: [], songs: {}, soloSongs: {} };
    }
    newData[groupId].title = formData.title;
    if (formData.imgUrl) newData[groupId].homeImg = formData.imgUrl;
    if (formData.bgUrl) newData[groupId].homeBg = formData.bgUrl;
    if (formData.audioUrl) newData[groupId].homeAudio = formData.audioUrl;
    
    try {
      const res = await fetch("http://localhost:8000/api/admin/save-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData)
      });
      if (res.ok) {
        refreshData();
      }
    } catch (err) {
      console.error("Failed to save registry", err);
    }
  };

  const openEditModal = (e, group) => {
    e.stopPropagation();
    setEditingGroup({
      id: group.id,
      title: group.title || group.id,
      imgUrl: group.img,
      bgUrl: group.bg,
      audioUrl: group.audio
    });
    setModalOpen(true);
  };

  const openAddModal = () => {
    setEditingGroup(null);
    setModalOpen(true);
  };

  if (loading) return null;

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
          style={{ boxShadow: '0 8px 25px rgba(0,0,0,0.5)', transform: 'rotate(2deg)' }} 
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
        {groupsList.map((group) => (
          <div
            key={group.id}
            className="card"
            onMouseEnter={() => handleEnter(group.bg, group.audio)}
            onMouseLeave={handleLeave}
            onClick={() => handleClick(group.id)}
            style={{ position: 'relative' }}
          >
            <img src={group.img} alt={group.id} />
            {/* Edit Button */}
            {isAdmin && (
              <button 
                className="admin-edit-btn"
                onClick={(e) => openEditModal(e, group)}
                aria-label="Edit Group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
            )}
          </div>
        ))}

        {/* Add Group Glass Card */}
        {isAdmin && (
          <div 
            className="card add-group-card" 
            onClick={openAddModal}
          >
            <div className="add-group-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>New Group</span>
            </div>
          </div>
        )}
      </div>

      <GroupAdminModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        initialData={editingGroup}
        onSave={handleSaveGroup}
      />
    </section>
  );
}

export default CardSection;