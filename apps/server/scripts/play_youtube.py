import sys
import re
import json
import urllib.request
import urllib.parse
import webbrowser
import ctypes

# Windows Virtual Key Codes
VK_MEDIA_NEXT_TRACK = 0xB5
VK_MEDIA_PREV_TRACK = 0xB4
VK_MEDIA_STOP = 0xB2
VK_MEDIA_PLAY_PAUSE = 0xB3
VK_F = 0x46  # YouTube Fullscreen shortcut 'f'
VK_T = 0x54  # YouTube Cinema/Theater mode shortcut 't'

def send_key(key_code):
    try:
        KEYEVENTF_KEYUP = 0x0002
        ctypes.windll.user32.keybd_event(key_code, 0, 0, 0)
        ctypes.windll.user32.keybd_event(key_code, 0, KEYEVENTF_KEYUP, 0)
        return True
    except Exception as e:
        return False

def clean_youtube_query(q):
    if not q:
        return ""
    q = re.sub(r'^(play|search\s+for|search|listen\s+to|put\s+on)\s+', '', q, flags=re.IGNORECASE)
    q = re.sub(r'\s+(from|on|in)\s+youtube.*$', '', q, flags=re.IGNORECASE)
    q = re.sub(r'\s+youtube.*$', '', q, flags=re.IGNORECASE)
    q = re.sub(r'\s+(from|on|in)$', '', q, flags=re.IGNORECASE)
    return q.strip(' "\'.,')

def play_youtube_song(query):
    try:
        clean_title = clean_youtube_query(query) or query
        encoded_query = urllib.parse.quote(clean_title)
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
                    "query": clean_title,
                    "videoUrl": watch_url,
                    "videoId": first_video_id,
                    "message": f"Playing '{clean_title}' on YouTube."
                }
        
        fallback_url = f"https://www.youtube.com/results?search_query={encoded_query}"
        webbrowser.open(fallback_url)
        return {
            "success": True,
            "action": "play",
            "query": clean_title,
            "videoUrl": fallback_url,
            "message": f"Playing '{clean_title}' on YouTube."
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

def handle_media_action(action, query=""):
    act = action.lower().strip()
    
    if act == "pause" or act == "resume":
        send_key(VK_MEDIA_PLAY_PAUSE)
        return {
            "success": True,
            "action": act,
            "message": f"YouTube media playback {act}d."
        }
    elif act == "stop":
        send_key(VK_MEDIA_STOP)
        return {
            "success": True,
            "action": "stop",
            "message": "YouTube media playback stopped."
        }
    elif act == "next":
        send_key(VK_MEDIA_NEXT_TRACK)
        return {
            "success": True,
            "action": "next",
            "message": "Skipped to next track."
        }
    elif act == "previous" or act == "prev":
        send_key(VK_MEDIA_PREV_TRACK)
        return {
            "success": True,
            "action": "previous",
            "message": "Skipped to previous track."
        }
    elif act == "fullscreen" or act == "full_screen" or act == "full screen":
        send_key(VK_F)
        return {
            "success": True,
            "action": "fullscreen",
            "message": "Toggled YouTube Full Screen mode."
        }
    elif act == "cinema" or act == "theater" or act == "cinema_mode" or act == "cinema mode":
        send_key(VK_T)
        return {
            "success": True,
            "action": "cinema",
            "message": "Toggled YouTube Cinema / Theater mode."
        }
    elif act == "play" or act == "change":
        if query:
            return play_youtube_song(query)
        else:
            send_key(VK_MEDIA_PLAY_PAUSE)
            return {
                "success": True,
                "action": "play",
                "message": "Resumed media playback."
            }
    else:
        if query:
            return play_youtube_song(query)
        return play_youtube_song(action)

if __name__ == "__main__":
    action_arg = sys.argv[1] if len(sys.argv) > 1 else "play"
    query_arg = sys.argv[2] if len(sys.argv) > 2 else ""
    
    result = handle_media_action(action_arg, query_arg)
    print(json.dumps(result))
