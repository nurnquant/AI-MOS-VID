/** Local-infra defaults shared by the e2e web server and spawned worker. */
export const LOCAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6380",
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  S3_REGION: process.env.S3_REGION ?? "us-east-1",
  S3_BUCKET: process.env.S3_BUCKET ?? "aivs-assets",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "aivs_local",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "aivs_local_secret",
  S3_FORCE_PATH_STYLE: "true",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "aivs_local_auth_secret_change_in_production_0001",
};
