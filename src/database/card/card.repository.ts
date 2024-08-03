import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";
import { CardEntity } from "./card.entity";
import { CardRepositoryPort } from "src/core/card/ports/card.repository.port";
import { Card } from "src/core/card/card";

@Injectable()
export class CardRepository implements CardRepositoryPort {
    
    constructor(
        @InjectRepository(CardEntity)
        private readonly cardRepository: Repository<CardEntity>,
    ) {}

    /**
     * @param card 
     * @returns true if card entity exists, false otherwise
     */
    async cardExists(card: Card): Promise<boolean> {
        return await this.cardRepository.exists({ where: { uuid: card.uuid } });
    }

    /**
     * @param name 
     * @returns card entities with name
     */
    async findAllWithName(name: string): Promise<Card[] | null> {
        return await this.cardRepository.findBy({ name: name });
    }

    /**
     * @param code three letter set code
     * @returns card entities in set with code
     */
    async findAllInSet(code: string): Promise<Card[] | null> {
        // TODO: figure this out
        // return await this.findBy({ set: code });
        return null;
    }

    async findById(id: number): Promise<Card | null> {
        const cardEntity = await this.cardRepository.findOneBy({ id });
        return cardEntity ? new Card() : null;
    }

    /**
     * @param uuid 
     * @returns card entity with uuid, null if not found
     */
    async findByUuid(uuid: string): Promise<Card | null> {
        return await this.cardRepository.findOneBy({ uuid: uuid });
    }

    /**
     * @param code three letter set code
     * @param number card number in set
     * @returns card entity in set with code and card number in set
     */
    async findBySetCodeAndNumber(code: string, number: number): Promise<Card | null> {
        // TODO: figure this out
        // return await this.findBy({ set: code })
        return null;
    }

    async removeById(id: number): Promise<void> {
        await this.cardRepository.delete(id);
    }    

    async saveCard(card: Card): Promise<Card> {
        const cardEntity = new CardEntity();
        cardEntity.id = card.id;
        cardEntity.name = card.name;
        return await this.cardRepository.save(cardEntity);    
    }

}