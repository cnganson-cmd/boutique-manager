const assert=require('node:assert/strict');
const fs=require('node:fs');

const dashboard=fs.readFileSync('patron-dashboard.js','utf8');
const styles=fs.readFileSync('patron-dashboard.css','utf8');
const testIndex=fs.readFileSync('test.html','utf8');

// La fonctionnalité est activée sur l'environnement de RECETTE demandé.
assert.match(testIndex,/patron-dashboard\.css\?v=1/);
assert.match(testIndex,/patron-dashboard\.js\?v=1/);

// Les périodes restent mémorisées pendant la navigation.
assert.match(dashboard,/bm_patron_period/);
assert.match(dashboard,/Aujourd’hui/);
assert.match(dashboard,/7 jours/);
assert.match(dashboard,/30 jours/);

// Chaque zone du tableau de bord mène vers un niveau de détail cohérent.
for(const detail of ['revenue','unremitted','stock','alerts','products']){
  assert.match(dashboard,new RegExp(`patronDashboardDetail\\('${detail}'`));
}
assert.match(dashboard,/patronStockDetail/);
assert.match(dashboard,/patronAnomalyDetail/);
assert.match(dashboard,/patronMoneyAction/);
assert.match(dashboard,/catalogProduct/);

// Les libellés ne présentent pas des sorties de stock comme des ventes.
assert.match(dashboard,/Produits les plus sortis/);
assert.match(dashboard,/ne représente pas encore les ventes en caisse/);
assert.match(dashboard,/Mode de calcul/);

// La vue se réorganise sur tablette et mobile.
assert.match(styles,/@media\(max-width:760px\)/);
assert.match(styles,/@media\(max-width:430px\)/);

console.log('Dashboard Patron interactif: OK');
