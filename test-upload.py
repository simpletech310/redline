#!/usr/bin/env python3
"""
Test script to upload media files to Supabase storage and verify they work.
"""

import os
import requests
import uuid
from datetime import datetime

# Supabase config from .env.local
SUPABASE_URL = "https://lguqssoghrjlpsccauhl.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXFzc29naHJqbHBzY2NhdWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODAzNDAsImV4cCI6MjA5MTU1NjM0MH0.TKsjsC8eP-y7SIR9eZMWtQXoOYt2s47ddfbVBwwbqa4"
BUCKET_NAME = "redline"

# Test assets path
TEST_ASSETS_PATH = "/Users/tj/Desktop/Simpletech Solutions/Software Solutions/AntiGravity Projects/RD/RedlineV2/redline/Test Assets"

def upload_to_supabase(file_path: str, folder: str = "posts") -> dict:
    """Upload a file to Supabase storage and return the public URL."""

    file_name = os.path.basename(file_path)
    file_ext = file_name.split('.')[-1].lower()
    unique_name = f"{folder}/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_ext}"

    # Determine content type
    content_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'webm': 'video/webm',
    }
    content_type = content_types.get(file_ext, 'application/octet-stream')

    # Upload URL
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{unique_name}"

    print(f"Uploading {file_name} ({content_type})...")
    print(f"  -> {unique_name}")

    with open(file_path, 'rb') as f:
        response = requests.post(
            upload_url,
            headers={
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": content_type,
            },
            data=f
        )

    if response.status_code in (200, 201):
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{unique_name}"
        print(f"  ✅ Uploaded successfully!")
        print(f"  URL: {public_url}")
        return {"success": True, "url": public_url, "path": unique_name}
    else:
        print(f"  ❌ Upload failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return {"success": False, "error": response.text}


def main():
    print("=" * 60)
    print("REDLINE - Test Asset Upload to Supabase")
    print("=" * 60)

    results = {"posts": [], "streaming": []}

    # Upload post pictures
    print("\n📸 UPLOADING POST PICTURES...")
    pic_folder = os.path.join(TEST_ASSETS_PATH, "post pic")
    if os.path.exists(pic_folder):
        for f in os.listdir(pic_folder):
            if f.startswith('.'):
                continue
            file_path = os.path.join(pic_folder, f)
            if os.path.isfile(file_path):
                result = upload_to_supabase(file_path, "posts")
                if result["success"]:
                    results["posts"].append({"type": "image", "url": result["url"], "file": f})

    # Upload post videos
    print("\n🎬 UPLOADING POST VIDEOS...")
    video_folder = os.path.join(TEST_ASSETS_PATH, "post video")
    if os.path.exists(video_folder):
        for f in os.listdir(video_folder):
            if f.startswith('.'):
                continue
            file_path = os.path.join(video_folder, f)
            if os.path.isfile(file_path):
                result = upload_to_supabase(file_path, "posts")
                if result["success"]:
                    results["posts"].append({"type": "video", "url": result["url"], "file": f})

    # Upload streaming videos
    print("\n📺 UPLOADING STREAMING VIDEOS...")
    streaming_folder = os.path.join(TEST_ASSETS_PATH, "streaming")
    if os.path.exists(streaming_folder):
        for f in os.listdir(streaming_folder):
            if f.startswith('.'):
                continue
            file_path = os.path.join(streaming_folder, f)
            if os.path.isfile(file_path):
                result = upload_to_supabase(file_path, "streams")
                if result["success"]:
                    results["streaming"].append({"url": result["url"], "file": f})

    # Summary
    print("\n" + "=" * 60)
    print("UPLOAD SUMMARY")
    print("=" * 60)

    print(f"\n📮 Post Media ({len(results['posts'])} files):")
    for item in results["posts"]:
        print(f"  [{item['type'].upper()}] {item['file']}")
        print(f"    {item['url']}")

    print(f"\n📺 Streaming Media ({len(results['streaming'])} files):")
    for item in results["streaming"]:
        print(f"  {item['file']}")
        print(f"    {item['url']}")

    # Generate test URLs for verification
    print("\n" + "=" * 60)
    print("TEST URLS - Open these in browser to verify playback:")
    print("=" * 60)
    for item in results["posts"]:
        if item["type"] == "video":
            print(f"\nVideo: {item['url']}")
    for item in results["streaming"]:
        print(f"\nStreaming: {item['url']}")


if __name__ == "__main__":
    main()
