# Quick Fix: Video Not Playing

## TL;DR

Your video file uses an **unsupported codec** (probably ProRes). Browsers can't play it.

## Solution

Convert your video to H.264/MP4 format.

## Fastest Method: HandBrake (Free, Easy)

1. Download: https://handbrake.fr/
2. Open your video file
3. Select "Web" preset
4. Click "Start Encode"
5. Import the new file into your app

## Alternative: FFmpeg (Command Line)

```bash
ffmpeg -i "input.mov" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart "output.mp4"
```

## What Changed in Your App

✅ The app now **blocks unsupported videos** at import time
✅ You'll see a clear error message explaining the issue
✅ No more blank surfaces or mysterious errors

## Test It

1. Try importing your current .mov file → Should show error
2. Convert it to .mp4 → Should import and play perfectly

## Supported Formats

✅ Use: **H.264/MP4** (best compatibility)
❌ Avoid: ProRes, DNxHD, Animation codec

---

**Bottom Line**: Your app is fixed. Your video file needs conversion. Use HandBrake (easiest) or FFmpeg (fastest).
