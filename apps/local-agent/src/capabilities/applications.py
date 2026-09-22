import os
import subprocess
import psutil
from typing import List, Dict, Any
from src.config import APPLICATION_REGISTRY

def list_applications() -> List[Dict[str, Any]]:
    """
    Returns a controlled list of currently running GUI applications and processes.
    """
    running_apps = []
    seen_names = set()

    for proc in psutil.process_iter(['pid', 'name', 'status']):
        try:
            info = proc.info
            name = info['name']
            if not name or info['status'] == psutil.STATUS_ZOMBIE:
                continue

            # Check if process corresponds to a registered app or typical GUI app
            is_registered = False
            app_id_match = None
            for app_id, reg in APPLICATION_REGISTRY.items():
                if any(p.lower() == name.lower() for p in reg["process_names"]):
                    is_registered = True
                    app_id_match = app_id
                    break

            if is_registered and app_id_match not in seen_names:
                seen_names.add(app_id_match)
                running_apps.append({
                    "pid": info['pid'],
                    "name": name,
                    "applicationId": app_id_match,
                    "displayName": APPLICATION_REGISTRY[app_id_match]["name"]
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    return running_apps

def launch_application(application_id: str) -> Dict[str, Any]:
    """
    Launches an application strictly through the controlled APPLICATION_REGISTRY allowlist.
    Rejects arbitrary executable paths or un-registered application IDs.
    """
    app_id = application_id.lower().strip()
    if app_id not in APPLICATION_REGISTRY:
        allowed_list = list(APPLICATION_REGISTRY.keys())
        raise ValueError(f"Application ID '{application_id}' is not in the controlled allowlist. Allowed applications: {allowed_list}")

    app_config = APPLICATION_REGISTRY[app_id]
    executables = app_config["executables"]

    launched = False
    launched_exec = None

    for exe in executables:
        try:
            if os.name == 'nt':
                # Use os.startfile or subprocess with shell=False
                subprocess.Popen([exe], shell=False, creationflags=subprocess.CREATE_NEW_CONSOLE)
            else:
                subprocess.Popen([exe], shell=False)
            launched = True
            launched_exec = exe
            break
        except Exception:
            continue

    if not launched:
        # Fallback to start command on Windows if executable in PATH
        try:
            subprocess.Popen(f"start {executables[0]}", shell=True)
            launched = True
            launched_exec = executables[0]
        except Exception as e:
            raise RuntimeError(f"Failed to launch application '{app_config['name']}': {e}")

    return {
        "success": True,
        "applicationId": app_id,
        "name": app_config["name"],
        "executable": launched_exec,
        "message": f"Successfully launched {app_config['name']}."
    }

def close_application(application_id: str) -> Dict[str, Any]:
    """
    Closes running instances of an application registered in APPLICATION_REGISTRY.
    """
    app_id = application_id.lower().strip()
    if app_id not in APPLICATION_REGISTRY:
        raise ValueError(f"Cannot close application: ID '{application_id}' is not in the controlled registry.")

    app_config = APPLICATION_REGISTRY[app_id]
    target_names = [p.lower() for p in app_config["process_names"]]

    terminated_count = 0

    for proc in psutil.process_iter(['pid', 'name']):
        try:
            proc_name = proc.info['name']
            if proc_name and proc_name.lower() in target_names:
                proc.terminate()
                terminated_count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    return {
        "success": terminated_count > 0,
        "applicationId": app_id,
        "name": app_config["name"],
        "terminatedCount": terminated_count,
        "message": f"Closed {terminated_count} process instance(s) of {app_config['name']}." if terminated_count > 0 else f"No active process found for {app_config['name']}."
    }
