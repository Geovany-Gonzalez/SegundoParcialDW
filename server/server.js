import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.RENDER ? { rejectUnauthorized: false } : false
});

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Registrar cliente (hash de contraseña)
app.post('/clientes/registrar', async (req, res) => {
  try {
    const { nombre, email, telefono, contrasena } = req.body;
    if (!nombre || !email || !telefono || !contrasena)
      return res.status(400).json({ error: 'Faltan campos' });

    const exists = await pool.query('SELECT 1 FROM clientes WHERE email=$1', [email]);
    if (exists.rowCount) return res.status(409).json({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(contrasena, 10);
    const { rows } = await pool.query(
      `INSERT INTO clientes (nombre,email,telefono,contrasena)
       VALUES ($1,$2,$3,$4)
       RETURNING id,nombre,email,telefono`,
      [nombre, email, telefono, hash]
    );
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error servidor' }); }
});

// Login (email + contraseña)
app.post('/clientes/login', async (req, res) => {
  try {
    const { email, contrasena } = req.body;
    const { rows } = await pool.query(
      'SELECT id,nombre,email,telefono,contrasena FROM clientes WHERE email=$1', [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(contrasena || '', rows[0].contrasena || '');
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const { contrasena: _, ...safe } = rows[0];
    res.json(safe);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error servidor' }); }
});

// Crear orden (ordenes + cliente_ordenes)
app.post('/ordenes', async (req, res) => {
  const client = await pool.connect();
  try {
    const { cliente_id, plato_nombre, notas } = req.body;
    if (!cliente_id || !plato_nombre)
      return res.status(400).json({ error: 'Faltan campos' });

    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO ordenes (plato_nombre, notas)
       VALUES ($1,$2)
       RETURNING id, plato_nombre, notas, estado, creado_en`,
      [plato_nombre, notas || null]
    );
    await client.query(
      'INSERT INTO cliente_ordenes (cliente_id, orden_id) VALUES ($1,$2)',
      [cliente_id, ins.rows[0].id]
    );
    await client.query('COMMIT');
    res.status(201).json({ ...ins.rows[0], cliente_id });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  } finally {
    client.release();
  }
});

// Listar órdenes por cliente
app.get('/ordenes/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { rows } = await pool.query(
      `SELECT o.id, o.plato_nombre, o.notas, o.estado, o.creado_en
       FROM ordenes o
       JOIN cliente_ordenes co ON co.orden_id = o.id
       WHERE co.cliente_id = $1
       ORDER BY o.id DESC`,
      [clienteId]
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error servidor' }); }
});

// Cambiar estado
app.put('/ordenes/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const valid = ['pending','preparing','delivered'];
    if (!valid.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    const { rows } = await pool.query(
      `UPDATE ordenes SET estado=$1 WHERE id=$2
       RETURNING id, plato_nombre, notas, estado, creado_en`,
      [estado, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe la orden' });
    res.json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error servidor' }); }
});

// Frontend
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API escuchando en puerto ${PORT}`));
