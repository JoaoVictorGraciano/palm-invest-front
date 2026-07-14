import { useState } from "react";

export function TransactionForm() {
  const [formData, setFormData] = useState({
    type: "BUY",
    assetSymbol: "",
    quantity: "",
    price: "",
    transactionDate: new Date().toISOString().slice(0, 16),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:8080/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: formData.type,
          assetSymbol: formData.assetSymbol.toUpperCase(),
          quantity: Number(formData.quantity),
          price: Number(formData.price),
          transactionDate: formData.transactionDate,
        }),
      });

      if (response.ok) {
        alert("Transação salva com sucesso no Banco de Dados!");
        setFormData({ ...formData, assetSymbol: "", quantity: "", price: "" });
      } else {
        alert("Erro ao salvar transação.");
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
      alert("Erro ao conectar com a API Spring Boot.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm mt-6">
      <h2 className="text-xl font-bold mb-4">Nova Transação</h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Tipo</label>
            <select
              className="border p-2 rounded-md"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="BUY">Compra</option>
              <option value="SELL">Venda</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Ativo (Ex: PETR4)</label>
            <input
              type="text"
              className="border p-2 rounded-md uppercase"
              required
              value={formData.assetSymbol}
              onChange={(e) => setFormData({ ...formData, assetSymbol: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Quantidade</label>
            <input
              type="number"
              className="border p-2 rounded-md"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              className="border p-2 rounded-md"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 bg-black text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-800 transition"
        >
          Salvar no Banco de Dados
        </button>
      </form>
    </div>
  );
}