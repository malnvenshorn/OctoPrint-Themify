import Client from '../client';
import { autobind } from '../utils';

export default class Editor {
    constructor() {
        autobind.call(this);
        this.clear();
    }

    clear() {
        this.theme = undefined;
        this.newFlag = false;

        if (this.content === undefined) {
            this.content = ko.observable('').extend({ dirtyFlag: false });
        } else {
            this.content('');
            this.content.setClean();
        }
    }

    new(name) {
        this.theme = name;
        this.newFlag = true;

        this.content('');
        this.content.setDirty();
    }

    load(name) {
        this.theme = name;
        return Client.getTheme(name)
            .done((response) => {
                this.content(response);
                this.content.setClean();
                this.newFlag = false;
            });
    }

    save() {
        return Client.saveTheme(this.theme, this.content())
            .done(() => {
                this.content.setClean();
                this.newFlag = false;
            });
    }

    isNew() {
        return this.newFlag;
    }

    isModified() {
        return this.content.isDirty();
    }

    /**
     * Insert two spaces on tab.
     */
    handleTabKey(data, event) {
        if (event.originalEvent.key !== 'Tab') return true;

        const editor = document.getElementById(event.target.id);
        const content = editor.value;

        const contentBeforeTab = content.slice(0, editor.selectionStart);
        const contentAfterTab = content.slice(editor.selectionEnd, content.length);
        // Where cursor moves after tab - moving forward by two chars
        const cursorPos = editor.selectionEnd + 2;
        this.content(`${contentBeforeTab}  ${contentAfterTab}`); // Add two spaces
        // Move cursor
        editor.selectionStart = cursorPos;
        editor.selectionEnd = cursorPos;

        return false;
    }
}
