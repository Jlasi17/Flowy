# Flowy

Flowy is a custom, self-made music application built specifically for artists under the HYBE label. It offers a premium, immersive listening experience featuring smooth animations, queue management, lyrics syncing, and a sleek aesthetic.

## Features
- **Immersive UI/UX**: Smooth, dynamic layout with high-quality animations powered by Framer Motion.
- **Queue Management**: Intuitive drag-and-drop queue reordering and auto-play functionality.
- **Music Playback**: Integrated web audio player.
- **Lyrics Sync**: Real-time synchronized lyrics display for supported tracks.
- **Library**: Custom music registry spanning multiple artists including BTS, TXT, LE SSERAFIM, ENHYPEN, and more.

## Prerequisites & Requirements
To run this project locally, you will need the following installed on your machine:
- [Node.js](https://nodejs.org/en/download/) (v16.0 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js) or [Yarn](https://yarnpkg.com/)
- [Python 3](https://www.python.org/downloads/) (for the backend server)
- [Git](https://git-scm.com/)

## Installation & Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/Jlasi17/Flowy.git
   cd flowy
   ```

2. **Install Frontend Dependencies**:
   Navigate to the project root and install the required npm packages:
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**:
   The backend relies on a lightweight Python server.
   ```bash
   cd backend
   pip3 install -r requirements.txt
   cd ..
   ```

4. **Add Media Files**:
   Since music files and large images are ignored via `.gitignore` to prevent bloating the git history, you must manually place your media files (songs, lyrics, cover arts) into the `public/` directory following the expected folder structure (e.g., `public/btssongs/`, `public/lesongs/`, etc.).

## Running the Application

To start the application, you need to run both the frontend development server and the backend server.

1. **Start the Frontend**:
   From the root of the `flowy` directory, run:
   ```bash
   npm run dev
   ```
   *This will start the Vite server.*

2. **Start the Backend**:
   Open a new terminal window, navigate to the backend directory, and run the start script:
   ```bash
   cd backend
   ./start.sh
   ```
   *Or manually run `python3 server.py`.*

## Technologies Used
- **Frontend**: React, Vite, Framer Motion
- **Backend**: Python (Flask/FastAPI)
- **Styling**: Custom CSS with dynamic theming
