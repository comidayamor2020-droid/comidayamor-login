import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useProducts, useUserCompany, useCreateOrder, CartItem } from "@/hooks/use-b2b";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Minus, Trash2, Send } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function PortalB2B() {
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: company, isLoading: loadingCompany } = useUserCompany();
  const createOrder = useCreateOrder();
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");

  const addToCart = (product: { id: string; nome: string; preco_venda: number | null; custo_estimado: number | null }) => {
    const price = product.preco_venda ?? product.custo_estimado ?? 0;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product_id: product.id, nome: product.nome, unit_price: price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleSubmit = async () => {
    if (!company) {
      toast.error("Sua conta não está vinculada a uma empresa. Entre em contato com o administrador.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um produto ao pedido.");
      return;
    }

    try {
      await createOrder.mutateAsync({ items: cart, notes, companyId: company.id });
      toast.success("Pedido enviado com sucesso!");
      setCart([]);
      setNotes("");
      navigate("/b2b/pedidos");
    } catch {
      toast.error("Erro ao enviar pedido. Tente novamente.");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Portal B2B</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione os produtos e crie seu pedido
        </p>
      </div>

      {!loadingCompany && !company && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Sua conta ainda não está vinculada a uma empresa B2B. Entre em contato com o administrador.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Product list */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Produtos</h2>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            </div>
          ) : !products?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum produto disponível.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => {
                const price = p.preco_venda ?? p.custo_estimado ?? 0;
                const inCart = cart.find((i) => i.product_id === p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{p.nome}</p>
                      {p.categoria && (
                        <p className="text-xs text-muted-foreground">{p.categoria}</p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-foreground">{formatBRL(price)}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-1">
                      {inCart ? (
                        <>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(p.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{inCart.quantity}</span>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(p.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => addToCart(p)}>
                          <Plus className="mr-1 h-3 w-3" /> Adicionar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart summary */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            <ShoppingCart className="h-4 w-4" /> Resumo do Pedido
          </h2>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            {cart.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum item adicionado.</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x {formatBRL(item.unit_price)}
                      </p>
                    </div>
                    <div className="ml-2 flex items-center gap-2">
                      <span className="font-medium text-foreground">{formatBRL(item.unit_price * item.quantity)}</span>
                      <button onClick={() => removeFromCart(item.product_id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>Total</span>
                    <span>{formatBRL(total)}</span>
                  </div>
                </div>

                <Textarea
                  placeholder="Observações do pedido (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                />

                <Button
                  className="mt-3 w-full"
                  onClick={handleSubmit}
                  disabled={createOrder.isPending || !company}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {createOrder.isPending ? "Enviando..." : "Enviar Pedido"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
