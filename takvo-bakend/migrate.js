const { Client } = require('pg');
const fs = require('fs');

const connectionString = 'postgresql://postgres.cusokfbmkfnezrzimhvm:benicio20252@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrateRubros() {
  const rubros = JSON.parse(fs.readFileSync('rubros.json', 'utf8'));
  for (const rubro of rubros) {
    await client.query(
      `INSERT INTO rubros (id, nombre) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [rubro.id, rubro.nombre]
    );
  }
  console.log("Rubros migrados.");
}

async function migratePaises() {
  const paises = JSON.parse(fs.readFileSync('paises.json', 'utf8'));
  for (const pais of paises) {
    await client.query(
      `INSERT INTO paises (id, nombre) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [pais.id, pais.nombre]
    );

    for (const provincia of pais.provincias) {
      await client.query(
        `INSERT INTO provincias (id, nombre, pais_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [provincia.id, provincia.nombre, pais.id]
      );

      for (const ciudad of provincia.ciudades) {
        await client.query(
          `INSERT INTO ciudades (id, nombre, provincia_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
          [ciudad.id, ciudad.nombre, provincia.id]
        );
      }
    }
  }
  console.log("Países, provincias y ciudades migrados.");
}

async function migrateNegocios() {
  const negocios = JSON.parse(fs.readFileSync('negocios.json', 'utf8'));
  for (const negocio of negocios) {
    await client.query(
      `INSERT INTO negocios (id, nombre, telefono, rubro_id, enviado, pais_id, provincia_id, ciudad_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        negocio.id,
        negocio.nombre,
        negocio.telefono,
        negocio.rubro_id,   // ojo, debe existir en rubros.json
        negocio.enviado,
        negocio.pais,
        negocio.provincia,
        negocio.ciudad
      ]
    );
  }
  console.log("Negocios migrados.");
}

async function migrateData() {
  try {
    await client.connect();
    console.log("Conectado a la base de datos.");

    await migrateRubros();
    await migratePaises();
    await migrateNegocios();

    console.log("Migración completada exitosamente.");
  } catch (err) {
    console.error("Error durante la migración:", err);
  } finally {
    await client.end();
    console.log("Desconectado de la base de datos.");
  }
}

migrateData();
