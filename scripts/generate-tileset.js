#!/usr/bin/env node

/**
 * Generate tileset.json for Glib models
 * This script creates a Cesium 3D Tiles tileset.json from glb files
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../public/models/AurthurSeat');
const OUTPUT_FILE = path.join(MODELS_DIR, 'tileset.json');
const TILES_DIR = path.join(__dirname, '../public/tiles');
const TILES_JSON = path.join(TILES_DIR, 'files.json');

// Arthur's Seat coordinates
const CENTER_LON = -3.1619;
const CENTER_LAT = 55.9445;
const CENTER_HEIGHT = 0;

function generateTileset() {
  // Check if models directory exists
  if (!fs.existsSync(MODELS_DIR)) {
    console.log(`⚠️  Models directory not found: ${MODELS_DIR}`);
    console.log('   Skipping tileset.json generation');
    return;
  }
  
  // Read all glb files
  const files = fs.readdirSync(MODELS_DIR)
    .filter(f => f.endsWith('.glb'))
    .sort();

  console.log(`Found ${files.length} .glb files`);

  // Create root tile
  const tileset = {
    asset: {
      version: '1.0',
      tilesetVersion: '1.0.0'
    },
    geometricError: 500,
    root: {
      boundingVolume: {
        region: [
          (CENTER_LON - 0.01) * Math.PI / 180, // west
          (CENTER_LAT - 0.01) * Math.PI / 180, // south
          (CENTER_LON + 0.01) * Math.PI / 180, // east
          (CENTER_LAT + 0.01) * Math.PI / 180, // north
          0,    // minimum height
          500   // maximum height
        ]
      },
      geometricError: 100,
      refine: 'ADD',
      children: []
    }
  };

  // Group files into batches for better performance
  const BATCH_SIZE = 25;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    // Create a child tile for each batch
    const childTile = {
      boundingVolume: {
        region: [
          (CENTER_LON - 0.01) * Math.PI / 180,
          (CENTER_LAT - 0.01) * Math.PI / 180,
          (CENTER_LON + 0.01) * Math.PI / 180,
          (CENTER_LAT + 0.01) * Math.PI / 180,
          0,
          500
        ]
      },
      geometricError: 10,
      refine: 'ADD',
      contents: batch.map(file => ({
        uri: file
      }))
    };

    tileset.root.children.push(childTile);
  }

  // Write tileset.json
  const json = JSON.stringify(tileset, null, 2);
  
  try {
    fs.writeFileSync(OUTPUT_FILE, json);
    console.log(`✅ Generated ${OUTPUT_FILE}`);
    console.log(`   Total tiles: ${files.length}`);
    console.log(`   Batches: ${tileset.root.children.length}`);
  } catch (error) {
    console.error('Error writing tileset.json:', error);
    // Try with sudo
    console.log('\nTrying with elevated permissions...');
    const { execSync } = require('child_process');
    const tmpFile = '/tmp/tileset.json';
    fs.writeFileSync(tmpFile, json);
    execSync(`sudo mv ${tmpFile} ${OUTPUT_FILE}`);
    console.log('✅ Created with sudo');
  }
}

function generateFilesJson() {
  try {
    // Read all glb files from tiles directory
    const files = fs.readdirSync(TILES_DIR)
      .filter(f => f.endsWith('.glb'))
      .sort();

    console.log(`\nGenerating files.json...`);
    console.log(`Found ${files.length} .glb files in tiles directory`);

    // Write simple JSON array
    fs.writeFileSync(TILES_JSON, JSON.stringify(files, null, 2));
    console.log(`✅ Generated ${TILES_JSON}`);
  } catch (error) {
    console.error('Error generating files.json:', error);
  }
}

if (require.main === module) {
  generateTileset();
  generateFilesJson();
}

module.exports = { generateTileset, generateFilesJson };
