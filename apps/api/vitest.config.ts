import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Every test stubs its own dependencies; nothing here may reach Supabase,
    // an RPC or the network. A test that needs those is not a unit test.
    env: {
      SUPABASE_URL: 'http://stub.invalid',
      SUPABASE_KEY: 'stub',
      HD_WALLET_MNEMONIC:
        'test test test test test test test test test test test junk',
      BACKEND_PRIVATE_KEY:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    },
  },
});
