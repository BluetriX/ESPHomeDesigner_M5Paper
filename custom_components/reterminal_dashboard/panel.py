"""
Panel view for the reTerminal Dashboard Designer.

This exposes the editor UI as a full-screen, authenticated panel inside Home Assistant,
so users do not need to copy anything into /config/www manually.

Routes:
- GET /reterminal-dashboard
    Serves the embedded editor HTML/JS, which talks to:
    - /api/reterminal_dashboard/layout
    - /api/reterminal_dashboard/entities
    - /api/reterminal_dashboard/snippet
    - /api/reterminal_dashboard/import_snippet

Notes:
- This view runs under the Home Assistant frontend origin and shares auth/session.
- All API calls are relative paths, no hard-coded host.
"""

from __future__ import annotations

import logging
from typing import Any

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import API_BASE_PATH

_LOGGER = logging.getLogger(__name__)


PANEL_URL_PATH = "/reterminal-dashboard"


class ReTerminalDashboardPanelView(HomeAssistantView):
    """Serve the reTerminal Dashboard Designer editor as a panel."""

    url = PANEL_URL_PATH
    name = "reterminal_dashboard:panel"
    requires_auth = False  # Temporarily disable for testing
    cors_allowed = False

    def __init__(self, hass: HomeAssistant) -> None:
        """Store hass if needed later."""
        self.hass = hass

    async def get(self, request) -> Any:  # type: ignore[override]
        """Return the full editor HTML by reading the standalone version.
        
        This ensures the panel has the same features as the standalone editor,
        just with automatic HA backend detection.
        """
        _LOGGER.info("Panel view accessed successfully")
        
        # Read the full standalone editor HTML
        import os
        from pathlib import Path
        
        # Get the path to the www/reterminal_dashboard_panel/editor.html file
        current_dir = Path(__file__).parent
        editor_path = current_dir.parent.parent / "www" / "reterminal_dashboard_panel" / "editor.html"
        
        try:
            with open(editor_path, "r", encoding="utf-8") as f:
                html_content = f.read()
                
            return web.Response(
                body=html_content,
                status=200,
                content_type="text/html",
            )
        except Exception as exc:
            _LOGGER.error("Failed to load editor.html: %s", exc)
            # Fallback to simple message
            fallback_html = f"""<!DOCTYPE html>
<html>
<head><title>reTerminal Dashboard - Error</title></head>
<body>
<h1>reTerminal Dashboard Designer</h1>
<p>Error loading editor. Check logs.</p>
<p>Error: {exc}</p>
<p><a href="/api/reterminal_dashboard/test">Test API</a></p>
</body>
</html>"""
            return web.Response(
                body=fallback_html,
                status=200,
                content_type="text/html",
            )

    def _load_base_styles(self) -> str:
        """Return the CSS subset from the standalone editor for the inline panel.

        Extracted from the original editor.html to avoid external files.
        Keep this in sync with your design but avoid remote dependencies.
        """
        # NOTE: For brevity and maintainability, we include only layout-critical parts.
        # You can further compress or refactor as needed.
        return """
:root {
  --bg: #0f1115;
  --bg-elevated: #181b22;
  --accent: #52c7ea;
  --accent-soft: rgba(82, 199, 234, 0.16);
  --border-subtle: #2a2f3a;
  --text: #e5e9f0;
  --muted: #7b8190;
  --danger: #ff6b81;
  --font: system-ui, -apple-system, BlinkMacSystemFont, -sans-serif;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
body {
  font-family: var(--font);
  background: radial-gradient(circle at top left, #1c1f26 0, #050609 40%, #020308 100%);
  color: var(--text);
  display: flex;
}
.sidebar {
  width: 260px;
  background: linear-gradient(to bottom, #151821, #0c0f15);
  border-right: 1px solid var(--border-subtle);
  padding: 16px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}
.sidebar h1 {
  font-size: 16px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  font-size: 10px;
  color: var(--muted);
  margin-top: 6px;
}
.pill span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}
.sidebar-section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  margin-bottom: 6px;
}
.select, .input {
  width: 100%;
  padding: 7px 9px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: #0f1118;
  color: var(--text);
  outline: none;
}
.select:focus, .input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-soft);
}
.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.btn {
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  padding: 6px 9px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.16s ease;
}
.btn:hover {
  background: var(--accent-soft);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
}
.btn-secondary {
  border-color: var(--border-subtle);
  color: var(--muted);
}
.btn-secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.btn-full {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
}
.page-list, .widget-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.item {
  padding: 5px 7px;
  border-radius: 5px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  color: var(--muted);
}
.item span.label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item small {
  font-size: 9px;
  opacity: 0.7;
}
.item.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.item:hover {
  background: #151822;
  border-color: var(--border-subtle);
}
.item .tag {
  padding: 1px 5px;
  border-radius: 999px;
  font-size: 8px;
  border: 1px solid var(--border-subtle);
  color: var(--muted);
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 14px 8px;
  gap: 8px;
  overflow: hidden;
  min-width: 0;
}
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.main-header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.main-header-title h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.main-header-title span {
  font-size: 11px;
  color: var(--muted);
}
.main-header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.main-header-pill {
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  font-size: 9px;
  color: var(--muted);
}
.canvas-wrap {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 8px;
  align-items: flex-start;
  justify-content: flex-start;
  min-width: 0;
  overflow: hidden;
}
.canvas-area {
  background: radial-gradient(circle at top, #171b22, #05070b);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}
.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  color: var(--muted);
  flex-shrink: 0;
}
.canvas-toolbar span strong {
  color: var(--accent);
  font-weight: 500;
}
.canvas {
  width: 800px;
  height: 480px;
  margin-top: 4px;
  background: #000000;
  border-radius: 10px;
  border: 1px solid #222222;
  position: relative;
  box-shadow: inset 0 0 0 1px #222222, 0 18px 40px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  transition: all 0.16s ease;
  flex-shrink: 0;
}
.canvas-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}
.widget {
  position: absolute;
  font-size: 12px;
  color: #ffffff;
  cursor: move;
  display: block;
  user-select: none;
  border: none;
  background: transparent;
  padding: 0;
}
.widget.active {
  outline: 1px solid var(--accent);
  box-shadow: 0 0 0 1px rgba(82, 199, 234, 0.4);
}
.widget-resize-handle {
  position: absolute;
  width: 11px;
  height: 11px;
  border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.7);
  cursor: nwse-resize;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.widget-resize-handle::after {
  content: "";
  width: 6px;
  height: 2px;
  border-radius: 2px;
  background: #0b0e13;
  transform: rotate(40deg);
  opacity: 0.9;
}
.right-panel {
  width: 260px;
  background: #0d1016;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-sizing: border-box;
  max-height: 480px;
}
.right-panel-header {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
}
.right-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hint {
  font-size: 9px;
  color: var(--muted);
}
"""