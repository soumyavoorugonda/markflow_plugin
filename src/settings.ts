import {App, PluginSettingTab, Setting} from "obsidian";
import MarkFlow from "./main";

export interface MarkFlowSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: MarkFlowSettings = {
	mySetting: 'default'
}

export class MarkFlowSettingTab extends PluginSettingTab {
	plugin: MarkFlow;

	constructor(app: App, plugin: MarkFlow) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
