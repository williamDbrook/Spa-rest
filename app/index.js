const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jsondb = require('simple-json-db');

const app = express();

require('dotenv').config();

const db = new jsondb('./data/databaze.json', {
    jsonSpaces: 2  // pro čitelnější formát JSON souboru
});

// Inicializace DB, pokud neexistuje
if (!db.has('uzivatele')) db.set('uzivatele', []);
if (!db.has('prispevky')) db.set('prispevky', []);
if (!db.has('citace')) db.set('citace', { uzivatele: 0, prispevky: 0 });

// Middleware
app.use(express.static('www'));
app.use(express.json());
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

// Pomocné funkce pro práci s DB
function getPrispevky() {
    return db.get('prispevky');
}

function getUzivatele() {
    return db.get('uzivatele');
}

function getCitace() {
    return db.get('citace');
}

function ulozPrispevky(prispevky) {
    db.set('prispevky', prispevky);
}

function ulozUzivatele(uzivatele) {
    db.set('uzivatele', uzivatele);
}

function ulozCitace(citace) {
    db.set('citace', citace);
}

function najdiUzivatele(jmeno) {
    return getUzivatele().find(u => u.jmeno === jmeno);
}

function najdiUzivatelePodleId(id) {
    return getUzivatele().find(u => u.id === id);
}

// Middleware pro kontrolu přihlášení
function vyzadujPrihlaseni(req, res, next) {
    if (!req.session.uzivatelId) {
        res.status(401).json({ chyba: 'Nutné přihlášení' });
        return;
    }
    next();
}

// API Endpointy
app.post('/api/registrace', (req, res) => {
    const { jmeno, heslo } = req.body;
    
    if (najdiUzivatele(jmeno)) {
        res.status(400).json({ chyba: 'Uživatel již existuje' });
        return;
    }

    const citace = getCitace();
    const hash = bcrypt.hashSync(heslo, 10);
    const uzivatele = getUzivatele();
    
    uzivatele.push({
        id: ++citace.uzivatele,
        jmeno,
        heslo: hash
    });
    
    ulozUzivatele(uzivatele);
    ulozCitace(citace);
    res.json({ uspech: true });
});

app.post('/api/prihlaseni', (req, res) => {
    const { jmeno, heslo } = req.body;
    const uzivatel = najdiUzivatele(jmeno);
    
    if (!uzivatel || !bcrypt.compareSync(heslo, uzivatel.heslo)) {
        res.status(401).json({ chyba: 'Nesprávné přihlašovací údaje' });
        return;
    }

    req.session.uzivatelId = uzivatel.id;
    res.json({ uspech: true });
});

app.post('/api/odhlaseni', (req, res) => {
    req.session.destroy();
    res.json({ uspech: true });
});

app.get('/api/prispevky', (req, res) => {
    const prispevky = getPrispevky();
    const obohacenePrispevky = prispevky.map(prispevek => {
        const uzivatel = najdiUzivatelePodleId(prispevek.uzivatel_id);
        return {
            ...prispevek,
            jmeno: uzivatel ? uzivatel.jmeno : 'neznámý'
        };
    });
    
    res.json(obohacenePrispevky);
});

app.post('/api/prispevky', vyzadujPrihlaseni, (req, res) => {
    const { obsah } = req.body;
    const uzivatelId = req.session.uzivatelId;
    const prispevky = getPrispevky();
    const citace = getCitace();
    
    const novyPrispevek = {
        id: ++citace.prispevky,
        uzivatel_id: uzivatelId,
        obsah,
        cas_vytvoreni: new Date().toISOString()
    };
    
    prispevky.push(novyPrispevek);
    ulozPrispevky(prispevky);
    ulozCitace(citace);
    res.json({ id: novyPrispevek.id });
});

app.delete('/api/prispevky/:id', vyzadujPrihlaseni, (req, res) => {
    const prispevekId = parseInt(req.params.id);
    const uzivatelId = req.session.uzivatelId;
    const prispevky = getPrispevky();
    
    const index = prispevky.findIndex(p => 
        p.id === prispevekId && p.uzivatel_id === uzivatelId
    );
    
    if (index === -1) {
        res.status(403).json({ chyba: 'Nemáte oprávnění smazat tento příspěvek' });
        return;
    }
    
    prispevky.splice(index, 1);
    ulozPrispevky(prispevky);
    res.json({ uspech: true });
});

app.get('/api/profil', vyzadujPrihlaseni, (req, res) => {
    const uzivatelId = req.session.uzivatelId;
    const prispevky = getPrispevky();
    const uzivatel = najdiUzivatelePodleId(uzivatelId);
    
    const mojePrispevky = prispevky
        .filter(p => p.uzivatel_id === uzivatelId)
        .map(p => ({
            ...p,
            jmeno: uzivatel.jmeno
        }));
    
    res.json(mojePrispevky);
});

module.exports = app;