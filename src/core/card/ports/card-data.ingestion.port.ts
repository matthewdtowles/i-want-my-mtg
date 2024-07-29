import { CreateCardDto } from '../../../http/card/dtos/create-card.dto';

export interface CardDataIngestionPort {
    
    /**
     * Obtains all MTG Cards for given Set.code and their data as an array of CreateCardDtos
     * 
     * @param string code - three letter set code
     * @returns array of CreateSetDto objects
     */
    fetchSetCards(code: string): Promise<CreateCardDto[]>;
}