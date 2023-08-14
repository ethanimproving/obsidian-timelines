import type {FrontMatterCache, MarkdownView, MetadataCache, TFile, Vault,} from 'obsidian';
import type {FrontmatterKeys, NoteData, TimelinesSettings} from './types';
import {BST} from './bst';
import {Notice} from 'obsidian';
import {createDate, FilterMDFiles, getImgUrl, parseTag} from './utils';
import {DataSet} from "vis-data";
import {Timeline} from "vis-timeline/esnext";
import "vis-timeline/styles/vis-timeline-graph2d.css";

export interface Args {
	tags: string;
	divHeight: number;
	startDate: string;
	endDate: string;
	minDate: string;
	maxDate: string;
	[key: string]: string | number;
}

export const RENDER_TIMELINE: RegExp = /<!--TIMELINE BEGIN tags=['"]([^"]*?)['"]-->([\s\S]*?)<!--TIMELINE END-->/i;

export class TimelineProcessor {

    createNoteCard(event: any): HTMLElement {
        let noteCard = document.createElement('div');
        noteCard.className = 'timeline-card';
        if (event.img) {
            let thumb = document.createElement('div');
            thumb.className = 'thumb';
            thumb.style.backgroundImage = `url(${event.img})`;
            noteCard.appendChild(thumb);
        }
        if (event.class) {
            noteCard.classList.add(event.class);
        }
    
        let article = document.createElement('article');
        let h3 = document.createElement('h3');
        let a = document.createElement('a');
        a.className = 'internal-link';
        a.href = event.path;
        a.textContent = event.title;
        h3.appendChild(a);
        article.appendChild(h3);
        noteCard.appendChild(article);
    
        let p = document.createElement('p');
        p.textContent = event.description;
        noteCard.appendChild(p);
    
        return noteCard;
    }
    
    getStartEndDates(event: any): [Date, Date] {
        let startDate = event.date?.replace(/(.*)-\d*$/g, '$1');
        let start: Date, end: Date;
        if (startDate[0] == '-') {
            let startComp = startDate.substring(1, startDate.length).split('-');
            start = new Date(+`-${startComp[0]}`, +startComp[1], +startComp[2]);
        } else {
            start = new Date(startDate);
        }
    
        let endDate = event.endDate?.replace(/(.*)-\d*$/g, '$1');
        if (endDate && endDate[0] == '-') {
            let endComp = endDate.substring(1, endDate.length).split('-');
            end = new Date(+`-${endComp[0]}`, +endComp[1], +endComp[2]);
        } else {
            end = new Date(endDate);
        }
    
        return [start, end];
    }

    async insertTimelineIntoCurrentNote(sourceView: MarkdownView, settings: TimelinesSettings, vaultFiles: TFile[], fileCache: MetadataCache, appVault: Vault) {
		let editor = sourceView.editor;
		if (editor) {
			const source = editor.getValue();
			let match = RENDER_TIMELINE.exec(source);
			if (match) {
				let tagList = match[1];

				let div = document.createElement('div');
				let rendered = document.createElement('div');
				rendered.addClass('timeline-rendered');
				rendered.setText(new Date().toString());

				div.appendChild(document.createComment(`TIMELINE BEGIN tags='${match[1]}'`));
				await this.run(tagList, div, settings, vaultFiles, fileCache, appVault, false);
				div.appendChild(rendered);
				div.appendChild(document.createComment('TIMELINE END'));

				editor.setValue(source.replace(match[0], div.innerHTML));
			}
		}
	};

    parseArgs(source: string, visTimeline: boolean): Args {
        let args: Args = {
            tags: '',
            divHeight: 400,
            startDate: '-1000',
            endDate: '3000',
            minDate: '-3000',
            maxDate: '3000'
        };

        if (visTimeline) {
            source.split('\n').map(e => {
                e = e.trim();
                if (e) {
                    let param = e.split('=');
                        if (param[1]) {
                        args[param[0]] = param[1]?.trim();
                    }
                }
            });
        } else {
            args.tags = source.trim();
        }

        return args;
    }

    getTagSet(tags: string, timelineTag: string): Set<string> {
        let tagSet = new Set<string>();
        tags.split(";").forEach(tag => parseTag(tag, tagSet));
        tagSet.add(timelineTag);
        return tagSet;
    }

    filterFiles(vaultFiles: TFile[], tagSet: Set<string>, fileCache: MetadataCache): TFile[] {
        return vaultFiles.filter(file => FilterMDFiles(file, tagSet, fileCache));
    }

    sortDates(timelineDates: number[], sortDirection: boolean): number[] {
        if (sortDirection) {
            return timelineDates.sort((d1, d2) => d1 - d2);
        } else {
            return timelineDates.sort((d1, d2) => d2 - d1);
        }
    }

    buildHtmlTimeline(timeline: HTMLElement, timelineNotes: Map<number, NoteData>, timelineDates: number[], settings: TimelinesSettings) {
        let eventCount = 0;
        for (let date of timelineDates) {
            let noteContainer = timeline.createDiv({ cls: 'timeline-container' });
            let noteHeader = noteContainer.createEl('h2', { text: timelineNotes.get(date)[0].date.replace(/-0*$/g, '').replace(/-0*$/g, '').replace(/-0*$/g, '')});
            let era = settings.era[Number(!noteHeader.textContent.startsWith('-'))];
            let eventContainer = noteContainer.createDiv({ cls: 'timeline-event-list', attr: { 'style': 'display: block'} });
            noteHeader.textContent += ' ' + era;
    
            noteHeader.addEventListener('click', event => {
                if (eventContainer.style.getPropertyValue('display') === 'none') {
                    eventContainer.style.setProperty('display', 'block');
                    return;
                }
                eventContainer.style.setProperty('display', 'none');
            });
    
            if (eventCount % 2 == 0) {
                noteContainer.addClass('timeline-left');
            } else {
                noteContainer.addClass('timeline-right');
                noteHeader.setAttribute('style', 'text-align: right;');
            }
    
            if (!timelineNotes.has(date)) {
                continue;
            }
    
            for (let eventAtDate of timelineNotes.get(date)) {
                let noteCard = eventContainer.createDiv({ cls: 'timeline-card' });
                if (eventAtDate.img) {
                    noteCard.createDiv({ cls: 'thumb', attr: { style: `background-image: url(${eventAtDate.img});` } });
                }
                if (eventAtDate.class) {
                    noteCard.addClass(eventAtDate.class);
                }
    
                noteCard.createEl('article').createEl('h3').createEl('a',
                    {
                        cls: 'internal-link',
                        attr: { href: `${eventAtDate.path}` },
                        text: eventAtDate.title
                    });
                noteCard.createEl('p', { text: eventAtDate.description });
            }
            eventCount++;
        }
    }

    buildVisTimelineItems(timelineNotes: Map<number, NoteData>, timelineDates: number[]): DataSet<any, any> {
            let items = new DataSet<any, any>([]);
        
            timelineDates.forEach(date => {
                Object.values(timelineNotes.get(date)).forEach(event => {
                    let noteCard = this.createNoteCard(event);
                    let [start, end] = this.getStartEndDates(event);
        
                    if (start.toString() === 'Invalid Date') return;
                    if ((event.type === "range" || event.type === "background") && end.toString() === 'Invalid Date') return;
        
                    items.add({
                        id: items.length + 1,
                        content: event.title ?? '',
                        title: noteCard.outerHTML,
                        description: event.description,
                        start: start,
                        className: event.class ?? '',
                        type: event.type,
                        end: end ?? null,
                        path: event.path
                    });
                });
            });
            return items;
        }

    getVisTimelineOptions(args: Args, settings: TimelinesSettings) {
        let options = {
            minHeight: +args.divHeight,
            showCurrentTime: false,
            showTooltips: false,
            template: function (item: any) {
                let eventContainer = document.createElement(settings.notePreviewOnHover ? 'a' : 'div');
                if ("href" in eventContainer) {
                    eventContainer.addClass('internal-link');
                    eventContainer.href = item.path;
                }
                eventContainer.setText(item.content);
                let eventCard = eventContainer.createDiv();
                eventCard.outerHTML = item.title;
                eventContainer.addEventListener('click', event => {
                    let el = (eventContainer.getElementsByClassName('timeline-card')[0] as HTMLElement);
                    el.style.setProperty('display', 'block');
                    el.style.setProperty('top', `-${el.clientHeight + 10}px`);
                });
                return eventContainer;
            },
            start: createDate(args.startDate),
            end: createDate(args.endDate),
            min: createDate(args.minDate),
            max: createDate(args.maxDate)
        };
        return options;
    }
    

    createVisTimeline(timeline: HTMLElement, items: DataSet <any, any>, options: any) {
        timeline.setAttribute('class', 'timeline-vis');
        new Timeline(timeline, items, options);
    }

    async run(source: string, el: HTMLElement, settings: TimelinesSettings, vaultFiles: TFile[], fileCache: MetadataCache, appVault: Vault, visTimeline: boolean) {

        let args = this.parseArgs(source, visTimeline);
        let tagSet = this.getTagSet(args.tags, settings.timelineTag);
        let fileList = this.filterFiles(vaultFiles, tagSet, fileCache);
        if (!fileList) return;

        let [timelineNotes, timelineDates] = await getTimelineData(appVault, fileCache, fileList, settings);
        timelineDates = this.sortDates(timelineDates, settings.sortDirection);

        let timeline = document.createElement('div');
        timeline.setAttribute('class', 'timeline');

        if (!visTimeline) {
            this.buildHtmlTimeline(timeline, timelineNotes, timelineDates, settings);
            el.appendChild(timeline);
            return;
        }

        let items = this.buildVisTimelineItems(timelineNotes, timelineDates);
        let options = this.getVisTimelineOptions(args, settings);
        this.createVisTimeline(timeline, items, options);
        el.appendChild(timeline);
    }

    async insertTimelineYaml(frontmatterKeys: FrontmatterKeys, sourceView: MarkdownView) {
        const editor = sourceView.editor;
        if (!editor) return;

        // Create a YAML block with the frontmatter keys
        let yaml = 'title:\n';
        yaml += 'description:\n';
        yaml += 'image:\n';
        yaml += 'type:\n';
        yaml += 'color:\n';
        yaml += 'start-date:\n';
        yaml += 'end-date:\n';

        // Check if the current note already has a YAML header
        const firstLine = editor.getLine(0);
        if (firstLine === '---') {
          // If it does, add the new keys to the existing YAML header
            let frontmatterEnd = 1;
            while (frontmatterEnd <= editor.lastLine() && editor.getLine(frontmatterEnd) !== '---') {
                frontmatterEnd++;
            }
          // Add the new keys to the existing YAML header
            editor.replaceRange(yaml, { line: frontmatterEnd, ch: 0 }, { line: frontmatterEnd, ch: 0 });
        } else {
          // If not, insert the new YAML block at the beginning of the note
            yaml = '---\n' + yaml + '---\n';
            editor.replaceRange(yaml, { line: 0, ch: 0 }, { line: 0, ch: 0 });
        }
    }
}

async function getTimelineData(appVault: Vault, fileCache: MetadataCache, fileList: TFile[], settings: TimelinesSettings): Promise<[Map<number, NoteData>, number[]]> {
	const timeline = document.createElement('div');
	timeline.classList.add('timeline');
	const timelineNotes = new Map<number, NoteData>();
	const timelineDates = new BST<number>();

	for (const file of fileList) {
		const metadata = fileCache.getFileCache(file);
		const frontmatter = metadata.frontmatter;

			const [startDate, noteTitle, description, img, noteClass, notePath, type, endDate] = getFrontmatterData(frontmatter, settings.frontmatterKeys, null, file);

			let noteId;
			if (startDate[0] == '-') {
				noteId = +startDate.substring(1).split('-').join('') * -1;
			} else {
				noteId = +startDate.split('-').join('');
			}

			if (!Number.isInteger(noteId)) continue;

			const note = {
				date: startDate,
				title: noteTitle,
				description: description ?? frontmatter.description,
				img: getImgUrl(app, appVault.adapter, img),
				path: notePath,
				class: noteClass,
				type: type,
				endDate: endDate
			};

			if (!timelineNotes.has(noteId)) {
				timelineNotes.set(noteId, [note]);
				timelineDates.insert(noteId);
			} else {
				const notes = timelineNotes.get(noteId);
				const insertIndex = settings.sortDirection ? 0 : notes.length;
				notes.splice(insertIndex, 0, note);
			}
		}

		return [timelineNotes, Array.from(timelineDates.inOrder())];
}

function getFrontmatterData(frontmatter: FrontMatterCache | null, frontmatterKeys: FrontmatterKeys, event: HTMLElement, file: TFile): [string, string, string, string, string, string, string, string | null] {
	const startDate = findMatchingFrontmatterKey(frontmatter, frontmatterKeys.startDateKey);
	if (!startDate) {
		new Notice(`No date found for ${file.name}`);
		return ['', '', '', '', '', '', '', ''];
	}
	const noteTitle = findMatchingFrontmatterKey(frontmatter, frontmatterKeys.titleKey) ?? file.name.replace(".md", "");
	const description = frontmatter.desription;
	const img = frontmatter?.image;
	const noteClass = frontmatter["color"] ?? '';
	const notePath = '/' + file.path;
	const type = frontmatter["type"] ?? 'box';
	const endDate = findMatchingFrontmatterKey(frontmatter, frontmatterKeys.endDateKey) ?? null;
	return [startDate, noteTitle, description, img, noteClass, notePath, type, endDate];
}

function findMatchingFrontmatterKey(frontmatter: FrontMatterCache | null, keys: string[]) {
	for (const key of keys) {
		if (frontmatter && frontmatter[key]) {
			return frontmatter[key];
		}
	}
	return null;
}