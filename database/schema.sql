-- ════════════════════════════════════════════════════════════════════════════
-- MAYZER – Schema v3.0.0
-- SENA Centro de Biotecnología Industrial – Palmira
-- Motor: MySQL 8.0+ / MariaDB 10.6+  |  Charset: utf8mb4
--
-- Este archivo es la definición completa y limpia de la base de datos.
-- No depende de ningún archivo de migración externo.
-- Para inicializar: mysql -u root -p < schema.sql
-- ════════════════════════════════════════════════════════════════════════════

DROP DATABASE IF EXISTS mayzer_db;

CREATE DATABASE mayzer_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mayzer_db;

-- ── Tablas de catálogo (sin FKs entre sí) ────────────────────────────────

CREATE TABLE ciudad (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  departamento VARCHAR(100) NOT NULL,
  pais         VARCHAR(100) NOT NULL DEFAULT 'Colombia',
  UNIQUE KEY uq_ciudad (nombre, departamento, pais)
) ENGINE=InnoDB COMMENT='Catálogo de municipios colombianos';

CREATE TABLE rol (
  id     TINYINT UNSIGNED PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB COMMENT='Roles de usuario del sistema';

CREATE TABLE solicitud_estado (
  id     TINYINT UNSIGNED PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB COMMENT='Estados del ciclo de vida de una solicitud';

CREATE TABLE aspirante_estado (
  id     TINYINT UNSIGNED PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB COMMENT='Estados del proceso de un aspirante';

CREATE TABLE grupo_estado (
  id     TINYINT UNSIGNED PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB COMMENT='Estados del ciclo de vida de un grupo de formación';

CREATE TABLE inscripcion_estado (
  id     TINYINT UNSIGNED PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB COMMENT='Estados de una inscripción aspirante↔grupo';

CREATE TABLE correo_tipo (
  id     TINYINT UNSIGNED PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB COMMENT='Tipos de correo electrónico gestionados por el sistema';

-- ── Usuarios y autenticación ─────────────────────────────────────────────

CREATE TABLE usuario (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_completo   VARCHAR(150) NOT NULL,
  nombre_usuario    VARCHAR(100) NOT NULL UNIQUE,
  email             VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash   VARCHAR(255) NOT NULL,
  rol_id            TINYINT UNSIGNED NOT NULL,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  intentos_fallidos INT     NOT NULL DEFAULT 0,
  bloqueado_hasta   DATETIME NULL,
  ultimo_login      DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES rol(id),
  INDEX idx_usuario_rol (rol_id)
) ENGINE=InnoDB COMMENT='Cuentas de acceso al panel de administración';

CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expira_en   DATETIME NOT NULL,
  revocado    BOOLEAN NOT NULL DEFAULT FALSE,
  ip_origen   VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  INDEX idx_refresh_usuario (usuario_id),
  INDEX idx_refresh_expira  (expira_en)
) ENGINE=InnoDB COMMENT='Tokens de refresco JWT para sesiones persistentes';

-- ── Infraestructura ───────────────────────────────────────────────────────

CREATE TABLE lugar (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(200) NOT NULL,
  direccion VARCHAR(200),
  capacidad INT,
  activo    BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB COMMENT='Aulas, laboratorios y espacios físicos de formación';

-- ── Entidades de negocio core ─────────────────────────────────────────────

CREATE TABLE empresa (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  nit             VARCHAR(50)  NOT NULL UNIQUE,
  direccion       VARCHAR(200),
  telefono        VARCHAR(50),
  tipo_entidad    ENUM('empresa','grupo SENA','persona') NOT NULL DEFAULT 'empresa',
  email           VARCHAR(150) NOT NULL,
  nombre_contacto VARCHAR(100),
  cargo_contacto  VARCHAR(100),
  ciudad_id       INT UNSIGNED NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL,
  FOREIGN KEY (ciudad_id) REFERENCES ciudad(id),
  INDEX idx_empresa_nombre  (nombre),
  INDEX idx_empresa_ciudad  (ciudad_id),
  INDEX idx_empresa_deleted (deleted_at)
) ENGINE=InnoDB COMMENT='Empresas, grupos SENA y personas que solicitan formación';

CREATE TABLE instructor (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id        BIGINT UNSIGNED NOT NULL UNIQUE,
  especialidad      VARCHAR(150),
  experiencia_anios INT  NOT NULL DEFAULT 0,
  horas_maximas     INT  NOT NULL DEFAULT 40,
  telefono          VARCHAR(50),
  color             VARCHAR(20) NULL DEFAULT NULL,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  INDEX idx_instructor_activo (activo, deleted_at)
) ENGINE=InnoDB COMMENT='Perfil extendido de instructores vinculados a usuario';

CREATE TABLE curso (
  id                         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre                     VARCHAR(150) NOT NULL,
  descripcion                TEXT,
  requerimientos_inscripcion TEXT,
  intensidad_horaria         INT  NOT NULL,
  certificable               BOOLEAN NOT NULL DEFAULT TRUE,
  activo                     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by                 BIGINT UNSIGNED NOT NULL,
  created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at                 TIMESTAMP NULL,
  FOREIGN KEY (created_by) REFERENCES usuario(id),
  INDEX idx_curso_activo     (activo, deleted_at),
  INDEX idx_curso_created_by (created_by)
) ENGINE=InnoDB COMMENT='Catálogo de cursos de formación complementaria';

-- ── Solicitudes y aspirantes ──────────────────────────────────────────────

CREATE TABLE solicitud (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa_id      BIGINT UNSIGNED      NOT NULL,
  curso_id        BIGINT UNSIGNED      NOT NULL,
  num_aspirantes  INT                  NOT NULL,
  observaciones   TEXT,
  estado_id       TINYINT UNSIGNED     NOT NULL,
  motivo_rechazo  TEXT NULL,
  revisado_por    BIGINT UNSIGNED NULL,
  revisado_en     DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL,
  FOREIGN KEY (empresa_id)  REFERENCES empresa(id),
  FOREIGN KEY (curso_id)    REFERENCES curso(id),
  FOREIGN KEY (estado_id)   REFERENCES solicitud_estado(id),
  FOREIGN KEY (revisado_por) REFERENCES usuario(id),
  INDEX idx_solicitud_estado          (estado_id),
  INDEX idx_solicitud_empresa         (empresa_id),
  INDEX idx_solicitud_curso           (curso_id),
  INDEX idx_solicitud_created         (created_at),
  INDEX idx_solicitud_deleted_created (deleted_at, created_at)
) ENGINE=InnoDB COMMENT='Solicitudes de formación enviadas por empresas/personas';

CREATE TABLE aspirante (
  id               BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  solicitud_id     BIGINT UNSIGNED  NOT NULL,
  nombre1          VARCHAR(100)     NOT NULL,
  nombre2          VARCHAR(100)     NOT NULL DEFAULT '',
  apellido1        VARCHAR(100)     NOT NULL,
  apellido2        VARCHAR(100)     NOT NULL DEFAULT '',
  nombre_completo  VARCHAR(150)     NOT NULL,
  tipo_documento   VARCHAR(10)      NOT NULL DEFAULT 'CC',
  numero_documento VARBINARY(255)   NOT NULL,
  email            VARBINARY(255)   NOT NULL,
  telefono         VARBINARY(255)   NOT NULL,
  fecha_nacimiento DATE             NOT NULL,
  estado_id        TINYINT UNSIGNED NOT NULL,
  documento_pdf    VARCHAR(255)     NOT NULL,
  motivo_rechazo   TEXT NULL,
  decision_por     BIGINT UNSIGNED NULL,
  decision_en      DATETIME NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitud(id) ON DELETE CASCADE,
  FOREIGN KEY (estado_id)    REFERENCES aspirante_estado(id),
  FOREIGN KEY (decision_por) REFERENCES usuario(id),
  INDEX idx_aspirante_estado          (estado_id),
  INDEX idx_aspirante_solicitud       (solicitud_id),
  INDEX idx_aspirante_created         (created_at),
  INDEX idx_aspirante_estado_created  (estado_id, created_at)
) ENGINE=InnoDB COMMENT='Personas que aplican a un curso a través de una solicitud';

CREATE TABLE aspirante_medico (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aspirante_id BIGINT UNSIGNED NOT NULL UNIQUE,
  tipo_sangre  VARCHAR(5),
  eps          VARBINARY(255),
  arl          VARBINARY(255),
  antecedentes VARBINARY(1000),
  medicamentos VARBINARY(1000),
  FOREIGN KEY (aspirante_id) REFERENCES aspirante(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Información médica cifrada del aspirante';

CREATE TABLE aspirante_contacto_emergencia (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aspirante_id         BIGINT UNSIGNED NOT NULL,
  nombre               VARCHAR(150)    NOT NULL,
  telefono             VARCHAR(50)     NOT NULL,
  telefono_emergencia2 VARCHAR(50),
  telefono_emergencia3 VARCHAR(50),
  FOREIGN KEY (aspirante_id) REFERENCES aspirante(id) ON DELETE CASCADE,
  INDEX idx_contacto_aspirante (aspirante_id)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC COMMENT='Contactos de emergencia del aspirante';

CREATE TABLE aspirante_laboral (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aspirante_id     BIGINT UNSIGNED NOT NULL UNIQUE,
  empresa_id       BIGINT UNSIGNED NULL,
  nivel_academico  VARCHAR(50)  NOT NULL,
  cargo            VARCHAR(150),
  area_trabajo     VARCHAR(100),
  sector           VARCHAR(100),
  vinculacion      VARCHAR(50),
  FOREIGN KEY (aspirante_id) REFERENCES aspirante(id) ON DELETE CASCADE,
  FOREIGN KEY (empresa_id)   REFERENCES empresa(id),
  INDEX idx_laboral_empresa (empresa_id)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC COMMENT='Información laboral y académica del aspirante';

-- ── Grupos de formación y eventos ─────────────────────────────────────────

CREATE TABLE grupo (
  id            BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  codigo        SMALLINT UNSIGNED NOT NULL,
  nombre        VARCHAR(200)     NOT NULL,
  curso_id      BIGINT UNSIGNED  NOT NULL,
  instructor_id BIGINT UNSIGNED  NOT NULL,
  lugar_id      BIGINT UNSIGNED,
  cupo_maximo   INT              NOT NULL DEFAULT 30,
  estado_id     TINYINT UNSIGNED NOT NULL,
  fecha_inicio  DATE             NOT NULL,
  fecha_fin     DATE             NOT NULL,
  observaciones TEXT,
  created_by    BIGINT UNSIGNED  NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (curso_id)      REFERENCES curso(id),
  FOREIGN KEY (instructor_id) REFERENCES instructor(id),
  FOREIGN KEY (lugar_id)      REFERENCES lugar(id),
  FOREIGN KEY (estado_id)     REFERENCES grupo_estado(id),
  FOREIGN KEY (created_by)    REFERENCES usuario(id),
  CONSTRAINT chk_grupo_fechas CHECK (fecha_fin >= fecha_inicio),
  INDEX idx_grupo_curso         (curso_id),
  INDEX idx_grupo_instructor    (instructor_id),
  INDEX idx_grupo_estado        (estado_id),
  INDEX idx_grupo_fecha_inicio  (fecha_inicio),
  INDEX idx_grupo_deleted_fecha (deleted_at, fecha_inicio)
) ENGINE=InnoDB COMMENT='Grupos de formación con instructor y cupo asignado';

CREATE TABLE instructor_grupo_historial (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  instructor_id    BIGINT UNSIGNED NOT NULL,
  grupo_id         BIGINT UNSIGNED NOT NULL,
  fecha_asignacion DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  asignado_por     BIGINT UNSIGNED NULL,
  nota             TEXT NULL,
  FOREIGN KEY (instructor_id) REFERENCES instructor(id) ON DELETE CASCADE,
  FOREIGN KEY (grupo_id)      REFERENCES grupo(id)      ON DELETE CASCADE,
  FOREIGN KEY (asignado_por)  REFERENCES usuario(id)    ON DELETE SET NULL,
  UNIQUE KEY uq_inst_grupo (instructor_id, grupo_id),
  INDEX idx_hist_instructor (instructor_id),
  INDEX idx_hist_grupo      (grupo_id),
  INDEX idx_hist_fecha      (fecha_asignacion)
) ENGINE=InnoDB COMMENT='Trazabilidad de asignaciones instructor↔grupo';

CREATE TABLE inscripcion (
  id           BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  aspirante_id BIGINT UNSIGNED  NOT NULL,
  grupo_id     BIGINT UNSIGNED  NOT NULL,
  estado_id    TINYINT UNSIGNED NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_aspirante_grupo (aspirante_id, grupo_id),
  FOREIGN KEY (aspirante_id) REFERENCES aspirante(id) ON DELETE CASCADE,
  FOREIGN KEY (grupo_id)     REFERENCES grupo(id)     ON DELETE CASCADE,
  FOREIGN KEY (estado_id)    REFERENCES inscripcion_estado(id),
  INDEX idx_inscripcion_grupo  (grupo_id),
  INDEX idx_inscripcion_estado (estado_id)
) ENGINE=InnoDB COMMENT='Relación aspirante inscrito en un grupo';

CREATE TABLE evento (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grupo_id     BIGINT UNSIGNED NOT NULL,
  titulo       VARCHAR(200)    NOT NULL,
  fecha_inicio DATE            NOT NULL,
  fecha_fin    DATE            NOT NULL,
  hora_inicio  TIME            NOT NULL,
  hora_fin     TIME            NOT NULL,
  lugar_id     BIGINT UNSIGNED,
  observaciones TEXT,
  created_by   BIGINT UNSIGNED NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (grupo_id)   REFERENCES grupo(id) ON DELETE CASCADE,
  FOREIGN KEY (lugar_id)   REFERENCES lugar(id),
  FOREIGN KEY (created_by) REFERENCES usuario(id),
  CONSTRAINT chk_evento_fechas CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT chk_evento_horas  CHECK (hora_fin  > hora_inicio),
  INDEX idx_evento_grupo       (grupo_id),
  INDEX idx_evento_fecha_inicio (fecha_inicio)
) ENGINE=InnoDB COMMENT='Clases y sesiones programadas dentro de un grupo';

-- ── Certificados ──────────────────────────────────────────────────────────

CREATE TABLE certificado (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inscripcion_id       BIGINT UNSIGNED NOT NULL UNIQUE,
  codigo_certificado   VARCHAR(100)    NOT NULL UNIQUE,
  fecha_emision        DATE            NOT NULL,
  emitido_por          BIGINT UNSIGNED NOT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inscripcion_id) REFERENCES inscripcion(id) ON DELETE CASCADE,
  FOREIGN KEY (emitido_por)    REFERENCES usuario(id),
  INDEX idx_certificado_codigo (codigo_certificado)
) ENGINE=InnoDB COMMENT='Certificados de aprobación emitidos a aspirantes';

-- ── Trazabilidad y comunicaciones ─────────────────────────────────────────

CREATE TABLE correo_log (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aspirante_id BIGINT UNSIGNED NULL,
  empresa_id   BIGINT UNSIGNED NULL,
  enviado_por  BIGINT UNSIGNED NULL,
  tipo_id      TINYINT UNSIGNED NOT NULL,
  destinatario VARCHAR(200)     NOT NULL,
  asunto       VARCHAR(300)     NOT NULL,
  cuerpo       TEXT             NOT NULL,
  estado       VARCHAR(20)      NOT NULL,
  error_msg    TEXT NULL,
  enviado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (aspirante_id) REFERENCES aspirante(id) ON DELETE SET NULL,
  FOREIGN KEY (empresa_id)   REFERENCES empresa(id)   ON DELETE SET NULL,
  FOREIGN KEY (enviado_por)  REFERENCES usuario(id)   ON DELETE SET NULL,
  FOREIGN KEY (tipo_id)      REFERENCES correo_tipo(id),
  INDEX idx_correo_aspirante (aspirante_id),
  INDEX idx_correo_enviado   (enviado_en)
) ENGINE=InnoDB COMMENT='Registro de correos electrónicos enviados por el sistema';

CREATE TABLE auditoria_log (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tabla         VARCHAR(80)  NOT NULL,
  operacion     VARCHAR(20)  NOT NULL,
  registro_id   BIGINT NULL,
  usuario_id    BIGINT UNSIGNED NULL,
  dato_antes    JSON NULL,
  dato_despues  JSON NULL,
  ip_origen     VARCHAR(45),
  user_agent    TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL,
  INDEX idx_auditoria_tabla    (tabla),
  INDEX idx_auditoria_usuario  (usuario_id),
  INDEX idx_auditoria_created  (created_at)
) ENGINE=InnoDB COMMENT='Log de auditoría de cambios sobre entidades clave';
