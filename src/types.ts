export interface FrontmatterKeys {
	startDateKey: string[];
	endDateKey: string[];
	titleKey: string[];
	descriptionKey: string[];
}

export const DEFAULT_FRONTMATTER_KEYS: FrontmatterKeys = {
	startDateKey: ['start-date'],
	endDateKey: ['end-date'],
	titleKey: ['title'],
	descriptionKey: ['description'],
}

export interface TimelinesSettings {
	era: any;
	timelineTag: string;
	sortDirection: boolean;
	notePreviewOnHover: boolean;
	frontmatterKeys: FrontmatterKeys;
	showRibbonCommand: boolean
}

export interface TimelineArgs {
	[key: string]: string
}

export interface CardContainer {
	date: string;
	title: string;
	description: string;
	img: string;
	path: string;
	endDate: string;
	type: string;
	class: string;
}

export type NoteData = CardContainer[];
export type AllNotesData = NoteData[];