# 🌊 Flowy

A cinematic, gesture-first music experience built for HYBE artists.

Flowy is a premium React-based music player designed around immersion, motion, and emotion.
Built with a strong focus on modern UI/UX, Flowy transforms music listening into a visually rich experience through dynamic animations, synchronized lyrics, cinematic transitions, queue interactions, and responsive mobile-first design.

Inspired by artists under the HYBE label — including BTS, Tomorrow X Together, and LE SSERAFIM — Flowy blends aesthetic storytelling with powerful audio functionality.

---

## ✨ Features

### 🎵 Immersive Music Playback
* Persistent global audio player
* Dynamic queue system with next/previous controls
* Shuffle and repeat modes
* Hidden HTML5 audio engine managed through React Context
* Smooth play/pause morph animations

### 🎤 Real-Time Synced Lyrics
* `.lrc` lyric parsing and synchronization
* Live active-line highlighting
* Member-specific glow colors for group songs
* Clean typography mode for solo tracks
* Karaoke-inspired lyric experience

### 📱 Gesture-First Mobile Experience
* Swipe-to-add queue interactions
* Drag-to-reorder queue system
* Swipe-down dismissible panels
* Horizontal album carousel gestures
* Dynamic Island inspired mini-player for mobile

### 🎨 Cinematic UI & Motion Design
* Glassmorphism and backdrop blur effects
* Dynamic album-based accent theming
* Animated background blobs
* Smooth page transitions
* Framer Motion powered interactions
* 3D rotating album carousel

### 🧠 Advanced Audio Architecture
* Centralized global audio state management
* Context-driven playback engine
* Persistent playback across routes
* Active album context tracking
* Modular React hooks and utilities

### 🖼️ Museum & Gallery Experience
* Dedicated immersive gallery mode
* High-resolution visual exploration UI
* Experimental cinematic layouts

### 🛠️ Lyrics Synchronization Utility
* Internal lyrics syncing tool
* Tap-based timestamp generation
* `.lrc` creation workflow

---

## 🏗️ Tech Stack

**Frontend**
* React
* Vite
* React Router
* Framer Motion

**Backend**
* Python
* Flask / FastAPI

**Styling & UI**
* Custom CSS Architecture
* CSS Variables
* Responsive Media Queries
* Dynamic Theming
* Glassmorphism Effects

---

## 🚀 Core Architectural Highlights

### 🎡 3D Album Carousel
The Dashboard experience uses advanced CSS transforms like:
`translateZ()`, `rotateY()`, `perspective()`
to create a cinematic rotating album showcase.

### 🌈 Dynamic Color System
Each album carries its own accent palette which dynamically themes:
* backgrounds
* glows
* player UI
* lyric highlights
* shadows

### 📲 Responsive UI Shifting
Flowy completely changes interaction patterns depending on screen size.

**Desktop**
* Bottom persistent player
* Wide immersive layouts
* Expanded controls

**Mobile**
* Floating mini-player
* Bottom sheet interactions
* Gesture-heavy navigation
* Dynamic Island inspired playback UI

### 🎭 Motion-Driven UX
Flowy heavily emphasizes animation as part of the experience:
* morphing controls
* fly-to-queue animations
* kinetic transitions
* swipe physics
* smooth route transitions

---

## ⚙️ Installation & Setup

**1. Clone Repository**
```bash
git clone https://github.com/Jlasi17/Flowy.git
cd Flowy
```

**2. Install Frontend Dependencies**
```bash
npm install
```

**3. Install Backend Dependencies**
```bash
cd backend
pip3 install -r requirements.txt
cd ..
```

---

## 📁 Media Setup

Large media assets are excluded from GitHub to keep the repository lightweight.

You must manually place:
* songs
* lyrics
* album covers
* artist images

inside the `public/` directory.
---

## ▶️ Running the Project

**Start Frontend**
```bash
npm run dev
```

**Start Backend**
```bash
cd backend
python3 server.py
# or
./start.sh
```

---

## 📱 PWA Support

Flowy is designed as a Progressive Web App and supports:
* standalone installation
* mobile home screen support
* responsive fullscreen layouts
* app-like mobile behavior

---

## 🧩 Important Components

| Component | Purpose |
| --- | --- |
| `AudioPlayerProvider` | Global audio engine & playback state |
| `PersistentAudioPlayer` | Floating/bottom music player |
| `MaximizedPlayer` | Full immersive playback screen |
| `QueuePanel` | Queue management UI |
| `LyricsPanel` | Synchronized lyric rendering |
| `SearchOverlay` | Search & add-to-queue system |
| `SwipeableTrack` | Gesture interactions |
| `Dashboard` | 3D album hero experience |

---

## 🎨 Design Philosophy

Flowy focuses on:
* emotional interaction
* cinematic immersion
* tactile gestures
* minimal but expressive UI
* music-first storytelling

Rather than behaving like a traditional music player, Flowy aims to feel alive — reacting to music through motion, color, depth, and interaction.

---

## 🔮 Future Plans
* AI-powered karaoke scoring
* Real-time voice analysis
* Advanced lyric animations
* Visualizer enhancements
* Multi-device sync
* Playlist generation
* Offline support improvements

---

## 👩‍💻 Developer
Built with passion by Lasya Jetti.

---

## 🤝 Contributions
I am always open to contributions, suggestions, and any help in developing this project further! Whether it's adding new features, fixing bugs, or improving the design, feel free to open an issue or submit a pull request.

---

## 📄 License
This project is for educational and personal showcase purposes.
Music and artist-related assets belong to their respective owners and labels.
