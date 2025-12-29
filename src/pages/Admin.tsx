import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Plus, 
  Edit, 
  Trash2,
  Store,
  Globe,
  LogOut,
  Menu,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Product, ProductCategory, SetItem, calculateFinalPrice } from '@/types/product';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MultipleImageUpload } from '@/components/admin/MultipleImageUpload';
import { SetItemsEditor } from '@/components/admin/SetItemsEditor';
import { CategorySelector } from '@/components/admin/CategorySelector';
import InvoicePage from '@/components/admin/InvoicePage';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';

type AdminView = 'dashboard' | 'products' | 'invoices';

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { products, isLoading: productsLoading, addProduct, updateProduct, deleteProduct } = useProducts();
  
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Product form state
  const [formData, setFormData] = useState({
    name: '',
    inventoryType: 'floor_sample' as ProductCategory,
    productType: '',
    subcategory: '',
    description: '',
    priceOriginal: 0,
    discountPercent: 0,
    mainImageUrl: '',
    imageUrls: [] as string[],
    isNew: false,
    tagSale: false,
    tagStaffPick: false,
    setItems: [] as SetItem[],
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      inventoryType: 'floor_sample',
      productType: '',
      subcategory: '',
      description: '',
      priceOriginal: 0,
      discountPercent: 0,
      mainImageUrl: '',
      imageUrls: [],
      isNew: false,
      tagSale: false,
      tagStaffPick: false,
      setItems: [],
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    const imageUrls = product.imageUrls && product.imageUrls.length > 0 
      ? product.imageUrls 
      : (product.mainImageUrl ? [product.mainImageUrl] : []);
    
    // Process set items to ensure imageUrls are properly loaded
    const processedSetItems = (product.setItems || []).map((item) => ({
      ...item,
      imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
    }));
    
    setFormData({
      name: product.name,
      inventoryType: product.category,
      productType: product.productType || '',
      subcategory: product.subcategory || '',
      description: product.description,
      priceOriginal: product.priceOriginal,
      discountPercent: product.discountPercent,
      mainImageUrl: product.mainImageUrl,
      imageUrls: imageUrls,
      isNew: product.isNew,
      tagSale: product.tags.includes('sale'),
      tagStaffPick: product.tags.includes('staff_pick'),
      setItems: processedSetItems,
    });
    setIsDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Product name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Product description is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.priceOriginal <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Product price must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    const tags: ('new' | 'sale' | 'staff_pick')[] = [];
    if (formData.isNew) tags.push('new');
    if (formData.tagSale) tags.push('sale');
    if (formData.tagStaffPick) tags.push('staff_pick');

    const imageUrls = formData.imageUrls.length > 0 ? formData.imageUrls : [];
    const mainImageUrl = imageUrls.length > 0 
      ? imageUrls[0] 
      : (formData.mainImageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80');

    // Process set items to ensure imageUrls are properly set
    const processedSetItems = formData.setItems.map((item) => ({
      ...item,
      imageUrl: item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : item.imageUrl,
    }));

    const productData = {
      name: formData.name.trim(),
      category: formData.inventoryType,
      productType: formData.productType || undefined,
      subcategory: formData.subcategory || undefined,
      description: formData.description.trim(),
      priceOriginal: formData.priceOriginal,
      discountPercent: formData.discountPercent,
      isNew: formData.isNew,
      tags,
      mainImageUrl: mainImageUrl,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      setItems: processedSetItems.length > 0 ? processedSetItems : undefined,
    };

    setIsSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      // Error is already handled in hook with toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
    } catch (err) {
      // Error is already handled in hook with toast
    }
  };

  const filteredProducts = categoryFilter === 'all' 
    ? products 
    : products.filter(p => p.category === categoryFilter);

  const floorSampleCount = products.filter(p => p.category === 'floor_sample').length;
  const onlineCount = products.filter(p => p.category === 'online_inventory').length;

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If not logged in, show nothing (redirect will happen)
  if (!user) {
    return null;
  }

  // Sidebar navigation component
  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Vmodern Furniture</p>
      </div>

      <nav className="flex-1 space-y-1">
        <button
          onClick={() => {
            setActiveView('dashboard');
            onNavigate?.();
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            activeView === 'dashboard'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => {
            setActiveView('products');
            onNavigate?.();
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            activeView === 'products'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Package className="h-4 w-4" />
          Products
        </button>
        <button
          onClick={() => {
            setActiveView('invoices');
            onNavigate?.();
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            activeView === 'invoices'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <FileText className="h-4 w-4" />
          Invoices
        </button>
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2 truncate">{user.email}</p>
        <Button variant="outline" onClick={handleLogout} className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card p-4 flex-col no-print">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-4">
          <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 border-b border-border bg-card p-4 flex items-center justify-between">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Vmodern Furniture</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {activeView === 'dashboard' && (
          <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
              <p className="text-muted-foreground">Overview of your inventory</p>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Products
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {productsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : products.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Floor Samples
                  </CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {productsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : floorSampleCount}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Online Inventory
                  </CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {productsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : onlineCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => { setActiveView('products'); setIsDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
                <Button variant="outline" onClick={() => setActiveView('invoices')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'products' && (
          <div className="p-4 sm:p-6 md:p-8">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle>Product Management</CardTitle>
                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-4">
                  <Select 
                    value={categoryFilter} 
                    onValueChange={(v) => setCategoryFilter(v as 'all' | ProductCategory)}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="floor_sample">Floor Samples</SelectItem>
                      <SelectItem value="online_inventory">Online Inventory</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </DialogTitle>
                      </DialogHeader>
                      <fieldset disabled={isSaving} className="space-y-6 py-4">
                        {/* Inventory Type */}
                        <div>
                          <Label className="text-base font-medium">Inventory Type</Label>
                          <RadioGroup
                            value={formData.inventoryType}
                            onValueChange={(v) => setFormData({ ...formData, inventoryType: v as ProductCategory })}
                            className="mt-3 flex flex-col sm:flex-row gap-4 sm:gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="floor_sample" id="floor_sample" />
                              <Label htmlFor="floor_sample" className="font-normal cursor-pointer">
                                Floor Samples
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="online_inventory" id="online_inventory" />
                              <Label htmlFor="online_inventory" className="font-normal cursor-pointer">
                                Online Inventory
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Category & Subcategory */}
                        <CategorySelector
                          category={formData.productType}
                          subcategory={formData.subcategory}
                          onCategoryChange={(v) => setFormData({ ...formData, productType: v })}
                          onSubcategoryChange={(v) => setFormData({ ...formData, subcategory: v })}
                        />

                        <div>
                          <Label htmlFor="name">Product Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Oslo Leather Sofa"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="A stunning mid-century modern leather sofa..."
                            rows={3}
                          />
                        </div>

                        {/* Multiple Image Upload */}
                        <MultipleImageUpload
                          label="Product Images"
                          value={formData.imageUrls}
                          onChange={(urls) => {
                            const limitedUrls = urls.slice(0, 10);
                            setFormData({ 
                              ...formData, 
                              imageUrls: limitedUrls,
                              mainImageUrl: limitedUrls.length > 0 ? limitedUrls[0] : formData.mainImageUrl
                            });
                          }}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="price">Set Price / Total ($)</Label>
                            <Input
                              id="price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.priceOriginal}
                              onChange={(e) => setFormData({ ...formData, priceOriginal: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="discount">Discount (%)</Label>
                            <Input
                              id="discount"
                              type="number"
                              min="0"
                              max="100"
                              value={formData.discountPercent}
                              onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        
                        {/* Price Preview */}
                        {formData.priceOriginal > 0 && (
                          <div className="rounded-lg border border-border bg-secondary/30 p-4">
                            <p className="text-sm font-medium text-foreground">Price Preview</p>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="text-lg font-semibold text-foreground">
                                ${calculateFinalPrice(formData.priceOriginal, formData.discountPercent).toFixed(2)}
                              </span>
                              {formData.discountPercent > 0 && (
                                <>
                                  <span className="text-sm text-muted-foreground line-through">
                                    ${formData.priceOriginal.toFixed(2)}
                                  </span>
                                  <Badge variant="highlight">{formData.discountPercent}% OFF</Badge>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Set Items */}
                        <SetItemsEditor
                          items={formData.setItems}
                          onChange={(items) => setFormData({ ...formData, setItems: items })}
                        />

                        <div>
                          <Label className="mb-3 block">Tags</Label>
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="isNew"
                                checked={formData.isNew}
                                onCheckedChange={(c) => setFormData({ ...formData, isNew: !!c })}
                              />
                              <Label htmlFor="isNew" className="font-normal">New Arrival</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="tagSale"
                                checked={formData.tagSale}
                                onCheckedChange={(c) => setFormData({ ...formData, tagSale: !!c })}
                              />
                              <Label htmlFor="tagSale" className="font-normal">On Sale</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="tagStaffPick"
                                checked={formData.tagStaffPick}
                                onCheckedChange={(c) => setFormData({ ...formData, tagStaffPick: !!c })}
                              />
                              <Label htmlFor="tagStaffPick" className="font-normal">Staff Pick</Label>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                          <Button 
                            type="button"
                            variant="outline" 
                            onClick={() => {
                              if (isSaving) return;
                              setIsDialogOpen(false);
                              resetForm();
                            }} 
                            disabled={isSaving}
                          >
                            {isSaving ? 'Cancel' : 'Close'}
                          </Button>
                          <Button type="button" onClick={handleSaveProduct} disabled={isSaving}>
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                {editingProduct ? 'Update' : 'Add'} Product
                              </>
                            )}
                          </Button>
                        </div>
                      </fieldset>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {filteredProducts.map((product) => (
                        <Card key={product.id}>
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <img
                                src={product.mainImageUrl}
                                alt={product.name}
                                className="h-20 w-20 rounded object-cover flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={product.category === 'floor_sample' ? 'default' : 'secondary'} className="text-xs">
                                      {product.category === 'floor_sample' ? 'Floor Sample' : 'Online'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {product.productType || '-'}
                                  </p>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                      ${product.priceFinal.toFixed(2)}
                                    </span>
                                    {product.priceOriginal !== product.priceFinal && (
                                      <span className="text-xs text-muted-foreground line-through">
                                        ${product.priceOriginal.toFixed(2)}
                                      </span>
                                    )}
                                    {product.discountPercent > 0 && (
                                      <Badge variant="highlight" className="text-xs">
                                        {product.discountPercent}% OFF
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(product)}
                                    className="flex-1"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No products found. Add your first product!</p>
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Inventory</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Original</TableHead>
                            <TableHead className="text-right">Discount</TableHead>
                            <TableHead className="text-right">Final Price</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <img
                                  src={product.mainImageUrl}
                                  alt={product.name}
                                  className="h-12 w-12 rounded object-cover"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>
                                <Badge variant={product.category === 'floor_sample' ? 'default' : 'secondary'}>
                                  {product.category === 'floor_sample' ? 'Floor Sample' : 'Online'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {product.productType || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                ${product.priceOriginal.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                {product.discountPercent > 0 ? `${product.discountPercent}%` : '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${product.priceFinal.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(product)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredProducts.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                No products found. Add your first product!
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'invoices' && (
          <InvoicePage isEmbedded />
        )}
      </main>
    </div>
  );
};

export default Admin;
