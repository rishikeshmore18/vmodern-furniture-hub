import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CategoryConfig } from '@/types/product';

interface DbCategory {
  id: string;
  name: string;
}

interface DbSubcategory {
  id: string;
  category_id: string;
  name: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      if (!categoriesData || categoriesData.length === 0) {
        setCategories([]);
        return;
      }

      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (subcategoriesError) throw subcategoriesError;

      const categoryConfigs: CategoryConfig[] = categoriesData.map((cat) => ({
        name: cat.name,
        subcategories: (subcategoriesData || [])
          .filter((sub) => sub.category_id === cat.id)
          .map((sub) => sub.name),
      }));

      setCategories(categoryConfigs);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (categoryName: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .insert({ name: categoryName });

      if (error) {
        if (error.code === '23505') {
          // Duplicate key, category already exists
          return;
        }
        throw error;
      }

      await fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const addSubcategory = async (categoryName: string, subcategoryName: string) => {
    try {
      // Get category ID
      const { data: category, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .maybeSingle();

      if (catError) throw catError;
      if (!category) return;

      const { error } = await supabase
        .from('subcategories')
        .insert({ category_id: category.id, name: subcategoryName });

      if (error) {
        if (error.code === '23505') {
          // Duplicate key, subcategory already exists
          return;
        }
        throw error;
      }

      await fetchCategories();
    } catch (err) {
      console.error('Error adding subcategory:', err);
    }
  };

  return {
    categories,
    isLoading,
    fetchCategories,
    addCategory,
    addSubcategory,
  };
}
