gadhets by crestrock
# Crestrock E-commerce Website

Welcome to the Crestrock E-commerce Website repository! This project is a modern online store built with React and TypeScript, designed for easy use and management. This guide will help non-technical users understand how to use and run the website.

## Features
- Browse products by category
- Add products to shopping cart
- Place orders and receive confirmation
- Admin dashboard for managing products
- Contact and About pages
- Mobile-friendly design

## Getting Started

### 1. Requirements
- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

### 2. Installation
1. **Download or Clone the Repository**
	 - Click the green "Code" button on GitHub, then "Download ZIP" and extract it, or use:
		 ```
		 git clone https://github.com/your-username/crestrock.git
		 ```
2. **Open the Project Folder**
	 - Open the `crestrock` folder in your preferred code editor (e.g., VS Code).

3. **Install Dependencies**
	 - Open a terminal in the `crestrock` folder and run:
		 ```
		 npm install
		 ```

### 3. Running the Website Locally
1. **Start the Development Server**
	 - In the terminal, run:
		 ```
		 npm run dev
		 ```
	 - The website will open in your browser, usually at [http://localhost:5173](http://localhost:5173).

### 4. Using the Website
- **Browse Products:** Use the homepage to view and filter products.
- **Shopping Cart:** Add items to your cart and proceed to checkout.
- **Admin Login:** Access the admin dashboard to manage products (credentials may be required).
- **Contact:** Use the contact page for inquiries.

### 5. Project Structure (For Reference)
- `src/` - Main source code
	- `components/` - Reusable UI components
	- `pages/` - Website pages (Home, About, Cart, etc.)
	- `services/` - Code for connecting to backend services (e.g., Firebase, payments)
	- `data/` - Product data
	- `contexts/` - State management (e.g., shopping cart)
	- `utils/` - Utility functions
	- `assets/` - Images and static files
- `public/` - Static files served directly
- `index.html` - Main HTML file

### 6. Frequently Asked Questions
**Q: I see errors when running `npm install` or `npm run dev`. What should I do?**
- Make sure you have Node.js installed. Download from [nodejs.org](https://nodejs.org/).
- If problems persist, try deleting the `node_modules` folder and running `npm install` again.

**Q: How do I deploy this website?**

To deploy your website after making changes, follow these steps:

1. **Build the Website**
	- In your terminal, run:
	  ```
	  npm run build
	  ```
	- This will create a `dist` folder containing your production-ready website files.

2. **Deploy the `dist` Folder**
	- Upload the contents of the `dist` folder to your hosting provider (e.g., Netlify, cPanel, or any static hosting service).

3. **Set Up Redirects (for Single Page Apps)**
	- To avoid issues like 404 errors on page reloads, add a file named `_redirects` inside the `dist` folder with the following content:
	  ```
	  /*    /index.html   200
	  ```
	- This ensures all routes are handled correctly.

4. **For cPanel Deployments**
	- After uploading the `dist` folder, ensure there is a file named `.htaccess` in your deployment directory with the following content:
	  ```
	  RewriteEngine On
	  RewriteBase /
	  RewriteRule ^index\.html$ - [L]
	  RewriteCond %{REQUEST_FILENAME} !-f
	  RewriteCond %{REQUEST_FILENAME} !-d
	  RewriteRule . /index.html [L]
	  ```
	- This will prevent 404 errors and ensure your app works with client-side routing.

5. **Backend Callback**
	- The website communicates with the backend at: [https://github.com/gregory-bot/backend-payment](https://github.com/gregory-bot/backend-payment)
	- Make sure your backend is deployed and accessible if your site needs to process payments or other server-side actions.

---

by gregory
