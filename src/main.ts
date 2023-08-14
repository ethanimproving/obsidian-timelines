import type {TimelinesSettings, FrontmatterKeys} from './types';
import {TimelineProcessor} from './block';
import {MarkdownView, Plugin} from 'obsidian';
import {TimelinesSettingTab} from './settings';
import {DEFAULT_FRONTMATTER_KEYS} from './types'

const DEFAULT_SETTINGS: TimelinesSettings = {
	timelineTag: 'timeline',
	sortDirection: true,
	notePreviewOnHover: true,
	frontmatterKeys: DEFAULT_FRONTMATTER_KEYS,
	era: [' BC', ' AD'],
	showRibbonCommand: true
}

export default class TimelinesPlugin extends Plugin {
	settings: TimelinesSettings;

	async addTimelineEvent(frontmatterKeys: FrontmatterKeys) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			const timelineProcessor = new TimelineProcessor();
			await timelineProcessor.insertTimelineYaml(frontmatterKeys, view);
		}
	}

	async onload() {
		// Load message
		await this.loadSettings();
		console.log('Loaded Timelines Plugin');

		// Register timeline block renderer
		this.registerMarkdownCodeBlockProcessor('timeline', async (source, el, ctx) => {
			const proc = new TimelineProcessor();
			await proc.run(source, el, this.settings, this.app.vault.getMarkdownFiles(), this.app.metadataCache, this.app.vault, false);
		});

		// Register vis-timeline block renderer
		this.registerMarkdownCodeBlockProcessor('timeline-vis', async (source, el, ctx) => {
			const proc = new TimelineProcessor();
			await proc.run(source, el, this.settings, this.app.vault.getMarkdownFiles(), this.app.metadataCache, this.app.vault, true);
		});

		this.addCommand({
			id: "render-timeline",
			name: "Render Timeline",
			callback: async () => {
				const proc = new TimelineProcessor();
				let view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					await proc.insertTimelineIntoCurrentNote(view, this.settings, this.app.vault.getMarkdownFiles(), this.app.metadataCache, this.app.vault);
				}
			}
		});

		if (this.settings.showRibbonCommand) {
			this.addRibbonIcon('calendar-range', 'Insert Timeline Event YAML', async () => {
				await this.addTimelineEvent(this.settings.frontmatterKeys);
			});
		}
		
		this.addCommand({
			id: 'insert-timeline-event-yaml',
			name: 'Insert Timeline Event YAML',
			callback: async () => {
				return await this.addTimelineEvent(this.settings.frontmatterKeys);
			}
		});

		this.addSettingTab(new TimelinesSettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}