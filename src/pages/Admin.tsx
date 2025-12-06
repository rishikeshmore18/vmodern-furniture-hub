import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Layout } from '@/components/layout/Layout';
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
import { mockProducts, getFloorSamples, getOnlineInventory } from '@/data/mockProducts';
import { Product, ProductCategory, calculateFinalPrice } from '@/types/product';
import { toast } from '@/hooks/use-toast';

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

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
    category: 'floor_sample' as ProductCategory,
    description: '',
    priceOriginal: 0,
    discountPercent: 0,
    mainImageUrl: '',
    isNew: false,
    tagSale: false,
    tagStaffPick: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'floor_sample',
      description: '',
      priceOriginal: 0,
      discountPercent: 0,
      mainImageUrl: '',
      isNew: false,
      tagSale: false,
      tagStaffPick: false,
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      priceOriginal: product.priceOriginal,
      discountPercent: product.discountPercent,
      mainImageUrl: product.mainImageUrl,
      isNew: product.isNew,
      tagSale: product.tags.includes('sale'),
      tagStaffPick: product.tags.includes('staff_pick'),
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
      category: formData.category,
      description: formData.description,
      priceOriginal: formData.priceOriginal,
      discountPercent: formData.discountPercent,
      priceFinal: calculateFinalPrice(formData.priceOriginal, formData.discountPercent),
      isNew: formData.isNew,
      tags,
      mainImageUrl: formData.mainImageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
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
      <Layout>
        <div className="container flex min-h-[60vh] items-center justify-center py-16">
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your inventory and invoices</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quick Actions
              </CardTitle>
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/invoice">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

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
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v as ProductCategory })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="floor_sample">Floor Sample</SelectItem>
                          <SelectItem value="online_inventory">Online Inventory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    <div>
                      <Label htmlFor="imageUrl">Image URL</Label>
                      <Input
                        id="imageUrl"
                        value={formData.mainImageUrl}
                        onChange={(e) => setFormData({ ...formData, mainImageUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Original Price ($)</Label>
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
    </Layout>
  );
};

export default Admin;
