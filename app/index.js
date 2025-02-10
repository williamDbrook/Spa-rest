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
if (!db.has('citace')) db.set('citace', { uzivatele: 0, prispevky: 0, kategorie: 0 });
if (!db.has('kategorie')) db.set('kategorie', []);
if (!db.has('tagy')) db.set('tagy', []);

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

function getKategorie() {
    return db.get('kategorie');
}

function getTagy() {
    return db.get('tagy');
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

function ulozKategorie(kategorie) {
    db.set('kategorie', kategorie);
}

function ulozTagy(tagy) {
    db.set('tagy', tagy);
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
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ chyba: 'Chyba při odhlašování' });
        }
        res.json({ uspech: true });
    });
});

app.get('/api/prispevky', vyzadujPrihlaseni, (req, res) => {
    const prispevky = getPrispevky();
    const obohacenePrispevky = prispevky.map(prispevek => {
        const uzivatel = najdiUzivatelePodleId(prispevek.uzivatel_id);
        return {
            ...prispevek,
            jmeno: uzivatel ? uzivatel.jmeno : 'neznámý',
            tags: prispevek.tags || []  // ensure tags is an array
        };
    });
    
    res.json(obohacenePrispevky);
});

app.get('/api/prispevky/tag/:tag', vyzadujPrihlaseni, (req, res) => {
    const tag = req.params.tag.toLowerCase();
    const prispevky = getPrispevky();
    const filteredPrispevky = prispevky.filter(prispevek => prispevek.tags && prispevek.tags.includes(tag));
    
    const obohacenePrispevky = filteredPrispevky.map(prispevek => {
        const uzivatel = najdiUzivatelePodleId(prispevek.uzivatel_id);
        return {
            ...prispevek,
            jmeno: uzivatel ? uzivatel.jmeno : 'neznámý',
            tags: prispevek.tags || []  // ensure tags is an array
        };
    });

    res.json(obohacenePrispevky);
});

app.post('/api/prispevky', vyzadujPrihlaseni, (req, res) => {
    const { title, category, tags, obsah } = req.body;
    const uzivatelId = req.session.uzivatelId;
    const prispevky = getPrispevky();
    const citace = getCitace();
    
    const novyPrispevek = {
        id: ++citace.prispevky,
        uzivatel_id: uzivatelId,
        title,
        category,
        tags: tags || [],  // ensure tags is an array
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
            jmeno: uzivatel.jmeno,
            tags: p.tags || []  // ensure tags is an array
        }));
    
    res.json(mojePrispevky);
});

app.get('/api/kategorie', vyzadujPrihlaseni, (req, res) => {
    res.json(getKategorie());
});

app.post('/api/kategorie', vyzadujPrihlaseni, (req, res) => {
    const { nazev } = req.body;
    const kategorie = getKategorie();
    const citace = getCitace();

    const novaKategorie = {
        id: ++citace.kategorie,
        nazev
    };

    kategorie.push(novaKategorie);
    ulozKategorie(kategorie);
    ulozCitace(citace);
    res.json({ id: novaKategorie.id });
});

app.get('/api/tagy', vyzadujPrihlaseni, (req, res) => {
    const prispevky = getPrispevky();
    const allTags = new Set();
    
    prispevky.forEach(prispevek => {
        if (prispevek.tags) {
            prispevek.tags.forEach(tag => allTags.add(tag));
        }
    });
    
    res.json(Array.from(allTags));
});

app.post('/api/tagy', vyzadujPrihlaseni, (req, res) => {
    const { nazev } = req.body;
    const tagy = getTagy();

    if (tagy.includes(nazev)) {
        res.status(400).json({ chyba: 'Tag již existuje' });
        return;
    }

    tagy.push(nazev);
    ulozTagy(tagy);
    res.json({ uspech: true });
});

module.exports = app;