import FirebaseService, { Product } from './firebaseService';
import { products as localProducts } from '../data/products';

// Function to sync local products to Firebase
export const initializeProducts = async () => {
  try {
    // Get current products from Firebase
    const firebaseProducts = await FirebaseService.getProducts();
    
    if (firebaseProducts.length === 0) {
      console.log('No products in Firebase, initializing...');
      
      // Add all local products to Firebase
      for (const product of localProducts) {
        try {
          await FirebaseService.createProduct(product);
          console.log(`Added: ${product.name}`);
        } catch (error) {
          console.error(`Failed to add ${product.name}:`, error);
        }
      }
      
      console.log('✅ All products synced to Firebase');
    } else {
      console.log(`✅ Firebase already has ${firebaseProducts.length} products`);
      
      // Optional: Compare and update if needed
      const localIds = new Set(localProducts.map(p => p.id));
      const firebaseIds = new Set(firebaseProducts.map(p => p.id));
      
      // Find products missing in Firebase
      const missingProducts = localProducts.filter(p => !firebaseIds.has(p.id));
      
      if (missingProducts.length > 0) {
        console.log(`Adding ${missingProducts.length} missing products...`);
        for (const product of missingProducts) {
          await FirebaseService.createProduct(product);
        }
      }
    }
  } catch (error) {
    console.error('Error initializing products:', error);
  }
};