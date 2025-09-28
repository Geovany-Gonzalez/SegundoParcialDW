-- BD: restaurante_ordenes_db

-- ===================
-- Maestros
-- ===================
CREATE TABLE IF NOT EXISTS clientes (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  email     VARCHAR(120) UNIQUE NOT NULL,
  telefono  VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS ordenes (
  id            SERIAL PRIMARY KEY,
  plato_nombre  VARCHAR(150) NOT NULL,
  notas         TEXT,
  estado        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  creado_en     TIMESTAMP DEFAULT NOW()
);

-- ===================
-- Relación (cliente <-> orden)
-- 1:N (una orden pertenece a un cliente)
-- ===================
CREATE TABLE IF NOT EXISTS cliente_ordenes (
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  orden_id   INT NOT NULL REFERENCES ordenes(id)  ON DELETE CASCADE,
  PRIMARY KEY (cliente_id, orden_id),
  CONSTRAINT unico_cliente_por_orden UNIQUE (orden_id)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_estado ON ordenes(estado);

-- ====== Vistas de apoyo (opcionales) ======
-- Vista que ya “une” para consultas simples
CREATE OR REPLACE VIEW v_ordenes_por_cliente AS
SELECT o.id, co.cliente_id, o.plato_nombre, o.notas, o.estado, o.creado_en
FROM ordenes o
JOIN cliente_ordenes co ON co.orden_id = o.id
ORDER BY o.id DESC;
