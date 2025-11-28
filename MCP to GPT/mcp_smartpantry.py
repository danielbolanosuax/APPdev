from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List, Dict

from mcp.server.fastmcp import FastMCP

# === LOGGING BÁSICO A FICHERO ===
LOG_FILE = Path(__file__).with_suffix(".log")
logging.basicConfig(
    level=logging.DEBUG,
    filename=str(LOG_FILE),
    filemode="a",
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logging.info("=== Arrancando SmartPantry MCP ===")

# Nombre del servidor en el cliente MCP
mcp = FastMCP("smartpantry-helper")

# 📁 Raíz del proyecto (por defecto: padre de esta carpeta "MCP to GPT")
DEFAULT_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", DEFAULT_ROOT)).resolve()


def _resolve_safe_path(rel_path: str) -> Path:
    """
    Resuelve un path relativo dentro del proyecto y evita escapes fuera de la raíz.
    """
    base = PROJECT_ROOT
    target = (base / rel_path).resolve()

    if not str(target).startswith(str(base)):
        raise ValueError(
            f"El path '{rel_path}' se sale de la raíz del proyecto ({base})."
        )
    return target


@mcp.tool()
def get_project_root() -> str:
    """
    Devuelve la ruta absoluta de la raíz del proyecto que ve este servidor MCP.
    """
    return str(PROJECT_ROOT)


@mcp.tool()
def list_project_files(
    subdir: str = ".",
    max_items: int = 200,
    include_dirs: bool = False,
) -> List[str]:
    """
    Lista archivos (y opcionalmente carpetas) dentro del proyecto.

    - subdir: carpeta relativa a la raíz del proyecto.
    - max_items: máximo de entradas a devolver.
    - include_dirs: si True, también devuelve directorios.
    """
    root = _resolve_safe_path(subdir)

    if not root.exists():
        raise FileNotFoundError(f"La carpeta '{subdir}' no existe dentro del proyecto.")

    results: List[str] = []
    for path in root.rglob("*"):
        if not include_dirs and path.is_dir():
            continue
        rel = path.relative_to(PROJECT_ROOT)
        results.append(str(rel).replace("\\", "/"))
        if len(results) >= max_items:
            break

    return results


@mcp.tool()
def read_project_file(path: str, max_bytes: int = 20000) -> str:
    """
    Lee el contenido de un archivo dentro del proyecto.

    - path: ruta relativa (por ejemplo: 'src/App.tsx').
    - max_bytes: máximo de bytes a devolver (para evitar romper el contexto).
    """
    file_path = _resolve_safe_path(path)

    if not file_path.exists() or not file_path.is_file():
        raise FileNotFoundError(f"El archivo '{path}' no existe en el proyecto.")

    data = file_path.read_bytes()
    if len(data) > max_bytes:
        head = data[:max_bytes].decode("utf-8", errors="ignore")
        tail_len = len(data) - max_bytes
        return (
            head
            + f"\n\n...[contenido truncado: {tail_len} bytes más en '{path}']..."
        )

    return data.decode("utf-8", errors="ignore")


@mcp.tool()
def write_project_file(
    path: str,
    content: str,
    create_dirs: bool = False,
) -> str:
    """
    Escribe (o sobreescribe) un archivo en el proyecto.

    ⚠️ Úsalo cuando tú se lo pidas explícitamente a la IA.

    - path: ruta relativa (por ejemplo: 'src/components/Nuevo.tsx').
    - content: contenido completo del archivo.
    - create_dirs: si True, crea las carpetas intermedias si no existen.
    """
    file_path = _resolve_safe_path(path)

    if create_dirs:
        file_path.parent.mkdir(parents=True, exist_ok=True)

    file_path.write_text(content, encoding="utf-8")

    rel = file_path.relative_to(PROJECT_ROOT)
    return f"Archivo escrito correctamente: {rel} ({len(content)} caracteres)."


@mcp.tool()
def search_in_project(
    query: str,
    file_pattern: str = "*.ts*",
    max_results: int = 50,
) -> List[Dict[str, str]]:
    """
    Busca una cadena de texto en los archivos del proyecto.

    - query: texto a buscar (sensible a mayúsculas/minúsculas).
    - file_pattern: patrón de archivo (ej: '*.tsx', '*.ts', '*.js', '*.json').
    - max_results: máximo de coincidencias a devolver.

    Devuelve una lista de objetos con:
      - path: ruta relativa del archivo
      - line: número de línea (1-based)
      - snippet: línea donde aparece la coincidencia
    """
    import fnmatch

    results: List[Dict[str, str]] = []

    for path in PROJECT_ROOT.rglob("*"):
        if not path.is_file():
            continue
        if not fnmatch.fnmatch(path.name, file_pattern):
            continue

        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for i, line in enumerate(text.splitlines(), start=1):
            if query in line:
                rel = path.relative_to(PROJECT_ROOT)
                results.append(
                    {
                        "path": str(rel).replace("\\", "/"),
                        "line": str(i),
                        "snippet": line.strip(),
                    }
                )
                if len(results) >= max_results:
                    return results

    return results


if __name__ == "__main__":
    try:
        logging.info("Iniciando FastMCP server (stdio). PROJECT_ROOT=%s", PROJECT_ROOT)
        mcp.run(transport="stdio")
    except Exception:
        logging.exception("ERROR no controlado en el servidor MCP")
        raise
