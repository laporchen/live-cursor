// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  ssr: false,
  nitro: {
    prerender: {
      autoSubfolderIndex: false
    }
  },
  runtimeConfig: {
    public: {
      wsUrl: ''
    }
  }
})
