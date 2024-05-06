import { Injectable } from "@nestjs/common";

@Injectable()
export class BoosterPack {
  contents: Partial<Record<string, number>>;
  weight: number;
};