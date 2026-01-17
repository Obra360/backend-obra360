import 'dotenv/config';
import { Pool } from 'pg';

async function testSupabaseConnection() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();
    console.log("✅ Conexión exitosa a Supabase");

    // Prueba una consulta simple
    const result = await client.query('SELECT NOW()');
    console.log("Resultado de la consulta:", result.rows);

    client.release();
  } catch (err) {
    console.error("❌ Error conectando a Supabase:", err);
  } finally {
    process.exit();
  }
}

testSupabaseConnection();