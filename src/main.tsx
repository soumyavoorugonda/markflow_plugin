import {App, Editor, MarkdownView, Modal, Notice, Plugin, View} from 'obsidian';
import {DEFAULT_SETTINGS, MarkFlowSettings, MarkFlowSettingTab} from "./settings";
import MarkflowApp from './MarkflowApp';
import { createRoot } from "react-dom/client";
import type { MarkflowData } from "./types";
import type {Tool} from './MarkflowApp';
import * as React from "react";

let setActiveTool: ((tool: Tool) => void) | null = null;
let lastActiveTool: Tool = "pencil";

export default class MarkFlow extends Plugin {
	settings: MarkFlowSettings;
	activeTool: Tool = "pencil";

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('pencil', "Insert Markflow block", () => {
			// Called when the user clicks the icon.
			(this.app as any).commands.executeCommandById(
			"markflow:insert-markflow-block"
			);
		});

		this.addCommand({
			id: "insert-markflow-block",
			name: "Insert Markflow block",
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor();

				const block =
				"```markflow\n" +
				"{\n" +
				'  "width": 800,\n' +
				'  "height": 500,\n' +
				'  "elements": []\n' +
				"}\n" +
				"```\n";

				editor.replaceRange(block, cursor);
			},
		});


		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('MarkFlow loaded');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample editor command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MarkFlowSettingTab(this.app, this));


		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		
		this.registerMarkdownCodeBlockProcessor(
			"markflow",
			(source, el, ctx) => {
				const plugin = this;
				let data: MarkflowData;
				try {
					data = JSON.parse(source);
				}
				catch {
					data = { width: 800, height: 500, elements: [] };
				}
				const section = ctx.getSectionInfo(el);
    			if (!section) return;

				const container = el.createDiv();
				const reactRoot = container.createDiv();

				const root = createRoot(reactRoot);
				root.render(
					<Wrapper section={section} data={data} />
				);

				function Wrapper({
					section,
					data,
				}: {
					section: NonNullable<ReturnType<typeof ctx.getSectionInfo>>;
					data: MarkflowData;
				}) {
					const [tool, setTool] = React.useState<Tool>(lastActiveTool);

					setActiveTool = setTool;
					function handleToolChange(t: Tool) {
						lastActiveTool = t;
						setTool(t);
					}

					return (
						<MarkflowApp
							initialData={data}
							activeTool={tool}
							onToolChange={(t: Tool) => {
							lastActiveTool = t;
							setTool(t);
							}}
							onChange={(nextData: MarkflowData) => {
							const view =
								plugin.app.workspace.getActiveViewOfType(MarkdownView);
							if (!view) return;

							const editor = view.editor;

							const updatedBlock = [
								"```markflow",
								JSON.stringify(nextData, null, 2),
								"```",
							].join("\n");

							editor.replaceRange(
								updatedBlock,
								{ line: section.lineStart, ch: 0 },
								{ line: section.lineEnd + 1, ch: 0 }
							);
							}}
						/>
						);
				}
			}

			);
		
	}
	private insertMarkflowBlock() {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) {
				new Notice("No active Markdown view found.");
				return;
			}
			// Force focus on the editor
			this.app.workspace.setActiveLeaf(view.leaf, { focus: true });

			const editor = view.editor;
			if (!editor) {
				new Notice("Switch to edit or live preview mode");
				return;
			}
			const cursor = editor.getCursor();

			const block = [
				"```markflow",
				"{",
				` "width": ${800},`,
				` "height": ${500}`,
				"}",
				"```",
				""
			].join("\n");

			editor.replaceRange(block, cursor);
		}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MarkFlowSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
