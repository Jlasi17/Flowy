import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioContext } from './AudioPlayerProvider';
import './PlaylistsPage.css';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { likedSongs, setSongs, setAlbumData, setAlbumId, setCurrentIndex, setIsPlaying } = useContext(AudioContext);

  // Extract full song objects from likedSongs dictionary
  const likedSongsArray = Object.values(likedSongs).filter(song => typeof song === 'object' && song.name);

  const playLikedSongs = () => {
    if (likedSongsArray.length === 0) return;
    
    // Map them into the format expected by the player
    const songsToPlay = likedSongsArray.map(s => ({
      ...s,
      filePath: s.filePath // Assumes toggleLike saved the original filePath
    }));

    setSongs(songsToPlay);
    setAlbumData({
      title: 'Liked Songs',
      cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=300&h=300&auto=format&fit=crop', // Placeholder gradient cover is handled in CSS, but this provides a fallback for the player
      member: 'You',
      color: '#ec4899'
    });
    setAlbumId('liked_songs');
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  return (
    <div className="playlists-page">
      <div className="playlists-header">
        <button className="playlists-back" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <h1 className="playlists-title">Your Playlists</h1>
      </div>

      <div className="playlists-grid">
        <div className="playlist-card" onClick={playLikedSongs}>
          <div className="playlist-cover">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <div className="playlist-name">Liked Songs</div>
          <div className="playlist-count">{likedSongsArray.length} tracks</div>
        </div>
      </div>
    </div>
  );
}
