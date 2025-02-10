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
	const obsah = document.getElementById('obsah-prispevku').value;

	fetch('/api/prispevky', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ obsah })
	})
	.then(res => res.json())
	.then(data => {
		if (data.chyba) {
			alert(data.chyba);
			return;
		}
		document.getElementById('obsah-prispevku').value = '';
		if (aktualniZobrazeni === 'hlavni') zobrazitHlavniStranu();
		else zobrazitProfil();
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
			<p>${prispevek.obsah}</p>
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

// Inicializace aplikace
aktualizujPrihlaseni();
zobrazitHlavniStranu();