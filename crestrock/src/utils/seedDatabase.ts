// src/utils/seedDatabase.ts
import { productsRef, addProduct } from '@/firebase/config';
import { onValue } from 'firebase/database';
import { products as sampleProducts } from '@/data/products';

export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting to seed database...');
    
    // Check if products already exist
    const productsExist = await new Promise((resolve) => {
      onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        resolve(data ? Object.keys(data).length > 0 : false);
      }, { onlyOnce: true });
    });

    if (productsExist) {
      console.log('✅ Products already exist in database');
      return;
    }

    console.log(`📦 Adding ${sampleProducts.length} products to Firebase...`);
    
    // Add all products
    const promises = sampleProducts.map(product => addProduct(product));
    await Promise.all(promises);
    
    console.log('✅ Database seeded successfully with all products!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};