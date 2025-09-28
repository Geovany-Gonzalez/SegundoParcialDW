-- BD: restaurante_ordenes_db (crearla en Render o local)
-- Tablas:

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre   VARCHAR(100) NOT NULL,
  email    VARCHAR(120) UNIQUE NOT NULL,
  telefono VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  cliente_id   INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  plato_nombre VARCHAR(150) NOT NULL,
  notas        TEXT,
  estado       VARCHAR(20) NOT NULL DEFAULT 'pending',
  creado_en    TIMESTAMP DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON ordenes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado  ON ordenes(estado);

-- Consultas que usa la API (referencia):
-- Registrar cliente
--  INSERT INTO clientes (nombre,email,telefono) VALUES ($1,$2,$3)
-- Login simulado
--  SELECT id,nombre,email,telefono FROM clientes WHERE email=$1 AND telefono=$2
-- Nueva orden
--  INSERT INTO ordenes (cliente_id,plato_nombre,notas) VALUES ($1,$2,$3)
-- Listar órdenes de un cliente
--  SELECT id,plato_nombre,notas,estado,creado_en FROM ordenes WHERE cliente_id=$1 ORDER BY id DESC
-- Actualizar estado de orden
--  UPDATE ordenes SET estado=$1 WHERE id=$2
