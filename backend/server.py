"""
Karaoke Backend — FastAPI server for real-time vocal removal using Demucs.

Endpoints:
  POST /api/karaoke        — Upload MP3, start processing, returns job_id
  WS   /ws/progress/{id}   — Real-time progress updates (0–100%)
  GET  /api/output/{id}/{f} — Serve processed instrumental file
  DELETE /api/karaoke/{id}  — Cancel a running job
"""

import os
import re
import shutil
import asyncio
import time
import hashlib
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Karaoke Backend")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lyrics directory ─────────────────────────────────────────────────────
LYRICS_DIR = Path(__file__).parent.parent / "public" / "lyrics"
LYRICS_DIR.mkdir(parents=True, exist_ok=True)


from pydantic import BaseModel


class SaveLyricsRequest(BaseModel):
    filename: str
    content: str


@app.post("/api/save-lyrics")
async def save_lyrics(req: SaveLyricsRequest):
    """Save an LRC file to public/lyrics/."""
    # Sanitize filename (no path traversal)
    safe_name = req.filename.replace("/", "").replace("\\", "").replace("..", "").strip()
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = LYRICS_DIR / f"{safe_name}.lrc"
    try:
        file_path.write_text(req.content, encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok", "path": str(file_path)}

# ── Storage ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
TEMP_DIR = BASE_DIR / "temp_jobs"
TEMP_DIR.mkdir(exist_ok=True)

# ── Job Registry ─────────────────────────────────────────────────────────
# job_id -> { status, progress, process, input_path, output_dir, output_file, created_at, error }
jobs: Dict[str, dict] = {}

# WebSocket connections per job
ws_connections: Dict[str, list] = {}

# Cleanup threshold (seconds)
CLEANUP_AFTER = 7200  # 2 hours


def get_job_dir(job_id: str) -> Path:
    return TEMP_DIR / job_id


# ── POST /api/karaoke ────────────────────────────────────────────────────
from fastapi import Form
from typing import Optional

@app.post("/api/karaoke")
async def start_karaoke(audio: Optional[UploadFile] = File(None), filePath: Optional[str] = Form(None)):
    """Upload an MP3 file or specify a local file path, then start Demucs vocal separation."""
    if filePath:
        rel_path = filePath.lstrip('/')
        full_path = BASE_DIR.parent / "public" / rel_path
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server")
        with open(full_path, "rb") as f:
            content = f.read()
    elif audio:
        content = await audio.read()
    else:
        raise HTTPException(status_code=400, detail="Must provide audio or filePath")
    job_id = hashlib.md5(content).hexdigest()[:16]
    job_dir = get_job_dir(job_id)

    # Check if job is already in memory
    if job_id in jobs and jobs[job_id]["status"] in ["processing", "done"]:
        jobs[job_id]["created_at"] = time.time()  # Reset lifespan
        return {"job_id": job_id, "status": jobs[job_id]["status"]}

    # Check if files already exist on disk (from server restart, etc)
    output_dir = job_dir / "output"
    output_base = output_dir / "htdemucs" / "input"
    no_vocals = output_base / "no_vocals.mp3"
    vocals = output_base / "vocals.mp3"

    if job_dir.exists() and no_vocals.exists():
        # Restore to registry
        jobs[job_id] = {
            "status": "done",
            "progress": 100,
            "process": None,
            "input_path": str(job_dir / "input.mp3"),
            "output_dir": str(output_dir),
            "output_file": str(no_vocals),
            "vocals_file": str(vocals) if vocals.exists() else None,
            "created_at": time.time(),
            "error": None,
        }
        return {"job_id": job_id, "status": "done"}

    # If we get here, need to start a fresh job
    # Clean up incomplete directory if exists
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)
    job_dir.mkdir(parents=True, exist_ok=True)

    # Save uploaded file
    input_path = job_dir / "input.mp3"
    with open(input_path, "wb") as f:
        f.write(content)

    output_dir.mkdir(exist_ok=True)

    # Register job
    jobs[job_id] = {
        "status": "processing",
        "progress": 0,
        "process": None,
        "input_path": str(input_path),
        "output_dir": str(output_dir),
        "output_file": None,
        "created_at": time.time(),
        "error": None,
    }

    # Start Demucs in background
    asyncio.create_task(_run_demucs(job_id, str(input_path), str(output_dir)))

    return {"job_id": job_id, "status": "processing"}


async def _run_demucs(job_id: str, input_path: str, output_dir: str):
    """Run Demucs subprocess and track progress."""
    job = jobs.get(job_id)
    if not job:
        return

    cmd = [
        "demucs",
        "--two-stems=vocals",
        "--mp3",
        "-o", output_dir,
        input_path,
    ]

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        job["process"] = process

        # Read stderr for progress
        # Demucs outputs progress like: "  3%|▎         | 1/36 [00:02<01:06,  1.90s/it]"
        buffer = ""
        while True:
            chunk = await process.stderr.read(256)
            if not chunk:
                break

            text = chunk.decode("utf-8", errors="replace")
            buffer += text

            # Extract percentage from tqdm-style output
            matches = re.findall(r'(\d+)%\|', buffer)
            if matches:
                progress = int(matches[-1])
                job["progress"] = progress
                await _broadcast_progress(job_id, progress, "processing")
                # Keep only last 500 chars to avoid memory growth
                buffer = buffer[-500:]

        await process.wait()

        if job["status"] == "cancelled":
            return

        if process.returncode == 0:
            # Find the output file
            # Demucs creates: output_dir/htdemucs/input/no_vocals.mp3
            output_base = Path(output_dir) / "htdemucs" / "input"
            no_vocals = output_base / "no_vocals.mp3"
            vocals = output_base / "vocals.mp3"

            if no_vocals.exists():
                job["status"] = "done"
                job["progress"] = 100
                job["output_file"] = str(no_vocals)
                # Store vocals path too for vocal mixing
                job["vocals_file"] = str(vocals) if vocals.exists() else None
                await _broadcast_progress(job_id, 100, "done",
                    instrumental_url=f"/api/output/{job_id}/no_vocals.mp3",
                    vocals_url=f"/api/output/{job_id}/vocals.mp3" if vocals.exists() else None
                )
            else:
                job["status"] = "error"
                job["error"] = "Output file not found"
                await _broadcast_progress(job_id, 0, "error", error="Output file not found")
        else:
            stderr_out = buffer[-1000:]
            job["status"] = "error"
            job["error"] = f"Demucs failed (code {process.returncode}): {stderr_out}"
            await _broadcast_progress(job_id, 0, "error", error=job["error"])

    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
        await _broadcast_progress(job_id, 0, "error", error=str(e))


async def _broadcast_progress(job_id: str, progress: int, status: str, **extra):
    """Send progress to all WebSocket connections for this job."""
    message = {"job_id": job_id, "progress": progress, "status": status, **extra}
    connections = ws_connections.get(job_id, [])
    dead = []
    for ws in connections:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connections.remove(ws)


# ── WebSocket /ws/progress/{job_id} ──────────────────────────────────────
@app.websocket("/ws/progress/{job_id}")
async def ws_progress(websocket: WebSocket, job_id: str):
    """Real-time progress updates for a karaoke job."""
    await websocket.accept()

    if job_id not in ws_connections:
        ws_connections[job_id] = []
    ws_connections[job_id].append(websocket)

    try:
        # Send current state immediately
        job = jobs.get(job_id)
        if job:
            msg = {"job_id": job_id, "progress": job["progress"], "status": job["status"]}
            if job["status"] == "done" and job.get("output_file"):
                msg["instrumental_url"] = f"/api/output/{job_id}/no_vocals.mp3"
                if job.get("vocals_file"):
                    msg["vocals_url"] = f"/api/output/{job_id}/vocals.mp3"
            await websocket.send_json(msg)

        # Keep connection alive until client disconnects
        while True:
            # Wait for any message (ping/pong or close)
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if job_id in ws_connections and websocket in ws_connections[job_id]:
            ws_connections[job_id].remove(websocket)


# ── GET /api/output/{job_id}/{filename} ──────────────────────────────────
@app.get("/api/output/{job_id}/{filename}")
async def get_output(job_id: str, filename: str):
    """Serve a processed audio file."""
    job = jobs.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=404, detail="Job not found or not ready")

    output_base = Path(job["output_dir"]) / "htdemucs" / "input"
    file_path = output_base / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        str(file_path),
        media_type="audio/mpeg",
        headers={"Accept-Ranges": "bytes"},
    )


# ── DELETE /api/karaoke/{job_id} ─────────────────────────────────────────
@app.delete("/api/karaoke/{job_id}")
async def cancel_karaoke(job_id: str):
    """Cancel a running karaoke job."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job["status"] = "cancelled"

    # Kill the demucs process if running
    proc = job.get("process")
    if proc and proc.returncode is None:
        try:
            proc.kill()
            await proc.wait()
        except Exception:
            pass

    # Note: We NO LONGER delete files on user cancellation so they can be reused!
    # The automatic background cleaner will delete them after 2 hours.

    # Broadcast cancellation
    await _broadcast_progress(job_id, 0, "cancelled")

    # Set status to cancelled but leave files so they can be reused if re-requested later
    job["status"] = "cancelled"
    job["error"] = "User cancelled"
    
    # Just close websockets, we keep the job in registry with "cancelled" status
    ws_connections.pop(job_id, None)

    return {"status": "cancelled"}


# ── GET /api/status/{job_id} ─────────────────────────────────────────────
@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    """Get the current status of a karaoke job."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
    }

    if job["status"] == "done" and job.get("output_file"):
        result["instrumental_url"] = f"/api/output/{job_id}/no_vocals.mp3"
        if job.get("vocals_file"):
            result["vocals_url"] = f"/api/output/{job_id}/vocals.mp3"

    if job.get("error"):
        result["error"] = job["error"]

    return result


# ── Background cleanup ───────────────────────────────────────────────────
@app.on_event("startup")
async def startup_cleanup():
    """Start periodic cleanup of old temp files."""
    asyncio.create_task(_periodic_cleanup())


async def _periodic_cleanup():
    """Clean up temp files older than CLEANUP_AFTER seconds by scanning the disk."""
    while True:
        try:
            # 1. Physical Disk Sweep (handles orphans from server restarts)
            now = time.time()
            if TEMP_DIR.exists():
                for item in TEMP_DIR.iterdir():
                    if item.is_dir():
                        # Use directory modification time for orphans
                        mtime = item.stat().st_mtime
                        if (now - mtime) > CLEANUP_AFTER:
                            print(f"[Cleanup] Deleting expired orphan folder: {item.name}")
                            shutil.rmtree(item, ignore_errors=True)
                            # Also remove from memory if it exists there
                            jobs.pop(item.name, None)
                            ws_connections.pop(item.name, None)

            # 2. Memory Registry Sweep (handles jobs still in dict)
            expired_ids = [
                jid for jid, j in jobs.items()
                if (now - j["created_at"]) > CLEANUP_AFTER and j["status"] in ("done", "error", "cancelled")
            ]
            for jid in expired_ids:
                job_dir = get_job_dir(jid)
                if job_dir.exists():
                    print(f"[Cleanup] Deleting expired job folder: {jid}")
                    shutil.rmtree(job_dir, ignore_errors=True)
                jobs.pop(jid, None)
                ws_connections.pop(jid, None)

        except Exception as e:
            print(f"[Cleanup] Error during scan: {e}")

        await asyncio.sleep(60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
