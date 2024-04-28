import HandleBars from 'handlebars';
import fs from 'fs';

const templatePath = './src/templates/';
const encoding = 'utf8';

const indexTemplateSrc = fs.readFileSync(templatePath + 'index.hbs', encoding);

export const indexTemplate = HandleBars.compile(indexTemplateSrc);