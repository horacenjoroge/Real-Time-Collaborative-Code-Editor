import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'collab_editor',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err: Error) => {
  console.error('❌ Database connection error:', err);
});

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  try {
    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        language VARCHAR(50) NOT NULL DEFAULT 'plaintext',
        content TEXT NOT NULL DEFAULT '',
        created_by UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      );
    `);

    // Create document_users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_users (
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
        last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (document_id, user_id)
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
      CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
      CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_document_users_user_id ON document_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_document_users_document_id ON document_users(document_id);
    `);

    // Create function for updating updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
      CREATE TRIGGER update_documents_updated_at
        BEFORE UPDATE ON documents
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    throw error;
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
