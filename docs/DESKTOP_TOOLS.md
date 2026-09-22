# JARVIS Desktop Tools Reference — Phase 3

## Available Desktop Tools

### System Telemetry
- `system_status`: Returns CPU %, Memory, Disk, GPU, Battery, Network, OS, Uptime.
- `system_info`: Returns hardware specifications and OS version.
- `system_uptime`: Returns host system boot timestamp and uptime.

### Application Management
- `application_list`: Lists active GUI processes.
- `application_launch`: Launches allowlisted application (`vscode`, `chrome`, `notepad`, `calculator`, `explorer`, `terminal`).
- `application_close`: Closes application process (requires explicit HITL user confirmation).

### Window Management
- `window_list`: Lists visible desktop windows and HWNDs.
- `window_focus`: Brings target window to front by title or HWND.
- `window_minimize`: Minimizes target window by title or HWND.
- `window_maximize`: Maximizes target window by title or HWND.

### Filesystem Sandbox
- `filesystem_list`: Lists directory contents inside authorized sandbox roots.
- `filesystem_read`: Reads file contents inside sandbox roots.
- `filesystem_exists`: Checks file/folder existence inside sandbox roots.
