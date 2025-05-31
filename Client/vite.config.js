import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})


// see now we need to make this into vector db as for seaching query and we need to store the data in the same place like normalized data as well as vectorised data 

// use 