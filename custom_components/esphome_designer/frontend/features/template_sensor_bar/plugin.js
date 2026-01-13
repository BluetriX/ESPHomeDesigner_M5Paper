/**
 * Template Sensor Bar Plugin
 */

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const color = props.color || "black";
    const iconSize = props.icon_size || 20;
    const fontSize = props.font_size || 14;
    const borderWidth = props.border_thickness || 0;

    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "space-around";
    el.style.padding = "0 10px";
    el.style.boxSizing = "border-box";
    let cssColor = getColorStyle(color);
    el.style.overflow = "hidden";

    if (props.show_background) {
        const cssBgColor = getColorStyle(props.background_color || "white");
        el.style.backgroundColor = cssBgColor;
        el.style.borderRadius = (props.border_radius || 8) + "px";

        if (borderWidth > 0) {
            el.style.border = `${borderWidth}px solid ${getColorStyle(props.border_color || "white")}`;
        } else {
            el.style.border = "none";
        }

        // Smart Preview: If Black on Black (common for inverted e-paper profiles), 
        // invert text color for preview visibility.
        if (cssColor === "#000000" && cssBgColor === "#000000") {
            cssColor = "#ffffff";
        }

        if (!props.background_color || props.background_color === "transparent") {
            el.style.border = "1px dashed #444"; // Visual aid for transparent
        }
    } else {
        el.style.backgroundColor = "transparent";
        el.style.borderRadius = "0";
        el.style.border = "none";
    }

    el.style.color = cssColor;

    const getEntityState = (possibleIds) => {
        if (!window.AppState || !window.AppState.entityStates) return null;
        for (const id of possibleIds) {
            if (window.AppState.entityStates[id]) return window.AppState.entityStates[id].state;
        }
        return null;
    };

    const sensors = [];

    if (props.show_wifi) {
        const state = getEntityState(['wifi_signal_dbm', 'sensor.wifi_signal']);
        sensors.push({
            type: 'wifi',
            icon: 'F0928',
            val: state !== null ? Math.round(state) + 'dB' : '-65dB'
        });
    }

    if (props.show_temperature) {
        const state = getEntityState(['sht4x_temperature', 'sht3x_temperature', 'shtc3_temperature', 'sensor.temperature']);
        sensors.push({
            type: 'temp',
            icon: 'F050F',
            val: state !== null ? parseFloat(state).toFixed(1) + '°C' : '23.5°C'
        });
    }

    if (props.show_humidity) {
        const state = getEntityState(['sht4x_humidity', 'sht3x_humidity', 'shtc3_humidity', 'sensor.humidity']);
        sensors.push({
            type: 'hum',
            icon: 'F058E',
            val: state !== null ? Math.round(state) + '%' : '45%'
        });
    }

    if (props.show_battery) {
        const state = getEntityState(['battery_level', 'sensor.battery_level']);
        sensors.push({
            type: 'bat',
            icon: 'F0079',
            val: state !== null ? Math.round(state) + '%' : '85%'
        });
    }

    el.innerHTML = "";

    sensors.forEach(s => {
        const group = document.createElement("div");
        group.style.display = "flex";
        group.style.alignItems = "center";
        group.style.gap = "6px";

        const icon = document.createElement("span");
        const cp = parseInt(s.icon, 16);
        icon.innerText = String.fromCodePoint(cp);
        icon.style.fontFamily = "'Material Design Icons', 'MDI', system-ui, -sans-serif";
        icon.style.fontSize = iconSize + "px";
        icon.style.lineHeight = "1";

        const text = document.createElement("span");
        text.innerText = s.val;
        text.style.fontSize = fontSize + "px";
        text.style.fontFamily = "Roboto, system-ui, -sans-serif";
        text.style.fontWeight = "500";
        text.style.whiteSpace = "nowrap";

        group.appendChild(icon);
        group.appendChild(text);
        el.appendChild(group);
    });
};

const exportDoc = (w, context) => {
    const {
        lines, addFont, getColorConst, addDitherMask, getCondProps, getConditionCheck, profile, isEpaper
    } = context;

    const p = w.props || {};

    const iconSize = parseInt(p.icon_size || 20, 10);
    const fontSize = parseInt(p.font_size || 14, 10);
    const colorProp = p.color || "white";
    const color = getColorConst(colorProp);
    const showWifi = p.show_wifi !== false;
    const showTemp = p.show_temperature !== false;
    const showHum = p.show_humidity !== false;
    const showBat = p.show_battery !== false;
    const showBg = p.show_background !== false;
    const bgColor = getColorConst(p.background_color || "black");
    const radius = parseInt(p.border_radius || 8, 10);
    const thickness = parseInt(p.border_thickness || 0, 10);
    const borderColor = getColorConst(p.border_color || "white");

    const iconFontRef = addFont("Material Design Icons", 400, iconSize);
    const textFontRef = addFont("Roboto", 500, fontSize);

    lines.push(`        // widget:template_sensor_bar id:${w.id} type:template_sensor_bar x:${w.x} y:${w.y} w:${w.width} h:${w.height} wifi:${showWifi} temp:${showTemp} hum:${showHum} bat:${showBat} bg:${showBg} bg_color:${p.background_color || "black"} radius:${radius} border:${thickness} icon_size:${iconSize} font_size:${fontSize} color:${colorProp} ${getCondProps(w)}`);

    const cond = getConditionCheck(w);
    if (cond) lines.push(`        ${cond}`);

    lines.push(`        {`);
    if (showBg) {
        if (radius > 0) {
            lines.push(`          auto draw_filled_rrect = [&](int x, int y, int w, int h, int r, auto c) {`);
            lines.push(`            it.filled_rectangle(x + r, y, w - 2 * r, h, c);`);
            lines.push(`            it.filled_rectangle(x, y + r, r, h - 2 * r, c);`);
            lines.push(`            it.filled_rectangle(x + w - r, y + r, r, h - 2 * r, c);`);
            lines.push(`            it.filled_circle(x + r, y + r, r, c);`);
            lines.push(`            it.filled_circle(x + w - r - 1, y + r, r, c);`);
            lines.push(`            it.filled_circle(x + r, y + h - r - 1, r, c);`);
            lines.push(`            it.filled_circle(x + w - r - 1, y + h - r - 1, r, c);`);
            lines.push(`          };`);

            if (thickness > 0) {
                lines.push(`          draw_filled_rrect(${w.x}, ${w.y}, ${w.width}, ${w.height}, ${radius}, ${borderColor});`);
                lines.push(`          draw_filled_rrect(${w.x + thickness}, ${w.y + thickness}, ${w.width - 2 * thickness}, ${w.height - 2 * thickness}, ${Math.max(0, radius - thickness)}, ${bgColor});`);
            } else {
                lines.push(`          draw_filled_rrect(${w.x}, ${w.y}, ${w.width}, ${w.height}, ${radius}, ${bgColor});`);
            }
        } else {
            if (thickness > 0) {
                lines.push(`          it.filled_rectangle(${w.x}, ${w.y}, ${w.width}, ${w.height}, ${borderColor});`);
                lines.push(`          it.filled_rectangle(${w.x + thickness}, ${w.y + thickness}, ${w.width - 2 * thickness}, ${w.height - 2 * thickness}, ${bgColor});`);
            } else {
                lines.push(`          it.filled_rectangle(${w.x}, ${w.y}, ${w.width}, ${w.height}, ${bgColor});`);
            }
        }
        addDitherMask(lines, p.background_color || "black", isEpaper, w.x, w.y, w.width, w.height);
    }

    let activeCount = 0;
    if (showWifi) activeCount++;
    if (showTemp) activeCount++;
    if (showHum) activeCount++;
    if (showBat) activeCount++;

    if (activeCount > 0) {
        const spacing = w.width / activeCount;
        let currentX = w.x + spacing / 2;
        const centerY = w.y + w.height / 2;

        if (showWifi) {
            lines.push(`          {`);
            lines.push(`            const char* wifi_icon = "\\U000F092B";`);
            lines.push(`            if (id(wifi_signal_dbm).has_state()) {`);
            lines.push(`              float sig = id(wifi_signal_dbm).state;`);
            lines.push(`              if (sig >= -50) wifi_icon = "\\U000F0928";`);
            lines.push(`              else if (sig >= -70) wifi_icon = "\\U000F0925";`);
            lines.push(`              else if (sig >= -85) wifi_icon = "\\U000F0922";`);
            lines.push(`              else wifi_icon = "\\U000F091F";`);
            lines.push(`            }`);
            lines.push(`            it.printf(${Math.round(currentX)} - 4, ${centerY}, id(${iconFontRef}), ${color}, TextAlign::CENTER_RIGHT, "%s", wifi_icon);`);
            lines.push(`            if (id(wifi_signal_dbm).has_state()) it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "%.0fdB", id(wifi_signal_dbm).state);`);
            lines.push(`            else it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "--dB");`);
            lines.push(`          }`);
            currentX += spacing;
        }

        if (showTemp) {
            const tempId = profile.features?.sht4x ? "sht4x_temperature" : (profile.features?.sht3x ? "sht3x_temperature" : "shtc3_temperature");
            const unit = p.unit || "°C";
            lines.push(`          {`);
            lines.push(`            it.printf(${Math.round(currentX)} - 4, ${centerY}, id(${iconFontRef}), ${color}, TextAlign::CENTER_RIGHT, "\\U000F050F");`);
            lines.push(`            if (id(${tempId}).has_state() && !std::isnan(id(${tempId}).state)) {`);
            if (unit === "°F" || unit === "F") {
                lines.push(`              it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "%.1f°F", id(${tempId}).state * 9.0 / 5.0 + 32.0);`);
            } else {
                lines.push(`              it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "%.1f°C", id(${tempId}).state);`);
            }
            lines.push(`            } else {`);
            lines.push(`              it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "--${unit}");`);
            lines.push(`            }`);
            lines.push(`          }`);
            currentX += spacing;
        }

        if (showHum) {
            const humId = profile.features?.sht4x ? "sht4x_humidity" : (profile.features?.sht3x ? "sht3x_humidity" : "shtc3_humidity");
            lines.push(`          {`);
            lines.push(`            it.printf(${Math.round(currentX)} - 4, ${centerY}, id(${iconFontRef}), ${color}, TextAlign::CENTER_RIGHT, "\\U000F058E");`);
            lines.push(`            if (id(${humId}).has_state()) it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "%.0f%%", id(${humId}).state);`);
            lines.push(`            else it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "--%%");`);
            lines.push(`          }`);
            currentX += spacing;
        }

        if (showBat) {
            lines.push(`          {`);
            lines.push(`            const char* bat_icon = "\\U000F0082";`);
            lines.push(`            float lvl = id(battery_level).state;`);
            lines.push(`            if (lvl >= 90) bat_icon = "\\U000F0079";`);
            lines.push(`            else if (lvl >= 50) bat_icon = "\\U000F007E";`);
            lines.push(`            else if (lvl >= 20) bat_icon = "\\U000F007B";`);
            lines.push(`            else bat_icon = "\\U000F0083";`);
            lines.push(`            it.printf(${Math.round(currentX)} - 4, ${centerY}, id(${iconFontRef}), ${color}, TextAlign::CENTER_RIGHT, "%s", bat_icon);`);
            lines.push(`            if (id(battery_level).has_state()) it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "%.0f%%", id(battery_level).state);`);
            lines.push(`            else it.printf(${Math.round(currentX)} + 4, ${centerY}, id(${textFontRef}), ${color}, TextAlign::CENTER_LEFT, "--%%");`);
            lines.push(`          }`);
        }
    }

    addDitherMask(lines, colorProp, isEpaper, w.x, w.y, w.width, w.height);
    lines.push(`        }`);
    if (cond) lines.push(`        }`);
};

const onExportNumericSensors = (context) => {
    const { lines, widgets, profile } = context;
    const barWidgets = widgets.filter(w => w.type === "template_sensor_bar");
    if (barWidgets.length === 0) return;

    let wifiNeeded = false;
    let tempNeeded = false;
    let humNeeded = false;
    let batNeeded = false;

    barWidgets.forEach(w => {
        const p = w.props || {};
        if (p.show_wifi !== false) wifiNeeded = true;
        if (p.show_temperature !== false) tempNeeded = true;
        if (p.show_humidity !== false) humNeeded = true;
        if (p.show_battery !== false) batNeeded = true;
    });

    if (wifiNeeded && !lines.some(l => l.includes("id: wifi_signal_dbm"))) {
        lines.push("- platform: wifi_signal");
        lines.push("  id: wifi_signal_dbm");
        lines.push("  update_interval: 60s");
        lines.push("  internal: true");
    }

    if (tempNeeded || humNeeded) {
        const shtId = profile.features?.sht4x ? "sht4x_sensor" : (profile.features?.sht3x ? "sht3x_sensor" : "shtc3_sensor");
        const shtPlatform = profile.features?.sht4x ? "sht4x" : (profile.features?.sht3x ? "sht3x" : "shtc3");

        if (!lines.some(l => l.includes(`id: ${shtId}`))) {
            lines.push(`- platform: ${shtPlatform}`);
            lines.push(`  id: ${shtId}`);
            if (tempNeeded) {
                const tempId = profile.features?.sht4x ? "sht4x_temperature" : (profile.features?.sht3x ? "sht3x_temperature" : "shtc3_temperature");
                lines.push("  temperature:");
                lines.push(`    id: ${tempId}`);
                lines.push("    internal: true");
            }
            if (humNeeded) {
                const humId = profile.features?.sht4x ? "sht4x_humidity" : (profile.features?.sht3x ? "sht3x_humidity" : "shtc3_humidity");
                lines.push("  humidity:");
                lines.push(`    id: ${humId}`);
                lines.push("    internal: true");
            }
            lines.push("  update_interval: 60s");
        }
    }

    if (batNeeded && !lines.some(l => l.includes("id: battery_level"))) {
        // Fallback for devices where battery is not auto-defined by hardware generators
        lines.push("- platform: template");
        lines.push("  id: battery_level");
        lines.push("  name: \"Battery Level\"");
        lines.push("  unit_of_measurement: '%'");
        lines.push("  update_interval: 60s");
        lines.push("  internal: true");
    }
};

const collectRequirements = (widget, context) => {
    const { trackIcon, addFont } = context;
    const p = widget.props || {};
    const iconSize = parseInt(p.icon_size || 20, 10);
    const fontSize = parseInt(p.font_size || 14, 10);

    addFont("Material Design Icons", 400, iconSize);
    addFont("Roboto", 500, fontSize);

    if (p.show_wifi !== false) ["F092B", "F091F", "F0922", "F0925", "F0928"].forEach(c => trackIcon(c, iconSize));
    if (p.show_temperature !== false) ["F050F"].forEach(c => trackIcon(c, iconSize));
    if (p.show_humidity !== false) ["F058E"].forEach(c => trackIcon(c, iconSize));
    if (p.show_battery !== false) ["F0082", "F0079", "F007E", "F007B", "F0083"].forEach(c => trackIcon(c, iconSize));
};

export default {
    id: "template_sensor_bar",
    name: "Sensor Bar",
    category: "Templates",
    defaults: {
        w: 355,
        h: 43,
        show_wifi: true,
        show_temperature: true,
        show_humidity: true,
        show_battery: true,
        show_background: true,
        background_color: "black",
        border_radius: 8,
        color: "white",
        font_size: 14,
        icon_size: 20
    },
    render,
    exportLVGL: (w, { common, convertColor, getLVGLFont, profile }) => {
        const p = w.props || {};
        const color = convertColor(p.color || "white");
        const iconSize = parseInt(p.icon_size || 20, 10);
        const fontSize = parseInt(p.font_size || 14, 10);
        const showWifi = p.show_wifi !== false;
        const showTemp = p.show_temperature !== false;
        const showHum = p.show_humidity !== false;
        const showBat = p.show_battery !== false;

        const iconFont = getLVGLFont("Material Design Icons", iconSize, 400);
        const textFont = getLVGLFont("Roboto", fontSize, 500);

        const widgets = [];

        if (showWifi) {
            let iconL = '!lambda |-\n';
            iconL += '              if (id(wifi_signal_dbm).has_state()) {\n';
            iconL += '                float sig = id(wifi_signal_dbm).state;\n';
            iconL += '                if (sig >= -50) return "\\U000F0928";\n';
            iconL += '                else if (sig >= -70) return "\\U000F0925";\n';
            iconL += '                else if (sig >= -85) return "\\U000F0922";\n';
            iconL += '                else return "\\U000F091F";\n';
            iconL += '              }\n';
            iconL += '              return "\\U000F092B";';

            widgets.push({
                obj: {
                    width: "SIZE_CONTENT", height: "SIZE_CONTENT", bg_opa: "TRANSP", border_width: 0,
                    layout: "FLEX", flex_flow: "ROW", flex_align_main: "CENTER", flex_align_cross: "CENTER",
                    pad_all: 0, widgets: [
                        { label: { text: iconL, text_font: iconFont, text_color: color } },
                        { label: { text: '!lambda "return id(wifi_signal_dbm).has_state() ? str_sprintf(\'%.0fdB\', id(wifi_signal_dbm).state).c_str() : \'--dB\';"', text_font: textFont, text_color: color, x: 4 } }
                    ]
                }
            });
        }

        if (showTemp) {
            const tempId = profile.features?.sht4x ? "sht4x_temperature" : (profile.features?.sht3x ? "sht3x_temperature" : "shtc3_temperature");
            const unit = p.unit || "°C";
            let tempExpr = `id(${tempId}).state`;
            if (unit === "°F") tempExpr = `(${tempId}.state * 9.0 / 5.0 + 32.0)`;

            widgets.push({
                obj: {
                    width: "SIZE_CONTENT", height: "SIZE_CONTENT", bg_opa: "TRANSP", border_width: 0,
                    layout: "FLEX", flex_flow: "ROW", flex_align_main: "CENTER", flex_align_cross: "CENTER",
                    pad_all: 0, widgets: [
                        { label: { text: '"\\U000F050F"', text_font: iconFont, text_color: color } },
                        { label: { text: `!lambda "return id(${tempId}).has_state() ? str_sprintf(\'%.1f${unit}\', ${tempExpr}).c_str() : \'--${unit}\';"`, text_font: textFont, text_color: color, x: 4 } }
                    ]
                }
            });
        }

        if (showHum) {
            const humId = profile.features?.sht4x ? "sht4x_humidity" : (profile.features?.sht3x ? "sht3x_humidity" : "shtc3_humidity");
            widgets.push({
                obj: {
                    width: "SIZE_CONTENT", height: "SIZE_CONTENT", bg_opa: "TRANSP", border_width: 0,
                    layout: "FLEX", flex_flow: "ROW", flex_align_main: "CENTER", flex_align_cross: "CENTER",
                    pad_all: 0, widgets: [
                        { label: { text: '"\\U000F058E"', text_font: iconFont, text_color: color } },
                        { label: { text: `!lambda "return id(${humId}).has_state() ? str_sprintf(\'%.0f%%\', id(${humId}).state).c_str() : \'--%\';"`, text_font: textFont, text_color: color, x: 4 } }
                    ]
                }
            });
        }

        if (showBat) {
            let batIconL = '!lambda |-\n';
            batIconL += '              float lvl = id(battery_level).state;\n';
            batIconL += '              if (lvl >= 90) return "\\U000F0079";\n';
            batIconL += '              else if (lvl >= 50) return "\\U000F007E";\n';
            batIconL += '              else if (lvl >= 20) return "\\U000F007B";\n';
            batIconL += '              else return "\\U000F0083";';

            widgets.push({
                obj: {
                    width: "SIZE_CONTENT", height: "SIZE_CONTENT", bg_opa: "TRANSP", border_width: 0,
                    layout: "FLEX", flex_flow: "ROW", flex_align_main: "CENTER", flex_align_cross: "CENTER",
                    pad_all: 0, widgets: [
                        { label: { text: batIconL, text_font: iconFont, text_color: color } },
                        { label: { text: '!lambda "return id(battery_level).has_state() ? str_sprintf(\'%.0f%%\', id(battery_level).state).c_str() : \'--%\';"', text_font: textFont, text_color: color, x: 4 } }
                    ]
                }
            });
        }

        return {
            obj: {
                ...common,
                bg_color: p.show_background !== false ? convertColor(p.background_color || "black") : "TRANSP",
                bg_opa: p.show_background !== false ? "COVER" : "TRANSP",
                radius: p.border_radius || 8,
                border_width: p.border_thickness || 0,
                border_color: convertColor(p.border_color || "white"),
                layout: { type: "FLEX", flex_flow: "ROW", flex_align_main: "SPACE_AROUND", flex_align_cross: "CENTER" },
                widgets: widgets
            }
        };
    },
    export: exportDoc,
    onExportNumericSensors,
    collectRequirements
};

