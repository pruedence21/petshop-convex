"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Package,
  ArrowLeft,
  ScanBarcode,
  Keyboard,
  Stethoscope,
  BedDouble
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { formatErrorMessage } from "@/lib/error-handling";
import { useRouter, useSearchParams } from "next/navigation";
import { AddCustomerDialog } from "@/components/dialogs/AddCustomerDialog";
import { useHotkeys } from 'react-hotkeys-hook';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';

// Types
type CartItem = {
  productId: Id<"products">;
  variantId?: Id<"productVariants">;
  name: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountType: "percent" | "nominal";
  notes?: string;
  maxStock: number;
};

type PaymentItem = {
  amount: number;
  paymentMethod: "CASH" | "QRIS" | "CREDIT" | "BANK_TRANSFER" | "DEBIT_CARD";
  referenceNumber?: string;
  notes?: string;
};

export default function SalesPOSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSaleIdRaw = searchParams.get("edit");

  const isValidEditId = editSaleIdRaw && editSaleIdRaw.length > 8 && editSaleIdRaw !== "page";
  const editSaleId = isValidEditId ? (editSaleIdRaw as Id<"sales">) : null;

  // -- State --
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "">("");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // Transaction State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<Id<"customers"> | "">("");
  const [transactionNotes, setTransactionNotes] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState({ amount: 0, type: "nominal" as "percent" | "nominal" });

  const [taxRate, setTaxRate] = useState(0);
  const [dueDate, setDueDate] = useState<number | undefined>(undefined);

  // Payment State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [currentPayment, setCurrentPayment] = useState<PaymentItem>({
    amount: 0,
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keyboard Navigation State
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const productListRef = useRef<HTMLDivElement>(null);

  // -- Queries --
  const branches = useQuery(api.master_data.branches.list, { includeInactive: false });
  const products = useQuery(api.inventory.products.list, { includeInactive: false });
  const categories = useQuery(api.inventory.productCategories.list, { includeInactive: false });
  const customers = useQuery(api.master_data.customers.list, { includeInactive: false });
  const umumCustomer = useQuery(api.master_data.customers.getOrCreateDefault, {});

  // Fetch existing sale if in edit mode
  const existingSale = useQuery(api.sales.sales.get, editSaleId ? { id: editSaleId } : "skip");

  const [selectedProductForVariantSelection, setSelectedProductForVariantSelection] = useState<any>(null);
  const variantsForSelection = useQuery(
    api.inventory.productVariants.listByProduct,
    selectedProductForVariantSelection
      ? { productId: selectedProductForVariantSelection._id, includeInactive: false }
      : "skip"
  );

  // -- Mutations --
  const createSale = useMutation(api.sales.sales.create);
  const updateHeader = useMutation(api.sales.sales.updateHeader);
  const addItem = useMutation(api.sales.sales.addItem);
  const clearItems = useMutation(api.sales.sales.clearItems);
  const updateDiscountAndTax = useMutation(api.sales.sales.updateDiscountAndTax);
  const submitSale = useMutation(api.sales.sales.submitSale);
  const createDefaultCustomer = useMutation(api.master_data.customers.createDefaultCustomer);

  // -- Handlers --
  const addToCart = (product: any, variant?: any) => {
    setCart(prev => {
      const existing = prev.find(item =>
        item.productId === product._id && item.variantId === variant?._id
      );

      if (existing) {
        return prev.map(item =>
          (item.productId === product._id && item.variantId === variant?._id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, {
        productId: product._id,
        variantId: variant?._id,
        name: product.name,
        variantName: variant?.variantName ? `${variant.variantName}: ${variant.variantValue}` : undefined,
        quantity: 1,
        unitPrice: variant ? variant.sellingPrice : product.sellingPrice,
        discountAmount: 0,
        discountType: "nominal",
        maxStock: 100,
      }];
    });

    if (variant) {
      setSelectedProductForVariantSelection(null);
      toast.success(`Ditambahkan: ${product.name} - ${variant.variantValue}`);
    } else {
      toast.success(`Ditambahkan: ${product.name}`);
    }
  };

  const handleProductClick = (product: any) => {
    if (product.hasVariants) {
      setSelectedProductForVariantSelection(product);
    } else {
      addToCart(product);
    }
  };

  // -- Computed --
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const discount = item.discountType === "percent"
        ? itemTotal * (item.discountAmount / 100)
        : item.discountAmount;
      return sum + (itemTotal - discount);
    }, 0);
  }, [cart]);

  const transactionDiscount = useMemo(() => {
    if (globalDiscount.type === "percent") {
      return cartSubtotal * (globalDiscount.amount / 100);
    }
    return globalDiscount.amount;
  }, [cartSubtotal, globalDiscount]);

  const taxAmount = useMemo(() => {
    return (cartSubtotal - transactionDiscount) * (taxRate / 100);
  }, [cartSubtotal, transactionDiscount, taxRate]);

  const grandTotal = useMemo(() => {
    return cartSubtotal - transactionDiscount + taxAmount;
  }, [cartSubtotal, transactionDiscount, taxAmount]);

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const changeAmount = Math.max(0, totalPaid - grandTotal);
  const outstandingAmount = Math.max(0, grandTotal - totalPaid);

  // -- Hooks & Effects --

  // Reset selection when search or category changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery, selectedCategory]);

  const scrollSelectedIntoView = (index: number) => {
    const element = document.getElementById(`product-row-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Keyboard Navigation for Product List
  useHotkeys('down', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => {
      const next = Math.min(prev + 1, filteredProducts.length - 1);
      scrollSelectedIntoView(next);
      return next;
    });
  }, { enableOnFormTags: true }, [filteredProducts]);

  useHotkeys('up', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => {
      const next = Math.max(prev - 1, 0);
      scrollSelectedIntoView(next);
      return next;
    });
  }, { enableOnFormTags: true }, [filteredProducts]);

  useHotkeys('enter', (e) => {
    if (selectedIndex >= 0 && selectedIndex < filteredProducts.length && !isPaymentDialogOpen && !selectedProductForVariantSelection) {
      e.preventDefault();
      handleProductClick(filteredProducts[selectedIndex]);
    }
  }, { enableOnFormTags: true }, [selectedIndex, filteredProducts, isPaymentDialogOpen, selectedProductForVariantSelection]);

  // Barcode Scanner
  useBarcodeScanner({
    onScan: (barcode) => {
      if (!products) return;
      const match = products.find(p => p.sku === barcode);
      if (match) {
        handleProductClick(match);
      } else {
        toast.error(`Produk tidak ditemukan: ${barcode}`);
      }
    }
  });

  // Hotkeys
  useHotkeys('f2', (e) => {
    e.preventDefault();
    document.getElementById('product-search')?.focus();
    setSelectedIndex(-1);
  });

  useHotkeys('f4', (e) => {
    e.preventDefault();
    if (cart.length > 0) setIsPaymentDialogOpen(true);
  });

  useHotkeys('esc', (e) => {
    if (isPaymentDialogOpen) {
      e.preventDefault();
      setIsPaymentDialogOpen(false);
    } else if (selectedProductForVariantSelection) {
      e.preventDefault();
      setSelectedProductForVariantSelection(null);
    } else {
      setSelectedIndex(-1);
      document.getElementById('product-search')?.blur();
    }
  });

  // Payment Dialog Hotkeys
  useHotkeys('f1', (e) => {
    if (isPaymentDialogOpen) {
      e.preventDefault();
      setCurrentPayment(prev => ({ ...prev, amount: grandTotal }));
    }
  }, { enableOnFormTags: true });

  // Module Shortcuts
  useHotkeys('f8', (e) => {
    e.preventDefault();
    router.push('/dashboard/clinic/appointments');
  });

  useHotkeys('f9', (e) => {
    e.preventDefault();
    router.push('/dashboard/hotel/bookings');
  });

  // Initialize from existing sale
  useEffect(() => {
    if (existingSale) {
      setSelectedBranch(existingSale.branchId);
      setCustomerId(existingSale.customerId);
      setTransactionNotes(existingSale.notes || "");
      setGlobalDiscount({
        amount: existingSale.discountAmount,
        type: existingSale.discountType as "percent" | "nominal"
      });
      setTaxRate(existingSale.taxRate);

      if (existingSale.items) {
        const mappedItems: CartItem[] = existingSale.items.map((item: any) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.product?.name || "Unknown",
          variantName: item.variant ? `${item.variant.variantName}: ${item.variant.variantValue}` : undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          discountType: item.discountType as "percent" | "nominal",
          notes: undefined,
          maxStock: 100,
        }));
        setCart(mappedItems);
      }
    }
  }, [existingSale]);

  // Auto-select first branch
  useEffect(() => {
    if (!editSaleId && branches && branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]._id);
    }
  }, [branches, editSaleId]);

  // Auto-select UMUM customer
  useEffect(() => {
    if (!editSaleId && umumCustomer && !customerId) {
      setCustomerId(umumCustomer._id);
    }
  }, [umumCustomer, editSaleId]);

  // Auto-create UMUM if missing
  useEffect(() => {
    if (customers !== undefined && umumCustomer === null) {
      createDefaultCustomer({});
    }
  }, [customers, umumCustomer]);

  // -- More Handlers --
  const updateCartItemQty = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      newCart[index] = { ...item, quantity: newQty };
      return newCart;
    });
  };

  const removeCartItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const addPayment = () => {
    if (currentPayment.amount <= 0) return;
    setPayments(prev => [...prev, currentPayment]);
    setCurrentPayment({
      amount: 0,
      paymentMethod: "CASH",
      referenceNumber: "",
      notes: "",
    });
  };

  const handlePaymentSubmit = async () => {
    if (!selectedBranch || !customerId || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      // 1. Create Sale Header
      const { saleId } = await createSale({
        branchId: selectedBranch as Id<"branches">,
        customerId: customerId as Id<"customers">,
        saleDate: Date.now(),
        dueDate: dueDate,
        notes: transactionNotes,
      });

      // 1b. Update Discount & Tax
      if (globalDiscount.amount > 0 || taxRate > 0) {
        await updateDiscountAndTax({
          saleId,
          discountAmount: globalDiscount.amount,
          discountType: globalDiscount.type,
          taxRate: taxRate,
        });
      }

      // 2. Add Items
      for (const item of cart) {
        await addItem({
          saleId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          discountType: item.discountType,
          notes: item.notes,
        });
      }

      // 3. Complete Sale (this handles stock & journal)
      await submitSale({ saleId, payments });

      toast.success("Transaksi berhasil disimpan!");
      setCart([]);
      setPayments([]);
      setCustomerId(umumCustomer?._id || "");
      setIsPaymentDialogOpen(false);

    } catch (error: any) {
      toast.error(formatErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* LEFT SIDE: Product List */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-border bg-card space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk (F2)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                id="product-search"
                className="pl-9"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <Badge variant="outline" className="text-[10px] text-muted-foreground h-5 px-1 border-border">F2</Badge>
              </div>
            </div>
            <Select value={selectedBranch as string} onValueChange={(v) => setSelectedBranch(v as Id<"branches">)}>
              <SelectTrigger className="w-[140px] md:w-[200px]">
                <SelectValue placeholder="Pilih Cabang" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map(b => (
                  <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" title="Klinik (F8)" onClick={() => router.push('/dashboard/clinic/appointments')}>
                <Stethoscope className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Hotel (F9)" onClick={() => router.push('/dashboard/hotel/bookings')}>
                <BedDouble className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="rounded-full"
              >
                Semua
              </Button>
              {categories?.map(cat => (
                <Button
                  key={cat._id}
                  variant={selectedCategory === cat._id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat._id)}
                  className="rounded-full"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-auto bg-background" ref={productListRef}>
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[50%]">Nama Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, index) => (
                <TableRow
                  key={product._id}
                  id={`product-row-${index}`}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedIndex === index ? "bg-muted border-l-4 border-l-primary" : ""
                    }`}
                  onClick={() => handleProductClick(product)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {product.name}
                      {product.hasVariants && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          Varian
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{product.sku}</TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(product.sellingPrice)}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Tidak ada produk ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* RIGHT SIDE: Cart / Transaction */}
      <div className="w-full md:w-[340px] lg:w-[380px] xl:w-[420px] bg-card flex flex-col h-full shadow-xl z-20 border-l border-border">
        {/* Customer Selector */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</Label>
            </div>
            {editSaleId && (
              <Badge variant="outline" className="text-xs border-border text-muted-foreground">Editing: {existingSale?.saleNumber}</Badge>
            )}
          </div>
          <Select
            value={customerId as string}
            onValueChange={(v) => {
              if (v === "ADD_NEW") {
                setIsAddCustomerOpen(true);
                return;
              }
              setCustomerId(v as Id<"customers">);
            }}
          >
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="Pilih Customer" />
            </SelectTrigger>
            <SelectContent>
              {customers?.map(c => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name} {c.code === "UMUM" && "(Walk-in)"}
                </SelectItem>
              ))}
              <SelectItem value="ADD_NEW" className="font-medium text-primary border-t border-border mt-1 pt-1">
                + Tambah Pelanggan Baru
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-hidden flex flex-col bg-card">
          {
            cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-medium">Keranjang Kosong</p>
                <p className="text-sm mt-1">Pilih produk di sebelah kiri untuk memulai transaksi</p>
                <div className="mt-8 flex gap-4 text-xs text-muted-foreground/70">
                  <div className="flex items-center gap-1"><Keyboard className="h-3 w-3" /> <span>F2: Cari</span></div>
                  <div className="flex items-center gap-1"><ScanBarcode className="h-3 w-3" /> <span>Scan Barcode</span></div>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {cart.map((item, index) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex gap-2 lg:gap-3 bg-card border border-border p-2 lg:p-3 rounded-lg shadow-sm">
                      <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate text-card-foreground">{item.name}</h4>
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground truncate">{item.variantName}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3 bg-muted/50 rounded-md p-1">
                            <button
                              onClick={() => updateCartItemQty(index, -1)}
                              className="h-6 w-6 flex items-center justify-center hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-medium w-4 text-center text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => updateCartItemQty(index, 1)}
                              className="h-6 w-6 flex items-center justify-center hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm text-foreground">{formatCurrency(item.unitPrice * item.quantity)}</p>
                            {item.quantity > 1 && (
                              <p className="text-[10px] text-muted-foreground">@{formatCurrency(item.unitPrice)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCartItem(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors self-start"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )
          }
        </div>

        {/* Totals & Actions */}
        <div className="p-4 bg-card border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="space-y-1.5 lg:space-y-2 mb-3 lg:mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatCurrency(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <span className="text-foreground">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-dashed border-border">
              <span className="text-foreground">Total</span>
              <span className="text-primary">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full border-input hover:bg-accent hover:text-accent-foreground" onClick={() => editSaleId ? router.back() : setCart([])}>
              Batal
            </Button>
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={cart.length === 0}>
                  Bayar (F4)
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-card-foreground">Pembayaran</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Total Tagihan: {formatCurrency(grandTotal)}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Quick Cash Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPayment({ ...currentPayment, amount: grandTotal })}
                      className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                    >
                      Uang Pas (F1)
                    </Button>
                    {[50000, 100000].map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPayment({ ...currentPayment, amount })}
                        className="border-input hover:bg-accent hover:text-accent-foreground"
                      >
                        {formatCurrency(amount)}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Metode Pembayaran</Label>
                    <Select
                      value={currentPayment.paymentMethod}
                      onValueChange={(v: any) => setCurrentPayment({ ...currentPayment, paymentMethod: v })}
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Tunai</SelectItem>
                        <SelectItem value="QRIS">QRIS</SelectItem>
                        <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                        <SelectItem value="CREDIT">Credit Card</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Jumlah Bayar</Label>
                    <Input
                      type="number"
                      value={currentPayment.amount || ""}
                      onChange={(e) => setCurrentPayment({ ...currentPayment, amount: parseFloat(e.target.value) || 0 })}
                      autoFocus
                      className="bg-background border-input"
                    />
                  </div>

                  {currentPayment.paymentMethod !== "CASH" && (
                    <div className="space-y-2">
                      <Label className="text-foreground">No. Referensi</Label>
                      <Input
                        value={currentPayment.referenceNumber || ""}
                        onChange={(e) => setCurrentPayment({ ...currentPayment, referenceNumber: e.target.value })}
                        placeholder="No. Ref / Approval Code"
                        className="bg-background border-input"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-foreground">Jatuh Tempo (Opsional)</Label>
                    <Input
                      type="date"
                      value={dueDate ? new Date(dueDate).toISOString().split('T')[0] : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value).getTime() : undefined;
                        setDueDate(date);
                      }}
                      className="bg-background border-input"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={addPayment}
                      disabled={currentPayment.amount <= 0}
                    >
                      Tambah Pembayaran
                    </Button>
                  </div>
                </div>

                {/* Payment List */}
                {payments.length > 0 && (
                  <div className="bg-muted p-3 rounded-md space-y-2 mt-4">
                    {payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm text-foreground">
                        <span>{p.paymentMethod}</span>
                        <span>{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                      <span>Total Dibayar</span>
                      <span>{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{changeAmount > 0 ? "Kembalian" : "Kurang Bayar"}</span>
                      <span className={changeAmount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                        {formatCurrency(changeAmount > 0 ? changeAmount : outstandingAmount)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handlePaymentSubmit}
                  className="w-full"
                  disabled={(totalPaid < grandTotal && customerId === umumCustomer?._id) || isSubmitting}
                >
                  {isSubmitting ? "Memproses..." : "Selesaikan Transaksi"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Variant Selection Dialog */}
      <Dialog open={!!selectedProductForVariantSelection} onOpenChange={(open) => !open && setSelectedProductForVariantSelection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Varian: {selectedProductForVariantSelection?.name}</DialogTitle>
            <DialogDescription>
              Pilih varian produk yang ingin ditambahkan ke keranjang.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {variantsForSelection?.map((variant: any) => (
              <Button
                key={variant._id}
                variant="outline"
                className="justify-between h-auto py-3"
                onClick={() => addToCart(selectedProductForVariantSelection, variant)}
              >
                <span>{variant.variantName}: {variant.variantValue}</span>
                <span className="font-bold">{formatCurrency(variant.sellingPrice)}</span>
              </Button>
            ))}
            {variantsForSelection?.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Tidak ada varian tersedia</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddCustomerDialog
        open={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onSuccess={(id) => setCustomerId(id as Id<"customers">)}
      />
    </div>
  );
}