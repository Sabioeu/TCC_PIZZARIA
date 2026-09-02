package com.integrador.api.pizza.config;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Configuration
public class DemoDataConfiguration {
    private static BigDecimal number(String value) { return new BigDecimal(value); }

    @Bean
    CommandLineRunner demoData(@Value("${aurora.demo-data:true}") boolean enabled,
                               BranchRepository branches, AppUserRepository users, ProductRepository products,
                               CustomerRepository customers, DiningTableRepository tables, InventoryRepository inventory,
                               SaleOrderRepository orders, FinanceRepository finance, SupplierRepository suppliers,
                               RecipeRepository recipes, CouponRepository coupons, BusinessSettingsRepository settings,
                               PurchaseOrderRepository purchases, ReservationRepository reservations,
                               CashSessionRepository cashSessions, CashMovementRepository cashMovements,
                               PasswordEncoder passwordEncoder) {
        return args -> {
            if (!enabled || branches.count() > 0) return;
            Branch jardins = branches.save(Branch.builder().code("JARDINS").name("Aurora Jardins")
                    .address("Alameda dos Sabores, 188 · Sao Paulo, SP").phone("(11) 3456-7890").build());
            Branch pinheiros = branches.save(Branch.builder().code("PINHEIROS").name("Aurora Pinheiros")
                    .address("Rua dos Pinheiros, 874 · Sao Paulo, SP").phone("(11) 3344-2288").build());
            seedSettings(settings, jardins, "12.345.678/0001-90");
            seedSettings(settings, pinheiros, "12.345.678/0002-70");
            users.saveAll(List.of(
                    user(jardins.getId(), "Davi Fernandes", "admin@aurora.pizza", "Aurora@2026", AppUser.Role.ADMIN, passwordEncoder),
                    user(jardins.getId(), "Marina Costa", "gerente@aurora.pizza", "Aurora@2026", AppUser.Role.MANAGER, passwordEncoder),
                    user(jardins.getId(), "Joao Silva", "cozinha@aurora.pizza", "Aurora@2026", AppUser.Role.KITCHEN, passwordEncoder),
                    user(jardins.getId(), "Ana Lima", "caixa@aurora.pizza", "Aurora@2026", AppUser.Role.CASHIER, passwordEncoder)));
            seedBranch(jardins, products, customers, tables, inventory, orders, finance, suppliers, recipes, coupons, purchases, reservations, cashSessions, cashMovements, true);
            seedBranch(pinheiros, products, customers, tables, inventory, orders, finance, suppliers, recipes, coupons, purchases, reservations, cashSessions, cashMovements, false);
        };
    }

    private void seedBranch(Branch branch, ProductRepository products, CustomerRepository customers, DiningTableRepository tables,
                            InventoryRepository inventory, SaleOrderRepository orders, FinanceRepository finance,
                            SupplierRepository suppliers, RecipeRepository recipes, CouponRepository coupons,
                            PurchaseOrderRepository purchases, ReservationRepository reservations,
                            CashSessionRepository cashSessions, CashMovementRepository cashMovements, boolean primary) {
        Long branchId = branch.getId();
        List<Product> menu = products.saveAll(menu(branchId, primary ? 0 : 2));
        List<Customer> clientele = customers.saveAll(List.of(
                customer(branchId, "Marina Costa", "(11) 99942-1820", "marina@email.com", "Alameda Santos, 420", 18, 920),
                customer(branchId, "Rafael Almeida", "(11) 98831-4402", "rafael@email.com", "Rua Oscar Freire, 88", 12, 610),
                customer(branchId, "Bianca Ferreira", "(11) 97710-2265", "bianca@email.com", "Rua Bela Cintra, 710", 9, 440),
                customer(branchId, "Lucas Martins", "(11) 96622-8091", "lucas@email.com", "Av. Paulista, 1560", 7, 285)));
        for (int i = 1; i <= (primary ? 12 : 8); i++) {
            DiningTable.Status status = i == 3 || i == 7 ? DiningTable.Status.OCCUPIED : i == 6 ? DiningTable.Status.RESERVED : DiningTable.Status.AVAILABLE;
            tables.save(DiningTable.builder().branchId(branchId).number(i).seats(i % 4 == 0 ? 6 : 4)
                    .area(i <= 6 ? "Sala principal" : "Terraco").status(status).qrToken(UUID.randomUUID().toString().substring(0, 8)).build());
        }
        Supplier bakery = suppliers.save(supplier(branchId, "Casa do Padeiro", "11.222.333/0001-40", "Caio", "(11) 3030-4411", 2));
        Supplier dairy = suppliers.save(supplier(branchId, "Laticinios Aurora", "22.333.444/0001-51", "Livia", "(11) 3030-5522", 1));
        Supplier emporium = suppliers.save(supplier(branchId, "Emporio Italia", "33.444.555/0001-62", "Marco", "(11) 3030-6633", 3));
        List<InventoryItem> stock = inventory.saveAll(List.of(
                stock(branchId, "Farinha italiana 00", "kg", "42.5", "18", bakery, "6.90", 62),
                stock(branchId, "Mozzarella fior di latte", "kg", "8.4", "10", dairy, "42.00", 8),
                stock(branchId, "Tomate San Marzano", "kg", "14.2", "8", emporium, "19.50", 24),
                stock(branchId, "Pepperoni artesanal", "kg", "5.1", "4", emporium, "64.00", 18),
                stock(branchId, "Burrata", "un", "6", "8", dairy, "13.20", 5),
                stock(branchId, "Azeite extravirgem", "l", "11", "5", emporium, "48.00", 120),
                stock(branchId, "Caixas delivery G", "un", "84", "50", bakery, "1.45", 365),
                stock(branchId, "Cogumelos frescos", "kg", "2.2", "3", emporium, "38.00", 3)));
        seedRecipes(branchId, menu, stock, recipes);
        coupons.saveAll(List.of(
                Coupon.builder().branchId(branchId).code("AURORA10").description("10% de boas-vindas").type(Coupon.Type.PERCENT).value(number("10")).validUntil(LocalDate.now().plusYears(1)).build(),
                Coupon.builder().branchId(branchId).code("FAMILIA15").description("R$ 15 para pedidos em familia").type(Coupon.Type.FIXED).value(number("15")).validUntil(LocalDate.now().plusMonths(6)).build()));
        finance.saveAll(List.of(
                entry(branchId, "Fechamento do salao", "Vendas", FinanceEntry.Type.INCOME, FinanceEntry.Status.PAID, "4280.50", 0),
                entry(branchId, "Fornecedor de laticinios", "Fornecedores", FinanceEntry.Type.EXPENSE, FinanceEntry.Status.PENDING, "1380.00", 2),
                entry(branchId, "Energia eletrica", "Operacional", FinanceEntry.Type.EXPENSE, FinanceEntry.Status.PENDING, "864.30", 5),
                entry(branchId, "Manutencao do forno", "Manutencao", FinanceEntry.Type.EXPENSE, FinanceEntry.Status.OVERDUE, "490.00", -2)));
        seedOrders(branchId, orders, menu, clientele, primary ? 18 : 9);
        PurchaseOrder purchase = purchases.save(PurchaseOrder.builder().branchId(branchId).code("PC-DEMO-" + branch.getCode())
                .supplierId(dairy.getId()).supplierName(dairy.getName()).status(PurchaseOrder.Status.SENT)
                .expectedDate(LocalDate.now().plusDays(2)).total(number("756.00")).createdBy("system@aurora.local")
                .items(List.of(PurchaseOrder.PurchaseItem.builder().inventoryItemId(stock.get(1).getId()).inventoryItemName(stock.get(1).getName())
                        .quantity(number("18")).unitCost(number("42")).lineTotal(number("756")).build())).build());
        DiningTable reserved = tables.findAllByBranchIdOrderByNumberAsc(branchId).stream().filter(t -> t.getNumber() == 6).findFirst().orElseThrow();
        reservations.save(Reservation.builder().branchId(branchId).tableId(reserved.getId()).tableNumber(6).customerId(clientele.get(1).getId())
                .customerName(clientele.get(1).getName()).phone(clientele.get(1).getPhone()).reservedFor(LocalDateTime.now().plusHours(3))
                .partySize(4).status(Reservation.Status.CONFIRMED).notes("Aniversario").build());
        if (primary) {
            CashSession cash = cashSessions.save(CashSession.builder().branchId(branchId).status(CashSession.Status.OPEN)
                    .openingAmount(number("300")).expectedAmount(number("300")).openedBy("admin@aurora.pizza").openedAt(LocalDateTime.now().minusHours(5)).build());
            cashMovements.save(CashMovement.builder().branchId(branchId).cashSessionId(cash.getId()).type(CashMovement.Type.SUPPLY)
                    .amount(number("100")).description("Reforco de troco").paymentMethod("Dinheiro").performedBy("admin@aurora.pizza").build());
        }
    }

    private List<Product> menu(Long branchId, int priceExtra) {
        return List.of(
                product(branchId, "PZ001", "Margherita Suprema", "Pizzas", "Tomate San Marzano, fior di latte e pesto de manjericao", 54.9 + priceExtra, 18.2, "#e9652d"),
                product(branchId, "PZ002", "Pepperoni Piccante", "Pizzas", "Pepperoni artesanal, mozzarella e mel apimentado", 64.9 + priceExtra, 22.8, "#d84032"),
                product(branchId, "PZ003", "Burrata & Parma", "Pizzas", "Burrata cremosa, presunto cru e rucula selvagem", 78.9 + priceExtra, 31.5, "#8d5d43"),
                product(branchId, "PZ004", "Quattro Formaggi", "Pizzas", "Mozzarella, gorgonzola, provolone e parmesao", 69.9 + priceExtra, 25.3, "#d79532"),
                product(branchId, "PZ005", "Trufada Funghi", "Pizzas", "Cogumelos, creme de trufas e tomilho fresco", 76.9 + priceExtra, 29.4, "#7a6048"),
                product(branchId, "PZ006", "Diavola", "Pizzas", "Calabresa artesanal, cebola roxa e pimenta", 61.9 + priceExtra, 21.1, "#b7352b"),
                basicProduct(branchId, "EN001", "Burrata ao Forno", "Entradas", "Tomates confitados, focaccia e azeite de ervas", 38 + priceExtra, 13.2, "#cc7042"),
                basicProduct(branchId, "EN002", "Arancini", "Entradas", "Bolinhos de risoto, queijo e aioli de limao", 32 + priceExtra, 11.4, "#da9b36"),
                basicProduct(branchId, "SB001", "Tiramisu da Casa", "Sobremesas", "Mascarpone, espresso e cacau belga", 26 + priceExtra, 8.3, "#654438"),
                basicProduct(branchId, "SB002", "Cannoli de Pistache", "Sobremesas", "Ricota doce, pistache e chocolate amargo", 24 + priceExtra, 7.8, "#72864d"),
                basicProduct(branchId, "BB001", "Limonata Siciliana", "Bebidas", "Limao siciliano, soda e alecrim", 14 + priceExtra, 3.9, "#8ea94f"),
                basicProduct(branchId, "BB002", "Vinho Tinto da Casa", "Bebidas", "Taca de corte italiano selecionado", 28 + priceExtra, 9.5, "#77323b"));
    }

    private Product product(Long branchId, String sku, String name, String category, String description, double price, double cost, String accent) {
        return Product.builder().branchId(branchId).sku(sku).name(name).category(category).description(description)
                .price(BigDecimal.valueOf(price)).cost(BigDecimal.valueOf(cost)).accent(accent).prepMinutes(18).availableForHalf(true)
                .variants(new ArrayList<>(List.of(
                        Product.ProductVariant.builder().name("Individual").priceAdjustment(number("-18.00")).build(),
                        Product.ProductVariant.builder().name("Grande").priceAdjustment(number("0.00")).build(),
                        Product.ProductVariant.builder().name("Familia").priceAdjustment(number("18.00")).build()))).active(true).build();
    }
    private Product basicProduct(Long branchId, String sku, String name, String category, String description, double price, double cost, String accent) {
        return Product.builder().branchId(branchId).sku(sku).name(name).category(category).description(description)
                .price(BigDecimal.valueOf(price)).cost(BigDecimal.valueOf(cost)).accent(accent).prepMinutes(category.equals("Bebidas") ? 2 : 10).active(true).build();
    }
    private void seedRecipes(Long branchId, List<Product> menu, List<InventoryItem> stock, RecipeRepository recipes) {
        for (int index = 0; index < 6; index++) {
            Product product = menu.get(index);
            recipes.saveAll(List.of(recipe(branchId, product, stock.get(0), "0.280"), recipe(branchId, product, stock.get(1), "0.180"), recipe(branchId, product, stock.get(2), "0.120")));
        }
        recipes.save(recipe(branchId, menu.get(1), stock.get(3), "0.080"));
        recipes.save(recipe(branchId, menu.get(2), stock.get(4), "1.000"));
        recipes.save(recipe(branchId, menu.get(4), stock.get(7), "0.090"));
    }
    private RecipeComponent recipe(Long branchId, Product product, InventoryItem item, String quantity) { return RecipeComponent.builder().branchId(branchId).productId(product.getId()).inventoryItemId(item.getId()).quantity(number(quantity)).unit(item.getUnit()).build(); }
    private AppUser user(Long branchId, String name, String email, String password, AppUser.Role role, PasswordEncoder encoder) { return AppUser.builder().branchId(branchId).name(name).email(email).passwordHash(encoder.encode(password)).role(role).build(); }
    private Customer customer(Long branchId, String name, String phone, String email, String address, int count, int points) { return Customer.builder().branchId(branchId).name(name).phone(phone).email(email).address(address).ordersCount(count).loyaltyPoints(points).totalSpent(number(String.valueOf(count * 82))).build(); }
    private Supplier supplier(Long branchId, String name, String document, String contact, String phone, int lead) { return Supplier.builder().branchId(branchId).name(name).document(document).contactName(contact).phone(phone).leadTimeDays(lead).build(); }
    private InventoryItem stock(Long branchId, String name, String unit, String quantity, String minimum, Supplier supplier, String cost, int expiresIn) { return InventoryItem.builder().branchId(branchId).name(name).unit(unit).quantity(number(quantity)).minimumQuantity(number(minimum)).supplierId(supplier.getId()).supplier(supplier.getName()).costPerUnit(number(cost)).expiresAt(LocalDate.now().plusDays(expiresIn)).build(); }
    private FinanceEntry entry(Long branchId, String description, String category, FinanceEntry.Type type, FinanceEntry.Status status, String amount, int dueIn) { return FinanceEntry.builder().branchId(branchId).description(description).category(category).type(type).status(status).amount(number(amount)).dueDate(LocalDate.now().plusDays(dueIn)).paidAt(status == FinanceEntry.Status.PAID ? LocalDate.now() : null).build(); }
    private void seedSettings(BusinessSettingsRepository settings, Branch branch, String document) { settings.save(BusinessSettings.builder().branchId(branch.getId()).tradeName(branch.getName()).document(document).phone(branch.getPhone()).address(branch.getAddress()).serviceFeePercent(number("10")).minimumDeliveryOrder(number("35")).defaultDeliveryFee(number("8")).averagePrepMinutes(35).maxDeliveryRadiusKm(8).pixKey("financeiro@aurorapizza.com.br").build()); }

    private void seedOrders(Long branchId, SaleOrderRepository orders, List<Product> menu, List<Customer> customers, int count) {
        SaleOrder.Status[] statuses = {SaleOrder.Status.PREPARING, SaleOrder.Status.READY, SaleOrder.Status.RECEIVED, SaleOrder.Status.COMPLETED};
        for (int i = 1; i <= count; i++) {
            Product first = menu.get(i % 6), second = menu.get(6 + (i % 5));
            int qty = i % 3 == 0 ? 2 : 1;
            List<SaleOrder.OrderLine> lines = List.of(
                    SaleOrder.OrderLine.builder().productId(first.getId()).productName(first.getName()).quantity(qty).unitPrice(first.getPrice()).unitCost(first.getCost()).variantName("Grande").lineTotal(first.getPrice().multiply(BigDecimal.valueOf(qty))).build(),
                    SaleOrder.OrderLine.builder().productId(second.getId()).productName(second.getName()).quantity(1).unitPrice(second.getPrice()).unitCost(second.getCost()).lineTotal(second.getPrice()).build());
            BigDecimal subtotal = first.getPrice().multiply(BigDecimal.valueOf(qty)).add(second.getPrice());
            SaleOrder.Type type = i % 3 == 0 ? SaleOrder.Type.DELIVERY : i % 3 == 1 ? SaleOrder.Type.DINE_IN : SaleOrder.Type.PICKUP;
            Customer customer = customers.get(i % customers.size());
            SaleOrder.Status status = i <= 4 ? statuses[i - 1] : SaleOrder.Status.COMPLETED;
            BigDecimal service = type == SaleOrder.Type.DINE_IN ? subtotal.multiply(number("0.10")).setScale(2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
            BigDecimal delivery = type == SaleOrder.Type.DELIVERY ? number("8") : BigDecimal.ZERO;
            BigDecimal total = subtotal.add(service).add(delivery);
            orders.save(SaleOrder.builder().branchId(branchId).code("DEMO-" + branchId + "-" + String.format("%04d", i)).status(status).type(type)
                    .tableNumber(type == SaleOrder.Type.DINE_IN ? (i % (branchId == 1 ? 12 : 8)) + 1 : null).customerId(customer.getId()).customerName(customer.getName()).customerPhone(customer.getPhone())
                    .deliveryAddress(type == SaleOrder.Type.DELIVERY ? customer.getAddress() : null).paymentMethod(i % 2 == 0 ? "PIX" : "Cartao")
                    .subtotal(subtotal).serviceFee(service).deliveryFee(delivery).total(total).paidAmount(total).items(lines)
                    .payments(List.of(SaleOrder.OrderPayment.builder().method(i % 2 == 0 ? "PIX" : "Cartao").amount(total).build()))
                    .stockDeducted(status == SaleOrder.Status.COMPLETED).loyaltyProcessed(status == SaleOrder.Status.COMPLETED)
                    .createdBy("system@aurora.local").createdAt(LocalDateTime.now().minusDays(i % 7).minusMinutes(i * 7L))
                    .completedAt(status == SaleOrder.Status.COMPLETED ? LocalDateTime.now().minusDays(i % 7) : null).build());
        }
    }
}
