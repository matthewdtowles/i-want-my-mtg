import { BaseSetResponseDto } from './base-set.response.dto';

// For setListPage.hbs
export class SetMetaResponseDto extends BaseSetResponseDto {
    readonly isBlockChild: boolean;

    /**
     * Full art_crop URL of the set's most valuable card, the background of its
     * tile in grid view. Undefined for a set whose cards have no images.
     */
    readonly coverImgSrc?: string;

    /** Release year alone — the tile's subline reads "2024 · 261 cards". */
    readonly releaseYear: string;

    constructor(init: Partial<SetMetaResponseDto>) {
        super(init);
        this.isBlockChild = init.isBlockChild ?? false;
        this.coverImgSrc = init.coverImgSrc;
        // `releaseDate` is a `date` column, so it is always 'YYYY-MM-DD'.
        this.releaseYear = this.releaseDate.slice(0, 4);
    }
}
