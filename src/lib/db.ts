import mysql from 'mysql2/promise';

// Database configuration - Production ready
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'epms_system',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '100'),
  queueLimit: 50,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  // Note: acquireTimeout removed - deprecated in mysql2
  idleTimeout: 60000,
  maxIdle: 10,
};

// Create connection pool
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// Execute query helper
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results as T;
  } finally {
    connection.release();
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export default { getPool, query, testConnection };
