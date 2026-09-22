import threading
import sys

_kill_switch_active = False
_on_activate_callback = None

def is_kill_switch_active() -> bool:
    """Returns True if the emergency kill switch has been triggered."""
    global _kill_switch_active
    return _kill_switch_active

def activate_kill_switch(reason: str = "Hotkey Ctrl+Alt+Shift+K triggered"):
    """Triggers the emergency kill switch immediately disabling all remote execution."""
    global _kill_switch_active, _on_activate_callback
    _kill_switch_active = True
    print(f"\n[KILL SWITCH ACTIVATED] {reason}. REMOTE CONTROL DISABLED.")
    if _on_activate_callback:
        try:
            _on_activate_callback()
        except Exception:
            pass

def reset_kill_switch():
    """Resets the kill switch restoring remote execution."""
    global _kill_switch_active
    _kill_switch_active = False
    print("[KILL SWITCH RESET] Remote control re-enabled.")

def register_activate_callback(cb):
    """Registers a callback function to run when kill switch activates (e.g. notify backend)."""
    global _on_activate_callback
    _on_activate_callback = cb

def start_kill_switch_listener():
    """Starts background hotkey listener for Ctrl + Alt + Shift + K."""
    def run_listener():
        try:
            from pynput import keyboard

            COMBINATION = {
                keyboard.Key.ctrl,
                keyboard.Key.alt,
                keyboard.Key.shift,
                keyboard.KeyCode.from_char('k')
            }
            COMBINATION_CAPS = {
                keyboard.Key.ctrl,
                keyboard.Key.alt,
                keyboard.Key.shift,
                keyboard.KeyCode.from_char('K')
            }

            current_keys = set()

            def on_press(key):
                current_keys.add(key)
                if COMBINATION.issubset(current_keys) or COMBINATION_CAPS.issubset(current_keys):
                    activate_kill_switch("Global hotkey Ctrl+Alt+Shift+K pressed")

            def on_release(key):
                if key in current_keys:
                    current_keys.remove(key)

            with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
                listener.join()
        except Exception as e:
            print(f"[KillSwitch] Pynput hotkey listener notice: {e}")

    thread = threading.Thread(target=run_listener, daemon=True)
    thread.start()
