import { useQuery } from '@tanstack/react-query';

/**
 * Lê o extrato completo de transações reais do Back-End Spring Boot,
 * ordenado da mais recente para a mais antiga.
 */
export function useTransactionHistory() {
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      // 1. Vai buscar a verdade absoluta no seu Java
      const response = await fetch("http://localhost:8080/api/transactions");
      
      if (!response.ok) {
        throw new Error("Falha ao buscar histórico de transações reais");
      }
      
      const dbTransactions = await response.json();

      // 2. Traduz o "idioma" do Java para o "idioma" da tabela do template
      return dbTransactions.map((t: any) => ({
        id: t.id.toString(),
        type: t.type,                // 'BUY' ou 'SELL'
        ticker: t.assetSymbol,       // O Java chama de assetSymbol, o template lê ticker
        assetClass: 'STOCK',         // Forçando para Ação por enquanto
        quantity: Number(t.quantity),
        pricePaid: Number(t.price),  // A tabela lê pricePaid
        purchasedAt: t.transactionDate // Aqui a data mapeada pro ordenamento funcionar!
      }));
    },
  });

  // 3. Ordena os dados da data mais nova para a mais velha
  const transactions = [...(query.data ?? [])].sort((a, b) => {
    // Evita erros caso alguma transação antiga não tenha data
    if (!a.purchasedAt || !b.purchasedAt) return 0;
    return b.purchasedAt.localeCompare(a.purchasedAt);
  });

  return { ...query, transactions };
}