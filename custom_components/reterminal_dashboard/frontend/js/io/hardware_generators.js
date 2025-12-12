// ============================================================================
// HARDWARE SECTION GENERATORS
// ============================================================================

function generateTouchscreenSection(profile) {
    if (!profile.touch) return []; // E-paper usually has no touch or handled differently

    const t = profile.touch;
    const lines = ["touchscreen:"];
    lines.push(`  - platform: ${t.platform}`);
    lines.push(`    id: my_touchscreen`);
    lines.push(`    display: my_display`); // Assumes display ID is my_display (LCDs)

    if (t.i2c_id) lines.push(`    i2c_id: ${t.i2c_id}`);
    if (t.spi_id) lines.push(`    spi_id: ${t.spi_id}`);

    // Explicit addresses or update intervals
    if (t.address) lines.push(`    address: ${t.address}`);
    if (t.update_interval) lines.push(`    update_interval: ${t.update_interval}`);

    // Pin mappings (some might be objects for IO extenders)
    const addPin = (key, val) => {
        if (!val) return;
        if (typeof val === 'string' || typeof val === 'number') {
            lines.push(`    ${key}: ${val}`);
        } else {
            lines.push(`    ${key}:`);
            Object.entries(val).forEach(([k, v]) => lines.push(`      ${k}: ${v}`));
        }
    };

    addPin("interrupt_pin", t.interrupt_pin);
    addPin("reset_pin", t.reset_pin);
    addPin("cs_pin", t.cs_pin);

    // Calc/Transform
    const transform = [];
    if (t.mirror_x) transform.push("mirror_x: true");
    if (t.mirror_y) transform.push("mirror_y: true");
    if (t.swap_xy) transform.push("swap_xy: true");

    if (transform.length > 0) {
        lines.push("    transform:");
        transform.forEach(l => lines.push(`      ${l}`));
    }

    if (t.calibration) {
        lines.push("    calibration:");
        Object.entries(t.calibration).forEach(([k, v]) => lines.push(`      ${k}: ${v}`));
    }

    lines.push("");
    return lines;
}

function generateBacklightSection(profile) {
    const lines = [];
    if (!profile.backlight) return lines;

    const bl = profile.backlight;

    // Output component for the backlight pin
    if (bl.platform === "ledc" || bl.platform === "gpio" || bl.platform === "switch") {
        if (bl.platform === "switch") {
            lines.push("switch:");
            lines.push("  - platform: gpio"); // Usually gpio switch for on/off backlights
            lines.push("    id: lcdbacklight");
            lines.push("    name: lcdbacklight");
            // Handle complex pin objects (e.g. attached to IO expander)
            if (typeof bl.pin === 'object') {
                lines.push("    pin:");
                Object.entries(bl.pin).forEach(([k, v]) => {
                    if (typeof v === 'object') {
                        lines.push(`      ${k}:`);
                        Object.entries(v).forEach(([sk, sv]) => lines.push(`        ${sk}: ${sv}`));
                    } else {
                        lines.push(`      ${k}: ${v}`);
                    }
                });
            } else {
                lines.push(`    pin: ${bl.pin}`);
            }
            lines.push("    restore_mode: ALWAYS_ON");
            lines.push("");
        } else {
            lines.push("output:");
            lines.push(`  - platform: ${bl.platform}`);
            lines.push(`    id: gpio_backlight_pwm`);
            lines.push(`    pin: ${bl.pin}`);
            if (bl.frequency) lines.push(`    frequency: ${bl.frequency}`);
            lines.push("");
        }
    }

    // Light component to control it
    lines.push("light:");
    lines.push("  - platform: monochromatic");
    lines.push("    name: Display Backlight");
    lines.push("    id: display_backlight");
    lines.push("    restore_mode: ALWAYS_ON");

    if (bl.platform === "switch") {
        // Fake output for switch-based backlights (Waveshare 7" style)
        lines.push("    output: fake_backlight_output");
        lines.push("    default_transition_length: 0s");
        lines.push("");
        lines.push("output:");
        lines.push("  - platform: template");
        lines.push("    id: fake_backlight_output");
        lines.push("    type: float");
        lines.push("    write_action:");
        lines.push("      - if:");
        lines.push("          condition:");
        lines.push("            lambda: 'return state > 0.0;'");
        lines.push("          then:");
        lines.push("            - switch.turn_on: lcdbacklight");
        lines.push("          else:");
        lines.push("            - switch.turn_off: lcdbacklight");
    } else {
        lines.push("    output: gpio_backlight_pwm");
    }
    lines.push("");
    return lines;
}

function generateExtraComponents(profile) {
    const lines = [];
    if (profile.extra_components && Array.isArray(profile.extra_components)) {
        lines.push(...profile.extra_components);
        lines.push("");
    }
    if (profile.extra_components_raw) {
        lines.push(profile.extra_components_raw);
        lines.push("");
    }
    // Handle extra_components that might be objects/strings mixed? No, assuming array of strings.
    // Also handle extra_spi/i2c/etc if they are separate components?
    // The profile definition uses `extra_components` for top-level component imports like "i2c:", "spi:", etc.
    // But `extra_spi` and `extra_components` (generic) are often used.

    // Also handle `extra_components` that are just strings to be dumped.
    return lines;
}

function generateI2CSection(profile) {
    const lines = [];
    if (profile.pins.i2c) {
        lines.push("i2c:");
        lines.push("  - sda: " + profile.pins.i2c.sda);
        lines.push("    scl: " + profile.pins.i2c.scl);
        lines.push("    scan: " + (profile.i2c_config?.scan !== false));
        lines.push("    id: bus_a");
        if (profile.i2c_config?.frequency) {
            lines.push("    frequency: " + profile.i2c_config.frequency);
        }
        lines.push("");
    }
    return lines;
}

function generateSPISection(profile) {
    const lines = [];
    if (profile.pins.spi) {
        lines.push("spi:");
        const spi = profile.pins.spi;
        if (spi.id) lines.push(`  - id: ${spi.id}`);
        else lines.push("  - id: spi_bus");

        lines.push(`    clk_pin: ${spi.clk}`);
        if (spi.mosi) lines.push(`    mosi_pin: ${spi.mosi}`);
        if (spi.miso) lines.push(`    miso_pin: ${spi.miso}`);

        if (spi.type === "quad") {
            lines.push("    interface: triple"); // ESPHome 'quad' is often interface: triple (?) No, interface: hardware usually.
            // Special handling for quad spi (e.g. Guition)
            if (spi.data_pins) {
                lines.push(`    data_pins: [${spi.data_pins.join(', ')}]`);
            }
        }
        lines.push("");

        // Extra SPI buses?
        if (profile.extra_spi) {
            lines.push(...profile.extra_spi);
            lines.push("");
        }
    }
    return lines;
}

function generateDisplaySection(profile) {
    const lines = [];

    // Display Platform Configuration
    if (profile.display_config) {
        lines.push("display:");
        lines.push(...profile.display_config);
        lines.push("");
    } else {
        // Fallback/Default generation for simple E-paper
        lines.push("display:");
        lines.push(`  - platform: ${profile.displayPlatform}`);
        lines.push("    id: epaper_display");

        const p = profile.pins.display;
        if (p.cs) lines.push(`    cs_pin: ${p.cs}`);
        if (p.dc) lines.push(`    dc_pin: ${p.dc}`);
        if (p.reset) lines.push(`    reset_pin: ${p.reset}`);
        if (p.busy) lines.push(`    busy_pin: ${p.busy}`);

        if (profile.displayModel) lines.push(`    model: "${profile.displayModel}"`);

        lines.push("    update_interval: never");
        lines.push("    full_update_every: 30");
        lines.push("");
    }

    // Add Touchscreen if present
    lines.push(...generateTouchscreenSection(profile));

    // Add Backlight if present
    lines.push(...generateBacklightSection(profile));

    return lines;
}

function generateSensorSection(profile, widgetSensorLines = []) {
    const lines = [];

    // Check if we need a sensor: block
    const hasBattery = profile.pins.batteryAdc;
    const hasSht4x = profile.features.sht4x;
    const hasShtc3 = profile.features.shtc3;
    const hasWidgets = widgetSensorLines.length > 0;

    if (!hasBattery && !hasSht4x && !hasShtc3 && !hasWidgets) return lines;

    lines.push("sensor:");

    // 1. Battery Voltage
    if (hasBattery) {
        lines.push("  - platform: adc");
        lines.push(`    pin: ${profile.pins.batteryAdc}`);
        lines.push("    id: battery_voltage");
        lines.push("    name: \"Battery Voltage\"");
        lines.push("    update_interval: 60s");
        lines.push("    attenuation: " + profile.battery.attenuation);
        lines.push("    filters:");
        lines.push("      - multiply: " + profile.battery.multiplier);
        if (profile.battery.calibration) {
            lines.push(`      - calibrate_linear:`);
            lines.push(`          - 0.0 -> 0.0`);
            lines.push(`          - ${profile.battery.calibration.min} -> 0.0`); // Empty?
            lines.push(`          - ${profile.battery.calibration.max} -> 100.0`); // Full?
            // Actually usually voltage is just voltage. Percentage is separate.
            // But existing code likely maps voltage to simple value or uses it for percentage template.
        }
    }

    // 2. SHT4x (Temperature/Humidity)
    if (hasSht4x) {
        lines.push("  - platform: sht4x");
        lines.push("    temperature:");
        lines.push("      name: \"Temperature\"");
        lines.push("    humidity:");
        lines.push("      name: \"Humidity\"");
        lines.push("    address: 0x44");
        lines.push("    update_interval: 60s");
    }

    // 3. SHTC3 (Temperature/Humidity)
    if (hasShtc3) {
        lines.push("  - platform: shtc3");
        lines.push("    temperature:");
        lines.push("      name: \"Temperature\"");
        lines.push("    humidity:");
        lines.push("      name: \"Humidity\"");
        lines.push("    update_interval: 60s");
    }

    // 4. Widget Sensors
    if (widgetSensorLines.length > 0) {
        lines.push(...widgetSensorLines);
    }

    // 5. Battery Percentage Template
    if (hasBattery) {
        lines.push("");
        lines.push("  - platform: template");
        lines.push("    name: \"Battery Level\"");
        lines.push("    id: battery_level");
        lines.push("    unit_of_measurement: \"%\"");
        lines.push("    lambda: |-");
        lines.push("      if (id(battery_voltage).state > 4.15) return 100;");
        lines.push("      if (id(battery_voltage).state < 3.27) return 0;");
        lines.push("      return (id(battery_voltage).state - 3.27) / (4.15 - 3.27) * 100.0;");
    }

    lines.push("");
    return lines;
}

function generateBinarySensorSection(profile, numPages) {
    const lines = [];
    if (!profile.features.buttons) return lines;

    lines.push("binary_sensor:");
    const b = profile.pins.buttons;

    if (b.left) {
        lines.push("  - platform: gpio"); // Left Button
        lines.push(`    pin:`);
        lines.push(`      number: ${b.left}`);
        lines.push(`      mode: INPUT_PULLUP`);
        lines.push(`      inverted: true`);
        lines.push("    name: \"Left Button\"");
        lines.push("    id: button_left");
        lines.push("    on_press:");
        lines.push("      then:");
        lines.push("        - if:");
        lines.push("            condition:");
        lines.push("              lambda: 'return id(display_page) > 0;'");
        lines.push("            then:");
        lines.push("              - lambda: 'id(display_page) -= 1;'");
        lines.push("              - component.update: my_display");
        lines.push("            else:");
        lines.push(`              - lambda: 'id(display_page) = ${numPages - 1};'`);
        lines.push("              - component.update: my_display");
    }

    if (b.right) {
        lines.push("  - platform: gpio"); // Right Button
        lines.push(`    pin:`);
        lines.push(`      number: ${b.right}`);
        lines.push(`      mode: INPUT_PULLUP`);
        lines.push(`      inverted: true`);
        lines.push("    name: \"Right Button\"");
        lines.push("    id: button_right");
        lines.push("    on_press:");
        lines.push("      then:");
        lines.push("        - if:");
        lines.push(`            condition:`);
        lines.push(`              lambda: 'return id(display_page) < ${numPages - 1};'`);
        lines.push("            then:");
        lines.push("              - lambda: 'id(display_page) += 1;'");
        lines.push("              - component.update: my_display");
        lines.push("            else:");
        lines.push("              - lambda: 'id(display_page) = 0;'");
        lines.push("              - component.update: my_display");
    }

    if (b.refresh) {
        lines.push("  - platform: gpio"); // Refresh Button
        lines.push(`    pin:`);
        lines.push(`      number: ${b.refresh}`);
        lines.push(`      mode: INPUT_PULLUP`);
        lines.push(`      inverted: true`);
        lines.push("    name: \"Refresh Button\"");
        lines.push("    id: button_refresh");
        lines.push("    on_press:");
        lines.push("      then:");
        lines.push("        - component.update: my_display");
    }

    lines.push("");
    return lines;
}

function generateButtonSection(profile, numPages) {
    const lines = [];
    // Page cycling buttons (template buttons for HA)
    lines.push("button:");
    lines.push("  - platform: template");
    lines.push("    name: \"Next Page\"");
    lines.push("    on_press:");
    lines.push("      then:");
    lines.push("        - lambda: |-");
    lines.push(`            if (id(display_page) < ${numPages - 1}) {`);
    lines.push("              id(display_page) += 1;");
    lines.push("            } else {");
    lines.push("              id(display_page) = 0;");
    lines.push("            }");
    lines.push("        - component.update: my_display");

    lines.push("  - platform: template");
    lines.push("    name: \"Previous Page\"");
    lines.push("    on_press:");
    lines.push("      then:");
    lines.push("        - lambda: |-");
    lines.push("            if (id(display_page) > 0) {");
    lines.push("              id(display_page) -= 1;");
    lines.push("            } else {");
    lines.push(`              id(display_page) = ${numPages - 1};`);
    lines.push("            }");
    lines.push("        - component.update: my_display");

    if (profile.features.buzzer) {
        lines.push("  - platform: template");
        lines.push("    name: \"Beep\"");
        lines.push("    on_press:");
        lines.push("      then:");
        lines.push("        - rtttl.play: \"beep:d=4,o=5,b=100:16p,16c6\"");
    }

    lines.push("");
    return lines;
}


/**
 * Generates PSRAM section for ESP32-S3 devices
 */
function generatePSRAMSection(profile) {
    // Check deep nested features or top level
    const hasPsram = (profile.features && profile.features.psram) || (profile.features && profile.features.features && profile.features.features.psram);
    if (!hasPsram) return [];

    return [
        "psram:",
        "  mode: octal",
        "  speed: 80MHz",
        ""
    ];
}

/**
 * Generates AXP2101 PMIC section (Critical for PhotoPainter)
 */
function generateAXP2101Section(profile) {
    if (!profile.features.axp2101 || profile.features.manual_pmic) return [];

    return [
        "axp2101:",
        "  i2c_id: bus_a",
        "  address: 0x34",
        "  irq_pin: GPIO21",
        "  battery_voltage:",
        "    name: \"Battery Voltage\"",
        "    id: battery_voltage",
        "  battery_level:",
        "    name: \"Battery Level\"",
        "    id: battery_level",
        "  on_setup:",
        "    - axp2101.set_ldo_voltage:",
        "        id: bldo1",
        "        voltage: 3300mv",
        "    - switch.turn_on: bldo1  # EPD_VCC (Screen Power)",
        "    - axp2101.set_ldo_voltage:",
        "        id: aldo1",
        "        voltage: 3300mv",
        "    - switch.turn_on: aldo1  # Peripherals",
        "    - axp2101.set_ldo_voltage:",
        "        id: aldo3",
        "        voltage: 3300mv",
        "    - switch.turn_on: aldo3  # Backlight/Logic",
        ""
    ];
}

/**
 * Generates output section for battery enable and buzzer
 */
function generateOutputSection(profile) {
    const lines = [];
    if (!profile.pins.batteryEnable && !profile.pins.buzzer) return lines;

    lines.push("output:");
    if (profile.pins.batteryEnable) {
        lines.push("  - platform: gpio"); // Use standard gpio output
        lines.push(`    pin: ${profile.pins.batteryEnable}`);
        lines.push("    id: bsp_battery_enable");
        // Often good to set restore_mode or inverted if needed
        // For now matching legacy exactly
    }
    if (profile.pins.buzzer) {
        // Only if not using rtttl or if rtttl uses this output?
        // RTTTL usually defines its own output or references one.
        // Legacy code:
        /*
          if (profile.pins.batteryEnable) lines.push("");
          lines.push(`  - platform: ledc`);
          lines.push(`    pin: ${profile.pins.buzzer}`);
          lines.push(`    id: buzzer_output`);
        */
        if (profile.pins.batteryEnable) lines.push("");
        lines.push("  - platform: ledc");
        lines.push(`    pin: ${profile.pins.buzzer}`);
        lines.push("    id: buzzer_output");
    }
    lines.push("");
    return lines;
}

/**
 * Generates RTTTL buzzer section
 */
function generateRTTTLSection(profile) {
    if (!profile.features.buzzer) return [];
    return [
        "rtttl:",
        "  id: reterminal_buzzer",
        "  output: buzzer_output",
        ""
    ];
}

function generateAudioSection(profile) {
    if (!profile.audio) return [];
    const lines = [];
    if (profile.audio.i2s_audio) {
        lines.push("i2s_audio:");
        lines.push(`  i2s_lrclk_pin: ${profile.audio.i2s_audio.i2s_lrclk_pin}`);
        lines.push(`  i2s_bclk_pin: ${profile.audio.i2s_audio.i2s_bclk_pin}`);
        if (profile.audio.i2s_audio.i2s_mclk_pin) lines.push(`  i2s_mclk_pin: ${profile.audio.i2s_audio.i2s_mclk_pin}`);
        lines.push("");
    }
    if (profile.audio.speaker) {
        lines.push("speaker:");
        lines.push(`  - platform: ${profile.audio.speaker.platform}`);
        lines.push(`    id: my_speaker`);
        if (profile.audio.speaker.dac_type) lines.push(`    dac_type: ${profile.audio.speaker.dac_type}`);
        if (profile.audio.speaker.i2s_dout_pin) lines.push(`    i2s_dout_pin: ${profile.audio.speaker.i2s_dout_pin}`);
        if (profile.audio.speaker.mode) lines.push(`    mode: ${profile.audio.speaker.mode}`);
        lines.push("");
    }
    return lines;
}
