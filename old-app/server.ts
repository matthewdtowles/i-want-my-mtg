import express from 'express';
import path from 'path';
import indexController from './controllers/indexController';

const app: any = express();


app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'hbs');

app.use('/', indexController);

export default app;