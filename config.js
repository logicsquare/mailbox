module.exports = {
  production: {
    database: process.env.DB_URL,
    redisConnString: process.env.REDIS_URL,
    siteUrl: process.env.SITE_URL,
    email: {
      apiKey: process.env.MG_API_KEY,
      domain: process.env.MG_DOMAIN,
      from: process.env.MG_FROM_EMAIL,
    }
  }
}