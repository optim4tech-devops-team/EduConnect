import pg from 'pg';
import { config } from './lib/config.mjs';

const { Client } = pg;

export async function getLatestOtp(identifier) {
  const client = new Client({ connectionString: config.databaseUrl });
  await client.connect();

  try {
    const result = await client.query(
      `
        SELECT "Code"
        FROM "OtpCodes"
        WHERE "Identifier" = $1
        ORDER BY "CreatedAt" DESC
        LIMIT 1
      `,
      [identifier],
    );

    if (result.rowCount === 0) {
      throw new Error(`No OTP found for ${identifier}`);
    }

    return result.rows[0].Code || result.rows[0].code;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const identifier = process.argv[2];

  if (!identifier) {
    console.error('Usage: node ./scripts/get-latest-otp.mjs <phone>');
    process.exit(1);
  }

  getLatestOtp(identifier)
    .then((otp) => console.log(otp))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
