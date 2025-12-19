import { pool } from "./connection";
import dotenv from "dotenv";

dotenv.config();

// Helper function to create index if it doesn't exist (MySQL doesn't support IF NOT EXISTS for indexes)
async function createIndexIfNotExists(
  tableName: string,
  indexName: string,
  columns: string
) {
  try {
    await pool.query(`CREATE INDEX ${indexName} ON ${tableName}(${columns})`);
    console.log(`  ✓ Created index: ${indexName}`);
  } catch (error: any) {
    // If index already exists, MySQL will throw an error - that's okay, just ignore it
    if (error.code === "ER_DUP_KEYNAME" || error.errno === 1061) {
      console.log(`  - Index already exists: ${indexName}`);
    } else {
      // For other errors, log but don't fail
      console.log(`  - Could not create index ${indexName}: ${error.message}`);
    }
  }
}

async function migrate() {
  try {
    console.log("Running migrations...");

    // Create conversations table
    console.log("Creating conversations table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id CHAR(36) PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("  ✓ conversations table created");

    // Create messages table
    console.log("Creating messages table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id CHAR(36) PRIMARY KEY,
        conversation_id CHAR(36) NOT NULL,
        sender ENUM('user', 'ai') NOT NULL,
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);
    console.log("  ✓ messages table created");

    // Create indexes
    console.log("Creating indexes...");
    await createIndexIfNotExists(
      "messages",
      "idx_messages_conversation_id",
      "conversation_id"
    );
    await createIndexIfNotExists(
      "messages",
      "idx_messages_timestamp",
      "timestamp"
    );
    await createIndexIfNotExists(
      "conversations",
      "idx_conversations_session_id",
      "session_id"
    );

    console.log("\n✓ Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

migrate();
