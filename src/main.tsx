import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MarkFlowSettings, MarkFlowSettingTab} from "./settings";
import MarkflowApp from './MarkflowApp';
import { createRoot } from "react-dom/client";
import type { MarkflowData } from "./types";
import type {Tool} from './MarkflowApp';
import * as React from "react";

let lastActiveTool: Tool = "pencil";

export default class MarkFlow extends Plugin {
	settings: MarkFlowSettings;
	activeTool: Tool = "pencil";

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('pencil', "Insert canvas block", () => {
			// Called when the user clicks the icon.
			this.app.workspace.trigger("command:insert-block");
		});

		this.addCommand({
			id: "insert-block",
			name: "Insert canvas block",
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
		statusBarItemEl.setText('Markflow loaded');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MarkFlowSettingTab(this.app, this));

		
		this.registerMarkdownCodeBlockProcessor(
			"markflow",
			(source, el, ctx) => {
				const app = this.app;
				let data: MarkflowData;
				try {
					data = JSON.parse(source) as MarkflowData;
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
								app.workspace.getActiveViewOfType(MarkdownView);
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
