import { app } from "./app";
import { env } from "./config/env";
import { ROLES } from "./config/constantes";
import { cerrarConexion, verificarConexion, pool } from "./data/base-datos";
import { hashearPassword } from "./utils/contrasenas";

const DESCRIPCION_ROLES: Record<string, string> = {
  [ROLES.ADMINISTRADOR]: "Gestiona usuarios, roles y consulta la auditoría",
  [ROLES.MEDICO]: "Registra y gestiona órdenes médicas",
  [ROLES.ENFERMERO_JEFE]: "Revisa órdenes y asigna enfermeros a las aplicaciones",
  [ROLES.ENFERMERO]: "Registra la administración de medicamentos",
  [ROLES.FARMACEUTICO]: "Gestiona lotes y dispensaciones",
};

const VIAS = [
  "Oral",
  "Intravenosa",
  "Intramuscular",
  "Subcutánea",
  "Tópica",
  "Inhalatoria",
  "Sublingual",
  "Rectal",
];

async function asegurarBaseDeDatos(): Promise<void> {
  for (const nombre of Object.values(ROLES)) {
    await pool.query(
      `INSERT INTO roles (nombre, descripcion)
       VALUES ($1, $2)
       ON CONFLICT (nombre) DO NOTHING`,
      [nombre, DESCRIPCION_ROLES[nombre]]
    );
  }

  for (const via of VIAS) {
    await pool.query(
      `INSERT INTO via_administracion (nombre)
       VALUES ($1)
       ON CONFLICT (nombre) DO NOTHING`,
      [via]
    );
  }

  const existente = await pool.query(
    `SELECT 1 FROM usuarios WHERE correo = $1`,
    [env.adminInicial.correo]
  );

  if (existente.rowCount === 0) {
    const rol = await pool.query(
      `SELECT id_rol FROM roles WHERE nombre = $1`,
      [ROLES.ADMINISTRADOR]
    );

    if (rol.rows.length > 0) {
      await pool.query(
        `INSERT INTO usuarios (id_rol, tipo_documento, documento, nombres, apellidos, correo, password_hash)
         VALUES ($1, 'CC', '0000000000', 'Administrador', 'SIGAM', $2, $3)
         ON CONFLICT (correo) DO NOTHING`,
        [
          rol.rows[0].id_rol,
          env.adminInicial.correo,
          await hashearPassword(env.adminInicial.password),
        ]
      );
    }
  }
}

async function iniciar(): Promise<void> {
  await verificarConexion();
  console.log(`✔ Conectado a la base de datos "${env.baseDatos.nombre}"`);

  await asegurarBaseDeDatos();
  console.log(`✔ Datos iniciales y usuario administrador listos en la base de datos.`);

  const puertoFinal = process.env.PORT || env.puerto || 10000;

  const servidor = app.listen(Number(puertoFinal), "0.0.0.0", () => {
    console.log(`✔ SIGAM API escuchando en el puerto ${puertoFinal}`);
  });

  const apagar = (senal: string) => {
    console.log(`\n${senal} recibido, cerrando...`);
    servidor.close(async () => {
      await cerrarConexion();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => apagar("SIGINT"));
  process.on("SIGTERM", () => apagar("SIGTERM"));
}

iniciar().catch((error) => {
  console.error("✖ No se pudo iniciar el servidor:", error.message ?? error);
  process.exit(1);
});