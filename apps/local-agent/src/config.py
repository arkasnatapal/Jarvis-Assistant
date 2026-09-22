import os
import platform
from pathlib import Path

# Agent Metadata
AGENT_ID = os.getenv("JARVIS_AGENT_ID", "jarvis-win-agent-01")
PLATFORM = "windows" if os.name == "nt" else platform.system().lower()
VERSION = "0.3.0"

# Server Connection Configuration (Localhost / Loopback only)
SERVER_WS_URL = os.getenv("JARVIS_SERVER_WS_URL", "ws://127.0.0.1:3001/local-agent")
HEARTBEAT_INTERVAL_SECONDS = 5
RECONNECT_INITIAL_BACKOFF = 1
RECONNECT_MAX_BACKOFF = 30

# Secure Credentials Storage
HOME_DIR = Path.home()
CREDENTIALS_DIR = HOME_DIR / ".jarvis"
PAIRING_SECRET_FILE = CREDENTIALS_DIR / "local_agent_pairing.key"

# Sandbox Filesystem Boundaries (Configurable Allowed Roots)
# Always normalized to canonical resolved paths
DEFAULT_ALLOWED_ROOTS = [
    os.path.abspath("d:\\Jarvis"),
    os.path.abspath(str(HOME_DIR / "Documents")),
    os.path.abspath(str(HOME_DIR / "Projects")),
    os.path.abspath(os.getcwd())
]

# Controlled Application Allowlist Registry
# Maps applicationId -> Executable binary name / command
APPLICATION_REGISTRY = {
    "vscode": {
        "name": "Visual Studio Code",
        "executables": ["code", "Code.exe", "code.cmd"],
        "process_names": ["Code.exe", "code"]
    },
    "chrome": {
        "name": "Google Chrome",
        "executables": ["chrome.exe", "chrome"],
        "process_names": ["chrome.exe", "chrome"]
    },
    "notepad": {
        "name": "Notepad",
        "executables": ["notepad.exe", "notepad"],
        "process_names": ["notepad.exe", "Notepad.exe"]
    },
    "calculator": {
        "name": "Calculator",
        "executables": ["calc.exe", "calc"],
        "process_names": ["calc.exe", "CalculatorApp.exe"]
    },
    "explorer": {
        "name": "File Explorer",
        "executables": ["explorer.exe"],
        "process_names": ["explorer.exe"]
    },
    "terminal": {
        "name": "Windows Terminal / Command Prompt",
        "executables": ["wt.exe", "cmd.exe"],
        "process_names": ["WindowsTerminal.exe", "cmd.exe"]
    }
}

# Advertised Agent Capabilities Matrix
AGENT_CAPABILITIES = [
    "system.status",
    "system.info",
    "system.uptime",
    "application.list",
    "application.launch",
    "application.close",
    "window.list",
    "window.focus",
    "window.minimize",
    "window.maximize",
    "filesystem.list",
    "filesystem.read",
    "filesystem.exists"
]
