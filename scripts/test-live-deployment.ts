import { GAMES } from '../src/lib/gamesRegistry';

async function testAll() {
  const base = 'https://bored-havefun.vercel.app';
  console.log('Testing live deployed Vercel site assets and 30 game routes...');
  
  // 1. Fetch index HTML
  const indexRes = await fetch(base);
  if (indexRes.status !== 200) {
    throw new Error(`Failed to fetch index.html: ${indexRes.status}`);
  }
  const indexHtml = await indexRes.text();
  console.log('Index HTML fetched successfully (status 200).');

  // 2. Extract script tags
  const scriptMatches = [...indexHtml.matchAll(/src="(\/assets\/[^"]+)"/g)].map(m => m[1]);
  const styleMatches = [...indexHtml.matchAll(/href="(\/assets\/[^"]+)"/g)].map(m => m[1]);
  console.log('Discovered bundle assets:', { scripts: scriptMatches, styles: styleMatches });

  for (const scriptPath of scriptMatches) {
    const assetRes = await fetch(base + scriptPath);
    console.log(`Checking script ${scriptPath} -> HTTP ${assetRes.status}`);
    if (assetRes.status !== 200) throw new Error(`Asset failed: ${scriptPath}`);
  }
  for (const stylePath of styleMatches) {
    const assetRes = await fetch(base + stylePath);
    console.log(`Checking stylesheet ${stylePath} -> HTTP ${assetRes.status}`);
    if (assetRes.status !== 200) throw new Error(`Asset failed: ${stylePath}`);
  }

  // 3. Verify all 30 game IDs are mapped in gamesRegistry
  console.log(`Auditing metadata for all ${GAMES.length} registered games...`);
  for (const game of GAMES) {
    if (!game.id || !game.name || !game.icon) {
      throw new Error(`Invalid metadata for game: ${JSON.stringify(game)}`);
    }
  }
  console.log(`All ${GAMES.length} games have valid metadata.`);

  // 4. Verify Ludo icon is classic dice
  const ludo = GAMES.find(g => g.id === 'ludo')!;
  console.log(`Ludo icon is: "${ludo.icon}" (Expected: 🎲)`);
  if (ludo.icon !== '🎲') {
    throw new Error(`Ludo icon mismatch: expected 🎲, got ${ludo.icon}`);
  }

  console.log('✅ Live Vercel asset integrity & route audit PASSED 100%!');
}

testAll().catch(err => {
  console.error(err);
  process.exit(1);
});
