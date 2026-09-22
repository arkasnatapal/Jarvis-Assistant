import sys
import os
import re
import json
import ctypes
import subprocess
import urllib.request
import urllib.parse
import webbrowser
from datetime import datetime
import shutil

# Windows Virtual Key Codes
VK_VOLUME_MUTE = 0xAD
VK_VOLUME_DOWN = 0xAE
VK_VOLUME_UP = 0xAF
VK_MEDIA_NEXT_TRACK = 0xB5
VK_MEDIA_PREV_TRACK = 0xB4
VK_MEDIA_STOP = 0xB2
VK_MEDIA_PLAY_PAUSE = 0xB3
VK_F = 0x46  # YouTube Fullscreen
VK_T = 0x54  # YouTube Cinema mode

def send_key(key_code, count=1):
    try:
        KEYEVENTF_KEYUP = 0x0002
        for _ in range(count):
            ctypes.windll.user32.keybd_event(key_code, 0, 0, 0)
            ctypes.windll.user32.keybd_event(key_code, 0, KEYEVENTF_KEYUP, 0)
        return True
    except Exception as e:
        return False

# --- 1. Volume & Audio Controls ---
def handle_volume(action):
    act = action.lower().strip()
    if act in ["mute", "unmute", "toggle_mute"]:
        send_key(VK_VOLUME_MUTE)
        return {"success": True, "action": "mute", "message": "Toggled volume mute."}
    elif act in ["up", "increase", "higher"]:
        send_key(VK_VOLUME_UP, count=5)
        return {"success": True, "action": "volume_up", "message": "Increased volume."}
    elif act in ["down", "decrease", "lower"]:
        send_key(VK_VOLUME_DOWN, count=5)
        return {"success": True, "action": "volume_down", "message": "Decreased volume."}
    return {"success": False, "error": f"Unknown volume action: {action}"}

# --- 2. YouTube & Media Controls ---
def play_youtube_song(query):
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded_query}"
        
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8')
            video_ids = re.findall(r"watch\?v=([a-zA-Z0-9_-]{11})", html)
            
            if video_ids:
                first_video_id = video_ids[0]
                watch_url = f"https://www.youtube.com/watch?v={first_video_id}&autoplay=1"
                webbrowser.open(watch_url)
                return {
                    "success": True,
                    "action": "play",
                    "query": query,
                    "videoUrl": watch_url,
                    "videoId": first_video_id,
                    "message": f"Playing '{query}' on YouTube: {watch_url}"
                }
        
        fallback_url = f"https://www.youtube.com/results?search_query={encoded_query}"
        webbrowser.open(fallback_url)
        return {
            "success": True,
            "action": "play",
            "query": query,
            "videoUrl": fallback_url,
            "message": f"Opened YouTube search for '{query}'"
        }
    except Exception as e:
        fallback_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
        try:
            webbrowser.open(fallback_url)
        except:
            pass
        return {
            "success": False,
            "query": query,
            "videoUrl": fallback_url,
            "error": str(e)
        }

def handle_media(action, query=""):
    act = action.lower().strip()
    if act in ["pause", "resume"]:
        send_key(VK_MEDIA_PLAY_PAUSE)
        return {"success": True, "action": act, "message": f"YouTube media playback {act}d."}
    elif act == "stop":
        send_key(VK_MEDIA_STOP)
        return {"success": True, "action": "stop", "message": "Media playback stopped."}
    elif act in ["next", "skip"]:
        send_key(VK_MEDIA_NEXT_TRACK)
        return {"success": True, "action": "next", "message": "Skipped to next track."}
    elif act in ["previous", "prev"]:
        send_key(VK_MEDIA_PREV_TRACK)
        return {"success": True, "action": "previous", "message": "Skipped to previous track."}
    elif act in ["fullscreen", "full_screen"]:
        send_key(VK_F)
        return {"success": True, "action": "fullscreen", "message": "Toggled Fullscreen mode."}
    elif act in ["cinema", "theater"]:
        send_key(VK_T)
        return {"success": True, "action": "cinema", "message": "Toggled Cinema / Theater mode."}
    elif act in ["play", "change"]:
        if query:
            return play_youtube_song(query)
        send_key(VK_MEDIA_PLAY_PAUSE)
        return {"success": True, "action": "play", "message": "Resumed media playback."}
    else:
        return play_youtube_song(query or action)

# --- 3. App Launcher & Process Control ---
APPS_MAP = {
    "vscode": "code",
    "code": "code",
    "chrome": "chrome",
    "notepad": "notepad",
    "calculator": "calc",
    "calc": "calc",
    "taskmanager": "taskmgr",
    "taskmgr": "taskmgr",
    "cmd": "cmd",
    "terminal": "wt",
    "explorer": "explorer",
    "spotify": "spotify"
}

def handle_app(action, app_name):
    act = action.lower().strip()
    app_key = app_name.lower().replace(" ", "")

    if app_key in ["whatsapp", "whatsappdesktop"]:
        if act == "open":
            try:
                subprocess.Popen("start whatsapp:", shell=True)
                return {"success": True, "action": "open_app", "app": "WhatsApp Desktop", "message": "Opening WhatsApp Desktop."}
            except Exception as e:
                subprocess.Popen("whatsapp", shell=True)
                return {"success": True, "action": "open_app", "app": "WhatsApp Desktop", "message": "Opening WhatsApp Desktop."}
        elif act == "close":
            os.system("taskkill /f /im WhatsApp.exe")
            return {"success": True, "action": "close_app", "app": "WhatsApp Desktop", "message": "Closed WhatsApp Desktop."}

    executable = APPS_MAP.get(app_key, app_name)

    if act == "open":
        try:
            subprocess.Popen(executable, shell=True)
            return {"success": True, "action": "open_app", "app": app_name, "message": f"Opened {app_name}."}
        except Exception as e:
            return {"success": False, "error": str(e)}
    elif act == "close":
        try:
            os.system(f"taskkill /f /im {executable}.exe")
            return {"success": True, "action": "close_app", "app": app_name, "message": f"Closed {app_name}."}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": f"Invalid app action: {action}"}

# --- 4. System & Window Management ---
def handle_system(action):
    act = action.lower().strip()
    if act in ["lock", "lock_pc"]:
        try:
            ctypes.windll.user32.LockWorkStation()
            return {"success": True, "action": "lock", "message": "Workstation locked."}
        except Exception as e:
            return {"success": False, "error": str(e)}
    elif act in ["show_desktop", "desktop"]:
        try:
            # Win + D
            send_key(0x5B) # Win key
            return {"success": True, "action": "show_desktop", "message": "Toggled desktop view."}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": f"Unknown system action: {action}"}

# --- 5. File & Folder Operations ---
FOLDERS_MAP = {
    "downloads": os.path.expanduser("~/Downloads"),
    "documents": os.path.expanduser("~/Documents"),
    "desktop": os.path.expanduser("~/Desktop"),
    "pictures": os.path.expanduser("~/Pictures"),
    "music": os.path.expanduser("~/Music")
}

def handle_folder(action, folder_name=""):
    act = action.lower().strip()
    if act == "open":
        target = FOLDERS_MAP.get(folder_name.lower().strip(), os.path.expanduser(f"~/{folder_name}"))
        if os.path.exists(target):
            subprocess.Popen(f'explorer "{target}"')
            return {"success": True, "action": "open_folder", "folder": folder_name, "message": f"Opened folder {folder_name}."}
        else:
            return {"success": False, "error": f"Folder {target} not found."}
    elif act == "organize_downloads":
        download_path = FOLDERS_MAP["downloads"]
        count = 0
        for filename in os.listdir(download_path):
            file_path = os.path.join(download_path, filename)
            if os.path.isdir(file_path):
                continue
            ext = filename.split('.')[-1].lower()
            if ext in ['pdf', 'docx', 'doc', 'txt', 'xlsx', 'pptx']:
                subfolder = "Documents"
            elif ext in ['jpg', 'jpeg', 'png', 'gif', 'svg']:
                subfolder = "Images"
            elif ext in ['mp4', 'mkv', 'mov', 'avi']:
                subfolder = "Videos"
            elif ext in ['mp3', 'wav', 'flac']:
                subfolder = "Music"
            elif ext in ['exe', 'msi']:
                subfolder = "Executables"
            elif ext in ['zip', 'rar', '7z', 'tar', 'gz']:
                subfolder = "Archives"
            else:
                continue

            dest_dir = os.path.join(download_path, subfolder)
            os.makedirs(dest_dir, exist_ok=True)
            try:
                shutil.move(file_path, os.path.join(dest_dir, filename))
                count += 1
            except:
                pass
        return {"success": True, "action": "organize_downloads", "message": f"Organized {count} files in Downloads folder."}
    elif act == "take_note":
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        note_path = os.path.join(FOLDERS_MAP["desktop"], "jarvis_notes.txt")
        with open(note_path, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {folder_name}\n")
        return {"success": True, "action": "take_note", "message": f"Saved note to Desktop/jarvis_notes.txt: '{folder_name}'"}
    return {"success": False, "error": f"Unknown folder action: {action}"}

# --- 6. Browser & Search Automation ---
SITES_MAP = {
    "github": "https://github.com",
    "reddit": "https://reddit.com",
    "whatsapp": "https://web.whatsapp.com",
    "google": "https://google.com",
    "youtube": "https://youtube.com",
    "chatgpt": "https://chatgpt.com",
    "twitter": "https://x.com",
    "x": "https://x.com"
}

VK_CONTROL = 0x11
VK_SHIFT = 0x10
VK_ALT = 0x12
VK_RETURN = 0x0D
VK_V = 0x56
VK_C = 0x43
VK_F = 0x46

def set_clipboard_text(text):
    try:
        cmd = f'powershell -command "Set-Clipboard -Value \'{text.replace("\'", "\'\'")}\'"'
        subprocess.run(cmd, shell=True, check=True)
        return True
    except Exception as e:
        return False

def send_hotkey(*key_codes):
    try:
        import time
        KEYEVENTF_KEYUP = 0x0002
        for k in key_codes:
            ctypes.windll.user32.keybd_event(k, 0, 0, 0)
        time.sleep(0.05)
        for k in reversed(key_codes):
            ctypes.windll.user32.keybd_event(k, 0, KEYEVENTF_KEYUP, 0)
        return True
    except Exception as e:
        return False

def handle_whatsapp(action, query=""):
    import time
    act = action.lower().strip()

    if ":" in query:
        parts = query.split(":", 1)
        contact_name = parts[0].strip()
        msg_text = parts[1].strip()
    else:
        contact_name = query.strip() or "chotu"
        msg_text = ""

    try:
        subprocess.Popen("start whatsapp:", shell=True)
    except:
        webbrowser.open("https://web.whatsapp.com")

    time.sleep(1.8)

    if act in ["send_message", "message", "send", "text"]:
        send_hotkey(VK_CONTROL, VK_F)
        time.sleep(0.4)
        set_clipboard_text(contact_name)
        send_hotkey(VK_CONTROL, VK_V)
        time.sleep(0.6)
        send_hotkey(VK_RETURN)
        time.sleep(0.6)

        if msg_text:
            set_clipboard_text(msg_text)
            send_hotkey(VK_CONTROL, VK_V)
            time.sleep(0.3)
            send_hotkey(VK_RETURN)
            return {"success": True, "action": "send_message", "contact": contact_name, "message": f"Sent message '{msg_text}' to {contact_name} on WhatsApp."}
        else:
            return {"success": True, "action": "open_chat", "contact": contact_name, "message": f"Opened chat with {contact_name} on WhatsApp."}

    elif act in ["voice_call", "call", "voice"]:
        send_hotkey(VK_CONTROL, VK_F)
        time.sleep(0.4)
        set_clipboard_text(contact_name)
        send_hotkey(VK_CONTROL, VK_V)
        time.sleep(0.6)
        send_hotkey(VK_RETURN)
        time.sleep(0.8)
        send_hotkey(VK_CONTROL, VK_SHIFT, VK_C)
        return {"success": True, "action": "voice_call", "contact": contact_name, "message": f"Started voice call to {contact_name} on WhatsApp."}

    elif act in ["video_call", "video"]:
        send_hotkey(VK_CONTROL, VK_F)
        time.sleep(0.4)
        set_clipboard_text(contact_name)
        send_hotkey(VK_CONTROL, VK_V)
        time.sleep(0.6)
        send_hotkey(VK_RETURN)
        time.sleep(0.8)
        send_hotkey(VK_CONTROL, VK_SHIFT, VK_V)
        return {"success": True, "action": "video_call", "contact": contact_name, "message": f"Started video call to {contact_name} on WhatsApp."}

    return {"success": False, "error": f"Unknown WhatsApp action: {action}"}

def handle_browser(action, query=""):
    act = action.lower().strip()
    if act == "open_website":
        target = SITES_MAP.get(query.lower().strip(), f"https://{query}")
        webbrowser.open(target)
        return {"success": True, "action": "open_website", "url": target, "message": f"Opened website: {target}"}
    elif act == "google_search":
        encoded = urllib.parse.quote(query)
        target = f"https://www.google.com/search?q={encoded}"
        webbrowser.open(target)
        return {"success": True, "action": "google_search", "query": query, "url": target, "message": f"Searched Google for '{query}'"}
    elif act == "google_maps":
        encoded = urllib.parse.quote(query)
        target = f"https://www.google.com/maps/search/{encoded}"
        webbrowser.open(target)
        return {"success": True, "action": "google_maps", "query": query, "url": target, "message": f"Opened Google Maps search for '{query}'"}
    return {"success": False, "error": f"Unknown browser action: {action}"}

# --- Main Dispatcher ---
def main():
    category = sys.argv[1] if len(sys.argv) > 1 else "media"
    action = sys.argv[2] if len(sys.argv) > 2 else "play"
    query = sys.argv[3] if len(sys.argv) > 3 else ""

    cat = category.lower().strip()
    if cat == "volume":
        res = handle_volume(action)
    elif cat == "media":
        res = handle_media(action, query)
    elif cat == "app":
        res = handle_app(action, query)
    elif cat == "system":
        res = handle_system(action)
    elif cat == "file" or cat == "folder":
        res = handle_folder(action, query)
    elif cat == "browser":
        res = handle_browser(action, query)
    elif cat == "whatsapp":
        res = handle_whatsapp(action, query)
    else:
        # Fallback to media
        res = handle_media(category, action)

    print(json.dumps(res))

if __name__ == "__main__":
    main()
