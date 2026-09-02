package com.integrador.api.pizza.config;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Configuration
public class DemoDataConfiguration {
    private static BigDecimal money(String value) { return new BigDecimal(value); }

    @Bean
    CommandLineRunner demoData(ProductRepository products, CustomerRepository customers,
                               DiningTableRepository tables, InventoryRepository inventory,
                               SaleOrderRepository orders, FinanceRepository finance) {
        return args -> {
            if (products.count() > 0) return;
            List<Product> menu = products.saveAll(List.of(
                    product("Margherita Suprema", "Pizzas", "Tomate San Marzano, fior di latte e pesto de manjericao", "54.90", "18.20", "#e9652d"),
                    product("Pepperoni Piccante", "Pizzas", "Pepperoni artesanal, mozzarella e mel apimentado", "64.90", "22.80", "#d84032"),
                    product("Burrata & Parma", "Pizzas", "Burrata cremosa, presunto cru e rucula selvagem", "78.90", "31.50", "#8d5d43"),
                    product("Quattro Formaggi", "Pizzas", "Mozzarella, gorgonzola, provolone e parmesao", "69.90", "25.30", "#d79532"),
                    product("Trufada Funghi", "Pizzas", "Cogumelos, creme de trufas e tomilho fresco", "76.90", "29.40", "#7a6048"),
                    product("Diavola", "Pizzas", "Calabresa artesanal, cebola roxa e pimenta calabresa", "61.90", "21.10", "#b7352b"),
                    product("Burrata ao Forno", "Entradas", "Tomates confitados, focaccia e azeite de ervas", "38.00", "13.20", "#cc7042"),
                    product("Arancini", "Entradas", "Bolinhos de risoto, queijo e aioli de limao", "32.00", "11.40", "#da9b36"),
                    product("Tiramisu da Casa", "Sobremesas", "Mascarpone, cafe espresso e cacau belga", "26.00", "8.30", "#654438"),
                    product("Cannoli de Pistache", "Sobremesas", "Ricota doce, pistache e chocolate meio amargo", "24.00", "7.80", "#72864d"),
                    product("Limonata Siciliana", "Bebidas", "Limao siciliano, soda e alecrim", "14.00", "3.90", "#8ea94f"),
                    product("Vinho Tinto da Casa", "Bebidas", "Taca de corte italiano selecionado", "28.00", "9.50", "#77323b")
            ));
            customers.saveAll(List.of(
                    Customer.builder().name("Marina Costa").phone("(11) 99942-1820").email("marina@email.com").address("Alameda Santos, 420").ordersCount(18).build(),
                    Customer.builder().name("Rafael Almeida").phone("(11) 98831-4402").email("rafael@email.com").address("Rua Oscar Freire, 88").ordersCount(12).build(),
                    Customer.builder().name("Bianca Ferreira").phone("(11) 97710-2265").email("bianca@email.com").address("Rua Bela Cintra, 710").ordersCount(9).build(),
                    Customer.builder().name("Lucas Martins").phone("(11) 96622-8091").email("lucas@email.com").address("Av. Paulista, 1560").ordersCount(7).build()
            ));
            for (int i = 1; i <= 12; i++) {
                DiningTable.Status status = i == 3 || i == 7 || i == 9 ? DiningTable.Status.OCCUPIED : i == 11 ? DiningTable.Status.RESERVED : DiningTable.Status.AVAILABLE;
                tables.save(DiningTable.builder().number(i).seats(i % 4 == 0 ? 6 : 4).area(i <= 6 ? "Sala principal" : "Terraco").status(status).build());
            }
            inventory.saveAll(List.of(
                    stock("Farinha italiana 00", "kg", "42.5", "18", "Casa do Padeiro", 62), stock("Mozzarella fior di latte", "kg", "8.4", "10", "Laticinios Aurora", 8),
                    stock("Tomate San Marzano", "kg", "14.2", "8", "Emporio Italia", 24), stock("Pepperoni artesanal", "kg", "5.1", "4", "Salumeria Roma", 18),
                    stock("Burrata", "un", "6", "8", "Laticinios Aurora", 5), stock("Azeite extravirgem", "l", "11", "5", "Emporio Italia", 120),
                    stock("Caixas delivery G", "un", "84", "50", "Pack Food", 365), stock("Cogumelos frescos", "kg", "2.2", "3", "Horta Viva", 3)
            ));
            finance.saveAll(List.of(
                    entry("Fechamento do salao", "Vendas", FinanceEntry.Type.INCOME, FinanceEntry.Status.PAID, "4280.50", 0),
                    entry("Fornecedor de laticinios", "Fornecedores", FinanceEntry.Type.EXPENSE, FinanceEntry.Status.PENDING, "1380.00", 2),
                    entry("Energia eletrica", "Operacional", FinanceEntry.Type.EXPENSE, FinanceEntry.Status.PENDING, "864.30", 5),
                    entry("Manutencao do forno", "Manutencao", FinanceEntry.Type.EXPENSE, FinanceEntry.Status.OVERDUE, "490.00", -2)
            ));
            seedOrders(orders, menu);
        };
    }

    private Product product(String name, String category, String description, String price, String cost, String accent) {
        return Product.builder().name(name).category(category).description(description).price(money(price)).cost(money(cost)).accent(accent).active(true).build();
    }
    private InventoryItem stock(String name, String unit, String quantity, String minimum, String supplier, int expiresIn) {
        return InventoryItem.builder().name(name).unit(unit).quantity(money(quantity)).minimumQuantity(money(minimum)).supplier(supplier).expiresAt(LocalDate.now().plusDays(expiresIn)).build();
    }
    private FinanceEntry entry(String description, String category, FinanceEntry.Type type, FinanceEntry.Status status, String amount, int dueIn) {
        return FinanceEntry.builder().description(description).category(category).type(type).status(status).amount(money(amount)).dueDate(LocalDate.now().plusDays(dueIn)).build();
    }
    private void seedOrders(SaleOrderRepository orders, List<Product> menu) {
        SaleOrder.Status[] statuses = {SaleOrder.Status.PREPARING, SaleOrder.Status.READY, SaleOrder.Status.RECEIVED, SaleOrder.Status.COMPLETED};
        for (int i = 1; i <= 18; i++) {
            Product first = menu.get(i % 6); Product second = menu.get(6 + (i % 5));
            int daysAgo = i % 7; int qty = i % 3 == 0 ? 2 : 1;
            List<SaleOrder.OrderLine> lines = List.of(
                    SaleOrder.OrderLine.builder().productId(first.getId()).productName(first.getName()).quantity(qty).unitPrice(first.getPrice()).build(),
                    SaleOrder.OrderLine.builder().productId(second.getId()).productName(second.getName()).quantity(1).unitPrice(second.getPrice()).build());
            BigDecimal total = first.getPrice().multiply(BigDecimal.valueOf(qty)).add(second.getPrice());
            orders.save(SaleOrder.builder().code("A" + String.format("%04d", i)).status(i <= 4 ? statuses[i - 1] : SaleOrder.Status.COMPLETED)
                    .type(i % 3 == 0 ? SaleOrder.Type.DELIVERY : i % 3 == 1 ? SaleOrder.Type.DINE_IN : SaleOrder.Type.PICKUP)
                    .tableNumber(i % 3 == 1 ? (i % 12) + 1 : null).customerName(i % 2 == 0 ? "Marina Costa" : "Cliente avulso")
                    .paymentMethod(i % 2 == 0 ? "PIX" : "Cartao").total(total).items(lines)
                    .createdAt(LocalDateTime.now().minusDays(daysAgo).minusMinutes(i * 7L)).build());
        }
    }
}
