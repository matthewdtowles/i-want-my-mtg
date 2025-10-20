export class TableHeaderView {
    readonly text: string;
    readonly classes: string[];

    constructor(text: string, classes?: string[]) {
        this.text = text;
        this.classes = classes || [];
    }
}