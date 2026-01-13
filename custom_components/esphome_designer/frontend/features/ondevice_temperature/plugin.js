/**
 * On-Device Temperature Plugin
 */

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};
    const color = props.color || "black";
    let iconSize = props.size || 32;
    const fontSize = props.font_size || 16;
    const labelFontSize = props.label_font_size || 12;
    const unit = props.unit || "°C";
    const showLabel = props.show_label !== false;
    const precision = props.precision ?? 1;

    let temperature = 22.5; // Default preview value

    if (props.fit_icon_to_frame) {
        const padding = 4;
        const maxDim = Math.max(8, Math.min((widget.width || 0) - padding * 2, (widget.height || 0) - padding * 2));
        iconSize = Math.round(maxDim);
    }

    if (!props.is_local_sensor && widget.entity_id) {
        if (window.AppState && window.AppState.entityStates) {
            const stateObj = window.AppState.entityStates[widget.entity_id];
            if (stateObj && stateObj.state !== undefined) {
                const val = parseFloat(stateObj.state);
                if (!isNaN(val)) {
                    temperature = val;
                }
            }
        }
    }

    let iconCode;
    if (temperature <= 10) {
        iconCode = "F0E4C"; // thermometer-low (cold)
    } else if (temperature <= 25) {
        iconCode = "F050F"; // thermometer (normal)
    } else {
        iconCode = "F10C2"; // thermometer-high (hot)
    }

    const cp = 0xf0000 + parseInt(iconCode.slice(1), 16);
    const ch = String.fromCodePoint(cp);

    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.color = getColorStyle(color);

    const iconEl = document.createElement("div");
    iconEl.textContent = ch;
    iconEl.style.fontSize = `${iconSize}px`;
    iconEl.style.fontFamily = "MDI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    iconEl.style.lineHeight = "1";
    el.appendChild(iconEl);

    const valueEl = document.createElement("div");
    valueEl.style.fontSize = `${fontSize}px`;
    valueEl.style.fontWeight = "500";
    valueEl.style.marginTop = "2px";

    let displayTemp = temperature;
    if (unit === "°F") {
        displayTemp = (temperature * 9 / 5) + 32;
    }

    valueEl.textContent = displayTemp.toFixed(precision) + unit;
    el.appendChild(valueEl);

    if (showLabel) {
        const labelEl = document.createElement("div");
        labelEl.style.fontSize = `${labelFontSize}px`;
        labelEl.style.opacity = "0.7";
        labelEl.style.marginTop = "1px";
        labelEl.textContent = "Temperature";
        el.appendChild(labelEl);
    }
};

export default {
    id: "ondevice_temperature",
    name: "Temperature",
    category: "SHT4x",
    defaults: {
        size: 32,
        font_size: 16,
        label_font_size: 10,
        color: "black",
        unit: "°C",
        show_label: true,
        precision: 1,
        fit_icon_to_frame: true,
        is_local_sensor: true
    },
    render,
    exportLVGL: (w, { common, convertColor, getLVGLFont, profile }) => {
        const p = w.props || {};
        const isLocal = p.is_local_sensor !== false;
        let sensorId = "onboard_temperature";
        if (isLocal && profile.features) {
            sensorId = profile.features.sht4x ? "sht4x_temperature" : (profile.features.sht3x ? "sht3x_temperature" : (profile.features.shtc3 ? "shtc3_temperature" : "onboard_temperature"));
        } else {
            sensorId = (w.entity_id || "").replace(/[^a-zA-Z0-9_]/g, "_") || "onboard_temperature";
        }

        const color = convertColor(p.color || "black");
        const iconSize = parseInt(p.size || 32, 10);
        const fontSize = parseInt(p.font_size || 16, 10);
        const labelSize = parseInt(p.label_font_size || 10, 10);
        const unit = p.unit || "°C";

        let iconLambda = '!lambda |-\n';
        iconLambda += `          if (id(${sensorId}).has_state()) {\n`;
        iconLambda += `            float t = id(${sensorId}).state;\n`;
        iconLambda += `            if (t <= 10) return "\\U000F0E4C";\n`;
        iconLambda += `            if (t <= 25) return "\\U000F050F";\n`;
        iconLambda += `            return "\\U000F10C2";\n`;
        iconLambda += '          }\n';
        iconLambda += '          return "\\U000F050F";';

        let textLambda = '!lambda |-\n';
        textLambda += `          if (id(${sensorId}).has_state()) {\n`;
        let tempExpr = `id(${sensorId}).state`;
        if (unit === "°F") tempExpr = `(id(${sensorId}).state * 9.0 / 5.0) + 32.0`;
        textLambda += `            return str_sprintf("%.1f${unit}", ${tempExpr}).c_str();\n`;
        textLambda += '          }\n';
        textLambda += `          return "--${unit}";`;

        const widgets = [
            {
                label: {
                    width: iconSize + 10,
                    height: iconSize + 4,
                    align: "TOP_MID",
                    text: iconLambda,
                    text_font: getLVGLFont("Material Design Icons", iconSize, 400),
                    text_color: color
                }
            },
            {
                label: {
                    width: "100%",
                    height: fontSize + 6,
                    align: "TOP_MID",
                    y: iconSize + 2,
                    text: textLambda,
                    text_font: getLVGLFont("Roboto", fontSize, 400),
                    text_color: color,
                    text_align: "CENTER"
                }
            }
        ];

        if (p.show_label) {
            widgets.push({
                label: {
                    width: "100%",
                    height: labelSize + 4,
                    align: "BOTTOM_MID",
                    text: `"Temperature"`,
                    text_font: getLVGLFont("Roboto", labelSize, 400),
                    text_color: color,
                    text_align: "CENTER",
                    opa: 180
                }
            });
        }

        return {
            obj: {
                ...common,
                bg_opa: "TRANSP",
                border_width: 0,
                widgets: widgets
            }
        };
    },
    collectRequirements: (w, context) => {
        const { trackIcon, addFont } = context;
        const p = w.props || {};
        const iconSize = parseInt(p.size || 32, 10);
        const fontSize = parseInt(p.font_size || 16, 10);
        const labelSize = parseInt(p.label_font_size || 10, 10);

        addFont("Material Design Icons", 400, iconSize);
        addFont("Roboto", 400, fontSize);
        if (p.show_label) addFont("Roboto", 400, labelSize);

        ["F0E4C", "F050F", "F10C2"].forEach(c => trackIcon(c, iconSize));
    },
    export: (w, context) => {
        const {
            lines, getColorConst, getCondProps, getConditionCheck, addFont, profile
        } = context;

        const p = w.props || {};
        const color = getColorConst(p.color || "black");
        const unit = p.unit || "°C";
        const iconSize = p.size || 32;
        const fontSize = p.font_size || 16;
        const iconFontId = addFont("Material Design Icons", 400, iconSize);
        const valueFontId = addFont("Roboto", 400, fontSize);

        const isLocal = p.is_local_sensor !== false;
        let sensorId = "onboard_temperature";

        if (isLocal) {
            // Use consistent ID with template_sensor_bar if possible
            if (profile.features) {
                sensorId = profile.features.sht4x ? "sht4x_temperature" : (profile.features.sht3x ? "sht3x_temperature" : (profile.features.shtc3 ? "shtc3_temperature" : "onboard_temperature"));
            }
        } else {
            sensorId = (w.entity_id || "").replace(/[^a-zA-Z0-9_]/g, "_");
            if (!sensorId) sensorId = "onboard_temperature";
        }

        lines.push(`        // widget:ondevice_temperature id:${w.id} type:ondevice_temperature x:${w.x} y:${w.y} w:${w.width} h:${w.height} unit:${unit} local:${isLocal} ent:${w.entity_id || ""} ${getCondProps(w)}`);

        const cond = getConditionCheck(w);
        if (cond) lines.push(`        ${cond}`);

        // Icon based on temperature
        lines.push(`        if (id(${sensorId}).has_state()) {`);
        lines.push(`          if (id(${sensorId}).state <= 10) {`);
        lines.push(`            it.printf(${w.x} + ${Math.round(w.width / 2)}, ${w.y} + ${Math.round(iconSize / 2)}, id(${iconFontId}), ${color}, TextAlign::CENTER, "\\U000F0E4C");`);
        lines.push(`          } else if (id(${sensorId}).state <= 25) {`);
        lines.push(`            it.printf(${w.x} + ${Math.round(w.width / 2)}, ${w.y} + ${Math.round(iconSize / 2)}, id(${iconFontId}), ${color}, TextAlign::CENTER, "\\U000F050F");`);
        lines.push(`          } else {`);
        lines.push(`            it.printf(${w.x} + ${Math.round(w.width / 2)}, ${w.y} + ${Math.round(iconSize / 2)}, id(${iconFontId}), ${color}, TextAlign::CENTER, "\\U000F10C2");`);
        lines.push(`          }`);
        lines.push(`        } else {`);
        lines.push(`          it.printf(${w.x} + ${Math.round(w.width / 2)}, ${w.y} + ${Math.round(iconSize / 2)}, id(${iconFontId}), ${color}, TextAlign::CENTER, "\\U000F050F");`);
        lines.push(`        }`);

        // Value
        let tempExpr = `id(${sensorId}).state`;
        if (unit === "°F") {
            tempExpr = `(id(${sensorId}).state * 9.0 / 5.0) + 32.0`;
        }
        lines.push(`        if (id(${sensorId}).has_state()) {`);
        lines.push(`          it.printf(${w.x} + ${Math.round(w.width / 2)}, ${w.y} + ${iconSize + 5}, id(${valueFontId}), ${color}, TextAlign::TOP_CENTER, "%.1f${unit}", ${tempExpr});`);
        lines.push(`        } else {`);
        lines.push(`          it.printf(${w.x} + ${Math.round(w.width / 2)}, ${w.y} + ${iconSize + 5}, id(${valueFontId}), ${color}, TextAlign::TOP_CENTER, "--${unit}");`);
        lines.push(`        }`);

        if (p.show_label) {
            const labelFontId = addFont("Roboto", 400, p.label_font_size || 10);
            lines.push(`        it.printf(${w.x} + ${Math.round(w.width / 2)}, ${w.y} + ${iconSize + fontSize + 8}, id(${labelFontId}), ${color}, TextAlign::TOP_CENTER, "Temperature");`);
        }

        if (cond) lines.push(`        }`);
    },
    onExportNumericSensors: (context) => {
        const { lines, widgets, profile } = context;
        if (!widgets) return;

        const processed = new Set();
        let needsLocalSHT = false;

        for (const w of widgets) {
            if (w.type !== "ondevice_temperature") continue;
            const p = w.props || {};
            if (p.is_local_sensor !== false) {
                needsLocalSHT = true;
                continue;
            }

            let eid = (w.entity_id || "").trim();
            if (!eid) continue;
            if (!eid.includes(".")) eid = `sensor.${eid}`;

            if (!processed.has(eid)) {
                processed.add(eid);
                const safeId = eid.replace(/[^a-zA-Z0-9_]/g, "_");
                lines.push("- platform: homeassistant", `  id: ${safeId}`, `  entity_id: ${eid}`, "  internal: true");
            }
        }

        if (needsLocalSHT) {
            const shtId = profile.features?.sht4x ? "sht4x_sensor" : (profile.features?.sht3x ? "sht3x_sensor" : "shtc3_sensor");
            const shtPlatform = profile.features?.sht4x ? "sht4x" : (profile.features?.sht3x ? "sht3x" : "shtc3");
            const tempId = profile.features?.sht4x ? "sht4x_temperature" : (profile.features?.sht3x ? "sht3x_temperature" : "shtc3_temperature");

            if (!lines.some(l => l.includes(`id: ${shtId}`))) {
                lines.push(`- platform: ${shtPlatform}`, `  id: ${shtId}`);
                lines.push(`  temperature:`, `    id: ${tempId}`, `    internal: true`);
                lines.push(`  update_interval: 60s`);
            } else {
                // SHT already exists, check if temperature sub-component exists
                if (!lines.some(l => l.includes(`id: ${tempId}`))) {
                    // This is tricky as we need to insert into an existing YAML block.
                    // For now, we assume if shtId exists, it was likely registered by template_sensor_bar which includes both temp and hum.
                }
            }
        }
    }
};
