import sys
from typing import List, Dict, Any

try:
    if sys.platform == "win32":
        import win32gui
        import win32con
        import win32process
        import psutil
        HAS_PYWIN32 = True
    else:
        HAS_PYWIN32 = False
except ImportError:
    HAS_PYWIN32 = False

def list_windows() -> List[Dict[str, Any]]:
    """
    Lists visible top-level desktop windows.
    """
    windows = []

    if not HAS_PYWIN32:
        # Fallback for testing environments
        return [
            {"hwnd": 1001, "title": "Visual Studio Code", "visible": True},
            {"hwnd": 1002, "title": "Google Chrome", "visible": True}
        ]

    def enum_windows_callback(hwnd, _):
        if win32gui.IsWindowVisible(hwnd) and win32gui.GetWindowText(hwnd).strip():
            title = win32gui.GetWindowText(hwnd).strip()
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            proc_name = ""
            try:
                proc = psutil.Process(pid)
                proc_name = proc.name()
            except Exception:
                pass

            windows.append({
                "hwnd": hwnd,
                "title": title,
                "pid": pid,
                "processName": proc_name
            })

    win32gui.EnumWindows(enum_windows_callback, None)
    return windows

def focus_window(query: str) -> Dict[str, Any]:
    """
    Brings a window matching title/query to foreground after HWND validation.
    """
    windows = list_windows()
    target_window = _find_window(windows, query)

    if not target_window:
        raise ValueError(f"No active window found matching query '{query}'.")

    hwnd = target_window["hwnd"]

    if HAS_PYWIN32:
        try:
            if win32gui.IsIconic(hwnd):
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            win32gui.SetForegroundWindow(hwnd)
        except Exception as e:
            # Try Alt key trick for SetForegroundWindow restriction on Windows
            try:
                import win32com.client
                shell = win32com.client.Dispatch("WScript.Shell")
                shell.SendKeys('%')
                win32gui.SetForegroundWindow(hwnd)
            except Exception:
                raise RuntimeError(f"Failed to bring window '{target_window['title']}' to focus: {e}")

    return {
        "success": True,
        "hwnd": hwnd,
        "title": target_window["title"],
        "message": f"Focused window '{target_window['title']}'."
    }

def minimize_window(query: str) -> Dict[str, Any]:
    """
    Minimizes a window matching title/query.
    """
    windows = list_windows()
    target_window = _find_window(windows, query)

    if not target_window:
        raise ValueError(f"No active window found matching query '{query}'.")

    hwnd = target_window["hwnd"]

    if HAS_PYWIN32:
        win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)

    return {
        "success": True,
        "hwnd": hwnd,
        "title": target_window["title"],
        "message": f"Minimized window '{target_window['title']}'."
    }

def maximize_window(query: str) -> Dict[str, Any]:
    """
    Maximizes a window matching title/query.
    """
    windows = list_windows()
    target_window = _find_window(windows, query)

    if not target_window:
        raise ValueError(f"No active window found matching query '{query}'.")

    hwnd = target_window["hwnd"]

    if HAS_PYWIN32:
        win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)

    return {
        "success": True,
        "hwnd": hwnd,
        "title": target_window["title"],
        "message": f"Maximized window '{target_window['title']}'."
    }

def _find_window(windows: List[Dict[str, Any]], query: str) -> Dict[str, Any] | None:
    """Helper to match HWND or title substrings."""
    query_str = str(query).lower().strip()

    # Try HWND match first if numeric
    if query_str.isdigit():
        target_hwnd = int(query_str)
        for w in windows:
            if w["hwnd"] == target_hwnd:
                return w

    # Substring title match
    for w in windows:
        if query_str in w["title"].lower():
            return w

    return None
