import knex, { Knex } from "knex";
import dotenv from "dotenv";
//@ts-ignore
import dbConfig from "../../knexfile";
dotenv.config();

// Interface for database connection with query method
interface DatabaseConnection {
  query: (sql: string, callback: (err: Error | null) => void) => void;
}

let knexInstance: Knex | null = null;
let signalHandlersRegistered = false;

// Graceful shutdown function
const gracefulShutdown = async () => {
  if (knexInstance) {
    console.log("Closing database connection...");
    await knexInstance.destroy();
    knexInstance = null;
  }
};

// Register signal handlers once at module level
if (!signalHandlersRegistered) {
  // Handle process termination signals
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
  process.on("exit", gracefulShutdown);
  signalHandlersRegistered = true;
}

// Health check function to verify connection is alive
async function isConnectionHealthy(instance: Knex): Promise<boolean> {
  try {
    // Simple query to test connection with timeout
    await Promise.race([
      instance.raw("SELECT 1"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Health check timeout")), 5000)
      ),
    ]);
    return true;
  } catch (error) {
    console.error("Database connection health check failed:", error);
    return false;
  }
}

// Create a new Knex instance
function createKnexInstance(): Knex {
  const config = dbConfig[process.env.NODE_ENV || "development"];
  return knex({
    ...config,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false,
      ...config.pool,
      // Add connection setup
      afterCreate: function (
        conn: unknown,
        done: (err: Error | null, conn?: unknown) => void
      ) {
        // Type assertion for database connection
        const connection = conn as DatabaseConnection;

        // Set connection timeout for MySQL/MariaDB
        if (config.client === "mysql" || config.client === "mysql2") {
          connection.query(
            "SET wait_timeout=28800;",
            function (err: Error | null) {
              if (err) {
                console.error("Failed to set connection timeout:", err);
              }
              done(err, conn);
            }
          );
        } else {
          // For other database types, just proceed
          done(null, conn);
        }
      },
    },
  });
}

export default async function getKnex(): Promise<Knex> {
  const maxRetries = 2;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // If no instance exists, create one
      if (!knexInstance) {
        knexInstance = createKnexInstance();
        return knexInstance;
      }

      // Check if existing connection is healthy
      const isHealthy = await isConnectionHealthy(knexInstance);

      if (!isHealthy) {
        console.log(
          `Database connection unhealthy, recreating connection... (attempt ${
            retryCount + 1
          }/${maxRetries})`
        );
        // Destroy the unhealthy connection
        try {
          await knexInstance.destroy();
        } catch (error) {
          console.error("Error destroying unhealthy connection:", error);
        }

        // Create a new instance
        knexInstance = createKnexInstance();

        // Test the new connection
        const newConnectionHealthy = await isConnectionHealthy(knexInstance);
        if (newConnectionHealthy) {
          return knexInstance;
        }
      } else {
        return knexInstance;
      }
    } catch (error) {
      console.error(
        `Failed to get healthy database connection (attempt ${
          retryCount + 1
        }):`,
        error
      );

      // Clean up failed instance
      if (knexInstance) {
        try {
          await knexInstance.destroy();
        } catch (destroyError) {
          console.error("Error destroying failed connection:", destroyError);
        }
        knexInstance = null;
      }
    }

    retryCount++;

    // Wait before retrying (exponential backoff)
    if (retryCount < maxRetries) {
      const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw new Error(
    `Failed to establish healthy database connection after ${maxRetries} attempts`
  );
}

// Synchronous version for backward compatibility (not recommended for new code)
export function getKnexSync(): Knex {
  if (!knexInstance) {
    knexInstance = createKnexInstance();
  }
  return knexInstance;
}

// Export a function to manually close the connection if needed
export async function closeKnex(): Promise<void> {
  if (knexInstance) {
    await knexInstance.destroy();
    knexInstance = null;
  }
}
