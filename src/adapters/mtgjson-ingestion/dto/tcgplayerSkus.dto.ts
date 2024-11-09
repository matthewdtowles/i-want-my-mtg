import { Injectable } from "@nestjs/common";

@Injectable()
export class TcgplayerSkus {
  condition: string;
  finishes: string[];
  language: string;
  printing: string;
  productId: string;
  skuId: string;
};