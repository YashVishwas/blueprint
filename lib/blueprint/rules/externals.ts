// Maps npm package names and import patterns → human-readable external service labels

export const EXTERNAL_PACKAGE_MAP: Record<string, string> = {
  // Payments
  stripe: 'Stripe',
  '@stripe/stripe-js': 'Stripe',
  braintree: 'Braintree',
  paypal: 'PayPal',
  '@paypal/checkout-server-sdk': 'PayPal',
  paddle: 'Paddle',
  razorpay: 'Razorpay',
  square: 'Square',

  // AI / ML
  openai: 'OpenAI',
  '@anthropic-ai/sdk': 'Anthropic',
  anthropic: 'Anthropic',
  cohere: 'Cohere',
  'cohere-ai': 'Cohere',
  replicate: 'Replicate',
  'google-generativeai': 'Google AI',
  '@google/generative-ai': 'Google AI',
  groq: 'Groq',
  mistral: 'Mistral',
  llamaindex: 'LlamaIndex',
  langchain: 'LangChain',
  '@langchain/core': 'LangChain',

  // AWS
  'aws-sdk': 'AWS',
  '@aws-sdk/client-s3': 'AWS S3',
  '@aws-sdk/client-sqs': 'AWS SQS',
  '@aws-sdk/client-sns': 'AWS SNS',
  '@aws-sdk/client-lambda': 'AWS Lambda',
  '@aws-sdk/client-dynamodb': 'AWS DynamoDB',
  '@aws-sdk/client-ses': 'AWS SES',
  '@aws-sdk/client-cloudwatch': 'AWS CloudWatch',
  '@aws-sdk/client-secretsmanager': 'AWS Secrets',

  // Google Cloud
  '@google-cloud/storage': 'Google Cloud Storage',
  '@google-cloud/pubsub': 'Google Pub/Sub',
  '@google-cloud/bigquery': 'BigQuery',
  'firebase-admin': 'Firebase',
  '@firebase/app': 'Firebase',
  firebase: 'Firebase',

  // Azure
  '@azure/storage-blob': 'Azure Blob',
  '@azure/cosmos': 'Azure Cosmos DB',
  '@azure/service-bus': 'Azure Service Bus',

  // Email
  nodemailer: 'SMTP / Email',
  '@sendgrid/mail': 'SendGrid',
  sendgrid: 'SendGrid',
  mailchimp: 'Mailchimp',
  '@mailchimp/mailchimp_marketing': 'Mailchimp',
  postmark: 'Postmark',
  resend: 'Resend',
  '@resend/node': 'Resend',
  brevo: 'Brevo',
  'mailgun.js': 'Mailgun',

  // SMS / Voice
  twilio: 'Twilio',
  vonage: 'Vonage',

  // Auth
  auth0: 'Auth0',
  '@auth0/nextjs-auth0': 'Auth0',
  '@clerk/nextjs': 'Clerk',
  '@clerk/clerk-sdk-node': 'Clerk',
  'next-auth': 'NextAuth.js',
  '@supabase/auth-helpers-nextjs': 'Supabase Auth',
  okta: 'Okta',

  // Database clients
  pg: 'PostgreSQL',
  mysql2: 'MySQL',
  mongoose: 'MongoDB',
  mongodb: 'MongoDB',
  redis: 'Redis',
  ioredis: 'Redis',
  '@upstash/redis': 'Redis (Upstash)',
  '@upstash/ratelimit': 'Redis (Upstash)',
  cockroachdb: 'CockroachDB',

  // Search
  algoliasearch: 'Algolia',
  '@elastic/elasticsearch': 'Elasticsearch',
  typesense: 'Typesense',
  meilisearch: 'Meilisearch',

  // Messaging / Queues
  kafkajs: 'Kafka',
  'amqplib': 'RabbitMQ',
  bull: 'Bull (Redis Queue)',
  bullmq: 'BullMQ',
  'inngest': 'Inngest',
  trigger: 'Trigger.dev',
  '@trigger.dev/sdk': 'Trigger.dev',
  qstash: 'QStash',
  '@upstash/qstash': 'QStash',

  // Monitoring
  '@sentry/nextjs': 'Sentry',
  '@sentry/node': 'Sentry',
  datadog: 'Datadog',
  'dd-trace': 'Datadog',
  newrelic: 'New Relic',
  '@vercel/analytics': 'Vercel Analytics',
  '@posthog/node': 'PostHog',
  posthog: 'PostHog',

  // Communication
  '@slack/web-api': 'Slack',
  '@slack/bolt': 'Slack',
  discord: 'Discord',
  'discord.js': 'Discord',
  telegraf: 'Telegram',
  twit: 'Twitter API',

  // CMS / Content
  contentful: 'Contentful',
  sanity: 'Sanity',
  '@sanity/client': 'Sanity',
  strapi: 'Strapi',
  '@notionhq/client': 'Notion',

  // Blob / File Storage
  '@vercel/blob': 'Vercel Blob',
  cloudinary: 'Cloudinary',
  uploadthing: 'UploadThing',

  // Maps
  '@googlemaps/google-maps-services-js': 'Google Maps',
  mapbox: 'Mapbox',

  // Feature flags
  '@launchdarkly/node-server-sdk': 'LaunchDarkly',
  growthbook: 'GrowthBook',

  // Supabase (all-in-one)
  '@supabase/supabase-js': 'Supabase',

  // PlanetScale / Neon / Turso
  '@planetscale/database': 'PlanetScale',
  '@neondatabase/serverless': 'Neon',
  '@libsql/client': 'Turso',

  // Misc
  axios: 'HTTP (axios)',
  'node-fetch': 'HTTP (fetch)',
  pusher: 'Pusher',
  'pusher-js': 'Pusher',
  ably: 'Ably',
}

// Python pip package → external service (used for import statement analysis)
export const PYTHON_EXTERNAL_MAP: Record<string, string> = {
  stripe: 'Stripe',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  boto3: 'AWS',
  botocore: 'AWS',
  redis: 'Redis',
  pymongo: 'MongoDB',
  psycopg2: 'PostgreSQL',
  sqlalchemy: 'SQLAlchemy',
  celery: 'Celery',
  sendgrid: 'SendGrid',
  twilio: 'Twilio',
  firebase_admin: 'Firebase',
  google: 'Google Cloud',
  slack_sdk: 'Slack',
  requests: 'HTTP (requests)',
  httpx: 'HTTP (httpx)',
  sentry_sdk: 'Sentry',
}

export function resolveExternal(packageName: string): string | null {
  // Exact match
  if (EXTERNAL_PACKAGE_MAP[packageName]) return EXTERNAL_PACKAGE_MAP[packageName]

  // Prefix match for scoped packages
  const scope = packageName.startsWith('@') ? packageName.split('/')[0] : null
  if (scope) {
    for (const [key, value] of Object.entries(EXTERNAL_PACKAGE_MAP)) {
      if (key.startsWith(scope)) return value
    }
  }

  return null
}
