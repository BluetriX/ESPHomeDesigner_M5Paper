/**
 * Gets the current device model.
 * @returns {string}
 */
function getDeviceModel() {
    // Default to E1001 if not set
    // TODO: Move currentDeviceModel to a proper state store
    return (window.currentDeviceModel || "reterminal_e1001");
}

/**
 * Gets the display name for a device model.
 * @param {string} model 
 * @returns {string}
 */
function getDeviceDisplayName(model) {
    switch (model) {
        case "m5_paper": return "M5 Paper (ESP32-D0WDQ6-V3)";
        case "reterminal_e1002": return "reTerminal E1002 (6-Color)";
        case "trmnl": return "Official TRMNL (ESP32-C3)";
        case "reterminal_e1001":
        default: return "reTerminal E1001 (Monochrome)";
    }
}

/**
 * Gets the native resolution for a device model.
 * @param {string} model - Device model identifier
 * @returns {{width: number, height: number}} Resolution object
 */
function getDeviceResolution(model) {
    switch (model) {
        case "m5_paper":
            return { width: 540, height: 960 };
        case "reterminal_e1002":
        case "trmnl":
        case "reterminal_e1001":
        default:
            return { width: 800, height: 480 };
    }
}

/**
 * Gets available colors for the current device model.
 * @returns {string[]}
 */
function getAvailableColors() {
    const model = getDeviceModel();
    if (model === "reterminal_e1002") {
        return ["black", "white", "gray", "red", "green", "blue", "yellow"];
    }
    // Default E1001, M5Paper and TRMNL (True Monochrome)
    return ["black", "white", "gray"];
}

/**
 * Gets the CSS color style for a given color name.
 * @param {string} colorName 
 * @returns {string} Hex color code
 */
function getColorStyle(colorName) {
    switch ((colorName || "").toLowerCase()) {
        case "white": return "#ffffff";
        case "red": return "#ff0000";
        case "green": return "#00ff00";
        case "blue": return "#0000ff";
        case "yellow": return "#ffff00";
        case "orange": return "#ffa500";
        case "gray": return "#aaaaaa"; // Keep for backward compatibility/preview
        case "black":
        default: return "#000000";
    }
}
