import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SetEntity } from "./set.entity";
import { Set } from "src/core/set/set.entity";
import { SetRepositoryPort } from "src/core/set/ports/set.repository.port";

@Injectable()
export class SetRepository implements SetRepositoryPort {
    
    constructor(
        @InjectRepository(SetEntity)
        private readonly setRepository: Repository<SetEntity>,
    ) {}
    saveSet(set: Set): Promise<Set> {
        throw new Error("Method not implemented.");
    }
    findByCode(code: string): Promise<Set | null> {
        throw new Error("Method not implemented.");
    }
    findByName(name: string): Promise<Set | null> {
        throw new Error("Method not implemented.");
    }
    findAllSets(): Promise<Set[] | null> {
        throw new Error("Method not implemented.");
    }
    findAllSetsMeta(): Promise<Set[] | null> {
        throw new Error("Method not implemented.");
    }

    async emailExists(_email: string): Promise<boolean> {
        return await this.setRepository.exists({where:{email: _email}});
    }
    
    async findById(id: number): Promise<Set | null> {
        const setEntity = await this.setRepository.findOneBy({ id });
        return setEntity ? new Set(setEntity.id, setEntity.name, setEntity.email) : null;
    }

    async findByEmail(setname: string): Promise<Set | null> {
        const setEntity: SetEntity =  await this.setRepository.findOneBy({ name: setname });
        return setEntity ? new Set(setEntity.id, setEntity.name, setEntity.email) : null;
    }

    async getPasswordHash(email: string): Promise<string> {
        const setEntity = await this.setRepository.findOneBy({ email });
        return setEntity ? setEntity.password : null;
    }

    async setExists(set: Set): Promise<boolean> {
        return await this.setRepository.exists({ where: { name: set.name } });
    }

    async removeById(id: number): Promise<void> {
        await this.setRepository.delete(id);
    }

    async removeSet(set: Set): Promise<void> {
        await this.setRepository.delete(set.id);
    }

    async save(set: Set, hashedPassword: string): Promise<Set> {
        const setEntity = new SetEntity();
        setEntity.id = set.id;
        setEntity.name = set.name;
        setEntity.email = set.email;
        setEntity.password = hashedPassword;
        const savedSetEntity = await this.setRepository.save(setEntity);
        return new Set(savedSetEntity.id, savedSetEntity.name, savedSetEntity.email);
    }
}