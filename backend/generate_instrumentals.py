import os
import subprocess
import shutil
from pathlib import Path

# Absolute paths
PUBLIC_DIR = Path("/Users/lasyajetti/Desktop/flowy/public")
OUT_DIR = PUBLIC_DIR / "instrumentals"

# Ensure output dir exists
OUT_DIR.mkdir(parents=True, exist_ok=True)

tracks = [
    "/btssongs/8/Blood Sweat & Tears.mp3",
    "/txtsongs/txt8/02. Sugar Rush Ride.mp3",
    "/lesongs/le5/04. Smart.mp3",
    "/btssongs/12/FAKE LOVE.mp3",
    "/lesongs/le7/02. HOT.mp3",
    "/txtsongs/txt9/09. Do It Like That.mp3",
    "/lesongs/le4/01. Perfect Night.mp3",
    "/btssongs/15/Dynamite.mp3",
    "/lesongs/le3/05. ANTIFRAGILE.mp3"
]

def process_track(rel_path):
    # e.g., "/btssongs/8/Blood Sweat & Tears.mp3"
    input_path = PUBLIC_DIR / rel_path.lstrip("/")
    
    if not input_path.exists():
        print(f"File not found: {input_path}")
        return

    # Extract base name without extension
    base_name = input_path.stem
    final_output = OUT_DIR / f"{base_name}_instrumental.mp3"
    
    if final_output.exists():
        print(f"Skipping {base_name}, already exists at {final_output}")
        return

    print(f"Processing: {base_name}...")
    
    # We use a temporary directory for demucs output
    temp_demucs_dir = OUT_DIR / "temp_demucs"
    temp_demucs_dir.mkdir(exist_ok=True)
    
    cmd = [
        "demucs",
        "--two-stems=vocals",
        "--mp3",
        "-o", str(temp_demucs_dir),
        str(input_path)
    ]
    
    try:
        subprocess.run(cmd, check=True)
        # Demucs places the result in `temp_demucs/htdemucs/input/no_vocals.mp3` 
        # (Assuming the input file was not renamed, demucs uses the input filename base for its inner folder, 
        # e.g., `temp_demucs/htdemucs/Blood Sweat & Tears/no_vocals.mp3`!)
        # Let's dynamically find the no_vocals.mp3 file inside temp_demucs
        
        found = False
        for path in temp_demucs_dir.rglob("no_vocals.mp3"):
            print(f"Found separated instrumental at {path}, moving to {final_output}...")
            shutil.copy(path, final_output)
            found = True
            break
            
        if not found:
            print(f"Error: Could not find no_vocals.mp3 for {base_name} in output.")
            
    except subprocess.CalledProcessError as e:
        print(f"Demucs failed for {base_name}: {e}")
    finally:
        # Clean up temp folder
        shutil.rmtree(temp_demucs_dir, ignore_errors=True)

if __name__ == "__main__":
    for t in tracks:
        process_track(t)
    print("Done generating all instrumentals!")
