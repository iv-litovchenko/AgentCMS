// main.js
const { Plugin, PluginSettingTab, Setting, TFolder } = require("obsidian");

class AWNHiddenDataAccessPlugin extends Plugin {
    settings = { hiddenFolders: [".data"] };

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new AWNHiddenDataSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => this.forceIndexFolders());

        this.registerEvent(this.app.vault.on("create", () => this.forceIndexFolders()));
        this.registerEvent(this.app.vault.on("modify", () => this.forceIndexFolders()));

        console.log("AWN Hidden Data Access loaded");
    }

    async forceIndexFolders() {
        for (const folderPath of this.settings.hiddenFolders) {
            try {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (folder instanceof TFolder) {
                    console.log(`[AWN] Forcing index for: ${folderPath}`);
                    await this.app.vault.adapter.list(folderPath);
                }
            } catch (e) {
                console.warn(`[AWN] Failed to index ${folderPath}`, e);
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, { hiddenFolders: [".data"] }, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.forceIndexFolders();
    }
}

class AWNHiddenDataSettingTab extends PluginSettingTab {
    plugin;

    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "AWN Hidden Data Access" });

        new Setting(containerEl)
            .setName("Папки для индексации")
            .setDesc("Укажи пути через запятую (.data, Areas/Collections/.data и т.д.)")
            .addTextArea((text) => {
                text.setPlaceholder(".data");
                text.setValue(this.plugin.settings.hiddenFolders.join(", "));
                text.onChange(async (value) => {
                    this.plugin.settings.hiddenFolders = value
                        .split(",")
                        .map(s => s.trim())
                        .filter(Boolean);
                    await this.plugin.saveSettings();
                });
            });
    }
}

module.exports = AWNHiddenDataAccessPlugin;