import { useState, useRef } from 'react';
import { Plus, Trash2, Printer, FileText, Save } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { storeInfo, returnTerms } from '@/data/storeInfo';
import { 
  InvoiceLineItem, 
  PaymentMethod, 
  calculateLineAmount, 
  SALES_TAX_RATE 
} from '@/types/product';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Get stored order number or start at 154 (from their PDF)
const getNextOrderNumber = (): number => {
  const stored = localStorage.getItem('vmodern_order_number');
  if (stored) {
    return parseInt(stored, 10) + 1;
  }
  return 154;
};

const saveOrderNumber = (num: number) => {
  localStorage.setItem('vmodern_order_number', num.toString());
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
};

const Invoice = () => {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Invoice state
  const [orderNumber, setOrderNumber] = useState(getNextOrderNumber());
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Bill To
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToPhone, setBillToPhone] = useState('');
  
  // Ship To
  const [sameAsBillTo, setSameAsBillTo] = useState(true);
  const [shipToName, setShipToName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [shipToPhone, setShipToPhone] = useState('');
  
  // Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: '1', source: '', itemNo: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0, lineAmount: 0 }
  ]);
  
  // Delivery & Payment
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [amountPaid, setAmountPaid] = useState(0);

  // Calculate totals
  const itemsSubtotal = lineItems.reduce((sum, item) => sum + item.lineAmount, 0);
  const subtotal = itemsSubtotal + deliveryCharges;
  const salesTax = subtotal * SALES_TAX_RATE;
  const total = subtotal + salesTax;
  const balance = total - amountPaid;

  // Update line item
  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(items => items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      // Recalculate line amount when quantity, unit price, or discount changes
      if (field === 'quantity' || field === 'unitPrice' || field === 'discountPercent') {
        updated.lineAmount = calculateLineAmount(
          field === 'quantity' ? Number(value) : updated.quantity,
          field === 'unitPrice' ? Number(value) : updated.unitPrice,
          field === 'discountPercent' ? Number(value) : updated.discountPercent
        );
      }
      return updated;
    }));
  };

  // Add new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { 
        id: Date.now().toString(), 
        source: '', 
        itemNo: '', 
        description: '', 
        quantity: 1, 
        unitPrice: 0, 
        discountPercent: 0, 
        lineAmount: 0 
      }
    ]);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  // New Invoice
  const handleNewInvoice = () => {
    const newOrderNum = orderNumber + 1;
    setOrderNumber(newOrderNum);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setBillToName('');
    setBillToAddress('');
    setBillToPhone('');
    setSameAsBillTo(true);
    setShipToName('');
    setShipToAddress('');
    setShipToPhone('');
    setLineItems([
      { id: '1', source: '', itemNo: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0, lineAmount: 0 }
    ]);
    setDeliveryCharges(0);
    setPaymentMethod('credit_card');
    setAmountPaid(0);
    toast({ title: 'New invoice created' });
  };

  // Save Invoice
  const handleSaveInvoice = () => {
    saveOrderNumber(orderNumber);
    toast({ title: `Invoice #${orderNumber} saved successfully` });
  };

  // Print
  const handlePrint = () => {
    saveOrderNumber(orderNumber);
    window.print();
  };

  return (
    <Layout hideFooter>
      <div className="no-print container py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-foreground">Invoice</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleNewInvoice}>
              <FileText className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
            <Button variant="outline" onClick={handleSaveInvoice}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Container */}
      <div 
        ref={printRef}
        className="invoice-container mx-auto max-w-4xl bg-card p-6 shadow-sm print:shadow-none md:p-10"
      >
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{storeInfo.name.toUpperCase()}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{storeInfo.address}</p>
            <p className="text-sm text-muted-foreground">{storeInfo.city}, {storeInfo.state} {storeInfo.zip}</p>
            <p className="text-sm text-muted-foreground">Phone: {storeInfo.phone}</p>
            <p className="text-sm text-muted-foreground">{storeInfo.website}</p>
            <p className="text-sm text-muted-foreground">Instagram: vmodernfurniture</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">Business Hours:</p>
            <p className="text-sm text-muted-foreground">Monday-Saturday</p>
            <p className="text-sm text-muted-foreground">11:00AM – 5:00PM</p>
            <p className="text-sm text-muted-foreground">CLOSED SUNDAY</p>
          </div>
        </div>

        {/* Invoice Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-wider text-foreground">INVOICE</h1>
        </div>

        {/* Date & Order Number */}
        <div className="mb-8 flex flex-wrap justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label className="font-medium">Date:</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="font-medium">Order No.:</Label>
            <span className="text-lg font-semibold text-foreground">{orderNumber}</span>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-semibold text-foreground">BILL TO</h3>
            <div className="space-y-3">
              <Input
                placeholder="Customer Name"
                value={billToName}
                onChange={(e) => setBillToName(e.target.value)}
              />
              <Textarea
                placeholder="Address"
                value={billToAddress}
                onChange={(e) => setBillToAddress(e.target.value)}
                rows={2}
              />
              <Input
                placeholder="Phone Number"
                value={billToPhone}
                onChange={(e) => setBillToPhone(e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">SHIP TO</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sameAsBillTo"
                  checked={sameAsBillTo}
                  onCheckedChange={(c) => {
                    setSameAsBillTo(!!c);
                    if (c) {
                      setShipToName(billToName);
                      setShipToAddress(billToAddress);
                      setShipToPhone(billToPhone);
                    }
                  }}
                />
                <Label htmlFor="sameAsBillTo" className="text-sm font-normal">Same as Bill To</Label>
              </div>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Name"
                value={sameAsBillTo ? billToName : shipToName}
                onChange={(e) => setShipToName(e.target.value)}
                disabled={sameAsBillTo}
              />
              <Textarea
                placeholder="Address"
                value={sameAsBillTo ? billToAddress : shipToAddress}
                onChange={(e) => setShipToAddress(e.target.value)}
                rows={2}
                disabled={sameAsBillTo}
              />
              <Input
                placeholder="Phone Number"
                value={sameAsBillTo ? billToPhone : shipToPhone}
                onChange={(e) => setShipToPhone(e.target.value)}
                disabled={sameAsBillTo}
              />
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-2 py-3 text-left font-medium">Source</th>
                <th className="px-2 py-3 text-left font-medium">Item No.</th>
                <th className="px-2 py-3 text-left font-medium">Description</th>
                <th className="px-2 py-3 text-right font-medium">Qty</th>
                <th className="px-2 py-3 text-right font-medium">Unit Price</th>
                <th className="px-2 py-3 text-right font-medium">Disc %</th>
                <th className="px-2 py-3 text-right font-medium">Amount</th>
                <th className="px-2 py-3 text-center font-medium no-print">Action</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Source"
                      value={item.source}
                      onChange={(e) => updateLineItem(item.id, 'source', e.target.value)}
                      className="h-9 w-24"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Item #"
                      value={item.itemNo}
                      onChange={(e) => updateLineItem(item.id, 'itemNo', e.target.value)}
                      className="h-9 w-20"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      className="h-9 min-w-[140px]"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-9 w-16 text-right"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="h-9 w-24 text-right"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent}
                      onChange={(e) => updateLineItem(item.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                      className="h-9 w-16 text-right"
                    />
                  </td>
                  <td className="px-2 py-2 text-right font-medium">
                    ${item.lineAmount.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center no-print">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            variant="outline"
            size="sm"
            onClick={addLineItem}
            className="no-print mt-3"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Row
          </Button>
        </div>

        {/* Delivery Charges */}
        <div className="mb-6 flex items-center gap-3">
          <Label>Delivery Charges:</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={deliveryCharges}
            onChange={(e) => setDeliveryCharges(parseFloat(e.target.value) || 0)}
            className="w-32"
          />
        </div>

        {/* Summary */}
        <div className="mb-8 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Select 
                  value={paymentMethod} 
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-muted-foreground">Sales Tax (6.25%):</span>
              <span className="font-medium">${salesTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-foreground">${total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Payments/Credits:</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="h-8 w-28 text-right"
              />
            </div>
            <div className={cn(
              "flex justify-between border-t border-border pt-2",
              balance > 0 ? "text-destructive" : "text-foreground"
            )}>
              <span className="font-semibold">Balance:</span>
              <span className="font-bold">${balance.toFixed(2)}</span>
            </div>
            {balance === 0 && (
              <p className="text-center text-sm font-medium text-green-600">PAID IN FULL</p>
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="mb-8 border-t border-border pt-6">
          <p className="mb-6 text-sm italic text-muted-foreground">
            By signing below, I find no defect or damage on the furniture.
          </p>
          <div className="flex flex-wrap justify-between gap-8">
            <div className="flex-1">
              <div className="mb-2 border-b border-foreground"></div>
              <p className="text-sm text-muted-foreground">Customer Signature</p>
            </div>
            <div className="w-48">
              <div className="mb-2 border-b border-foreground text-center">
                {formatDate(new Date(invoiceDate))}
              </div>
              <p className="text-center text-sm text-muted-foreground">Date</p>
            </div>
          </div>
        </div>

        {/* Return Terms */}
        <div className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-3 font-semibold text-foreground">
            Return Terms: Delivery and assembly fees are non-refundable.
          </p>
          <ol className="list-inside list-decimal space-y-2">
            {returnTerms.map((term, index) => (
              <li key={index}>
                <span className="font-medium text-foreground">{term.title}:</span>{' '}
                {term.content}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Spacer for print */}
      <div className="h-8"></div>
    </Layout>
  );
};

export default Invoice;
