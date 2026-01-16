import { NextRequest, NextResponse } from 'next/server';

interface SearchResult {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  servingSize: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Search Open Food Facts
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,product_name_en,brands,nutriments,serving_size`,
      {
        headers: {
          'User-Agent': 'OperationRecon/1.0 - Calorie Tracking App',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search Open Food Facts');
    }

    const data = await response.json();
    const products = data.products || [];

    const results: SearchResult[] = products
      .filter((p: Record<string, unknown>) => p.product_name || p.product_name_en)
      .map((product: Record<string, unknown>): SearchResult => {
        const nutriments = (product.nutriments || {}) as Record<string, number>;
        const servingSize = (product.serving_size as string) || '100g';

        // Prefer per serving values, fallback to per 100g
        const calories = Math.round(
          nutriments['energy-kcal_serving'] ||
          nutriments['energy-kcal_100g'] ||
          (nutriments['energy_100g'] || 0) / 4.184
        );

        return {
          id: product.code as string,
          name: (product.product_name || product.product_name_en) as string,
          brand: product.brands as string | undefined,
          calories,
          macros: {
            protein: Math.round(nutriments['proteins_serving'] || nutriments['proteins_100g'] || 0),
            carbs: Math.round(nutriments['carbohydrates_serving'] || nutriments['carbohydrates_100g'] || 0),
            fat: Math.round(nutriments['fat_serving'] || nutriments['fat_100g'] || 0),
          },
          servingSize,
        };
      });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Food search error:', error);
    return NextResponse.json(
      { error: 'Failed to search foods' },
      { status: 500 }
    );
  }
}
