const fs = require('fs');
let content = fs.readFileSync('src/components/Cows/CowsPage.jsx', 'utf8');

// Find the start of dead code (line after "}) && null /* intentional */}" )
// and the end right before the LAST closing </div> of the cards grid

// The dead block starts somewhere around line 557 and ends at line ~955
// We know from inspection:
// Line 555 ends with:  }) && null /* intentional */}
// Line 556: blank
// Line 557: "              const primaryTag = rawTags[0]"   <- start of dead code
// ...
// Line 955: "            }) && null /* intentional: buttons rendered per-card below */}"  <- last line of old block
// Line 956: "          </div>"   <- grid closing

const lines = content.split('\n');
let deadStart = -1;
let deadEnd = -1;

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  
  // Start: first line after the "intentional" comment that has old dead const
  if (deadStart === -1 && trimmed === 'const primaryTag = rawTags[0]') {
    deadStart = i;
  }
  
  // End: the old Quick Actions line (second occurrence, the one from original code)
  if (deadStart > -1 && trimmed === '}) && null /* intentional: buttons rendered per-card below */}') {
    deadEnd = i;
    break;
  }
}

console.log('deadStart:', deadStart, 'deadEnd:', deadEnd);

if (deadStart > -1 && deadEnd > -1) {
  // Remove lines from deadStart to deadEnd (inclusive)
  lines.splice(deadStart - 1, deadEnd - deadStart + 2); // -1 for blank line before, +2 to include both ends
  fs.writeFileSync('src/components/Cows/CowsPage.jsx', lines.join('\n'));
  console.log('SUCCESS, removed', deadEnd - deadStart + 2, 'lines');
} else {
  // Print lines around the area to debug
  for (let i = 554; i <= 562; i++) {
    console.log(i + ':', JSON.stringify(lines[i]));
  }
}
