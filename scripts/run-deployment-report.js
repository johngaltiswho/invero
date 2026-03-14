const fs = require('fs');
const { execSync } = require('child_process');

// Read .env.local
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const envVars = {};

  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
      process.env[key] = value;
    }
  });

  console.log('Environment loaded successfully');
  console.log('Running deployment report...\n');

  // Run the TypeScript script
  execSync('npx tsx scripts/fetch-deployment-data.ts', {
    stdio: 'inherit',
    env: { ...process.env, ...envVars }
  });
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
