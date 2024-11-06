import { Injectable } from "@nestjs/common";

@Injectable()
export class SealedProductPack {
  code: string;
  set: string;
};