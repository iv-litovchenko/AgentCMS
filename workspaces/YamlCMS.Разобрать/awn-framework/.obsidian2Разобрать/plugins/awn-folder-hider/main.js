// main.js
const { Plugin, PluginSettingTab, Setting } = require("obsidian");

class AWNFolderHider extends Plugin {
    settings = {
        folderKeywords: ["_data", ".data"]
    };

    async onload() {
        await this.loadSettings();
        
        this.addSettingTab(new AWNFolderHiderSettingTab(this.app, this));

        console.log("AWN Folder Hider loaded");

        this.applyHiding();

        // Обновляем при изменениях в дереве
        this.registerEvent(
            this.app.workspace.on("layout-change", () => this.applyHiding())
        );

        setTimeout(() => this.applyHiding(), 800);
    }

    applyHiding() {
        const styleId = "awn-folder-hider-style";
        let style = document.getElementById(styleId);

        if (!style) {
            style = document.createElement("style");
            style.id = styleId;
            document.head.appendChild(style);
        }

        let cssRules = "";

        this.settings.folderKeywords.forEach(keyword => {
            if (keyword.trim() === "") return;
            
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // экранируем спецсимволы
            cssRules += `
                .nav-folder-title[data-path*="${keyword}"],
                .nav-folder-children[data-path*="${keyword}"] {
                    display: none !important;
                }
            `;
        });

        style.textContent = cssRules;
    }

    async loadSettings() {
        this.settings = Object.assign({}, { folderKeywords: ["_data", ".data"] }, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.applyHiding();        // сразу применяем
    }

    onunload() {
        const style = document.getElementById("awn-folder-hider-style");
        if (style) style.remove();
    }
}

class AWNFolderHiderSettingTab extends PluginSettingTab {
    plugin;

    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "AWN Folder Hider" });

        new Setting(containerEl)
            .setName("Скрывать папки содержащие")
            .setDesc("Перечислите слова/части названия через запятую. Пример: _data, .data, private, temp")
            .addTextArea(text => {
                text.setPlaceholder("_data, .data, secret");
                text.setValue(this.plugin.settings.folderKeywords.join(", "));
                text.onChange(async (value) => {
                    this.plugin.settings.folderKeywords = value
                        .split(",")
                        .map(s => s.trim())
                        .filter(Boolean);
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Применить изменения")
            .addButton(btn => {
                btn.setButtonText("Применить сейчас");
                btn.onClick(() => this.plugin.applyHiding());
            });
    }
}

module.exports = AWNFolderHider;