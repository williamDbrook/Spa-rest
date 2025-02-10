// Stavové proměnné aplikace
let jePrihlasen = false;
let aktualniZobrazeni = 'hlavni';  // 'hlavni' nebo 'profil'

// Základní funkce pro práci s UI
function zobrazPrvek(id, zobrazit = true) {
    document.getElementById(id).classList.toggle('skryty', !zobrazit);
}

function aktualizujPrihlaseni() {
    zobrazPrvek('prihlasovaci-formulare', !jePrihlasen);
    zobrazPrvek('uzivatelska-sekce', jePrihlasen);
}

// API funkce
function registrovat() {
    const jmeno = document.getElementById('reg-jmeno').value;
    const heslo = document.getElementById('reg-heslo').value;

    fetch('/api/registrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jmeno, heslo })
    })
    .then(res => res.json())
    .then(data => {
        if (data.chyba) {
            alert(data.chyba);
            return;
        }
        alert('Registrace úspěšná');
    });
}

function prihlasit() {
    const jmeno = document.getElementById('prih-jmeno').value;
    const heslo = document.getElementById('prih-heslo').value;

    fetch('/api/prihlaseni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jmeno, heslo })
    })
    .then(res => res.json())
    .then(data => {
        if (data.chyba) {
            alert(data.chyba);
            return;
        }
        jePrihlasen = true;
        aktualizujPrihlaseni();
        zobrazitHlavniStranu();
    });
}

function odhlasit() {
    fetch('/api/odhlaseni', { method: 'POST' })
    .then(() => {
        jePrihlasen = false;
        aktualizujPrihlaseni();
        zobrazitHlavniStranu();
    });
}

function vytvorPrispevek() {
    const title = document.getElementById('nazev-clanku').value;
    const category = document.getElementById('kategorie-clanku').value;
    const tags = document.getElementById('tagy-clanku').value.split(',').map(tag => tag.trim());
    const obsah = document.getElementById('obsah-clanku').value;

    fetch('/api/prispevky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, tags, obsah })
    })
    .then(res => res.json())
    .then(data => {
        if (data.chyba) {
            alert(data.chyba);
            return;
        }
        document.getElementById('nazev-clanku').value = '';
        document.getElementById('kategorie-clanku').value = '';
        document.getElementById('tagy-clanku').value = '';
        document.getElementById('obsah-clanku').value = '';
        zobrazitHlavniStranu();  // Refresh the main view to show the new post
    });
}

function smazatPrispevek(prispevekId) {
    fetch(`/api/prispevky/${prispevekId}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
        if (data.chyba) {
            alert(data.chyba);
            return;
        }
        if (aktualniZobrazeni === 'hlavni') zobrazitHlavniStranu();
        else zobrazitProfil();
    });
}

function zobrazPrispevky(prispevky, zobrazitMazani) {
    const sekcePrispevku = document.getElementById('sekce-prispevku');
    sekcePrispevku.innerHTML = '';

    prispevky.forEach(prispevek => {
        const prvekPrispevku = document.createElement('div');
        prvekPrispevku.className = 'prispevek';
        prvekPrispevku.innerHTML = `
            <strong>${prispevek.jmeno}</strong>
            <h3>${prispevek.title}</h3>
            <p>${prispevek.obsah}</p>
            <small>Kategorie: ${prispevek.category}, Tagy: ${prispevek.tags ? prispevek.tags.join(', ') : ''}</small>
            <small>${prispevek.cas_vytvoreni}</small>
            ${zobrazitMazani ? 
                `<button onclick="smazatPrispevek(${prispevek.id})">Smazat</button>` : 
                ''}
        `;
        sekcePrispevku.appendChild(prvekPrispevku);
    });
}

function zobrazitHlavniStranu() {
    aktualniZobrazeni = 'hlavni';
    fetch('/api/prispevky')
    .then(res => res.json())
    .then(prispevky => zobrazPrispevky(prispevky, false));
}

function zobrazitProfil() {
    aktualniZobrazeni = 'profil';
    fetch('/api/profil')
    .then(res => res.json())
    .then(prispevky => zobrazPrispevky(prispevky, true));
}

function nactiKategorie() {
    fetch('/api/kategorie')
    .then(res => res.json())
    .then(kategorie => {
        const select = document.getElementById('kategorie-clanku');
        select.innerHTML = kategorie.map(k => `<option value="${k.id}">${k.nazev}</option>`).join('');
    });
}

function nactiTagy() {
    fetch('/api/tagy')
    .then(res => res.json())
    .then(tagy => {
        // Process tags if needed
    });
}

// Inicializace aplikace
aktualizujPrihlaseni();
zobrazitHlavniStranu();
nactiKategorie();