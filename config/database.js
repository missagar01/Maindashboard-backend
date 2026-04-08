const { Pool } = require('pg');
const config = require('./env');
const { logger } = require('../utils/logger.cjs');
const { getLocalPostgresPort, isTunnelActive } = require('./sshTunnel');

let mainPool;
let authPool;


// Function to reset main pool (useful for connection errors)
const resetMainPool = () => {
  if (mainPool) {
    logger.warn('🔄 Resetting main database pool due to connection error');
    mainPool.end().catch(() => {
      // Ignore errors during pool shutdown
    });
    mainPool = null;
  }
};

const shouldUsePostgresTunnel = ({ host, isRDS }) => {
  if (!process.env.SSH_HOST || !isTunnelActive()) {
    return false;
  }

  const tunnelPreference = String(
    process.env.PG_USE_SSH_TUNNEL ||
    process.env.DB_USE_SSH_TUNNEL ||
    ""
  ).toLowerCase();

  if (["true", "1", "yes"].includes(tunnelPreference)) {
    return true;
  }

  if (["false", "0", "no"].includes(tunnelPreference)) {
    return false;
  }

  return Boolean(host) && !isRDS;
};


const buildConnectionOptions = (databaseConfig) => {
  if (config.databaseUrl && databaseConfig === config.postgres) {
    return {
      connectionString: config.databaseUrl,
      ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
    };
  }

  const { host, port, user, password, database, ssl } = databaseConfig;
  if (!host || !user || !database) {
    return null;
  }

  // AWS RDS requires SSL, so enable it automatically for RDS hosts
  const isRDS = host.includes("rds.amazonaws.com");
  const useSSL = isRDS || ssl;

  // Optionally force the shared SSH tunnel even for RDS, which is useful on local
  // environments where direct 5432 access is blocked but the bastion host can reach it.
  const useTunnel = shouldUsePostgresTunnel({ host, isRDS });
  const finalHost = useTunnel ? '127.0.0.1' : host;
  const finalPort = useTunnel ? getLocalPostgresPort() : port;

  if (useTunnel) {
    logger.info(`📡 Database: Using SSH tunnel (localhost:${finalPort}) for ${database}`);
  } else {
    logger.info(`📡 Database: Using direct connection (${finalHost}:${finalPort}) for ${database}${useSSL ? ' (SSL enabled)' : ''}`);
  }

  return {
    host: finalHost,
    port: finalPort,
    user,
    password,
    database,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    // Additional connection options for SSH tunnel stability
    connectionTimeoutMillis: useTunnel ? 30000 : (isRDS ? 20000 : 15000), // Longer timeout for RDS
    idleTimeoutMillis: 30000,
    statement_timeout: 30000,
  };
};

const ensureQcLabSamplesTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS qc_lab_samples (
      id SERIAL PRIMARY KEY,

      sample_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      sms_batch_code VARCHAR(50) NOT NULL,
      furnace_number VARCHAR(50) NOT NULL,
      sequence_code VARCHAR(10) NOT NULL,
      laddle_number INTEGER NOT NULL,
      shift_type VARCHAR(20) NOT NULL,

      final_c NUMERIC(10,4),
      final_mn NUMERIC(10,4),
      final_s NUMERIC(10,4),
      final_p NUMERIC(10,4),

      tested_by VARCHAR(100),
      remarks TEXT,
      report_picture TEXT,
      unique_code VARCHAR(50),

      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await mainPool.query(ddl);
  await mainPool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'qc_lab_samples' AND column_name = 'code'
      ) THEN
        ALTER TABLE qc_lab_samples RENAME COLUMN code TO unique_code;
      END IF;
    END $$;
  `);
  await mainPool.query('ALTER TABLE qc_lab_samples ADD COLUMN IF NOT EXISTS unique_code VARCHAR(50)');
  await mainPool.query('ALTER TABLE qc_lab_samples ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()');
  await mainPool.query('ALTER TABLE qc_lab_samples ALTER COLUMN created_at SET DEFAULT NOW()');
  await mainPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_qc_lab_samples_unique_code ON qc_lab_samples (unique_code)');
  logger.info('Ensured qc_lab_samples table and unique code index exist');
};

const ensureSmsRegisterTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS sms_register (
      id SERIAL PRIMARY KEY,

      sample_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      sequence_number VARCHAR(10),
      laddle_number INTEGER,

      sms_head VARCHAR(150),
      furnace_number VARCHAR(50),

      remarks TEXT,
      picture TEXT,

      shift_incharge VARCHAR(100),
      temperature VARCHAR(50),
      update_link VARCHAR(255),

      unique_code VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await mainPool.query(ddl);
  await mainPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_register_unique_code ON sms_register (unique_code)');
  await mainPool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sms_register' AND column_name = 'temprature'
      ) THEN
        ALTER TABLE sms_register RENAME COLUMN temprature TO temperature;
      END IF;
    END $$;
  `);
  await mainPool.query('ALTER TABLE sms_register ADD COLUMN IF NOT EXISTS picture TEXT');
  await mainPool.query('ALTER TABLE sms_register ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()');
  await mainPool.query('ALTER TABLE sms_register ALTER COLUMN sample_timestamp SET DEFAULT CURRENT_TIMESTAMP');
  await mainPool.query('ALTER TABLE sms_register ADD COLUMN IF NOT EXISTS update_link VARCHAR(255)');
  await mainPool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sms_register' AND column_name = 'temperature'
      ) THEN
        ALTER TABLE sms_register ALTER COLUMN temperature TYPE VARCHAR(50) USING temperature::text;
      ELSE
        ALTER TABLE sms_register ADD COLUMN temperature VARCHAR(50);
      END IF;
    END $$;
  `);
  logger.info('Ensured sms_register table and unique code index exist');
};

const ensureHotCoilTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS hot_coil (
      id SERIAL PRIMARY KEY,
      sample_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      sms_short_code TEXT,
      submission_type TEXT,
      size TEXT,
      mill_incharge TEXT,
      quality_supervisor TEXT,
      picture TEXT,
      electrical_dc_operator TEXT,
      remarks TEXT,
      strand1_temperature TEXT,
      strand2_temperature TEXT,
      shift_supervisor TEXT,
      unique_code TEXT,
      update_link VARCHAR(255)
    )
  `;
  await mainPool.query(ddl);
  await mainPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_hot_coil_unique_code ON hot_coil (unique_code)');
  await mainPool.query('ALTER TABLE hot_coil ADD COLUMN IF NOT EXISTS submission_type TEXT');
  await mainPool.query('ALTER TABLE hot_coil ADD COLUMN IF NOT EXISTS picture TEXT');
  await mainPool.query('ALTER TABLE hot_coil ADD COLUMN IF NOT EXISTS update_link VARCHAR(255)');
  logger.info('Ensured hot_coil table and unique code index exist');
};

const ensurePipeMillTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS pipe_mill (
      id SERIAL PRIMARY KEY,

      sample_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      recoiler_short_code VARCHAR(50) NOT NULL,
      mill_number VARCHAR(100) NOT NULL,
      section VARCHAR(50),
      item_type VARCHAR(50),

      quality_supervisor VARCHAR(100) NOT NULL,
      mill_incharge VARCHAR(100) NOT NULL,
      forman_name VARCHAR(100) NOT NULL,
      fitter_name VARCHAR(100) NOT NULL,

      shift VARCHAR(20) NOT NULL,
      size VARCHAR(50) NOT NULL,
      thickness VARCHAR(30),

      remarks TEXT,
      picture TEXT,

      unique_code VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await mainPool.query(ddl);
  await mainPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_pipe_mill_unique_code ON pipe_mill (unique_code)');
  await mainPool.query('ALTER TABLE pipe_mill ALTER COLUMN sample_timestamp SET DEFAULT CURRENT_TIMESTAMP');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS recoiler_short_code VARCHAR(50)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS mill_number VARCHAR(100)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS quality_supervisor VARCHAR(100)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS mill_incharge VARCHAR(100)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS forman_name VARCHAR(100)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS fitter_name VARCHAR(100)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS shift VARCHAR(20)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS size VARCHAR(50)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS section VARCHAR(50)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS item_type VARCHAR(50)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS thickness VARCHAR(30)');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS remarks TEXT');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS picture TEXT');
  await mainPool.query('ALTER TABLE pipe_mill ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()');
  logger.info('Ensured pipe_mill table and unique code index exist');
};

const ensureReCoilerTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS re_coiler (
      id SERIAL PRIMARY KEY,

      sample_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      hot_coiler_short_code VARCHAR(50) NOT NULL,
      size VARCHAR(50),
      supervisor VARCHAR(100),
      incharge VARCHAR(100),
      contractor VARCHAR(100),
      machine_number VARCHAR(50),
      welder_name VARCHAR(100),

      unique_code VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await mainPool.query(ddl);
  // Allow duplicate unique_code values per requirements; drop legacy unique index if it exists.
  await mainPool.query('DROP INDEX IF EXISTS idx_re_coiler_unique_code');
  await mainPool.query('ALTER TABLE re_coiler ALTER COLUMN sample_timestamp SET DEFAULT CURRENT_TIMESTAMP');
  await mainPool.query('ALTER TABLE re_coiler ADD COLUMN IF NOT EXISTS size VARCHAR(50)');
  await mainPool.query('ALTER TABLE re_coiler ADD COLUMN IF NOT EXISTS supervisor VARCHAR(100)');
  await mainPool.query('ALTER TABLE re_coiler ADD COLUMN IF NOT EXISTS incharge VARCHAR(100)');
  await mainPool.query('ALTER TABLE re_coiler ADD COLUMN IF NOT EXISTS contractor VARCHAR(100)');
  await mainPool.query('ALTER TABLE re_coiler ADD COLUMN IF NOT EXISTS machine_number VARCHAR(50)');
  await mainPool.query('ALTER TABLE re_coiler ADD COLUMN IF NOT EXISTS welder_name VARCHAR(100)');
  await mainPool.query('ALTER TABLE re_coiler ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()');
  await mainPool.query('ALTER TABLE re_coiler ALTER COLUMN unique_code SET NOT NULL');
  logger.info('Ensured re_coiler table and unique code index exist');
};

const ensureTundishChecklistTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS tundish_checklist (
      id SERIAL PRIMARY KEY,

      sample_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      tundish_number INTEGER,

      nozzle_plate_check TEXT,
      well_block_check TEXT,
      board_proper_set TEXT,
      board_sand_filling TEXT,
      refractory_slag_cleaning TEXT,
      tundish_mession_name TEXT,
      handover_proper_check TEXT,
      handover_nozzle_installed TEXT,
      handover_masala_inserted TEXT,
      stand1_mould_operator TEXT,
      stand2_mould_operator TEXT,
      timber_man_name TEXT,
      laddle_operator_name TEXT,
      shift_incharge_name TEXT,
      forman_name TEXT,
      unique_code TEXT
    )
  `;
  await mainPool.query(ddl);
  await mainPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_tundish_checklist_unique_code ON tundish_checklist (unique_code)');
  await mainPool.query('ALTER TABLE tundish_checklist ALTER COLUMN sample_timestamp SET DEFAULT CURRENT_TIMESTAMP');
  await mainPool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tundish_checklist' AND column_name = 'sample_date'
      ) THEN
        ALTER TABLE tundish_checklist DROP COLUMN sample_date;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tundish_checklist' AND column_name = 'sample_time'
      ) THEN
        ALTER TABLE tundish_checklist DROP COLUMN sample_time;
      END IF;
    END $$;
  `);

  await mainPool.query('ALTER TABLE tundish_checklist ALTER COLUMN unique_code SET NOT NULL');
  logger.info('Ensured tundish_checklist table and unique code index exist');
};

const ensureLaddleChecklistTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS laddle_checklist (
      id SERIAL PRIMARY KEY,

      sample_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      sample_date DATE NOT NULL,
      laddle_number INTEGER NOT NULL,

      slag_cleaning_top VARCHAR(50),
      slag_cleaning_bottom VARCHAR(50),
      nozzle_proper_lancing VARCHAR(50),
      pursing_plug_cleaning VARCHAR(50),
      sly_gate_check VARCHAR(50),
      nozzle_check_cleaning VARCHAR(50),
      sly_gate_operate VARCHAR(50),
      nfc_proper_heat VARCHAR(50),
      nfc_filling_nozzle VARCHAR(50),

      plate_life INTEGER,

      timber_man_name VARCHAR(100),
      laddle_man_name VARCHAR(100),
      laddle_foreman_name VARCHAR(100),
      supervisor_name VARCHAR(100),

      unique_code VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await mainPool.query(ddl);
  await mainPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_laddle_checklist_unique_code ON laddle_checklist (unique_code)');
  await mainPool.query('ALTER TABLE laddle_checklist ALTER COLUMN sample_timestamp SET DEFAULT CURRENT_TIMESTAMP');
  await mainPool.query('ALTER TABLE laddle_checklist ALTER COLUMN sample_date TYPE DATE USING sample_date::date');
  await mainPool.query('ALTER TABLE laddle_checklist ALTER COLUMN sample_date SET NOT NULL');
  await mainPool.query('ALTER TABLE laddle_checklist ALTER COLUMN laddle_number TYPE INTEGER USING laddle_number::integer');
  await mainPool.query('ALTER TABLE laddle_checklist ALTER COLUMN laddle_number SET NOT NULL');
  await mainPool.query('ALTER TABLE laddle_checklist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()');
  await mainPool.query('ALTER TABLE laddle_checklist ALTER COLUMN unique_code SET NOT NULL');
  logger.info('Ensured laddle_checklist table and unique code index exist');
};


const ensureLaddleReturnTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS laddle_return (
      id SERIAL PRIMARY KEY,

      sample_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      laddle_return_date DATE NOT NULL,
      laddle_return_time TIME NOT NULL,

      poring_temperature VARCHAR(100),
      poring_temperature_photo TEXT,

      furnace_shift_incharge VARCHAR(100),
      furnace_crane_driver VARCHAR(100),

      ccm_temperature_before_pursing VARCHAR(100),
      ccm_temp_before_pursing_photo TEXT,
      ccm_temp_after_pursing_photo TEXT,

      ccm_crane_driver VARCHAR(100),
      stand1_mould_operator VARCHAR(100),
      stand2_mould_operator VARCHAR(100),

      shift_incharge VARCHAR(100),
      timber_man VARCHAR(100),
      operation_incharge VARCHAR(100),

      laddle_return_reason TEXT,
      unique_code VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await mainPool.query(ddl);
  await mainPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_laddle_return_unique_code ON laddle_return (unique_code)');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN sample_timestamp SET DEFAULT CURRENT_TIMESTAMP');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN laddle_return_date TYPE DATE USING laddle_return_date::date');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN laddle_return_date SET NOT NULL');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN laddle_return_time TYPE TIME USING laddle_return_time::time');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN laddle_return_time SET NOT NULL');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN poring_temperature TYPE VARCHAR(100)');
  await mainPool.query('ALTER TABLE laddle_return ADD COLUMN IF NOT EXISTS poring_temperature_photo TEXT');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN ccm_temperature_before_pursing TYPE VARCHAR(100)');
  await mainPool.query('ALTER TABLE laddle_return ADD COLUMN IF NOT EXISTS ccm_temp_before_pursing_photo TEXT');
  await mainPool.query('ALTER TABLE laddle_return ADD COLUMN IF NOT EXISTS ccm_temp_after_pursing_photo TEXT');
  await mainPool.query('ALTER TABLE laddle_return ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN unique_code TYPE VARCHAR(20)');
  await mainPool.query('ALTER TABLE laddle_return ALTER COLUMN unique_code SET NOT NULL');
  const nullableColumns = [
    'furnace_shift_incharge',
    'furnace_crane_driver',
    'ccm_crane_driver',
    'stand1_mould_operator',
    'stand2_mould_operator',
    'shift_incharge',
    'timber_man',
    'operation_incharge',
    'laddle_return_reason'
  ];
  for (const column of nullableColumns) {
    await mainPool.query(`ALTER TABLE laddle_return ALTER COLUMN ${column} DROP NOT NULL`);
  }
  logger.info('Ensured laddle_return table and unique code index exist');
};

const ensureLoginTable = async () => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS login (
      id BIGSERIAL PRIMARY KEY,
      create_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      user_name VARCHAR(150) NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(50),
      user_id VARCHAR(50),
      email VARCHAR(200),
      number VARCHAR(20),
      department VARCHAR(100),
      give_by VARCHAR(150),
      status VARCHAR(20) DEFAULT 'ACTIVE',
      user_acess VARCHAR(200),
      employee_id VARCHAR(50),
      createdate TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updatedate TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await mainPool.query(ddl);
  await mainPool.query(`
    CREATE OR REPLACE FUNCTION trigger_set_updatedate()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updatedate = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await mainPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_login_updatedate'
      ) THEN
        CREATE TRIGGER trg_login_updatedate
        BEFORE UPDATE ON login
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_updatedate();
      END IF;
    END $$;
  `);
  logger.info('Ensured login table exists');
};

const ensureAuthUsersTable = async () => {
  if (!authPool) {
    return;
  }
  const ddl = `
    CREATE TABLE IF NOT EXISTS public.users (
      id BIGSERIAL PRIMARY KEY,
      user_name VARCHAR(150) UNIQUE,
      username VARCHAR(150),
      employee_id VARCHAR(150),
      password TEXT,
      password_hash TEXT,
      role VARCHAR(50) DEFAULT 'user',
      status VARCHAR(50) DEFAULT 'active',
      user_status VARCHAR(50) DEFAULT 'active',
      email_id VARCHAR(200),
      number VARCHAR(20),
      department VARCHAR(100),
      given_by VARCHAR(255),
      user_access TEXT,
      page_access TEXT,
      system_access TEXT,
      profile_img TEXT,
      store_access TEXT,
      session_token TEXT,
      remark TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await authPool.query(ddl);

  /* 
  // Check if id column is BIGINT (not auto-increment) and convert to BIGSERIAL
  try {
    const colCheck = await authPool.query(\`
      SELECT 
        data_type,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'id'
    \`);

    if (colCheck.rows.length > 0) {
      const colInfo = colCheck.rows[0];
      // If id is BIGINT without a default (not auto-increment), convert it
      if (colInfo.data_type === 'bigint' && !colInfo.column_default) {
        console.log('Converting id column from BIGINT to BIGSERIAL (auto-increment)...');

        // Create sequence if it doesn't exist
        await authPool.query(\`
          CREATE SEQUENCE IF NOT EXISTS users_id_seq;
        \`);

        // Set the sequence to start from max(id) + 1
        const maxIdResult = await authPool.query(\`
          SELECT COALESCE(MAX(id), 0) as max_id FROM public.users
        \`);
        const maxId = parseInt(maxIdResult.rows[0].max_id) || 0;

        await authPool.query(\`
          SELECT setval('users_id_seq', \${maxId + 1}, false);
        \`);

        // Alter the column to use the sequence as default
        // await authPool.query(\`
        //   ALTER TABLE public.users 
        //   ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
        // \`);

        console.log('✅ Successfully converted id column to auto-increment');
      } else if (colInfo.data_type === 'bigint' && colInfo.column_default) {
        // Already has a default, just ensure sequence is set correctly
        const maxIdResult = await authPool.query(\`
          SELECT COALESCE(MAX(id), 0) as max_id FROM public.users
        \`);
        const maxId = parseInt(maxIdResult.rows[0].max_id) || 0;

        await authPool.query(\`
          CREATE SEQUENCE IF NOT EXISTS users_id_seq;
          SELECT setval('users_id_seq', \${maxId + 1}, false);
        \`);
      }
    }
  } catch (alterErr) {
    console.warn('Could not alter id column to auto-increment:', alterErr.message);
  }
  */

  /*
  // Ensure the sequence exists and is properly set up for auto-increment (for new tables)
  try {
    const seqCheck = await authPool.query(\`
      SELECT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'users_id_seq'
      )
    \`);

    if (!seqCheck.rows[0].exists) {
      // Create sequence if it doesn't exist
      await authPool.query(\`
        CREATE SEQUENCE IF NOT EXISTS users_id_seq;
        SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM public.users), 1), true);
      \`);
    } else {
      // Ensure the sequence is linked to the column and set to correct value
      const maxIdResult = await authPool.query(\`
        SELECT COALESCE(MAX(id), 0) as max_id FROM public.users
      \`);
      const maxId = parseInt(maxIdResult.rows[0].max_id) || 0;

      await authPool.query(\`
        SELECT setval('users_id_seq', \${maxId + 1}, false);
      \`);
    }
  } catch (seqErr) {
    console.warn('Could not set up users_id_seq sequence:', seqErr.message);
  }
  */

  await authPool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_name ON public.users (user_name)');

  // Drop existing employee_id index if it exists (with CASCADE to handle dependencies)
  try {
    await authPool.query('DROP INDEX IF EXISTS public.idx_users_employee_id CASCADE');
  } catch (err) {
    // Ignore errors if index doesn't exist
    console.log('Note: Could not drop idx_users_employee_id (may not exist):', err.message);
  }

  // Clean up duplicate non-NULL employee_id values before creating unique index
  try {
    await authPool.query(`
      UPDATE public.users u1
      SET employee_id = NULL
      WHERE employee_id IS NOT NULL
        AND employee_id IN (
          SELECT employee_id
          FROM public.users u2
          WHERE u2.employee_id IS NOT NULL
            AND u2.id < u1.id
        )
    `);
  } catch (err) {
    console.warn('Could not clean up duplicate employee_id values:', err.message);
  }

  // Create partial unique index for employee_id (only when NOT NULL)
  try {
    await authPool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_id
      ON public.users (employee_id)
      WHERE employee_id IS NOT NULL
    `);
  } catch (err) {
    // If index creation fails, check if it already exists with correct definition
    if (err.code === '42P07' || err.code === '23505') {
      console.log('Index idx_users_employee_id already exists or has duplicates');
      // Try to drop and recreate
      try {
        await authPool.query('DROP INDEX IF EXISTS public.idx_users_employee_id CASCADE');
        await authPool.query(`
          CREATE UNIQUE INDEX idx_users_employee_id
          ON public.users (employee_id)
          WHERE employee_id IS NOT NULL
        `);
      } catch (retryErr) {
        console.warn('Could not recreate idx_users_employee_id index:', retryErr.message);
      }
    } else {
      console.warn('Could not create idx_users_employee_id index:', err.message);
    }
  }

  // Ensure created_at has DEFAULT NOW() if it exists
  try {
    await authPool.query(`
      ALTER TABLE public.users 
      ALTER COLUMN created_at SET DEFAULT NOW();
    `);
  } catch (err) {
    // Column might not exist yet, that's okay
    console.log('Note: Could not set created_at default (may not exist yet):', err.message);
  }

  // Add missing columns if they don't exist (for existing tables)
  const columnsToAdd = [
    { name: 'status', type: 'VARCHAR(50)', hasDefault: true, defaultValue: 'active' },
    { name: 'number', type: 'VARCHAR(20)', hasDefault: false },
    { name: 'department', type: 'VARCHAR(100)', hasDefault: false },
    { name: 'given_by', type: 'VARCHAR(255)', hasDefault: false },
    { name: 'user_access', type: 'TEXT', hasDefault: false },
    { name: 'page_access', type: 'TEXT', hasDefault: false },
    { name: 'system_access', type: 'TEXT', hasDefault: false },
    { name: 'profile_img', type: 'TEXT', hasDefault: false },
    { name: 'store_access', type: 'TEXT', hasDefault: false },
    { name: 'session_token', type: 'TEXT', hasDefault: false },
    { name: 'remark', type: 'TEXT', hasDefault: false },
    { name: 'created_at', type: 'TIMESTAMPTZ', hasDefault: true, defaultValue: 'NOW()' },
  ];

  for (const column of columnsToAdd) {
    try {
      // Check if column exists
      const checkResult = await authPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = $1
      `, [column.name]);

      if (checkResult.rows.length === 0) {
        // Column doesn't exist, add it
        let alterQuery = `ALTER TABLE public.users ADD COLUMN ${column.name} ${column.type}`;
        if (column.hasDefault && column.defaultValue) {
          if (column.defaultValue === 'NOW()') {
            alterQuery += ` DEFAULT NOW()`;
          } else {
            alterQuery += ` DEFAULT '${column.defaultValue}'`;
          }
        }
        await authPool.query(alterQuery);
        logger.info(`Added missing column '${column.name}' to users table`);
      } else if (column.name === 'created_at') {
        // Ensure created_at has DEFAULT NOW()
        try {
          await authPool.query(`ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT NOW()`);
          logger.info(`Ensured 'created_at' column has DEFAULT NOW()`);
        } catch (alterErr) {
          logger.warn(`Could not set created_at default:`, alterErr.message);
        }
      } else if (column.name === 'given_by') {
        // Check if given_by column exists but has wrong size, update it to VARCHAR(255)
        const colInfo = await authPool.query(`
          SELECT character_maximum_length 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'given_by'
        `);

        if (colInfo.rows.length > 0) {
          const currentSize = colInfo.rows[0].character_maximum_length;
          if (currentSize && currentSize < 255) {
            await authPool.query(`ALTER TABLE public.users ALTER COLUMN given_by TYPE VARCHAR(255)`);
            logger.info(`Updated 'given_by' column size to VARCHAR(255)`);
          }
        }
      }
    } catch (err) {
      logger.error(`Could not add column ${column.name} to users table:`, err.message);
      // Don't throw - continue with other columns
    }
  }

  logger.info('Ensured auth users table exists with all required columns');
};

const connectDatabase = async () => {
  if (mainPool) {
    return mainPool;
  }

  const options = buildConnectionOptions(config.postgres);
  if (!options) {
    logger.warn('Database configuration missing. Skipping main database connection.');
    return null;
  }

  // Retry connection with exponential backoff
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      mainPool = new Pool({
        ...options,
        connectionTimeoutMillis: options.connectionTimeoutMillis || 30000,
        idleTimeoutMillis: options.idleTimeoutMillis || 30000,
        max: 10,
        // Additional options for stability
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });

      mainPool.on('error', (error) => {
        logger.error('Unexpected PostgreSQL client error', error);
        // Reset pool on error to force reconnection
        if (error.message.includes('terminated') || error.message.includes('Connection terminated')) {
          logger.warn('⚠️ Connection terminated, resetting pool');
          resetMainPool();
        }
      });

      // Handle connection errors
      mainPool.on('connect', (client) => {
        client.on('error', (err) => {
          logger.error('PostgreSQL client connection error:', err.message);
          // Reset pool on client connection errors
          if (err.message.includes('terminated') || err.message.includes('Connection terminated')) {
            resetMainPool();
          }
        });
      });

      // Test connection with longer timeout for SSH tunnel
      const testTimeout = process.env.SSH_HOST ? 30000 : 15000;
      await Promise.race([
        mainPool.query('SELECT 1'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), testTimeout)
        )
      ]);

      logger.info('Main database connection established');

      await ensureQcLabSamplesTable();
      await ensureSmsRegisterTable();
      await ensureHotCoilTable();
      await ensurePipeMillTable();
      await ensureReCoilerTable();
      await ensureTundishChecklistTable();
      await ensureLaddleChecklistTable();
      await ensureLaddleReturnTable();
      await ensureLoginTable();
      return mainPool;
    } catch (error) {
      lastError = error;
      const errorMsg = error.message || 'Unknown error';
      logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed:`, errorMsg);

      if (mainPool) {
        try {
          await mainPool.end();
        } catch (e) {
          // Ignore cleanup errors
        }
        mainPool = null;
      }

      if (attempt < maxRetries) {
        // Longer delay for SSH tunnel connections
        const baseDelay = process.env.SSH_HOST ? 2000 : 1000;
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('Database connection failed after all retries', lastError);
  throw lastError;
};

const connectAuthDatabase = async () => {
  if (authPool) {
    return authPool;
  }

  const options = buildConnectionOptions(config.authDatabase);
  if (!options) {
    logger.warn('Auth database configuration missing. Skipping auth database connection.');
    return null;
  }

  // Retry connection with exponential backoff
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      authPool = new Pool({
        ...options,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10,
      });

      authPool.on('error', (error) => {
        logger.error('Unexpected PostgreSQL auth client error', error);
      });

      // Test connection with timeout
      await Promise.race([
        authPool.query('SELECT 1'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);

      logger.info('Auth database connection established');
      await ensureAuthUsersTable();
      return authPool;
    } catch (error) {
      lastError = error;
      logger.warn(`Auth database connection attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (authPool) {
        try {
          await authPool.end();
        } catch (e) {
          // Ignore cleanup errors
        }
        authPool = null;
      }

      if (attempt < maxRetries) {
        // Longer delay for SSH tunnel connections
        const baseDelay = process.env.SSH_HOST ? 2000 : 1000;
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('Auth database connection failed after all retries', lastError);
  throw lastError;
};

const getPool = () => {
  if (!mainPool) {
    // Try to build connection options and create pool synchronously
    // This handles cases where connectDatabase() hasn't been called yet
    const options = buildConnectionOptions(config.postgres);
    if (options) {
      // Log connection details for debugging (without password)
      logger.info(`🔌 Creating database pool: ${options.user}@${options.host}:${options.port}/${options.database}`);

      mainPool = new Pool({
        ...options,
        connectionTimeoutMillis: options.connectionTimeoutMillis || 30000,
        idleTimeoutMillis: options.idleTimeoutMillis || 30000,
        max: 10,
        // Additional options for stability
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });

      mainPool.on('error', (error) => {
        logger.error('Unexpected PostgreSQL client error', error);
        // Reset pool on error to force reconnection
        if (error.message.includes('terminated') || error.message.includes('Connection terminated')) {
          logger.warn('⚠️ Connection terminated, resetting pool');
          resetMainPool();
        }
      });

      // Handle connection errors
      mainPool.on('connect', (client) => {
        client.on('error', (err) => {
          logger.error('PostgreSQL client connection error:', err.message);
          // Reset pool on client connection errors
          if (err.message.includes('terminated') || err.message.includes('Connection terminated')) {
            resetMainPool();
          }
        });
      });

      logger.warn('⚠️ Database pool created on-demand. Consider calling connectDatabase() during server startup.');
    } else {
      const missing = [];
      if (!config.postgres.host) missing.push('DB_HOST');
      if (!config.postgres.user) missing.push('DB_USER');
      if (!config.postgres.database) missing.push('DB_NAME');
      throw new Error(`Database has not been initialized. Missing: ${missing.join(', ')}. Check your .env file.`);
    }
  }
  return mainPool;
};

const getAuthPool = () => {
  if (!authPool) {
    throw new Error('Auth database has not been initialized. Call connectAuthDatabase() first.');
  }
  return authPool;
};

module.exports = { connectDatabase, getPool, connectAuthDatabase, getAuthPool, resetMainPool };
