#!/usr/bin/env node

/**
 * Environment Variables Diagnostic Script
 * 
 * Run this to check if all required environment variables are set
 * 
 * Usage:
 *   node scripts/check-env.js
 */

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   Environment Variables Diagnostic                 ║');
console.log('╚════════════════════════════════════════════════════╝\n');

const requiredVars = {
  'Client (Browser)': [
    'NEXT_PUBLIC_CLIENT_PRIVATE_KEY',
    'NEXT_PUBLIC_CLIENT_ADDRESS',
    'NEXT_PUBLIC_FACILITATOR_ADDRESS',
    'NEXT_PUBLIC_RECIPIENT_ADDRESS',
    'NEXT_PUBLIC_TOKEN_ADDRESS',
    'NEXT_PUBLIC_NETWORK_ID',
    'NEXT_PUBLIC_STARKNET_NODE_URL',
  ],
  'Server (Backend)': [
    'FACILITATOR_PRIVATE_KEY',
    'STARKNET_NODE_URL',
  ],
  'Optional': [
    'NEXT_PUBLIC_NETWORK_NAME',
    'NEXT_PUBLIC_EXPLORER_URL',
    'NEXT_PUBLIC_SITE_URL',
  ],
};

let allGood = true;
let missingCount = 0;
let warnings = [];

Object.entries(requiredVars).forEach(([category, vars]) => {
  console.log(`\n${category}:`);
  console.log('─'.repeat(50));
  
  vars.forEach(varName => {
    const value = process.env[varName];
    const isOptional = category === 'Optional';
    
    if (value && value !== '') {
      // Show first 10 chars for security
      const preview = value.length > 10 ? value.slice(0, 10) + '...' : value;
      console.log(`✅ ${varName}`);
      console.log(`   Value: ${preview} (length: ${value.length})`);
      
      // Validate format for addresses
      if (varName.includes('ADDRESS') && !value.startsWith('0x')) {
        warnings.push(`⚠️  ${varName} should start with 0x`);
      }
      
      // Validate private keys
      if (varName.includes('PRIVATE_KEY') && value.length < 60) {
        warnings.push(`⚠️  ${varName} seems too short (expected ~66 chars)`);
      }
    } else {
      if (isOptional) {
        console.log(`⚪ ${varName} (optional)`);
      } else {
        console.log(`❌ ${varName} - MISSING!`);
        allGood = false;
        missingCount++;
      }
    }
  });
});

// Summary
console.log('\n' + '═'.repeat(50));
console.log('\n📊 Summary:\n');

if (allGood) {
  console.log('✅ All required environment variables are set!');
} else {
  console.log(`❌ ${missingCount} required variable(s) missing!`);
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(w => console.log(`   ${w}`));
}

console.log('\n💡 Tips:');
console.log('   • Local: Create .env.local file');
console.log('   • Vercel: Add in Settings → Environment Variables');
console.log('   • After adding vars in Vercel, redeploy!');

console.log('\n📚 Documentation:');
console.log('   • See PRODUCTION_ENV_FIX.md for complete guide');
console.log('   • See KEYPAIRS.md for test account details\n');

// Exit code
process.exit(allGood ? 0 : 1);

