const fs = require('fs');
const files = [
    'scripts/components/ui/profile/spiritualKinship.js',
    'scripts/components/ui/profile/grandparents.js',
    'scripts/components/ui/profile/grandchildren.js',
    'scripts/components/ui/profile/siblings.js',
    'scripts/components/ui/profile/relatives.js',
    'scripts/components/ui/profile/parents.js',
    'scripts/components/ui/profile/marriage.js',
    'scripts/components/ui/shared/participants.js',
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // We want to replace renderPersonTile(person, ctx, roleLabel, false)
    // with renderPersonTile(person, ctx, roleLabel, false, { showId: true })
    
    // There might be different arguments.
    // Let's use a regex to append `{ showId: true }` if there's no 5th argument.
    content = content.replace(/renderPersonTile\(([^,]+),\s*([^,]+),\s*([^,]+),\s*false\)/g, 'renderPersonTile($1, $2, $3, false, { showId: true })');
    content = content.replace(/renderPersonTile\(([^,]+),\s*([^,]+),\s*([^,]+),\s*isPlaceholder\)/g, 'renderPersonTile($1, $2, $3, isPlaceholder, { showId: true })');

    fs.writeFileSync(file, content);
});
console.log('Updated profile tiles to showId');
