# Upload Lecture Video to KAM Server

This document contains instructions for uploading lecture videos to the KAM server and linking them from course pages.

## Configuration

- **Server**: kam.mff.cuni.cz
- **Username**: vasek
- **Archive Path**: /nfs/archive/vasek/prednasky/
- **Web Path**: ~/WWW/video/ (NOTE: WWW in uppercase, not public_html!)
- **Base URL**: https://kam.mff.cuni.cz/~vasek/video/

## Steps

### 1. Create target directory on server

```bash
sshpass -p 'PASSWORD' ssh vasek@kam.mff.cuni.cz 'mkdir -p /nfs/archive/vasek/prednasky/SEMESTER'
```

Replace `SEMESTER` with the semester code (e.g., `ZS-2025`).

### 2. Upload video file

```bash
rsync -avP ~/Downloads/VIDEO_FILE --rsh="sshpass -p 'PASSWORD' ssh" vasek@kam.mff.cuni.cz:/nfs/archive/vasek/prednasky/SEMESTER/OUTPUT_NAME.mkv
```

Replace:
- `VIDEO_FILE` with the source video filename
- `SEMESTER` with the semester code
- `OUTPUT_NAME` with desired output filename (e.g., `prednaska-2025-10-01`)

### 3. Create symlink and set permissions

```bash
sshpass -p 'PASSWORD' ssh vasek@kam.mff.cuni.cz '
  mkdir -p ~/WWW/video/SEMESTER &&
  ln -sf /nfs/archive/vasek/prednasky/SEMESTER/OUTPUT_NAME.mkv \
         ~/WWW/video/SEMESTER/OUTPUT_NAME.mkv &&
  chmod 755 ~ ~/WWW ~/WWW/video ~/WWW/video/SEMESTER &&
  chmod 644 /nfs/archive/vasek/prednasky/SEMESTER/OUTPUT_NAME.mkv
'
```

### 4. Verify upload and symlink

```bash
sshpass -p 'PASSWORD' ssh vasek@kam.mff.cuni.cz '
  ls -lh /nfs/archive/vasek/prednasky/SEMESTER/OUTPUT_NAME.mkv &&
  ls -l ~/WWW/video/SEMESTER/
'
```

### 5. Add link to course page

The video will be accessible at:
```
https://kam.mff.cuni.cz/~vasek/video/SEMESTER/OUTPUT_NAME.mkv
```

Add this link to the appropriate course page under a "Lecture Recordings" section.

## Example Usage

For a video `~/Downloads/2025-10-01 14-00-40.mkv` for Fall 2025 semester:

- SEMESTER: `ZS-2025`
- VIDEO_FILE: `2025-10-01 14-00-40.mkv`
- OUTPUT_NAME: `prednaska-2025-10-01`

## Requirements

- `sshpass` package must be installed: `sudo apt install sshpass`
