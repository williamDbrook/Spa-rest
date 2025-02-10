require('dotenv').config();

const port = process.env.PORT;

require('http').createServer(require('./app')).listen(port, 'localhost', () => {
    console.log(`Server běží na http://localhost:${ port }...`);
});