import time
import platform
import psutil

def get_system_status() -> dict:
    """Returns comprehensive system telemetry snapshot."""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Battery info
    battery_info = None
    try:
        battery = psutil.sensors_battery()
        if battery:
            battery_info = {
                "percent": battery.percent,
                "power_plugged": battery.power_plugged,
                "secs_left": battery.secsleft
            }
    except Exception:
        pass

    # Network stats
    net_io = psutil.net_io_counters()
    net_info = {
        "bytes_sent": net_io.bytes_sent,
        "bytes_recv": net_io.bytes_recv
    }

    # Uptime
    boot_time = psutil.boot_time()
    uptime_seconds = int(time.time() - boot_time)

    # GPU info if py3nvml / wmi available
    gpu_info = "N/A"
    try:
        if platform.system() == "Windows":
            import subprocess
            res = subprocess.run(
                ['wmic', 'path', 'win32_VideoController', 'get', 'name'],
                capture_output=True, text=True, timeout=2
            )
            if res.returncode == 0:
                lines = [line.strip() for line in res.stdout.split('\n') if line.strip() and line.strip() != 'Name']
                if lines:
                    gpu_info = ", ".join(lines)
    except Exception:
        pass

    return {
        "cpu_usage_percent": cpu_percent,
        "memory": {
            "total_gb": round(memory.total / (1024**3), 2),
            "used_gb": round(memory.used / (1024**3), 2),
            "available_gb": round(memory.available / (1024**3), 2),
            "percent": memory.percent
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "percent": disk.percent
        },
        "gpu": gpu_info,
        "battery": battery_info,
        "network": net_info,
        "os": f"{platform.system()} {platform.release()} ({platform.version()})",
        "uptime_seconds": uptime_seconds
    }

def get_system_info() -> dict:
    """Returns static hardware and OS system information."""
    return {
        "os": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "architecture": platform.architecture()[0],
        "machine": platform.machine(),
        "processor": platform.processor(),
        "hostname": platform.node(),
        "cpu_count_logical": psutil.cpu_count(logical=True),
        "cpu_count_physical": psutil.cpu_count(logical=False),
        "python_version": platform.python_version()
    }

def get_system_uptime() -> dict:
    """Returns uptime metrics."""
    boot_time = psutil.boot_time()
    uptime_seconds = int(time.time() - boot_time)
    hrs = uptime_seconds // 3600
    mins = (uptime_seconds % 3600) // 60
    secs = uptime_seconds % 60
    
    return {
        "boot_timestamp": int(boot_time),
        "uptime_seconds": uptime_seconds,
        "uptime_formatted": f"{hrs}h {mins}m {secs}s"
    }
