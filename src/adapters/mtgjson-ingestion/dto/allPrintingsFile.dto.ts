import { Injectable } from "@nestjs/common";
import { Meta } from "./meta.dto";
import { SetDto } from "./set.dto";

@Injectable()
export class AllPrintingsFile { meta: Meta; data: Record<string, SetDto>; }