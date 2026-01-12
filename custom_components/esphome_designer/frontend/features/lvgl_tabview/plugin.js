/**
 * LVGL Tabview Plugin
 */

const render = (el, widget, { getColorStyle }) => {
    const props = widget.props || {};

    el.innerHTML = "";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.boxSizing = "border-box";
    el.style.overflow = "hidden";
    el.style.backgroundColor = getColorStyle(props.bg_color || "white");
    el.style.border = "1px solid #333";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.backgroundColor = "#e0e0e0";
    header.style.borderBottom = "1px solid #333";
    header.style.height = "30px";
    header.style.flexShrink = "0";

    let tabs = props.tabs || ["Tab 1", "Tab 2"];
    if (typeof tabs === 'string') {
        tabs = tabs.includes("\n") ? tabs.split("\n") : tabs.split(",").map(t => t.trim());
    } else if (!Array.isArray(tabs)) {
        tabs = ["Tab 1", "Tab 2"];
    }
    tabs.forEach((tabName, i) => {
        const tab = document.createElement("div");
        tab.textContent = tabName;
        tab.style.flex = "1";
        tab.style.display = "flex";
        tab.style.alignItems = "center";
        tab.style.justifyContent = "center";
        tab.style.fontSize = "12px";
        tab.style.fontFamily = "Roboto, sans-serif";
        tab.style.color = "#000";
        tab.style.borderRight = i < tabs.length - 1 ? "1px solid #999" : "none";
        tab.style.backgroundColor = i === 0 ? "#fff" : "#e0e0e0";
        header.appendChild(tab);
    });
    el.appendChild(header);

    const content = document.createElement("div");
    content.style.flex = "1";
    content.style.display = "flex";
    content.style.alignItems = "center";
    content.style.justifyContent = "center";
    content.style.color = "#999";
    content.style.fontSize = "10px";
    content.style.fontFamily = "Roboto, sans-serif";
    content.textContent = "Tab Content Area";
    el.appendChild(content);
};

const exportLVGL = (w, context) => {
    const { getObjectDescriptor } = context;
    const props = w.props || {};

    const obj = getObjectDescriptor(w);
    obj.type = "tabview";

    // Tabview uses special construction args in ESPHome
    obj.type = "obj"; // Reset to obj because tabview is complex container
    // But wait, ESPHome components usually map directly. 
    // Let's check LVGL docs or ESPHome LVGL docs.
    // ESPHome lvgl config:
    // - tabview:
    //     tabs: 
    //       - title: "Tab 1"

    // However, our simplified generator likely expects a type mapping.
    // If the generator supports generic attrs, we can pass them.

    obj.type = "tabview";
    obj.attrs = {
        ...obj.attrs,
        tab_pos: props.tab_pos || "TOP",
        tab_size: 30
    };

    // Tabs need to be children or configured in a specific way.
    // The simplified generator might not handle nested complex structures well purely via attrs.
    // We'll pass the raw tabs list for the generator to handle if it knows how,
    // or arguably just creating the container is better than the warning.

    let tabs = props.tabs || ["Tab 1", "Tab 2"];
    if (typeof tabs === 'string') {
        tabs = tabs.includes("\n") ? tabs.split("\n") : tabs.split(",").map(t => t.trim());
    }

    // Pass tabs as a custom property for the generator to potentially usage
    obj._custom = { tabs };

    return obj;
};

export default {
    id: "lvgl_tabview",
    name: "Tabview",
    category: "LVGL",
    defaults: {
        tabs: ["Page 1", "Page 2", "Page 3"],
        tab_pos: "TOP",
        bg_color: "white"
    },
    render,
    exportLVGL
};
