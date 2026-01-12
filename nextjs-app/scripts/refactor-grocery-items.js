const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/lib/grocery-items.ts');
const content = fs.readFileSync(inputPath, 'utf8');

// Regex to find items
const itemRegex = /\{ name: "(.*?)", category: "(.*?)", default_unit: "(.*?)", estimated_price_per_unit: (.*?) \},/g;

let newContent = content;
const enTranslations = {};
const frTranslations = {};

// Helper to slugify
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

let match;
const items = [];
while ((match = itemRegex.exec(content)) !== null) {
    const [fullMatch, name, category, unit, price] = match;
    const id = slugify(name);
    items.push({ fullMatch, name, category, unit, price, id });

    enTranslations[id] = name;
    frTranslations[id] = name; // Placeholder for now, simple copy
}

// Replace in content
items.forEach(item => {
    // We add id attribute to the object string
    const replacement = `{ id: "${item.id}", name: "${item.name}", category: "${item.category}", default_unit: "${item.unit}", estimated_price_per_unit: ${item.price} },`;
    newContent = newContent.replace(item.fullMatch, replacement);
});

// Update interface definition
newContent = newContent.replace(
    'export interface GroceryItemTemplate {',
    'export interface GroceryItemTemplate {\n    id: string;'
);

// Write back TS file
fs.writeFileSync(inputPath, newContent);

// Write translation fragments
fs.writeFileSync(path.join(__dirname, '../messages/items_en_fragment.json'), JSON.stringify(enTranslations, null, 2));
fs.writeFileSync(path.join(__dirname, '../messages/items_fr_fragment.json'), JSON.stringify(frTranslations, null, 2));

console.log('Refactored items and generated fragments.');
