import { NextRequest, NextResponse } from 'next/server';
import { BarcodeProduct } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'No barcode provided' },
        { status: 400 }
      );
    }

    // Query Open Food Facts API
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
      {
        headers: {
          'User-Agent': 'OperationRecon/1.0 - Calorie Tracking App',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Open Food Facts');
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // Extract nutritional info per serving or per 100g
    const servingSize = product.serving_size || '100g';
    const isPerServing = product.nutrition_data_per === 'serving';

    // Get values - prefer per serving, fallback to per 100g
    const suffix = isPerServing ? '_serving' : '_100g';

    const calories = Math.round(
      nutriments[`energy-kcal${suffix}`] ||
      nutriments['energy-kcal_serving'] ||
      nutriments['energy-kcal_100g'] ||
      (nutriments[`energy${suffix}`] || nutriments['energy_100g'] || 0) / 4.184
    );

    const protein = Math.round(
      nutriments[`proteins${suffix}`] ||
      nutriments['proteins_serving'] ||
      nutriments['proteins_100g'] ||
      0
    );

    const carbs = Math.round(
      nutriments[`carbohydrates${suffix}`] ||
      nutriments['carbohydrates_serving'] ||
      nutriments['carbohydrates_100g'] ||
      0
    );

    const fat = Math.round(
      nutriments[`fat${suffix}`] ||
      nutriments['fat_serving'] ||
      nutriments['fat_100g'] ||
      0
    );

    const result: BarcodeProduct = {
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || undefined,
      calories,
      macros: { protein, carbs, fat },
      servingSize,
      barcode: code,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup barcode' },
      { status: 500 }
    );
  }
}
