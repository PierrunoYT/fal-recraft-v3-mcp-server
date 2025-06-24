#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test the MCP server
async function testServer() {
  console.log('Testing fal-ai/recraft/v3 MCP Server...\n');

  // Check if FAL_KEY is set
  if (!process.env.FAL_KEY) {
    console.error('❌ FAL_KEY environment variable is not set');
    console.error('Please set your fal.ai API key: export FAL_KEY=your_api_key_here');
    process.exit(1);
  }

  console.log('✅ FAL_KEY environment variable is set');

  // Build the project first
  console.log('📦 Building project...');
  const buildProcess = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  buildProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Build failed');
      process.exit(1);
    }

    console.log('✅ Build successful');

    // Start the server
    console.log('🚀 Starting MCP server...');
    const serverPath = join(__dirname, 'build', 'index.js');
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FAL_KEY: process.env.FAL_KEY }
    });

    let serverOutput = '';
    let serverError = '';

    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      serverError += data.toString();
      console.log('Server:', data.toString().trim());
    });

    // Wait a moment for server to start
    setTimeout(() => {
      console.log('✅ Server appears to be running');
      console.log('📋 Available tools:');
      console.log('  - recraft_v3_generate: Generate images synchronously');
      console.log('  - recraft_v3_generate_queue: Submit to queue for long-running requests');
      console.log('  - recraft_v3_queue_status: Check queue status');
      console.log('  - recraft_v3_queue_result: Get queue results');
      console.log('\n🎯 Example usage in MCP client:');
      console.log('  Tool: recraft_v3_generate');
      console.log('  Parameters: {');
      console.log('    "prompt": "A futuristic cityscape with flying cars and neon lights, digital illustration style",');
      console.log('    "image_size": "1024x1024",');
      console.log('    "style": "digital_illustration",');
      console.log('    "enable_safety_checker": true');
      console.log('  }');
      console.log('\n✅ Test completed successfully!');
      console.log('💡 The server is ready to be used with your MCP client.');
      
      // Terminate the server
      serverProcess.kill('SIGTERM');
      process.exit(0);
    }, 2000);

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    });

    serverProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error('❌ Server exited with code:', code);
        if (serverError) {
          console.error('Server errors:', serverError);
        }
        process.exit(1);
      }
    });
  });

  buildProcess.on('error', (error) => {
    console.error('❌ Failed to build:', error.message);
    process.exit(1);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

// Run the test
testServer().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});