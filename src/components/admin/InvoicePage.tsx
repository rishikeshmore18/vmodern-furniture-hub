import { useState, useRef } from 'react';
import { Plus, Trash2, Printer, FileText, Save } from 'lucide-react';
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

interface InvoicePageProps {
  isEmbedded?: boolean;
}

const InvoicePage = ({ isEmbedded = false }: InvoicePageProps) => {
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
    <div className={cn(!isEmbedded && "min-h-screen bg-background")}>
      <div className="no-print px-4 py-4">
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
        className="invoice-container mx-auto max-w-4xl bg-card p-4 shadow-sm print:shadow-none md:p-6"
      >
        {/* Header - Compact for print */}
        <div className="mb-4 flex flex-col gap-4 border-b border-border pb-3 md:flex-row md:justify-between print:mb-2 print:pb-2">
          <div className="print:text-xs">
            <h2 className="text-lg font-bold text-foreground print:text-sm">{storeInfo.name.toUpperCase()}</h2>
            <p className="text-sm text-muted-foreground print:text-xs">{storeInfo.address}</p>
            <p className="text-sm text-muted-foreground print:text-xs">{storeInfo.city}, {storeInfo.state} {storeInfo.zip}</p>
            <p className="text-sm text-muted-foreground print:text-xs">Phone: {storeInfo.phone}</p>
          </div>
          <div className="text-right print:text-xs">
            <p className="text-sm font-medium text-foreground print:text-xs">Business Hours:</p>
            <p className="text-sm text-muted-foreground print:text-xs">Mon-Sat: 11AM–5PM</p>
            <p className="text-sm text-muted-foreground print:text-xs">CLOSED SUNDAY</p>
          </div>
        </div>

        {/* Invoice Title */}
        <div className="mb-4 text-center print:mb-2">
          <h1 className="text-2xl font-bold tracking-wider text-foreground print:text-xl">INVOICE</h1>
        </div>

        {/* Date & Order Number */}
        <div className="mb-4 flex flex-wrap justify-between gap-4 print:mb-2 print:gap-2">
          <div className="flex items-center gap-2">
            <Label className="font-medium text-sm">Date:</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-auto h-8 text-sm print:border-0 print:p-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="font-medium text-sm">Order No.:</Label>
            <span className="text-base font-semibold text-foreground">{orderNumber}</span>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="mb-4 grid gap-4 md:grid-cols-2 print:mb-2 print:gap-2">
          <div>
            <h3 className="mb-2 font-semibold text-foreground text-sm print:mb-1">BILL TO</h3>
            <div className="space-y-2 print:space-y-1">
              <Input
                placeholder="Customer Name"
                value={billToName}
                onChange={(e) => setBillToName(e.target.value)}
                className="h-8 text-sm"
              />
              <Textarea
                placeholder="Address"
                value={billToAddress}
                onChange={(e) => setBillToAddress(e.target.value)}
                rows={2}
                className="text-sm min-h-[50px]"
              />
              <Input
                placeholder="Phone Number"
                value={billToPhone}
                onChange={(e) => setBillToPhone(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between print:mb-1">
              <h3 className="font-semibold text-foreground text-sm">SHIP TO</h3>
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
                <Label htmlFor="sameAsBillTo" className="text-xs font-normal">Same as Bill To</Label>
              </div>
            </div>
            <div className="space-y-2 print:space-y-1">
              <Input
                placeholder="Name"
                value={sameAsBillTo ? billToName : shipToName}
                onChange={(e) => setShipToName(e.target.value)}
                disabled={sameAsBillTo}
                className="h-8 text-sm"
              />
              <Textarea
                placeholder="Address"
                value={sameAsBillTo ? billToAddress : shipToAddress}
                onChange={(e) => setShipToAddress(e.target.value)}
                rows={2}
                disabled={sameAsBillTo}
                className="text-sm min-h-[50px]"
              />
              <Input
                placeholder="Phone Number"
                value={sameAsBillTo ? billToPhone : shipToPhone}
                onChange={(e) => setShipToPhone(e.target.value)}
                disabled={sameAsBillTo}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Line Items Table - Compact */}
        <div className="mb-3 overflow-x-auto print:mb-2">
          <table className="w-full text-xs print:text-[10px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-1 py-2 text-left font-medium print:py-1">Source</th>
                <th className="px-1 py-2 text-left font-medium print:py-1">Item#</th>
                <th className="px-1 py-2 text-left font-medium print:py-1">Description</th>
                <th className="px-1 py-2 text-right font-medium print:py-1">Qty</th>
                <th className="px-1 py-2 text-right font-medium print:py-1">Price</th>
                <th className="px-1 py-2 text-right font-medium print:py-1">Disc%</th>
                <th className="px-1 py-2 text-right font-medium print:py-1">Amount</th>
                <th className="px-1 py-2 text-center font-medium no-print">X</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className="border-b border-border/50 print:break-inside-avoid">
                  <td className="px-1 py-1">
                    <Input
                      placeholder="Src"
                      value={item.source}
                      onChange={(e) => updateLineItem(item.id, 'source', e.target.value)}
                      className="h-7 w-16 text-xs"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      placeholder="#"
                      value={item.itemNo}
                      onChange={(e) => updateLineItem(item.id, 'itemNo', e.target.value)}
                      className="h-7 w-14 text-xs"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      className="h-7 min-w-[100px] text-xs"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-7 w-12 text-right text-xs"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="h-7 w-20 text-right text-xs"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent}
                      onChange={(e) => updateLineItem(item.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                      className="h-7 w-12 text-right text-xs"
                    />
                  </td>
                  <td className="px-1 py-1 text-right font-medium">
                    ${item.lineAmount.toFixed(2)}
                  </td>
                  <td className="px-1 py-1 text-center no-print">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
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
            className="no-print mt-2 h-7 text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Row
          </Button>
        </div>

        {/* Delivery Charges */}
        <div className="mb-3 flex items-center gap-2 print:mb-2">
          <Label className="text-sm">Delivery Charges:</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={deliveryCharges}
            onChange={(e) => setDeliveryCharges(parseFloat(e.target.value) || 0)}
            className="w-24 h-7 text-sm"
          />
        </div>

        {/* Summary - Compact */}
        <div className="mb-4 flex justify-end print:mb-2">
          <div className="w-full max-w-xs space-y-1 text-sm print:text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 no-print">
                <Select 
                  value={paymentMethod} 
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="h-6 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="debit_card">Debit</SelectItem>
                    <SelectItem value="credit_card">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-muted-foreground">Tax (6.25%):</span>
              <span className="font-medium">${salesTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-foreground">${total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Paid:</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="h-6 w-24 text-right text-xs"
              />
            </div>
            <div className={cn(
              "flex justify-between border-t border-border pt-1",
              balance > 0 ? "text-destructive" : "text-foreground"
            )}>
              <span className="font-semibold">Balance:</span>
              <span className="font-bold">${balance.toFixed(2)}</span>
            </div>
            {balance === 0 && (
              <p className="text-center text-xs font-medium text-green-600">PAID IN FULL</p>
            )}
          </div>
        </div>

        {/* Signature Section - Compact */}
        <div className="mb-3 border-t border-border pt-3 print:mb-2 print:pt-2">
          <p className="mb-3 text-xs italic text-muted-foreground print:mb-2 print:text-[9px]">
            By signing below, I find no defect or damage on the furniture.
          </p>
          <div className="flex flex-wrap justify-between gap-4 print:gap-2">
            <div className="flex-1">
              <div className="mb-1 border-b border-foreground"></div>
              <p className="text-xs text-muted-foreground print:text-[9px]">Customer Signature</p>
            </div>
            <div className="w-32 print:w-24">
              <div className="mb-1 border-b border-foreground text-center text-sm">
                {formatDate(new Date(invoiceDate))}
              </div>
              <p className="text-center text-xs text-muted-foreground print:text-[9px]">Date</p>
            </div>
          </div>
        </div>

        {/* Return Terms - Very Compact */}
        <div className="border-t border-border pt-2 text-[9px] leading-tight text-muted-foreground print:text-[7px] print:leading-tight">
          <p className="mb-1 font-semibold text-foreground text-[10px] print:text-[8px]">
            Return Terms: Delivery and assembly fees are non-refundable.
          </p>
          <ol className="list-inside list-decimal space-y-0.5">
            {returnTerms.map((term, index) => (
              <li key={index} className="print:break-inside-avoid">
                <span className="font-medium text-foreground">{term.title}:</span>{' '}
                {term.content}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
