import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.RENDER ? { rejectUnauthorized: false } : false
});

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// POST /clientes/registrar
app.post('/clientes/registrar', async (req, res) => {
  try {
    const { nombre, email, telefono } = req.body;
    if (!nombre || !email || !telefono)
      return res.status(400).json({ error: 'Faltan campos' });

    const exists = await pool.query('SELECT 1 FROM clientes WHERE email=$1', [email]);
    if (exists.rowCount > 0)
      return res.status(409).json({ error: 'Email ya registrado' });

    const { rows } = await pool.query(
      'INSERT INTO clientes (nombre,email,telefono) VALUES ($1,$2,$3) RETURNING id,nombre,email,telefono',
      [nombre, email, telefono]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

// POST /clientes/login (email + telefono)
app.post('/clientes/login', async (req, res) => {
  try {
    const { email, telefono } = req.body;
    const { rows } = await pool.query(
      'SELECT id,nombre,email,telefono FROM clientes WHERE email=$1 AND telefono=$2',
      [email, telefono]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

// POST /ordenes (crear pedido)
app.post('/ordenes', async (req, res) => {
  try {
    const { cliente_id, plato_nombre, notas } = req.body;
    if (!cliente_id || !plato_nombre)
      return res.status(400).json({ error: 'Faltan campos' });

    const { rows } = await pool.query(
      `INSERT INTO ordenes (cliente_id,plato_nombre,notas)
       VALUES ($1,$2,$3)
       RETURNING id,cliente_id,plato_nombre,notas,estado,creado_en`,
      [cliente_id, plato_nombre, notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

// GET /ordenes/:clienteId (listar)
app.get('/ordenes/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { rows } = await pool.query(
      `SELECT id,plato_nombre,notas,estado,creado_en
       FROM ordenes
       WHERE cliente_id=$1
       ORDER BY id DESC`,
      [clienteId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

// PUT /ordenes/:id/estado  (pending -> preparing -> delivered)
app.put('/ordenes/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const valid = ['pending', 'preparing', 'delivered'];
    if (!valid.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    const { rows } = await pool.query(
      `UPDATE ordenes SET estado=$1 WHERE id=$2
       RETURNING id,cliente_id,plato_nombre,notas,estado,creado_en`,
      [estado, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No existe la orden' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

// Servir frontend
app.get('*', (req, res) => {
  res.sendFile(new URL('./public/index.html', import.meta.url));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API escuchando en puerto ${PORT}`));
