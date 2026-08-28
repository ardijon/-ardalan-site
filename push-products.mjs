import fs from 'fs'

const products = JSON.parse(fs.readFileSync('./src/data/products.json', 'utf8'))

// Write in the format storage.js expects: collection:products
const collectionData = {
  key: 'collection:products',
  value: JSON.stringify(products),
  metadata: {}
}

fs.writeFileSync('products-collection.json', JSON.stringify([collectionData], null, 2))
console.log('Created products-collection.json')
console.log('Run: npx wrangler kv bulk put --binding=SITE_KV --namespace-id=76de247968e348f5818c9947b464d93d products-collection.json')