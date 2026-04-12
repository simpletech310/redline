#!/usr/bin/env python3
"""
Upload streaming videos to Mux for HLS playback.
Videos in the streaming folder (over 50MB) are uploaded to Mux.
"""

import os
import sys
import time
import requests
import base64
from datetime import datetime

# Mux API credentials - set these before running
MUX_TOKEN_ID = os.getenv("MUX_TOKEN_ID", "")
MUX_TOKEN_SECRET = os.getenv("MUX_TOKEN_SECRET", "")

# Test assets path
TEST_ASSETS_PATH = "/Users/tj/Desktop/Simpletech Solutions/Software Solutions/AntiGravity Projects/RD/RedlineV2/redline/Test Assets"


def get_mux_auth():
    """Get base64 encoded auth header for Mux API."""
    if not MUX_TOKEN_ID or not MUX_TOKEN_SECRET:
        print("\n" + "=" * 60)
        print("MUX CREDENTIALS NOT SET")
        print("=" * 60)
        print("\nTo upload videos to Mux, you need to set your API credentials.")
        print("\n1. Go to https://dashboard.mux.com/")
        print("2. Navigate to Settings > API Access Tokens")
        print("3. Create a new token with 'Mux Video' permissions")
        print("4. Set the environment variables:")
        print("   export MUX_TOKEN_ID=your_token_id")
        print("   export MUX_TOKEN_SECRET=your_token_secret")
        print("\nOr edit this script and set them directly.")
        print("=" * 60)
        return None

    auth_string = f"{MUX_TOKEN_ID}:{MUX_TOKEN_SECRET}"
    return base64.b64encode(auth_string.encode()).decode()


def create_mux_upload(filename: str) -> dict:
    """Create a direct upload URL for Mux."""
    auth = get_mux_auth()
    if not auth:
        return {"error": "No credentials"}

    response = requests.post(
        "https://api.mux.com/video/v1/uploads",
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
        },
        json={
            "new_asset_settings": {
                "playback_policy": ["public"],
                "video_quality": "basic",  # Use 'plus' for higher quality
            },
            "cors_origin": "*",
        },
        timeout=30,
    )

    if response.status_code != 201:
        return {"error": f"Failed to create upload: {response.text}"}

    data = response.json()["data"]
    return {
        "upload_id": data["id"],
        "upload_url": data["url"],
    }


def upload_to_mux(file_path: str) -> dict:
    """Upload a video file to Mux via direct upload."""
    filename = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)

    print(f"\nUploading {filename} ({file_size / 1024 / 1024:.1f}MB) to Mux...")

    # Create upload URL
    upload_info = create_mux_upload(filename)
    if "error" in upload_info:
        return upload_info

    upload_url = upload_info["upload_url"]
    upload_id = upload_info["upload_id"]

    print(f"  Created upload: {upload_id}")
    print(f"  Uploading file...")

    # Upload the file
    with open(file_path, "rb") as f:
        response = requests.put(
            upload_url,
            headers={"Content-Type": "video/quicktime"},
            data=f,
            timeout=600,  # 10 minute timeout for large files
        )

    if response.status_code not in (200, 201):
        return {"error": f"Upload failed: {response.status_code}"}

    print(f"  Upload complete! Waiting for processing...")

    # Wait for asset to be created
    return wait_for_asset(upload_id)


def wait_for_asset(upload_id: str, max_wait: int = 300) -> dict:
    """Wait for Mux to process the upload and return asset info."""
    auth = get_mux_auth()
    if not auth:
        return {"error": "No credentials"}

    start_time = time.time()

    while time.time() - start_time < max_wait:
        response = requests.get(
            f"https://api.mux.com/video/v1/uploads/{upload_id}",
            headers={"Authorization": f"Basic {auth}"},
            timeout=30,
        )

        if response.status_code != 200:
            return {"error": f"Failed to check upload status: {response.text}"}

        data = response.json()["data"]
        status = data.get("status")

        if status == "asset_created":
            asset_id = data.get("asset_id")
            return get_asset_info(asset_id)
        elif status == "errored":
            return {"error": f"Upload processing failed: {data.get('error', {}).get('message', 'Unknown error')}"}

        print(f"  Status: {status}... waiting")
        time.sleep(5)

    return {"error": "Timeout waiting for asset creation"}


def get_asset_info(asset_id: str) -> dict:
    """Get asset info including playback ID."""
    auth = get_mux_auth()
    if not auth:
        return {"error": "No credentials"}

    response = requests.get(
        f"https://api.mux.com/video/v1/assets/{asset_id}",
        headers={"Authorization": f"Basic {auth}"},
        timeout=30,
    )

    if response.status_code != 200:
        return {"error": f"Failed to get asset info: {response.text}"}

    data = response.json()["data"]
    playback_ids = data.get("playback_ids", [])

    if not playback_ids:
        return {"error": "No playback ID found"}

    playback_id = playback_ids[0]["id"]

    return {
        "success": True,
        "asset_id": asset_id,
        "playback_id": playback_id,
        "playback_url": f"https://stream.mux.com/{playback_id}.m3u8",
        "thumbnail_url": f"https://image.mux.com/{playback_id}/thumbnail.jpg",
        "duration": data.get("duration"),
        "aspect_ratio": data.get("aspect_ratio"),
        "resolution": data.get("resolution_tier"),
    }


def main():
    print("=" * 60)
    print("REDLINE - Mux Video Upload")
    print("=" * 60)

    # Check credentials
    if not get_mux_auth():
        sys.exit(1)

    results = []
    streaming_folder = os.path.join(TEST_ASSETS_PATH, "streaming")

    if not os.path.exists(streaming_folder):
        print(f"\nStreaming folder not found: {streaming_folder}")
        sys.exit(1)

    # List videos in streaming folder
    videos = []
    for f in os.listdir(streaming_folder):
        if f.startswith('.'):
            continue
        file_path = os.path.join(streaming_folder, f)
        if os.path.isfile(file_path):
            file_size = os.path.getsize(file_path)
            videos.append({
                "name": f,
                "path": file_path,
                "size": file_size,
                "size_mb": file_size / 1024 / 1024,
            })

    print(f"\nFound {len(videos)} videos in streaming folder:")
    for v in videos:
        print(f"  - {v['name']} ({v['size_mb']:.1f}MB)")

    # Upload each video
    print("\n" + "-" * 60)

    for video in videos:
        result = upload_to_mux(video["path"])
        result["filename"] = video["name"]
        result["size_mb"] = video["size_mb"]
        results.append(result)

        if result.get("success"):
            print(f"  Playback URL: {result['playback_url']}")
            print(f"  Thumbnail: {result['thumbnail_url']}")
        else:
            print(f"  Error: {result.get('error')}")

    # Summary
    print("\n" + "=" * 60)
    print("UPLOAD SUMMARY")
    print("=" * 60)

    successful = [r for r in results if r.get("success")]
    failed = [r for r in results if not r.get("success")]

    if successful:
        print(f"\nSuccessful uploads ({len(successful)}):")
        for r in successful:
            print(f"\n  {r['filename']} ({r['size_mb']:.1f}MB)")
            print(f"    Asset ID: {r['asset_id']}")
            print(f"    Playback: {r['playback_url']}")
            print(f"    Thumbnail: {r['thumbnail_url']}")

    if failed:
        print(f"\nFailed uploads ({len(failed)}):")
        for r in failed:
            print(f"  - {r.get('filename', 'Unknown')}: {r.get('error', 'Unknown error')}")

    # Generate test HTML
    if successful:
        generate_test_html(successful)


def generate_test_html(results: list):
    """Generate an HTML page to test Mux video playback."""
    html = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redline - Mux Stream Test</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      padding: 20px;
      min-height: 100vh;
    }
    h1 { color: #dc2626; margin-bottom: 10px; font-size: 24px; }
    .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
    .stream-card {
      background: #111;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid #222;
    }
    .stream-card h3 { color: #fff; margin-bottom: 12px; font-size: 16px; }
    .stream-card p { color: #888; font-size: 12px; margin-bottom: 12px; }
    .stream-card video {
      width: 100%;
      border-radius: 12px;
      background: #000;
    }
    .url {
      font-size: 10px;
      color: #555;
      word-break: break-all;
      margin-top: 12px;
      padding: 10px;
      background: #0a0a0a;
      border-radius: 6px;
    }
    .status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 10px;
    }
    .status.ready { background: #166534; color: #4ade80; }
    .status.loading { background: #854d0e; color: #fbbf24; }
    .note {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 14px;
      color: #f87171;
    }
  </style>
</head>
<body>
  <h1>REDLINE TV - Stream Test</h1>
  <p class="subtitle">Testing Mux HLS streaming with sound</p>

  <div class="note">
    <strong>Sound Test:</strong> Click on the video to play. Videos should play with sound.
    Click the volume icon or tap "Tap for sound" if muted.
  </div>
'''

    for i, r in enumerate(results):
        video_id = f"video{i}"
        html += f'''
  <div class="stream-card">
    <h3>{r['filename']} <span id="{video_id}-status" class="status loading">Loading...</span></h3>
    <p>{r['size_mb']:.1f}MB | Playback ID: {r['playback_id']}</p>
    <video
      id="{video_id}"
      controls
      playsinline
      webkit-playsinline
      poster="{r['thumbnail_url']}"
    ></video>
    <div class="url">{r['playback_url']}</div>
  </div>
'''

    html += '''
  <script>
    document.querySelectorAll('video').forEach((video, i) => {
      const src = video.nextElementSibling.textContent.trim();
      const statusEl = document.getElementById(`video${i}-status`);

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          statusEl.textContent = 'Ready - Click to play with sound';
          statusEl.className = 'status ready';
        });
      } else if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          statusEl.textContent = 'Ready - Click to play with sound';
          statusEl.className = 'status ready';
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            statusEl.textContent = 'Error loading stream';
            statusEl.className = 'status';
            statusEl.style.background = '#7f1d1d';
            statusEl.style.color = '#f87171';
          }
        });
      }
    });
  </script>
</body>
</html>
'''

    output_path = "/Users/tj/Desktop/Simpletech Solutions/Software Solutions/AntiGravity Projects/RD/RedlineV2/redline/test-mux-streams.html"
    with open(output_path, "w") as f:
        f.write(html)

    print(f"\n\nTest page generated: {output_path}")
    print("Open this file in a browser to test Mux stream playback with sound.")


if __name__ == "__main__":
    main()
