import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    env: {
      DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
    },
  },
})
