-- BD: restaurante_ordenes_db
-- === Maestros ===
CREATE TABLE IF NOT EXISTS clientes (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  email      VARCHAR(120) UNIQUE NOT NULL,
  telefono   VARCHAR(50)  NOT NULL,
  contrasena VARCHAR(200) NOT NULL   -- guarda HASH (bcrypt), no texto plano
);

CREATE TABLE IF NOT EXISTS ordenes (
  id           SERIAL PRIMARY KEY,
  plato_nombre VARCHAR(150) NOT NULL,
  notas        TEXT,
  estado       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  creado_en    TIMESTAMP DEFAULT NOW()
);

-- === Relación cliente <-> orden (1:N) ===
CREATE TABLE IF NOT EXISTS cliente_ordenes (
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  orden_id   INT NOT NULL REFERENCES ordenes(id)  ON DELETE CASCADE,
  PRIMARY KEY (cliente_id, orden_id),
  CONSTRAINT unico_cliente_por_orden UNIQUE (orden_id)  -- cada orden pertenece a 1 cliente
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
