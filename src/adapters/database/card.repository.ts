import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { Card } from 'src/core/card/card.entity';

@Injectable()
export class CardRepository implements CardRepositoryPort {
    
    constructor(
        @InjectRepository(Card)
        private readonly cardRepository: Repository<Card>,
    ) {}


    async save(cards: Card[]): Promise<Card[]> {
        return await this.cardRepository.save(cards) ?? [];
    }

    async findAllInSet(code: string): Promise<Card[]> {
        return await this.cardRepository.find({
            where: {
                set: {
                    setCode: code,
                },
            },
        }) ?? [];
    }

    async findAllWithName(_name: string): Promise<Card[]> {
        return await this.cardRepository.find({ 
            where: {
                name: _name 
            },
            relations: ['set'],
        }) ?? [];
    }

    async findById(_id: number): Promise<Card | null> {
        return await this.cardRepository.findOne({ 
            where: {
                id: _id
            },
            relations: ['set'],
        });
    }

    async findBySetCodeAndNumber(code: string, _number: number): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: {
                set: {
                    setCode: code,
                },
                number: String(_number),
            },
            relations: ['set'],
        });
    }

    async findByUuid(_uuid: string): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: {
                uuid: _uuid
            },
            relations: ['set'],
        });
    }

    async delete(card: Card): Promise<void> {
        await this.cardRepository.delete(card);
    }
}