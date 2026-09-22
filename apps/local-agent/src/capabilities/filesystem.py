import os
from typing import List, Dict, Any
from src.security import is_path_allowed

MAX_READ_BYTES = 500 * 1024  # 500 KB limit for safe reads

def list_filesystem(target_path: str) -> Dict[str, Any]:
    """
    Lists directory contents strictly within allowed sandbox root.
    """
    if not is_path_allowed(target_path):
        raise PermissionError(f"Access Denied: Target path '{target_path}' is outside the authorized JARVIS sandbox boundary.")

    canonical_path = os.path.realpath(os.path.abspath(target_path))

    if not os.path.exists(canonical_path):
        raise FileNotFoundError(f"Path '{target_path}' does not exist.")

    if not os.path.isdir(canonical_path):
        raise ValueError(f"Path '{target_path}' is a file, not a directory.")

    entries = []
    for item in os.listdir(canonical_path):
        full_item_path = os.path.join(canonical_path, item)
        is_dir = os.path.isdir(full_item_path)
        size = 0
        if not is_dir:
            try:
                size = os.path.getsize(full_item_path)
            except Exception:
                pass

        entries.append({
            "name": item,
            "isDirectory": is_dir,
            "sizeBytes": size
        })

    return {
        "path": canonical_path,
        "entryCount": len(entries),
        "entries": entries
    }

def read_filesystem(target_path: str) -> Dict[str, Any]:
    """
    Reads contents of a file strictly within allowed sandbox root.
    """
    if not is_path_allowed(target_path):
        raise PermissionError(f"Access Denied: Target path '{target_path}' is outside the authorized JARVIS sandbox boundary.")

    canonical_path = os.path.realpath(os.path.abspath(target_path))

    if not os.path.exists(canonical_path):
        raise FileNotFoundError(f"File '{target_path}' does not exist.")

    if os.path.isdir(canonical_path):
        raise ValueError(f"Path '{target_path}' is a directory, not a file.")

    file_size = os.path.getsize(canonical_path)
    if file_size > MAX_READ_BYTES:
        raise ValueError(f"File size ({file_size} bytes) exceeds maximum safe read limit ({MAX_READ_BYTES} bytes).")

    with open(canonical_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    return {
        "path": canonical_path,
        "sizeBytes": file_size,
        "content": content
    }

def exists_filesystem(target_path: str) -> Dict[str, Any]:
    """
    Checks if a file/folder exists strictly within allowed sandbox root.
    """
    if not is_path_allowed(target_path):
        return {
            "path": target_path,
            "exists": False,
            "allowed": False,
            "message": "Access Denied: Path outside authorized sandbox boundary."
        }

    canonical_path = os.path.realpath(os.path.abspath(target_path))
    exists = os.path.exists(canonical_path)
    is_dir = os.path.isdir(canonical_path) if exists else False

    return {
        "path": canonical_path,
        "exists": exists,
        "isDirectory": is_dir,
        "allowed": True
    }
