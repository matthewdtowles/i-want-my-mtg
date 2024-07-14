import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { CardResponse } from 'src/card/card.response.model';
import { SetResponse } from 'src/set/set.response.model';
import { CardSet } from './models/cardSet.model';
import { Set } from './models/set.model';

@Injectable()
export class DataIngestionService {





    // TODO: separate into:
    // fetch from rest api method to get all set data from CARD_DATA_API
    // get from database
    // process data from api or db based on what we want to be returned
    // public method that will call the above: db first, if nothing, fetch from restful API

}
