import { app } from "./app";
import { env } from "./config/env";
import { cerrarConexion, verificarConexion, pool } from "./data/base-datos";
import bcrypt from "bcryptjs";

async function asegurarBaseDeDatos() {
  // Crear tabla de usuarios y medicamentos si no existen
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id_usuario SERIAL PRIMARY KEY,
      correo VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      rol VARCHAR(50) NOT NULL DEFAULT 'Administrador',
      estado BOOLEAN DEFAULT true
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS medicamentos (
      id_medicamento SERIAL PRIMARY KEY,
      codigo_cums VARCHAR(100) UNIQUE NOT NULL,
      tipo_medicamento VARCHAR(100) NOT NULL,
      nombre_generico VARCHAR(255) NOT NULL,
      nombre_comercial VARCHAR(255),
      stock_minimo INTEGER NOT NULL DEFAULT 0,
      es_controlado BOOLEAN DEFAULT false,
      estado BOOLEAN DEFAULT true
    );
  `);

  // Insertar usuario administrador por defecto si no existe
  const adminPasswordHash = await bcrypt.hash(env.admin.password, 10);
  await pool.query(`
    INSERT INTO usuarios (correo, password, rol, estado)
    VALUES ($1, $2, 'Administrador', true)
    ON CONFLICT (correo) DO NOTHING;
  `, [env.admin.correo, adminPasswordHash]);
}

async function iniciar(): Promise<void> {
  await verificarConexion();
  console.log(`✔ Conectado a la base de datos "${env.baseDatos.nombre}"`);

  // Asegurar tablas y datos iniciales automáticamente
  await asegurarBaseDeDatos();
  console.log(`✔ Tablas y usuario administrador listos en la base de datos.`);

  const servidor = app.listen(Number(env.puerto), '0.0.0.0', () => {
    console.log(`✔ SIGAM API escuchando en puerto ${env.puerto}`);
  });
  // ... resto del código de cierre
}