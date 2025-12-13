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
 * Gets the native resolution for a device model in landscape orientation.
 * @param {string} model - Device model identifier
 * @returns {{width: number, height: number}} Resolution object (landscape)
 */
function getDeviceResolution(model) {
    switch (model) {
        case "m5_paper":
            // M5 Paper is natively portrait (540×960), so landscape is rotated
            return { width: 960, height: 540 };
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
    } else if (model === "m5_paper") {
        // M5 Paper with IT8951E supports 16 grayscale levels
        return ["black", "darkgray", "gray", "lightgray", "white"];
    }
    // Default E1001 and TRMNL (Binary with dithered gray)
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
        case "lightgray": return "#c0c0c0"; // ~75% brightness
        case "gray": return "#808080"; // 50% brightness
        case "darkgray": return "#404040"; // ~25% brightness
        case "red": return "#ff0000";
        case "green": return "#00ff00";
        case "blue": return "#0000ff";
        case "yellow": return "#ffff00";
        case "orange": return "#ffa500";
        case "black":
        default: return "#000000";
    }
}
