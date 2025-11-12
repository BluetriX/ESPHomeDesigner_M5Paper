# reTerminal Dashboard Designer - Implementation Plan

This file defines the concrete structure and responsibilities for the new, open-source solution you can publish on GitHub.

Architecture recap (based on all provided files and decisions):

- Rendering and layout live in Home Assistant.
- HACS integration exposes:
  - A GUI editor panel to design dashboards.
  - REST endpoints that render 800x480 dashboard PNGs per device/page.
  - Services to change pages.
- reTerminal E1001 runs a generic ESPHome firmware:
  - Connects to WiFi.
  - Periodically fetches PNG from HA endpoint.
  - Draws it on the 800x480 e-paper.
  - Uses hardware buttons to cycle pages by calling HA services.
- No hard-coded sensors; everything is chosen via the GUI.
- Entirely local; no external cloud like TRMNL.

## 1. Repository layout

Top-level suggestion for the new GitHub repo:

- `/custom_components/reterminal_dashboard/`
  - `__init__.py`
  - `manifest.json`
  - `config_flow.py`
  - `const.py`
  - `api.py` (REST / image endpoints)
  - `models.py` (layout/page/widget models)
  - `renderer.py` (HTML/PNG rendering)
  - `services.py` (page switching etc.)
  - `panel.py` or `websocket.py` (if needed to support live editor)
  - `translations/en.json`
- `/www/reterminal_dashboard_panel/`
  - Frontend (built JS/CSS) for the editor (e.g. React or Lit).
- `/esphome/`
  - `reterminal_e1001_generic.yaml` (example firmware config, generic, no user sensors).
- `README.md`
- `LICENSE`
- `hacs.json`
- `.github/workflows/` (hassfest, hacs)

This mirrors good practice from `ha_trmnl_weather_station` and keeps everything self-contained.

## 2. HA integration: key pieces

### 2.1 `manifest.json`

- Domain: `reterminal_dashboard`
- Requirements:
  - `Pillow` (for PNG rendering) or alternative.
  - Optionally `jinja2` if using templates.
- Config flow: yes.
- Panel: true (we register a custom panel for the editor).

### 2.2 `const.py` (core constants)

- `DOMAIN = "reterminal_dashboard"`
- `CONF_DEVICE_ID = "device_id"`
- `CONF_NAME = "name"`
- `CONF_PAGES = "pages"`
- `CONF_LAYOUT = "layout"`
- `CONF_API_TOKEN = "api_token"` (for secured image fetching)
- `IMAGE_WIDTH = 800`
- `IMAGE_HEIGHT = 480`
- `DEFAULT_PAGES = 3`

### 2.3 Layout and widget model (`models.py`)

Internal data (stored in HA storage, not user YAML):

- Device layout schema (simplified):

```python
@dataclass
class WidgetConfig:
    id: str
    type: str  # "sensor_value", "icon_label", "weather_block", etc.
    entity_id: str | None
    x: int
    y: int
    width: int
    height: int
    props: dict  # colors (for pre-dithering), font size, alignment, formatting, etc.

@dataclass
class PageConfig:
    id: str
    name: str
    widgets: list[WidgetConfig]

@dataclass
class DeviceConfig:
    device_id: str
    name: str
    api_token: str
    pages: list[PageConfig]
    default_page: int
    current_page: int
```

- Stored via `hass.helpers.storage.Store`.
- Edited exclusively through the GUI and integration APIs.

### 2.4 REST/image endpoints (`api.py`)

Expose (authenticated, requires long-lived token or per-device token):

- `GET /api/reterminal_dashboard/{device_id}/page/{page_index}/image.png`
  - Validate device and token.
  - Load `DeviceConfig`.
  - Resolve entities from HA state.
  - Call `renderer.render_png(device_config, page_index, hass)`.

Optional:
- `POST /api/reterminal_dashboard/{device_id}/set_page`
- `POST /api/reterminal_dashboard/{device_id}/next_page`
- But better: expose as HA services and let ESPHome call services.

### 2.5 Services (`services.py`)

Register services:

- `reterminal_dashboard.set_page`
  - `device_id: str`
  - `page: int`
  - Update `current_page` in store.
- `reterminal_dashboard.next_page`
- `reterminal_dashboard.prev_page`

These are triggered by:
- ESPHome button actions (via `homeassistant.service` calls).
- HA automations.
- The editor, for preview.

## 3. Rendering (`renderer.py`)

Goal: deterministic 800x480 PNG for e-ink.

Implementation outline:

- Use `Pillow`:
  - Create `Image.new("L", (IMAGE_WIDTH, IMAGE_HEIGHT), color=255)` (1-channel).
  - Use `ImageDraw` and preconfigured fonts.
  - Render:
    - Time/date blocks.
    - Sensor values (rounded).
    - Icons via a simple icon set mapped to text or small bitmaps.
- Respect widget config:
  - For each widget:
    - Fetch entity state.
    - Run small formatting rules.
    - Draw text/lines/icons at `x, y, width, height`.
- Export:
  - Return PNG bytes with 1-bit or dithered grayscale friendly to the Waveshare panel.

This is all server-side, no user secrets in code.

## 4. Frontend editor (HACS panel) structure

Served as a custom panel in HA sidebar.

Core capabilities:

- Select a reTerminal device (identified by `device_id`).
- Manage 3-5 pages:
  - Add/remove/rename pages.
- Visual 800x480 canvas:
  - Drag-and-drop widgets.
  - Snap to grid for clean layouts.
- Widget library:
  - Sensor Value
  - Label + Value
  - Weather Summary
  - Icon + Label
  - List (e.g., TODO items, alerts)
  - Battery / WiFi indicators (optional, using reTerminal’s own entities or HA).
- Data binding:
  - Each widget can pick an entity via `entity` selector (HA native).
  - Formatting options (decimals, units, suffixes).
- Live preview:
  - Call backend to render a temporary PNG.
  - Display directly in the editor.

Tech suggestion:

- Build with Lit or React.
- Communicate via:
  - `/api/reterminal_dashboard/...` for CRUD and preview.
  - Use HA’s `hass` object if integrated as a panel for auth.

## 5. Generic ESPHome firmware (example)

Goal: minimal, public-safe configuration. No personal entities.

Key elements for `esphome/reterminal_e1001_generic.yaml`:

- WiFi config (user provided).
- `api:` enabled (to call HA services).
- `online_image`:
  - `url: "http://homeassistant.local:8123/api/reterminal_dashboard/${device_id}/page/${current_page}/image.png?token=${device_token}"`
  - `update_interval: 5min` (configurable)
  - On success: update display.
- `display`:
  - waveshare_epaper 800x480 config matching E1001.
- Globals:
  - `current_page` int; default 0.
- Buttons:
  - Left/right to decrement/increment `current_page` locally.
  - Also call `homeassistant.service`:
    - `reterminal_dashboard.prev_page` / `next_page`
    - Pass `device_id` so HA state is authoritative if needed.
- All secrets (WiFi, token, host) are user-provided, not in repo.

This firmware remains generic and reusable.

## 6. How this answers your original question

- Yes, you still flash firmware via ESPHome, but:
  - Only once, with a generic, open-source config.
  - After that, all customization (sensors, layouts, styling, pages) is done:
    - In the Home Assistant GUI editor panel.
    - No device-specific YAML logic.
- It differs from TRMNL Weather:
  - TRMNL Weather: HA pushes JSON to TRMNL cloud/webhook and their infra renders.
  - Here: HA integration renders PNG directly and serves it locally to ESPHome.
  - Same clean separation of concerns, but 100% local and owned by you.

## 7. Next steps (implementation-ready)

When implementing, create:

1. `custom_components/reterminal_dashboard/manifest.json`
2. `custom_components/reterminal_dashboard/const.py`
3. `custom_components/reterminal_dashboard/__init__.py`
   - Setup storage, register services, init API routes, load devices.
4. `custom_components/reterminal_dashboard/config_flow.py`
   - Add devices: set `device_id`, generate `api_token`.
5. `custom_components/reterminal_dashboard/models.py`
   - Data classes and storage helpers.
6. `custom_components/reterminal_dashboard/renderer.py`
   - Implement PNG rendering for basic widgets.
7. `custom_components/reterminal_dashboard/api.py`
   - Implement `/api/reterminal_dashboard/...` endpoints.
8. `custom_components/reterminal_dashboard/services.py`
   - Implement page navigation services.
9. Frontend panel under `/www/reterminal_dashboard_panel/`
   - Canvas editor, widget library, calls backend.
10. `esphome/reterminal_e1001_generic.yaml`
   - Minimal example using `online_image` and buttons + HA service calls.

This structure will give you a clean, publishable project aligned with best practices and your requirements.