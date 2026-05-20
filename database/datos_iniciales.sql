-- ════════════════════════════════════════════════════════════════════════════
-- MAYZER – Datos iniciales v3.0.0
-- SENA Centro de Biotecnología Industrial – Palmira
--
-- Incluye: catálogos, usuarios, instructores, empresas, cursos, lugares,
--          solicitudes, aspirantes (con datos cifrados), grupos, eventos,
--          inscripciones y certificados de ejemplo.
--
-- Contraseña de todos los usuarios de prueba: Admin123
-- Clave de cifrado: mayzer_clave_32_chars_cambiar!!  (ver ENCRYPTION_KEY en .env)
-- ════════════════════════════════════════════════════════════════════════════

USE mayzer_db;

-- ════════════════════════════════════════════════════════════════════════════
-- CATÁLOGOS DE REFERENCIA
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO rol (id, nombre) VALUES
  (1, 'Administrador'),
  (2, 'Instructor'),
  (3, 'Super Usuario');

INSERT INTO solicitud_estado (id, nombre) VALUES
  (1, 'PENDIENTE'), (2, 'EN_REVISION'), (3, 'APROBADA'), (4, 'RECHAZADA');

INSERT INTO aspirante_estado (id, nombre) VALUES
  (1, 'PENDIENTE'), (2, 'PRE_APROBADO'), (3, 'ASIGNADO'), (4, 'RECHAZADO');

INSERT INTO grupo_estado (id, nombre) VALUES
  (1, 'PROGRAMADO'), (2, 'EN_CURSO'), (3, 'FINALIZADO'), (4, 'CANCELADO');

INSERT INTO inscripcion_estado (id, nombre) VALUES
  (1, 'INSCRITO'), (2, 'APROBADO'), (3, 'REPROBADO'), (4, 'RETIRADO');

INSERT INTO correo_tipo (id, nombre) VALUES
  (1, 'APROBACION'), (2, 'RECHAZO'), (3, 'ASIGNACION'),
  (4, 'INFORMACION_CURSO'), (5, 'GENERAL');

-- ════════════════════════════════════════════════════════════════════════════
-- CIUDADES (26 municipios colombianos relevantes)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO ciudad (nombre, departamento) VALUES
  ('Bogotá',           'Cundinamarca'),
  ('Medellín',         'Antioquia'),
  ('Cali',             'Valle del Cauca'),
  ('Barranquilla',     'Atlántico'),
  ('Cartagena',        'Bolívar'),
  ('Palmira',          'Valle del Cauca'),
  ('Bucaramanga',      'Santander'),
  ('Manizales',        'Caldas'),
  ('Pereira',          'Risaralda'),
  ('Santa Marta',      'Magdalena'),
  ('Ibagué',           'Tolima'),
  ('Villavicencio',    'Meta'),
  ('Pasto',            'Nariño'),
  ('Montería',         'Córdoba'),
  ('Neiva',            'Huila'),
  ('Armenia',          'Quindío'),
  ('Popayán',          'Cauca'),
  ('Valledupar',       'Cesar'),
  ('Sincelejo',        'Sucre'),
  ('Tunja',            'Boyacá'),
  ('Buga',             'Valle del Cauca'),
  ('Tuluá',            'Valle del Cauca'),
  ('Cartago',          'Valle del Cauca'),
  ('Yumbo',            'Valle del Cauca'),
  ('Buenaventura',     'Valle del Cauca'),
  ('Guadalajara de Buga', 'Valle del Cauca');

-- ════════════════════════════════════════════════════════════════════════════
-- USUARIOS (contraseña para todos: Admin123)
-- hash bcrypt $2b$12$ de 'Admin123'
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO usuario (nombre_completo, nombre_usuario, email, contrasena_hash, rol_id, activo) VALUES
  ('Maira Administradora SENA',   'maira.admin',       'maira@sena.edu.co',          '$2b$12$/EUW2qwpads7mWgZEh4npeNvGKkM2JsFD.wRA4s1HP7Ql2z1QvzMq', 1, TRUE),
  ('Carlos Instructor Sistemas',  'carlos.instructor', 'carlos.instructor@sena.edu.co', '$2b$12$qlLzEc3aqY933Y.hdL.ihuolIKhGCg7sUEbC3tlDDZboSyqkRqxX6', 2, TRUE),
  ('Super Usuario Sistema',       'super.usuario',     'super@sena.edu.co',           '$2b$12$lpZWRmPKEaqvDOJezs2XJeJTw0EQxjlgQeK23.ezHWmF7hMzbTG3i', 3, TRUE),
  ('Juliana Instructora SENA',    'juliana.instructor','juliana.instructor@sena.edu.co','$2b$12$/EUW2qwpads7mWgZEh4npeNvGKkM2JsFD.wRA4s1HP7Ql2z1QvzMq', 2, TRUE),
  ('Pedro Admin Secundario',      'pedro.admin',       'pedro.admin@sena.edu.co',     '$2b$12$/EUW2qwpads7mWgZEh4npeNvGKkM2JsFD.wRA4s1HP7Ql2z1QvzMq', 1, TRUE);

-- ════════════════════════════════════════════════════════════════════════════
-- INSTRUCTORES
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO instructor (usuario_id, especialidad, experiencia_anios, horas_maximas, telefono, color) VALUES
  (2, 'Análisis y Desarrollo de Software',          8, 40, '3001234567', '#e85d00'),
  (4, 'Seguridad Industrial y Salud en el Trabajo', 6, 40, '3009876543', '#0ea5e9');

-- ════════════════════════════════════════════════════════════════════════════
-- LUGARES
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO lugar (nombre, direccion, capacidad, activo) VALUES
  ('Aula 101 – Bloque A',      'SENA Sede Industrial Palmira, Bloque A, Piso 1',  30, TRUE),
  ('Laboratorio de Sistemas',  'SENA Sede Industrial Palmira, Bloque B, Piso 2',  25, TRUE),
  ('Aula 201 – Bloque B',      'SENA Sede Industrial Palmira, Bloque B, Piso 2',  35, TRUE),
  ('Aula Virtual 1',           'Plataforma Sofia Plus – Acceso remoto',            50, TRUE),
  ('Taller de Mecánica',       'SENA Sede Industrial Palmira, Bloque C',           20, TRUE),
  ('Sala de Conferencias',     'SENA Sede Industrial Palmira, Bloque A, Piso 3',   40, TRUE);

-- ════════════════════════════════════════════════════════════════════════════
-- CURSOS
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO curso (nombre, descripcion, requerimientos_inscripcion, intensidad_horaria, created_by) VALUES
  ('Análisis y Desarrollo de Software',
   'Formación complementaria en programación web, bases de datos y despliegue de aplicaciones orientada a profesionales del sector TI.',
   'Bachiller, mayor de 18 años, conocimientos básicos en informática.', 80, 1),
  ('Seguridad Industrial y Salud en el Trabajo',
   'Normativas colombianas de seguridad laboral, uso correcto de EPP, identificación de riesgos y prevención de accidentes.',
   'Trabajador activo en empresa del sector industrial, mayor de 18 años.', 40, 1),
  ('Manejo de Inventarios y Logística',
   'Gestión de bodegas, control de stock, sistemas de trazabilidad y operaciones de almacén bajo normas nacionales.',
   'Bachiller con experiencia o interés en almacén, logística o cadena de suministro.', 60, 1),
  ('Contabilidad y Finanzas para No Contadores',
   'Conceptos básicos de contabilidad, lectura de estados financieros, manejo de nómina y herramientas de gestión.',
   'Bachiller, manejo básico de Excel.', 50, 1),
  ('Trabajo en Alturas – Nivel Avanzado',
   'Certificación de competencias para trabajo en alturas: normativa, equipos de protección, rescate y primeros auxilios.',
   'Trabajador con certificado básico de alturas vigente, apto médicamente.', 32, 1),
  ('Buenas Prácticas de Manufactura (BPM)',
   'Estándares de higiene, inocuidad y calidad en plantas de producción de alimentos y productos de consumo masivo.',
   'Trabajador en planta de alimentos o manufactura. Bachiller.', 40, 1);

-- ════════════════════════════════════════════════════════════════════════════
-- EMPRESAS (8 empresas del Valle del Cauca + 2 tipos alternativos)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO empresa (nombre, nit, email, telefono, tipo_entidad, nombre_contacto, cargo_contacto, ciudad_id, direccion) VALUES
  ('Industrias Metálicas del Valle S.A.S', '900123456-1', 'contacto@metalicasvalle.com',  '6022345678', 'empresa',
   'Roberto Lozano',   'Gerente RRHH',          6,  'Cra 25 #15-40, Zona Industrial'),
  ('Almacén El Progreso Ltda',             '800456789-2', 'rrhh@elprogreso.com',           '6023456789', 'empresa',
   'Carmen Ríos',      'Coordinadora',           6,  'Cl 30 #20-15, Centro'),
  ('Constructora Palmar S.A',              '900789123-3', 'capacitacion@palmar.com',       '6024567890', 'empresa',
   'Héctor Giraldo',   'Director Proyectos',     3,  'Av 4 Norte #54-20, Cali'),
  ('Grupo SENA – Aprendices TSA 2025',     '890001112-0', 'grupo.tsa@sena.edu.co',         '6025001122', 'grupo SENA',
   'Maira Admin',      'Instructora',            6,  'SENA Sede Industrial Palmira'),
  ('Pedro Ramírez Independiente',          '1091234321',  'pedro.ramirez@gmail.com',       '3045678905', 'persona',
   'Pedro Ramírez',    '',                       6,  'Cl 12 #8-30, Palmira'),
  ('ConstruValle S.A.S',                   '900445566-4', 'rrhh@construvalle.com',         '6026001234', 'empresa',
   'Lucía Fernández',  'Jefe de Recursos Humanos',6, 'Cra 40 #10-55, Zona Industrial'),
  ('Cooperativa Agro del Sur',             '890334455-5', 'formacion@agrodelsur.com',      '6027001234', 'empresa',
   'Hernán Muñoz',     'Coordinador Operativo',  21, 'Vía Panamericana Km 3, Buga'),
  ('Textiles Farallones Ltda',             '900112233-6', 'gestionhumana@farallones.com',  '6028001234', 'empresa',
   'Sofía Arango',     'Gestión Humana',          24, 'Parque Industrial Yumbo'),
  ('Lorena Quintero – Independiente',      '1065877001',  'lorena.quintero@gmail.com',     '3112345670', 'persona',
   'Lorena Quintero',  '',                        6,  'Cl 18 #6-22, Palmira'),
  ('Grupo SENA – Contabilidad 2025',       '890001113-1', 'grupo.cont@sena.edu.co',        '6025001133', 'grupo SENA',
   'Pedro Admin',      'Administrador',           6,  'SENA Sede Industrial Palmira');

-- ════════════════════════════════════════════════════════════════════════════
-- SOLICITUDES (10 solicitudes en distintos estados)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO solicitud (empresa_id, curso_id, num_aspirantes, estado_id, revisado_por, revisado_en) VALUES
  (1,  1, 4, 3, 1, NOW()),   -- 1: Metálicas del Valle → ADS         (APROBADA)
  (2,  2, 4, 3, 1, NOW()),   -- 2: El Progreso → Seguridad Industrial (APROBADA)
  (3,  3, 1, 1, NULL, NULL), -- 3: Constructora Palmar → Logística    (PENDIENTE)
  (4,  1, 1, 2, 1, NOW()),   -- 4: Grupo SENA → ADS                  (EN_REVISION)
  (5,  2, 1, 1, NULL, NULL), -- 5: Pedro Ramírez → Seguridad          (PENDIENTE)
  (6,  5, 3, 3, 1, NOW()),   -- 6: ConstruValle → Alturas             (APROBADA)
  (7,  6, 2, 3, 1, NOW()),   -- 7: Agro del Sur → BPM                (APROBADA)
  (8,  2, 3, 2, 1, NOW()),   -- 8: Textiles Farallones → Seguridad    (EN_REVISION)
  (9,  1, 1, 1, NULL, NULL), -- 9: Lorena Quintero → ADS              (PENDIENTE)
  (10, 4, 3, 3, 1, NOW());   -- 10: Grupo SENA Contabilidad → Contab. (APROBADA)

-- ════════════════════════════════════════════════════════════════════════════
-- ASPIRANTES  (datos personales cifrados con AES-256-CBC)
-- Clave: 'mayzer_clave_32_chars_cambiar!!'
-- Formato VARBINARY: UNHEX('<iv_hex>:<datos_hex>' como UTF-8 en hex)
-- ════════════════════════════════════════════════════════════════════════════

-- ── Solicitud 1 – Industrias Metálicas del Valle (4 aspirantes) ──────────

-- Carlos Andrés Mendez López  |  PRE_APROBADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  1,'Carlos','Andrés','Mendez','López','Carlos Andrés Mendez López','CC',
  UNHEX('66636163646536373736323733613632393265346662363564306161653330313a6439333335333261663932366261363461363135346132656461383333376562'),
  UNHEX('31656265306665393530666438386638633761396632353666343863633766643a31313664326664313537653932643733656133373030376433363732313636393539656239336665376462316565336662656536613366383331393461373935'),
  UNHEX('63373638363966356263383836636665313730663835613039303461333330383a3132373538363232383435343261623538306330623666333233623933643033'),
  '1990-05-12',2,'doc_seed_001.pdf',1,NOW()
);

-- Ana Lucía Torres Reyes  |  ASIGNADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  1,'Ana','Lucía','Torres','Reyes','Ana Lucía Torres Reyes','CC',
  UNHEX('63626638653963626330393361613937353130333333613565383665303534633a3430616139326665623035616464356163376335623933326637646137353530'),
  UNHEX('62613936343239343330653034616530643632373464343065623436303864303a38323462373462653263306432386364316463633836646265623638356138326138376134323462613632363861393431373233336638623763356230393066'),
  UNHEX('38353363653162313337343763386437633563373439656631323231373066613a3164306264356338613735353238653230656266343235646664316439353134'),
  '1995-08-22',3,'doc_seed_002.pdf',1,NOW()
);

-- Sofía Rendón Castillo  |  PRE_APROBADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  1,'Sofía','','Rendón','Castillo','Sofía Rendón Castillo','CC',
  UNHEX('39353166373833663365326163303532343966643638316235386335383833633a3637633439646661336537363038306336633534343633646136643533346639'),
  UNHEX('38343437626166356330336536363938313963616238653666643830623365663a32383537333930663131656434383739396431653263393261643565356631373863336536393234626131336139646438613562363634333636313936373239'),
  UNHEX('64376337373837643965303965333334613835326162373938666261663765383a3137303062343136376235373234373435396430323736636433353935653563'),
  '1993-02-14',2,'doc_seed_s1_03.pdf',1,NOW()
);

-- Miguel Vargas Torres  |  PENDIENTE
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  1,'Miguel','','Vargas','Torres','Miguel Vargas Torres','CC',
  UNHEX('65393866373164623963313731343663343465366166336632666231646336613a3235313239333032633639636239616265336365386339336361373766636362'),
  UNHEX('34383032616536303736323531303934613164633936636362626538316537663a663433653963383738343463326363653134303031346137396239626661306130336539356137316533653333356162663262373730336533343135363731323538336635613539653432366130323637373235373830313139366265373734'),
  UNHEX('38316638666331663232323064306433623637353465303539613736393731353a3630313436663930336165636636313736656363346631626236656436343465'),
  '1998-09-05',1,'doc_seed_s1_04.pdf'
);

-- ── Solicitud 2 – Almacén El Progreso (4 aspirantes) ─────────────────────

-- Lucía María García Muñoz  |  PENDIENTE
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  2,'Lucía','María','García','Muñoz','Lucía María García Muñoz','CC',
  UNHEX('66343533323034663165313230646364373564383931303132663434323530363a3733616535316130353636386330306263616539333237356632336130306234'),
  UNHEX('31333662623232366537633365623536343666303461393336386637356438363a37333730626230326530623339633764646430396562653436353934323564613166636564623033666237396432343432656264613863643865653164353533'),
  UNHEX('62386162616233396531356363323730663866306664633064643730323964343a6664313838633565366536333665356637646265323234363732613865353030'),
  '1988-11-03',1,'doc_seed_003.pdf'
);

-- Juan Pablo Pérez Castro  |  RECHAZADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,motivo_rechazo,decision_por,decision_en) VALUES (
  2,'Juan','Pablo','Pérez','Castro','Juan Pablo Pérez Castro','CC',
  UNHEX('62393262623263303363633461336237383562633732383362346430663439303a3933303463396333333535663538663134663733373239653665323435373430'),
  UNHEX('33636533313933616231383336313861313266663535653938633466323033343a37623730616530356263393663326162373933373066336435363464373766646466613838363931623736306232343636336138346262326161626434346231'),
  UNHEX('34613463663734393935643637343434323434643030353530613563653638363a3936383864376436383437343631643030346362343832376630623631373433'),
  '1992-03-17',4,'doc_seed_004.pdf',
  'Documentación incompleta: no adjuntó carta de autorización del empleador.',1,NOW()
);

-- Diana Ospina Ríos  |  PRE_APROBADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  2,'Diana','','Ospina','Ríos','Diana Ospina Ríos','CC',
  UNHEX('31646366326566306564313938303237303234343335623433336461396339343a3431363565616535343364326362396538636535306565646339353433363662'),
  UNHEX('65653238386533623837646462393732656562353034353262363439653936363a31373035373439353138346238643262616261373833353336346262386662643630626463393463303734656264646431666137306366333562613766363033'),
  UNHEX('30643339663163323236353762376438343039643435383334306264323162323a3734373933653634393633303231656465663865356330643164383961666164'),
  '1991-07-19',2,'doc_seed_s2_03.pdf',1,NOW()
);

-- Luis Bermúdez Prado  |  PENDIENTE
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  2,'Luis','','Bermúdez','Prado','Luis Bermúdez Prado','CC',
  UNHEX('31313964363063313531616466393133383231353565396561343366383335333a6434663039323331383835653764643361306563373133616437663661383435'),
  UNHEX('31323935326638616434393633366661303761616665333730316263373431623a37663633353036343333343032333463396461666538643030653965643135313763396336663431386231633636356238626630376135373264663465343266'),
  UNHEX('34613937323162633835663639303739313461303332363638303830316361613a3534343965663066376165653232633865653063613763323662323265653963'),
  '1987-04-28',1,'doc_seed_s2_04.pdf'
);

-- ── Solicitud 3 – Constructora Palmar (1 aspirante, PENDIENTE) ────────────

INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  3,'Jhon','','Cardona','Mejía','Jhon Cardona Mejía','CC',
  UNHEX('35656236306666353239613063303637333931373765353965616564343964323a3764653561393832303139633335303236373264373762336666333930376166'),
  UNHEX('62663738613937383165323233356435303633646631666662366134366234643a33383933653731653764393166323166646333326331363631646438356363663162373135383539663366373637366164393330383138346265303437393566'),
  UNHEX('63326162383263383965383962363064336166633566623630313636313538633a3766643633623836393537656261373835393938653938626531643034643333'),
  '1996-12-10',1,'doc_seed_s3_01.pdf'
);

-- ── Solicitud 4 – Grupo SENA (1 aspirante, PRE_APROBADO) ─────────────────

INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  4,'Valentina','','Agudelo','Duarte','Valentina Agudelo Duarte','CC',
  UNHEX('39373235313537343739343764623039386139623962323938373364303366303a3065336263653238396433393430396362333833636363656230346337663538'),
  UNHEX('62373437343130373262663630346531393863343235363464386339653965333a36643836616663666336386562343237666431393837303062613836393037666465363137306665313265393564346362353932356361653063313138353262'),
  UNHEX('36343038343662633461626666623438646337316235393264383434343961393a6534646330346639353331373330353731633438346431393336623237636534'),
  '2000-01-15',2,'doc_seed_s4_01.pdf',1,NOW()
);

-- ── Solicitud 5 – Pedro Ramírez Independiente (1 aspirante, PENDIENTE) ───

INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  5,'Pedro','','Ramírez','Ospina','Pedro Ramírez Ospina','CC',
  UNHEX('36646639313336316130393335666438333737666666616437343866303736373a3439643436346632393066616431356534336166666563666663633262366638'),
  UNHEX('31333163313963343461663532613133313238363931373630356436366264623a61633238323563323831656133346464336463613037616133353935633065616261343037666438306131383161326436613830353735636566376463356335'),
  UNHEX('64313739633861396263316162666362356261643062306639333136663237633a3963316433323761323963613830646365613636303134313538633438623464'),
  '1985-07-30',1,'doc_seed_005.pdf'
);

-- ── Solicitud 6 – ConstruValle (3 aspirantes, Trabajo en Alturas) ─────────

-- Andrés Gómez Herrera  |  ASIGNADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  6,'Andrés','','Gómez','Herrera','Andrés Gómez Herrera','CC',
  UNHEX('31656165383638643463336538383264353661313134303162316635336432663a3236313734636136623034653338303932663535613261336264343963633562'),
  UNHEX('30666361613063663832323535353336633564383661323337636662376364363a30363661393663613436613730653433343530626139333337643531653332366336366366396165323738363337303264346536373531346236613765336636'),
  UNHEX('37626539373332313433643064343630366536633861393038313065316438393a3230363166633635346363313431643439353235663135303161393466383630'),
  '1989-06-23',3,'doc_seed_s6_01.pdf',1,NOW()
);

-- Paola Nieto Salazar  |  ASIGNADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  6,'Paola','','Nieto','Salazar','Paola Nieto Salazar','CC',
  UNHEX('62623136663134333439663236343137366236623166623531643865396632653a3738383862363137663339376630333233633530396238646437383035326565'),
  UNHEX('38306633333465666663343666666466333666336236303862373464616163373a62343236383338656635373861663734616666333266303962383036373230333032373132653962663061323833336132323531333861646537646133623531'),
  UNHEX('31666132353531316436663930613363646133303135346336633735353465633a3437643938346130346331653666333935643466316332383365313364393934'),
  '1994-11-08',3,'doc_seed_s6_02.pdf',1,NOW()
);

-- Edgar Mena Ospina  |  PRE_APROBADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  6,'Edgar','','Mena','Ospina','Edgar Mena Ospina','CC',
  UNHEX('63363565393462633136356539616535316138313236303263646135323432303a6563643035373136653264383438303331646234396636663666396262373333'),
  UNHEX('61303230656536613639666337643566616431313665313061666235346637353a34323732623762393437356163663238623431393663396664323038336263346463353563313334306634306637376132643062623532383836393962663065'),
  UNHEX('36313263636664313030363362653737636632363066343765653032663139333a3233343839653434363262333935353565316162626134326634346136346365'),
  '1997-03-31',2,'doc_seed_s6_03.pdf',1,NOW()
);

-- ── Solicitud 7 – Cooperativa Agro del Sur (2 aspirantes, BPM) ───────────

-- Camila Ruiz Montoya  |  ASIGNADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  7,'Camila','','Ruiz','Montoya','Camila Ruiz Montoya','CC',
  UNHEX('38313337366531306266626635613431393133336130636566333539653335343a3162306137383862336536316534376234393738393832626236343337653661'),
  UNHEX('66303264306632376632303436346665316164376532326564633062663662333a30353231376465353439343631383830333435346438333232323262396665383338663232373330653362393231623237656433343064326131333565353738'),
  UNHEX('35643233313437613936336261643035636232303930663364383962353236313a3133653137646332333065343263353832333832313137343063333434633331'),
  '1993-09-17',3,'doc_seed_s7_01.pdf',1,NOW()
);

-- Jorge Salcedo Piedrahita  |  PRE_APROBADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  7,'Jorge','','Salcedo','Piedrahita','Jorge Salcedo Piedrahita','CC',
  UNHEX('33303734616232313562336237386561643738383563636364643333306633303a3731306665346263396433313666613738666435316639343032353864633439'),
  UNHEX('63343136366339326437616361316639626335353931613331626332636436643a62626635316536636363303964316164383435383062626235663933373839366231353438306664646262653636346138346261363566326330363563623832'),
  UNHEX('39353164313233326237343030646530656562386238303735336364343862643a3034663762653035323932653935326137653461396661393463343063313562'),
  '1986-05-25',2,'doc_seed_s7_02.pdf',1,NOW()
);

-- ── Solicitud 8 – Textiles Farallones (3 aspirantes, EN_REVISION) ─────────

-- Natalia López Sánchez  |  PENDIENTE
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  8,'Natalia','','López','Sánchez','Natalia López Sánchez','CC',
  UNHEX('66356230393738626237303330303436643131323633316463623164333531623a3734373966396130356231353866336562366135333837333838663032393130'),
  UNHEX('37306261306638303962633762316462323837326430326166346166363136323a33346434663432646332303561663935653061366139353661346263663031356166363837346238393538653533383032333931356433386466366162366361'),
  UNHEX('62613534316235623030346535623739386332663637653530623231313531633a6433636365363038333738336566363462383431616439643962346134636461'),
  '1999-08-12',1,'doc_seed_s8_01.pdf'
);

-- Carlos Prado Vásquez  |  PENDIENTE
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  8,'Carlos','','Prado','Vásquez','Carlos Prado Vásquez','CC',
  UNHEX('31306466383833333361646531376337313234626230663663326466633733353a3065373737363662616639323664383432653630346261653439313566613238'),
  UNHEX('63613830303430383032343263646636656263393262313266343037393630393a33383062616635653132646161313463323231386432643037306233316163363463376336666566396131343363353765653334646363363339396239333230'),
  UNHEX('61346163626436626236396465343839643736663965313432313264633536323a3636633136646433613833636466303936666131613131613031343636343730'),
  '1991-01-07',1,'doc_seed_s8_02.pdf'
);

-- Andrea Silva Molina  |  PENDIENTE
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  8,'Andrea','','Silva','Molina','Andrea Silva Molina','CC',
  UNHEX('39633164643039356261663530626638646539323735333135353531383461363a3237356137326339666666623935613635353431626635336261303035356534'),
  UNHEX('64303432373936623737653736343866633435373338333361373432313939353a36613862343163366566336563356262373765316239653462343462636336633866316130326563303530633632383336366463346461313136653434353862'),
  UNHEX('32633466613961656263313966663562636562366539396631616363663333323a3430306664646461626134666134303965316666613739646438623435386439'),
  '1997-06-30',1,'doc_seed_s8_03.pdf'
);

-- ── Solicitud 9 – Lorena Quintero Independiente (1 aspirante, PENDIENTE) ──

INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf) VALUES (
  9,'Lorena','','Quintero','Arbeláez','Lorena Quintero Arbeláez','CC',
  UNHEX('39366365306262646333636461616534626531323363316164383038643836303a3264313662373662643232326236396231646335316433373564326430633031'),
  UNHEX('34326263633131323063383032353637643835303737346133323339626632613a38306633386264663939613738366636333739383831666463653762373065616430346538323361306165653961633931393963336664366634306465656565'),
  UNHEX('30663631353264623539313864663335616530663736393466636637313966343a6433316465333266313361356366316234636431623866616163656536376438'),
  '1990-04-14',1,'doc_seed_s9_01.pdf'
);

-- ── Solicitud 10 – Grupo SENA Contabilidad (3 aspirantes) ─────────────────

-- David Cano Lozano  |  ASIGNADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  10,'David','','Cano','Lozano','David Cano Lozano','CC',
  UNHEX('31366134326333646138333535303232626530303665353364316632646333343a3738376331393166353164643233363033333430363936333862636264393334'),
  UNHEX('36376466316338623462323566343730366234303432356339343163333531303a66306464323563306463363130366537323465356631353161316437313763613964363538623465626263363465303737356335363030373564376433303534'),
  UNHEX('63386438623330373461343737666461633563326561626338376436616433303a6537313630303135366163653533646661653136353966626335373631313261'),
  '1995-10-20',3,'doc_seed_s10_01.pdf',1,NOW()
);

-- Sara Reyes Castaño  |  ASIGNADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  10,'Sara','','Reyes','Castaño','Sara Reyes Castaño','CC',
  UNHEX('34353538333637373331623238303731313336323932326439323561316563623a6234343335363932343265623135346138356166623636383032396430646233'),
  UNHEX('66616531313737646331333166643166656461383331393561626139383038363a38306461373166373863343461313139623536306334316438383865336333383838353665363637663634363961393466396133666334366163353565373936'),
  UNHEX('62646639353963666236353836376364393237613563396431323633326665633a3834313131343236313733386166326132353066326463626631353764326261'),
  '1998-03-05',3,'doc_seed_s10_02.pdf',1,NOW()
);

-- Esteban Mora Giraldo  |  PRE_APROBADO
INSERT INTO aspirante (solicitud_id,nombre1,nombre2,apellido1,apellido2,nombre_completo,tipo_documento,numero_documento,email,telefono,fecha_nacimiento,estado_id,documento_pdf,decision_por,decision_en) VALUES (
  10,'Esteban','','Mora','Giraldo','Esteban Mora Giraldo','CC',
  UNHEX('66366339346438323364373265643635393934613566653164386539366636303a6539613438383532386437653235653465633138643337336336626166303664'),
  UNHEX('37383663633533626363306261336162323864613139323465653932623565373a65333031336465663235353064636235373736353434396363313239323062366531346531396562316133653938316530313561393639643935343765346633'),
  UNHEX('32613139613433656563653262623932653937383135633331356161656633393a3438626165373535336335656639646432666136623133616565376566663231'),
  '1993-07-11',2,'doc_seed_s10_03.pdf',1,NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- DATOS MÉDICOS (todos los aspirantes)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO aspirante_medico (aspirante_id, tipo_sangre, eps, arl) VALUES
  -- Sol 1 – Metálicas del Valle
  (1, 'O+',  UNHEX('61653637393830363035346230663938386539653138356462383566663166343a3534393730623461373863343564386332393337313865316538613232646631'), UNHEX('63613331376365303061653461666364623061643263633635356634363936663a6265353439613262313338666564363535366561656634376430333162386537')),
  (2, 'A+',  UNHEX('66343235383238626231356535363530663638373931376365346631646333343a6337323761636439356531306162386236663566396535323135383762366166'), UNHEX('35613837373161643965323534343562623664373434363833346338623830653a3564306463623665663032343033333630373835643438393537643832346530')),
  (3, 'B-',  NULL, NULL),
  (4, 'AB+', NULL, NULL),
  -- Sol 2 – El Progreso
  (5, 'B+',  UNHEX('65626339663066363835613232393036346430333439666339653965626133653a6236393839646162626139313034303863386237303762316232663263636461'), UNHEX('63613331376365303061653461666364623061643263633635356634363936663a6265353439613262313338666564363535366561656634376430333162386537')),
  (6, 'AB-', NULL, NULL),
  (7, 'O+',  NULL, NULL),
  (8, 'A-',  NULL, NULL),
  -- Sol 3 – Constructora
  (9, 'O+',  NULL, NULL),
  -- Sol 4 – Grupo SENA
  (10,'B+',  NULL, NULL),
  -- Sol 5 – Pedro Ramírez
  (11,'O+',  NULL, NULL),
  -- Sol 6 – ConstruValle
  (12,'A+',  NULL, NULL),
  (13,'O-',  NULL, NULL),
  (14,'B+',  NULL, NULL),
  -- Sol 7 – Agro del Sur
  (15,'AB+', NULL, NULL),
  (16,'O+',  NULL, NULL),
  -- Sol 8 – Textiles Farallones
  (17,'A+',  NULL, NULL),
  (18,'B-',  NULL, NULL),
  (19,'O+',  NULL, NULL),
  -- Sol 9 – Lorena Quintero
  (20,'A+',  NULL, NULL),
  -- Sol 10 – Grupo SENA Contabilidad
  (21,'O+',  NULL, NULL),
  (22,'AB+', NULL, NULL),
  (23,'B+',  NULL, NULL);

-- ════════════════════════════════════════════════════════════════════════════
-- CONTACTOS DE EMERGENCIA
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO aspirante_contacto_emergencia (aspirante_id, nombre, telefono) VALUES
  (1,  'María López',          '3109876543'),
  (2,  'Jorge Torres',         '3209876543'),
  (3,  'Hernando Rendón',      '3119876544'),
  (4,  'Consuelo Vargas',      '3129876545'),
  (5,  'Rosa Muñoz',           '3009876543'),
  (6,  'Elena Castro',         '3159876543'),
  (7,  'Ricardo Ospina',       '3189876546'),
  (8,  'Gloria Prado',         '3199876547'),
  (9,  'Felipe Cardona',       '3209876548'),
  (10, 'Marcela Agudelo',      '3219876549'),
  (11, 'Sandra Ospina',        '3049876543'),
  (12, 'Patricia Gómez',       '3139876550'),
  (13, 'Alberto Nieto',        '3149876551'),
  (14, 'Cecilia Mena',         '3159876552'),
  (15, 'Laura Ruiz',           '3169876553'),
  (16, 'Álvaro Salcedo',       '3179876554'),
  (17, 'Beatriz López',        '3189876555'),
  (18, 'Gustavo Prado',        '3199876556'),
  (19, 'Carolina Silva',       '3209876557'),
  (20, 'Rodrigo Quintero',     '3219876558'),
  (21, 'Pilar Cano',           '3229876559'),
  (22, 'Bernardo Reyes',       '3239876560'),
  (23, 'Amparo Mora',          '3249876561');

-- ════════════════════════════════════════════════════════════════════════════
-- DATOS LABORALES
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO aspirante_laboral (aspirante_id, empresa_id, nivel_academico, cargo, area_trabajo, sector, vinculacion) VALUES
  (1,  1,  'Técnico',       'Operario de producción',    'Manufactura',     'Manufactura', 'Contrato término fijo'),
  (2,  1,  'Tecnólogo',     'Auxiliar administrativa',   'Administración',  'Manufactura', 'Contrato término indefinido'),
  (3,  1,  'Bachillerato',  'Ayudante de planta',        'Producción',      'Manufactura', 'Contrato término fijo'),
  (4,  1,  'Bachillerato',  'Mensajero',                 'Logística',       'Manufactura', 'Prestación de servicios'),
  (5,  2,  'Bachillerato',  'Auxiliar de bodega',        'Logística',       'Comercio',    'Contrato término fijo'),
  (6,  2,  'Profesional',   'Supervisor de calidad',     'Calidad',         'Comercio',    'Contrato término indefinido'),
  (7,  2,  'Técnico',       'Cajero',                    'Ventas',          'Comercio',    'Contrato término fijo'),
  (8,  2,  'Tecnólogo',     'Facturadora',               'Administración',  'Comercio',    'Contrato término fijo'),
  (9,  3,  'Profesional',   'Ingeniero residente',       'Construcción',    'Construcción','Contrato término indefinido'),
  (10, 4,  'Tecnólogo',     'Aprendiz SENA',             'Sistemas',        'Educación',   'Contrato de aprendizaje'),
  (11, 5,  'Técnico',       'Independiente',             'Servicios',       'Servicios',   'Prestación de servicios'),
  (12, 6,  'Tecnólogo',     'Maestro de obra',           'Construcción',    'Construcción','Contrato término indefinido'),
  (13, 6,  'Bachillerato',  'Oficial de construcción',   'Construcción',    'Construcción','Contrato término fijo'),
  (14, 6,  'Bachillerato',  'Ayudante de obra',          'Construcción',    'Construcción','Contrato término fijo'),
  (15, 7,  'Técnico',       'Operario de planta',        'Producción',      'Agroindustria','Contrato término indefinido'),
  (16, 7,  'Bachillerato',  'Empacador',                 'Producción',      'Agroindustria','Contrato término fijo'),
  (17, 8,  'Técnico',       'Operario de confección',    'Producción',      'Textil',      'Contrato término fijo'),
  (18, 8,  'Bachillerato',  'Auxiliar de calidad',       'Calidad',         'Textil',      'Contrato término fijo'),
  (19, 8,  'Bachillerato',  'Tinturadora',               'Producción',      'Textil',      'Contrato término fijo'),
  (20, 9,  'Profesional',   'Diseñadora gráfica',        'Comunicaciones',  'Servicios',   'Prestación de servicios'),
  (21, 10, 'Bachillerato',  'Aprendiz SENA',             'Administración',  'Educación',   'Contrato de aprendizaje'),
  (22, 10, 'Técnico',       'Aprendiz SENA',             'Contabilidad',    'Educación',   'Contrato de aprendizaje'),
  (23, 10, 'Tecnólogo',     'Aprendiz SENA',             'Finanzas',        'Educación',   'Contrato de aprendizaje');

-- ════════════════════════════════════════════════════════════════════════════
-- GRUPOS DE FORMACIÓN (6 grupos)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO grupo (codigo, nombre, curso_id, instructor_id, lugar_id, cupo_maximo, estado_id, fecha_inicio, fecha_fin, created_by) VALUES
  (1, 'ADS 2025',                    1, 1, 2, 20, 3, '2025-02-03', '2025-04-30', 1), -- FINALIZADO
  (2, 'Seguridad Industrial 2025',    2, 2, 1, 25, 3, '2025-03-05', '2025-04-16', 1), -- FINALIZADO
  (3, 'Logística y Bodegas 2025',     3, 1, 1, 15, 1, '2025-07-01', '2025-08-29', 1), -- PROGRAMADO
  (4, 'Trabajo en Alturas 2025',      5, 2, 5, 20, 2, '2025-04-14', '2025-05-09', 1), -- EN_CURSO
  (5, 'Buenas Prácticas BPM 2025',    6, 2, 1, 18, 2, '2025-04-21', '2025-05-23', 1), -- EN_CURSO
  (6, 'Contabilidad Básica 2025',     4, 1, 6, 25, 2, '2025-04-07', '2025-05-26', 1); -- EN_CURSO

-- ════════════════════════════════════════════════════════════════════════════
-- HISTORIAL DE ASIGNACIONES INSTRUCTOR↔GRUPO
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO instructor_grupo_historial (instructor_id, grupo_id, asignado_por) VALUES
  (1, 1, 1), (2, 2, 1), (1, 3, 1), (2, 4, 1), (2, 5, 1), (1, 6, 1);

-- ════════════════════════════════════════════════════════════════════════════
-- INSCRIPCIONES
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO inscripcion (aspirante_id, grupo_id, estado_id) VALUES
  -- Grupo 1 – ADS (FINALIZADO): Ana Torres + David Cano + Sara Reyes
  (2,  1, 2),  -- Ana Torres       → APROBADO
  (21, 1, 2),  -- David Cano       → APROBADO
  (22, 1, 2),  -- Sara Reyes       → APROBADO
  -- Grupo 4 – Alturas (EN_CURSO): Andrés Gómez + Paola Nieto
  (12, 4, 1),  -- Andrés Gómez     → INSCRITO
  (13, 4, 1),  -- Paola Nieto      → INSCRITO
  -- Grupo 5 – BPM (EN_CURSO): Camila Ruiz
  (15, 5, 1),  -- Camila Ruiz      → INSCRITO
  -- Grupo 6 – Contabilidad (EN_CURSO): David Cano + Sara Reyes + Valentina
  (10, 6, 1),  -- Valentina Agudelo → INSCRITO
  (21, 6, 1),  -- David Cano       → INSCRITO (también en grupo 1 finalizado)
  (22, 6, 1);  -- Sara Reyes       → INSCRITO

-- ════════════════════════════════════════════════════════════════════════════
-- EVENTOS (clases programadas por grupo)
-- ════════════════════════════════════════════════════════════════════════════

-- Grupo 1 – ADS (FINALIZADO, 8 sesiones)
INSERT INTO evento (grupo_id,titulo,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_id,created_by) VALUES
  (1,'Introducción a la programación web',  '2025-02-03','2025-02-03','08:00','12:00',2,1),
  (1,'Bases de datos relacionales',         '2025-02-10','2025-02-10','08:00','12:00',2,1),
  (1,'Desarrollo frontend con React',       '2025-02-17','2025-02-17','08:00','12:00',2,1),
  (1,'APIs REST con Node.js',               '2025-02-24','2025-02-24','08:00','12:00',2,1),
  (1,'Autenticación JWT y seguridad',       '2025-03-03','2025-03-03','08:00','12:00',2,1),
  (1,'Contenerización con Docker',          '2025-03-10','2025-03-10','08:00','12:00',2,1),
  (1,'Despliegue en la nube',               '2025-03-17','2025-03-17','08:00','12:00',2,1),
  (1,'Proyecto integrador – Presentación',  '2025-03-24','2025-03-24','08:00','12:00',2,1);

-- Grupo 2 – Seguridad Industrial (FINALIZADO, 6 sesiones)
INSERT INTO evento (grupo_id,titulo,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_id,created_by) VALUES
  (2,'Normativa SGSST – Resolución 0312',   '2025-03-05','2025-03-05','14:00','18:00',1,1),
  (2,'Uso y mantenimiento de EPP',          '2025-03-12','2025-03-12','14:00','18:00',1,1),
  (2,'Identificación de peligros y riesgos','2025-03-19','2025-03-19','14:00','18:00',1,1),
  (2,'Plan de emergencias y evacuación',    '2025-03-26','2025-03-26','14:00','18:00',1,1),
  (2,'Primeros auxilios básicos',           '2025-04-02','2025-04-02','14:00','18:00',1,1),
  (2,'Evaluación final y cierre',           '2025-04-16','2025-04-16','14:00','18:00',1,1);

-- Grupo 3 – Logística (PROGRAMADO, 6 sesiones)
INSERT INTO evento (grupo_id,titulo,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_id,created_by) VALUES
  (3,'Introducción a la cadena de suministro','2025-07-01','2025-07-01','08:00','12:00',1,1),
  (3,'Gestión de almacenes y bodegas',         '2025-07-08','2025-07-08','08:00','12:00',1,1),
  (3,'Control de inventarios y stock',         '2025-07-15','2025-07-15','08:00','12:00',1,1),
  (3,'Sistemas de trazabilidad',               '2025-07-22','2025-07-22','08:00','12:00',1,1),
  (3,'Normativa aduanera y transporte',        '2025-07-29','2025-07-29','08:00','12:00',1,1),
  (3,'Proyecto de mejora en bodega',           '2025-08-05','2025-08-05','08:00','12:00',1,1);

-- Grupo 4 – Trabajo en Alturas (EN_CURSO, 5 sesiones)
INSERT INTO evento (grupo_id,titulo,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_id,created_by) VALUES
  (4,'Marco legal – Resolución 4272',           '2025-04-14','2025-04-14','08:00','12:00',5,1),
  (4,'Equipos de protección individual (EPI)',  '2025-04-21','2025-04-21','08:00','12:00',5,1),
  (4,'Técnicas de ascenso y descenso',          '2025-04-28','2025-04-28','08:00','12:00',5,1),
  (4,'Rescate en alturas',                      '2025-05-05','2025-05-05','08:00','12:00',5,1),
  (4,'Evaluación práctica final',               '2025-05-09','2025-05-09','08:00','12:00',5,1);

-- Grupo 5 – BPM (EN_CURSO, 5 sesiones)
INSERT INTO evento (grupo_id,titulo,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_id,created_by) VALUES
  (5,'Introducción a las BPM',                  '2025-04-21','2025-04-21','14:00','18:00',1,1),
  (5,'Higiene personal y de instalaciones',     '2025-04-28','2025-04-28','14:00','18:00',1,1),
  (5,'Control de plagas y agua potable',        '2025-05-05','2025-05-05','14:00','18:00',1,1),
  (5,'Documentación y registros de calidad',    '2025-05-12','2025-05-12','14:00','18:00',1,1),
  (5,'Auditoría interna y cierre',              '2025-05-23','2025-05-23','14:00','18:00',1,1);

-- Grupo 6 – Contabilidad (EN_CURSO, 6 sesiones)
INSERT INTO evento (grupo_id,titulo,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_id,created_by) VALUES
  (6,'Principios de contabilidad básica',       '2025-04-07','2025-04-07','18:00','21:00',6,1),
  (6,'Plan único de cuentas (PUC)',             '2025-04-14','2025-04-14','18:00','21:00',6,1),
  (6,'Estados financieros básicos',             '2025-04-28','2025-04-28','18:00','21:00',6,1),
  (6,'Nómina y prestaciones sociales',          '2025-05-05','2025-05-05','18:00','21:00',6,1),
  (6,'Impuestos: IVA y retenciones',            '2025-05-12','2025-05-12','18:00','21:00',6,1),
  (6,'Herramientas: Excel y software contable', '2025-05-26','2025-05-26','18:00','21:00',6,1);

-- ════════════════════════════════════════════════════════════════════════════
-- CERTIFICADOS (grupo 1 – ADS finalizado: 3 aprobados)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO certificado (inscripcion_id, codigo_certificado, fecha_emision, emitido_por) VALUES
  (1, 'SENA-2025-ADS-0001', '2025-04-30', 1),  -- Ana Torres
  (2, 'SENA-2025-ADS-0002', '2025-04-30', 1),  -- David Cano
  (3, 'SENA-2025-ADS-0003', '2025-04-30', 1);  -- Sara Reyes

-- Nota: la columna color ya está incluida en el INSERT de instructor arriba.
-- Las líneas ALTER TABLE siguientes aplican SOLO a bases existentes sin la columna.

-- ═══════════════════════════════════════════════════════════
-- Migración v1.0.0 definitiva
-- Ejecutar SOLO si la base de datos ya existe (upgrade)
-- ═══════════════════════════════════════════════════════════

-- 1. Columna color en instructor (si no fue aplicada en v1.2.4)
-- ALTER TABLE instructor ADD COLUMN IF NOT EXISTS color VARCHAR(20) NULL DEFAULT NULL;

-- 2. instructor_nombre en eventos: no requiere cambio de schema,
--    el JOIN a usuario se agrega en la query del controller.

-- 3. La función restablecer aspirante usa el estado_id 1 (PENDIENTE)
--    que ya existe en la tabla aspirante_estado. No requiere migración de schema.
