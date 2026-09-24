-- TJ Manufaktur: Produktverwaltung
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL UNIQUE,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
  variants_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  personalization_label TEXT NOT NULL DEFAULT '',
  personalization_placeholder TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  unlimited_stock INTEGER NOT NULL DEFAULT 0 CHECK(unlimited_stock IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_active_sort ON products(active,sort_order);

INSERT OR IGNORE INTO products(product_id,sku,name,description,category,price_cents,variants_json,tags_json,personalization_label,personalization_placeholder,stock,unlimited_stock,active,sort_order) VALUES
('p1','TJ-P1','Blumenstecker','Personalisierter Blumenstecker aus 3 mm Holz für Sträuße, Geschenke und besondere Anlässe.','Floristik & Hochzeit',590,'["Birke natur","Pappel natur"]','["3 mm Holz","personalisierbar"]','Text / Name','z. B. Für dich',0,1,1,10),
('p2','TJ-P2','Namens- & Tischschild','Individuelles Tischschild mit passendem Standfuß für Hochzeit, Taufe, Geburtstag und Events.','Hochzeit & Event',790,'["Birke natur","Pappel natur"]','["mit Standfuß","Lasergravur"]','Name','z. B. Sophie',0,1,1,20),
('p3','TJ-P3','Geschenkanhänger','Gravierter Anhänger für Blumen, Geschenkboxen und persönliche Botschaften.','Geschenk & Floristik',390,'["Standard 55 × 70 mm","Mini 40 × 50 mm"]','["mit Loch","Wunschtext"]','Text','z. B. Alles Liebe',0,1,1,30),
('p4','TJ-P4','Cake Topper','Personalisierter Cake Topper mit Namen, Datum oder Anlass und zwei stabilen Spitzen.','Hochzeit & Geburtstag',1290,'["Hochzeit","Geburtstag","Eigener Anlass"]','["ca. 150 mm","personalisierbar"]','Wunschtext','z. B. Lena & Tim',0,1,1,40),
('p5','TJ-P5','Schlüsselanhänger','Individueller Schlüsselanhänger mit Wunschtext.','Personalisierte Geschenke',690,'["Holz natur","Holz dunkel"]','["personalisierbar"]','Text / Name','z. B. Tizian',0,1,1,50);
