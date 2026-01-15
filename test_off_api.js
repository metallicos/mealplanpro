
const barcode = '3057640100673'; // Volvic 1.5L
const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=product_name,serving_size,product_quantity,serving_quantity,quantity,nutriments`;

async function fetchProduct() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(JSON.stringify(data.product, null, 2));
    } catch (error) {
        console.error(error);
    }
}

fetchProduct();
