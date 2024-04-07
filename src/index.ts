import axios, { AxiosResponse } from 'axios';
import { Set } from './models/Set'

const SOURCE_URL = 'https://mtgjson.com/api/v5/';

async function fetchSetJson(name: string) {
    try {
        const response: AxiosResponse<any> = await axios.get(SOURCE_URL + name + '.json');
        return response.data;
    } catch (error) {
        console.error('Error fetching cards for ' + name, error);
        return null;
    }
}



fetchSetJson('KLD').then((data) => {
    if (data) {
        console.log(data.data);
    }
    let set: Set = data.data;
    console.log(set.name); 
});
