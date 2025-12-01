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
  Keyboard
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, parseErrorMessage } from "@/lib/utils";
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
  const productGridRef = useRef<HTMLDivElement>(null);

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
    const element = document.getElementById(`product-card-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Keyboard Navigation for Product Grid
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

  useHotkeys('right', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => {
      const next = Math.min(prev + 1, filteredProducts.length - 1);
      scrollSelectedIntoView(next);
      return next;
    });
  }, { enableOnFormTags: true }, [filteredProducts]);

  useHotkeys('left', (e) => {
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

  const handlePaymentSubmit = async () => {
    if (!customerId || !selectedBranch) {
      toast.error("Data customer atau cabang tidak valid");
      return;
    }
    if (payments.length === 0) {
      toast.error("Belum ada pembayaran");
      return;
    }

    setIsSubmitting(true);
    try {
      let saleId = editSaleId;

      if (saleId) {
        await updateHeader({
          saleId,
          customerId: customerId as Id<"customers">,
          branchId: selectedBranch as Id<"branches">,
          notes: transactionNotes || undefined,
        });
        await clearItems({ saleId });
      } else {
        const sale = await createSale({
          customerId: customerId as Id<"customers">,
          branchId: selectedBranch as Id<"branches">,
          saleDate: Date.now(),
          notes: transactionNotes || undefined,
        });
        saleId = sale.saleId;
      }

      if (!saleId) throw new Error("Sale ID missing");

      for (const item of cart) {
        await addItem({
          saleId: saleId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          discountType: item.discountType,
          notes: item.notes,
        });
      }

      await updateDiscountAndTax({
        saleId: saleId,
        discountAmount: globalDiscount.amount,
        discountType: globalDiscount.type,
        taxRate: taxRate,
      });

      const result = await submitSale({
        saleId: saleId,
        payments: payments.map(p => ({
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber || undefined,
          notes: p.notes || undefined,
        })),
      });

      toast.success(`Transaksi Berhasil! Kembalian: ${formatCurrency(result.change)}`);

      if (editSaleId) {
        router.push("/dashboard/sales");
      } else {
        setCart([]);
        setPayments([]);
        setTransactionNotes("");
        setGlobalDiscount({ amount: 0, type: "nominal" });
        setIsPaymentDialogOpen(false);
      }
    } catch (error: any) {
      toast.error(parseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPayment = () => {
    if (currentPayment.amount <= 0) return;
    setPayments([...payments, currentPayment]);
    setCurrentPayment({ ...currentPayment, amount: 0, referenceNumber: "", notes: "" });
  };

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col md:flex-row bg-muted/40 overflow-hidden max-w-[1400px] mx-auto border-x border-border shadow-sm">
      {/* LEFT SIDE: Product Catalog */}
      <div className="flex-1 flex flex-col border-r border-border h-full">
        {/* Header / Filter Bar */}
        <div className="p-4 bg-card border-b border-border space-y-4">
          <div className="flex gap-4 items-center">
            {editSaleId && (
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                placeholder="Cari produk (F2)..."
                className="pl-9 bg-muted border-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
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

        {/* Product Grid */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 lg:gap-3 pb-20" ref={productGridRef}>
            {filteredProducts.map((product, index) => (
              <Card
                key={product._id}
                id={`product-card-${index}`}
                className={`cursor-pointer hover:shadow-md transition-all active:scale-95 overflow-hidden group flex flex-col ${selectedIndex === index ? "ring-2 ring-primary shadow-md scale-[1.02]" : "border-border"
                  }`}
                onClick={() => handleProductClick(product)}
              >
                <div className="h-28 lg:h-36 bg-muted flex items-center justify-center relative">
                  {/* Placeholder for image */}
                  <Package className="h-10 w-10 text-muted-foreground/50" />
                  {product.hasVariants && (
                    <Badge className="absolute top-2 right-2 bg-primary hover:bg-primary/90 text-[10px] px-1.5 h-5 text-primary-foreground">
                      Varian
                    </Badge>
                  )}
                </div>
                <div className="p-2 lg:p-2.5 flex flex-col flex-1 bg-card">
                  <h3 className="font-medium text-xs lg:text-sm line-clamp-2 leading-tight mb-auto min-h-[2.5em] text-card-foreground">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-primary text-sm">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                    <Button size="icon" variant="ghost" className={`h-6 w-6 rounded-full bg-primary/10 text-primary transition-opacity ${selectedIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    SKU: {product.sku}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT SIDE: Cart / Transaction */}
      <div className="w-full md:w-[340px] lg:w-[380px] xl:w-[420px] bg-card flex flex-col h-full shadow-xl z-10 border-l border-border">
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
          {cart.length === 0 ? (
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
          )}
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

                  <Button onClick={addPayment} className="w-full" variant="secondary">
                    Tambah Pembayaran
                  </Button>

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
                </div>

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