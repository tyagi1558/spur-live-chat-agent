import { pool } from './connection';
import dotenv from 'dotenv';

dotenv.config();

const FAQ_DATA = {
  shipping: {
    policy: "We offer free shipping on orders over $50. Standard shipping (5-7 business days) is $5.99, and express shipping (2-3 business days) is $12.99. We ship to all US states and select international locations.",
    usa: "Yes, we ship to all 50 US states. International shipping is available to Canada, UK, Australia, and select European countries."
  },
  returns: {
    policy: "We offer a 30-day return policy. Items must be unused, in original packaging, with tags attached. Returns are free for orders over $50, otherwise a $5.99 return shipping fee applies.",
    refund: "Refunds are processed within 5-7 business days after we receive your return. You'll receive an email confirmation once the refund is processed."
  },
  support: {
    hours: "Our support team is available Monday-Friday, 9 AM - 6 PM EST. For urgent matters, email us at support@store.com and we'll respond within 24 hours."
  }
};

async function seed() {
  try {
    console.log('Seeding FAQ data...');
    // FAQ data is embedded in the LLM prompt, so no database seeding needed
    // This file exists for consistency with the migration pattern
    console.log('✓ Seed completed (FAQ data embedded in LLM prompt)');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();


