import axios, { AxiosResponse } from 'axios';

const SOURCE_URL = 'https://mtgjson.com/api/v5/';

async function fetchCardsFromSet(name: string) {
    try {
        const response: AxiosResponse<any> = await axios.get(SOURCE_URL + name + '.json');
        return response.data;
    } catch (error) {
        console.error('Error fetching cards for ' + name, error);
        return null;
    }
}

fetchCardsFromSet('KLD').then((data) => {
    if (data) {
        console.log(data);
    }
});
