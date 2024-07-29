import { CreateSetDto } from '../../../http/set/dtos/create-set.dto';

export interface SetDataIngestionPort {
    
    /**
     * Obtains all MTG Sets and their data as an array of CreateSetDtos
     * 
     * @returns array of CreateSetDto objects
     */
    fetchAllSets(): Promise<CreateSetDto[]>;
}