import { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Plus, 
  Edit, 
  Trash2,
  Store,
  Globe,
  LogOut
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
import { mockProducts, getFloorSamples, getOnlineInventory } from '@/data/mockProducts';
import { Product, ProductCategory, SetItem, calculateFinalPrice } from '@/types/product';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { SetItemsEditor } from '@/components/admin/SetItemsEditor';
import { CategorySelector } from '@/components/admin/CategorySelector';
import InvoicePage from '@/components/admin/InvoicePage';

type AdminView = 'dashboard' | 'products' | 'invoices';

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>('dashboard');

  // Simple auth check
  const handleLogin = () => {
    if (password === 'admin123') {
      setIsLoggedIn(true);
      toast({ title: 'Welcome to Admin Panel' });
    } else {
      toast({ title: 'Invalid password', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword('');
  };

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
    isNew: false,
    tagSale: false,
    tagStaffPick: false,
    setItems: [] as SetItem[],
  });

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
      isNew: false,
      tagSale: false,
      tagStaffPick: false,
      setItems: [],
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      inventoryType: product.category,
      productType: product.productType || '',
      subcategory: product.subcategory || '',
      description: product.description,
      priceOriginal: product.priceOriginal,
      discountPercent: product.discountPercent,
      mainImageUrl: product.mainImageUrl,
      isNew: product.isNew,
      tagSale: product.tags.includes('sale'),
      tagStaffPick: product.tags.includes('staff_pick'),
      setItems: product.setItems || [],
    });
    setIsDialogOpen(true);
  };

  const handleSaveProduct = () => {
    const tags: ('new' | 'sale' | 'staff_pick')[] = [];
    if (formData.isNew) tags.push('new');
    if (formData.tagSale) tags.push('sale');
    if (formData.tagStaffPick) tags.push('staff_pick');

    const productData: Product = {
      id: editingProduct?.id || Date.now().toString(),
      name: formData.name,
      category: formData.inventoryType,
      productType: formData.productType,
      subcategory: formData.subcategory,
      description: formData.description,
      priceOriginal: formData.priceOriginal,
      discountPercent: formData.discountPercent,
      priceFinal: calculateFinalPrice(formData.priceOriginal, formData.discountPercent),
      isNew: formData.isNew,
      tags,
      mainImageUrl: formData.mainImageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      setItems: formData.setItems.length > 0 ? formData.setItems : undefined,
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? productData : p));
      toast({ title: 'Product updated successfully' });
    } else {
      setProducts([...products, productData]);
      toast({ title: 'Product added successfully' });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    toast({ title: 'Product deleted' });
  };

  const filteredProducts = categoryFilter === 'all' 
    ? products 
    : products.filter(p => p.category === categoryFilter);

  const floorSampleCount = products.filter(p => p.category === 'floor_sample').length;
  const onlineCount = products.filter(p => p.category === 'online_inventory').length;

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Hint: admin123
                </p>
              </div>
              <Button onClick={handleLogin} className="w-full">
                Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 flex flex-col no-print">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Vmodern Furniture</p>
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveView('dashboard')}
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
            onClick={() => setActiveView('products')}
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
            onClick={() => setActiveView('invoices')}
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

        <Button variant="outline" onClick={handleLogout} className="mt-auto">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeView === 'dashboard' && (
          <div className="p-8">
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
                  <div className="text-2xl font-bold">{products.length}</div>
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
                  <div className="text-2xl font-bold">{floorSampleCount}</div>
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
                  <div className="text-2xl font-bold">{onlineCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
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
          <div className="p-8">
            {/* Product Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Management</CardTitle>
                <div className="flex items-center gap-4">
                  <Select 
                    value={categoryFilter} 
                    onValueChange={(v) => setCategoryFilter(v as 'all' | ProductCategory)}
                  >
                    <SelectTrigger className="w-[180px]">
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
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        {/* Inventory Type - Radio buttons */}
                        <div>
                          <Label className="text-base font-medium">Inventory Type</Label>
                          <RadioGroup
                            value={formData.inventoryType}
                            onValueChange={(v) => setFormData({ ...formData, inventoryType: v as ProductCategory })}
                            className="mt-3 flex gap-6"
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

                        {/* Image Upload */}
                        <ImageUpload
                          label="Main Product Image"
                          value={formData.mainImageUrl}
                          onChange={(url) => setFormData({ ...formData, mainImageUrl: url })}
                        />

                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveProduct}>
                            {editingProduct ? 'Update' : 'Add'} Product
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                    </TableBody>
                  </Table>
                </div>
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
