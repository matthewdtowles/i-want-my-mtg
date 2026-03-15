export class TableHeaderView {
    readonly text: string;
    readonly classes: string[];
    readonly subtitle?: string;

    constructor(text: string, classes?: string[], subtitle?: string) {
        this.text = text;
        this.classes = classes || [];
        this.subtitle = subtitle;
    }
}
