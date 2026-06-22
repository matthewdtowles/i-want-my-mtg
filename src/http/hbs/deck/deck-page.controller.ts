import {
    Body,
    Controller,
    Get,
    Inject,
    Param,
    ParseIntPipe,
    Post,
    Render,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { DeckPageOrchestrator } from './deck-page.orchestrator';
import {
    DeckDetailViewDto,
    DeckImportResultViewDto,
    DeckImportViewDto,
    DeckListViewDto,
} from './dto/deck.view.dto';

@Controller('decks')
export class DeckPageController {
    constructor(
        @Inject(DeckPageOrchestrator) private readonly orchestrator: DeckPageOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('decks')
    async list(@Req() req: AuthenticatedRequest): Promise<DeckListViewDto> {
        return this.orchestrator.buildListView(req);
    }

    @UseGuards(OptionalAuthGuard)
    @Get('import')
    @Render('deckImport')
    importForm(@Req() req: AuthenticatedRequest): DeckImportViewDto {
        return this.orchestrator.buildImportView(req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('import')
    @Render('deckImportResult')
    async import(
        @Body() body: { name?: string; format?: string; text?: string },
        @Req() req: AuthenticatedRequest
    ): Promise<DeckImportResultViewDto> {
        return this.orchestrator.importDecklist(
            req,
            body.name ?? '',
            body.format,
            body.text ?? ''
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @Render('deckDetail')
    async detail(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<DeckDetailViewDto> {
        return this.orchestrator.buildDetailView(req, id);
    }
}
