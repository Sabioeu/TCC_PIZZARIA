package com.integrador.api.pizza.service;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.realtime.OrderRealtimeHandler;
import com.integrador.api.pizza.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OperationsService {
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final Map<String, BigDecimal> MODIFIER_PRICES = Map.of(
            "Borda de catupiry", new BigDecimal("10.00"),
            "Extra mozzarella", new BigDecimal("8.00"),
            "Bacon crocante", new BigDecimal("9.00"),
            "Azeitonas", new BigDecimal("4.00"),
            "Sem lactose", new BigDecimal("7.00"));

    private final ProductRepository products;
    private final CustomerRepository customers;
    private final DiningTableRepository tables;
    private final InventoryRepository inventory;
    private final SaleOrderRepository orders;
    private final FinanceRepository finance;
    private final RecipeRepository recipes;
    private final StockMovementRepository stockMovements;
    private final CouponRepository coupons;
    private final BusinessSettingsRepository settings;
    private final CashSessionRepository cashSessions;
    private final CashMovementRepository cashMovements;
    private final LoyaltyTransactionRepository loyaltyTransactions;
    private final AuditService audit;
    private final OrderRealtimeHandler realtime;
    private final CommerceService commerce;

    public List<Product> products(Long branchId) { return products.findAllByBranchIdOrderByCategoryAscNameAsc(branchId); }
    public List<Customer> customers(Long branchId) { return customers.findAllByBranchIdOrderByNameAsc(branchId); }
    public List<DiningTable> tables(Long branchId) { return tables.findAllByBranchIdOrderByNumberAsc(branchId); }
    public List<InventoryItem> inventory(Long branchId) { return inventory.findAllByBranchIdOrderByNameAsc(branchId); }
    public List<SaleOrder> orders(Long branchId) { return orders.findAllByBranchIdOrderByCreatedAtDesc(branchId); }
    public List<FinanceEntry> finance(Long branchId) { return finance.findAllByBranchIdOrderByDueDateDesc(branchId); }
    public List<StockMovement> stockMovements(Long branchId) { return stockMovements.findTop100ByBranchIdOrderByCreatedAtDesc(branchId); }
    public List<RecipeComponent> recipe(Long productId) { return recipes.findAllByProductId(productId); }
    public List<Coupon> coupons(Long branchId) { return coupons.findAllByBranchIdOrderByCodeAsc(branchId); }

    @Transactional
    public Product saveProduct(Long branchId, Product product) {
        product.setId(null);
        product.setBranchId(branchId);
        product.setActive(true);
        if (product.getVariants() == null) product.setVariants(new ArrayList<>());
        Product saved = products.save(product);
        audit.record(branchId, "CREATE", "PRODUCT", saved.getId(), saved.getName());
        return saved;
    }

    @Transactional
    public Product updateProduct(Long branchId, Long id, Product input) {
        Product product = productForBranch(branchId, id);
        product.setName(input.getName());
        product.setSku(input.getSku());
        product.setCategory(input.getCategory());
        product.setDescription(input.getDescription());
        product.setPrice(input.getPrice());
        product.setCost(input.getCost());
        product.setAccent(input.getAccent());
        product.setPrepMinutes(input.getPrepMinutes());
        product.setAvailableForHalf(input.isAvailableForHalf());
        product.setActive(input.isActive());
        product.setVariants(input.getVariants() == null ? new ArrayList<>() : input.getVariants());
        audit.record(branchId, "UPDATE", "PRODUCT", id, product.getName());
        return products.save(product);
    }

    @Transactional
    public List<RecipeComponent> saveRecipe(Long branchId, Long productId, List<RecipeInput> inputs) {
        productForBranch(branchId, productId);
        recipes.deleteAllByProductId(productId);
        List<RecipeComponent> result = new ArrayList<>();
        for (RecipeInput input : inputs) {
            InventoryItem item = inventoryForBranch(branchId, input.inventoryItemId());
            if (input.quantity() == null || input.quantity().signum() <= 0) throw new IllegalArgumentException("Quantidade da ficha tecnica deve ser positiva");
            result.add(recipes.save(RecipeComponent.builder().branchId(branchId).productId(productId)
                    .inventoryItemId(item.getId()).quantity(input.quantity()).unit(item.getUnit()).build()));
        }
        audit.record(branchId, "UPDATE_RECIPE", "PRODUCT", productId, result.size() + " componentes");
        return result;
    }

    @Transactional
    public Customer saveCustomer(Long branchId, Customer customer) {
        customer.setId(null);
        customer.setBranchId(branchId);
        customer.setCreatedAt(LocalDateTime.now());
        if (customer.getTotalSpent() == null) customer.setTotalSpent(ZERO);
        Customer saved = customers.save(customer);
        audit.record(branchId, "CREATE", "CUSTOMER", saved.getId(), saved.getName());
        return saved;
    }

    @Transactional
    public FinanceEntry saveFinance(Long branchId, FinanceEntry entry) {
        entry.setId(null);
        entry.setBranchId(branchId);
        if (entry.getStatus() == FinanceEntry.Status.PAID && entry.getPaidAt() == null) entry.setPaidAt(LocalDate.now());
        FinanceEntry saved = finance.save(entry);
        audit.record(branchId, "CREATE", "FINANCE_ENTRY", saved.getId(), saved.getDescription());
        return saved;
    }

    @Transactional
    public DiningTable updateTable(Long branchId, Long id, DiningTable.Status status) {
        DiningTable table = tableForBranch(branchId, id);
        table.setStatus(status);
        DiningTable saved = tables.save(table);
        audit.record(branchId, "STATUS", "TABLE", id, status.name());
        realtime.publish("TABLE_UPDATED", branchId, saved);
        return saved;
    }

    @Transactional
    public InventoryItem adjustStock(Long branchId, Long id, StockAdjustment command) {
        InventoryItem item = inventoryForBranch(branchId, id);
        BigDecimal before = item.getQuantity();
        BigDecimal next = command.absolute() ? command.quantity() : before.add(command.quantity());
        if (next.signum() < 0) throw new IllegalArgumentException("O saldo do estoque nao pode ficar negativo");
        item.setQuantity(next);
        StockMovement.Type type = command.type() == null ? StockMovement.Type.ADJUSTMENT : command.type();
        BigDecimal delta = next.subtract(before);
        stockMovements.save(StockMovement.builder().branchId(branchId).inventoryItemId(id).inventoryItemName(item.getName())
                .type(type).quantity(delta).balanceAfter(next).reason(blankToDefault(command.reason(), "Ajuste manual"))
                .performedBy(audit.actor()).build());
        audit.record(branchId, "STOCK_ADJUSTMENT", "INVENTORY_ITEM", id, before + " -> " + next);
        return inventory.save(item);
    }

    @Transactional
    public SaleOrder createOrder(Long branchId, CreateOrder command) {
        if (command.items() == null || command.items().isEmpty()) throw new IllegalArgumentException("O pedido precisa de pelo menos um item");
        SaleOrder.Type type = command.type() == null ? SaleOrder.Type.DINE_IN : command.type();
        List<SaleOrder.OrderLine> lines = new ArrayList<>();
        BigDecimal subtotal = ZERO;
        int maxPrep = 10;
        for (CreateOrderItem item : command.items()) {
            Product product = productForBranch(branchId, item.productId());
            if (!product.isActive()) throw new IllegalArgumentException("Produto indisponivel: " + product.getName());
            Product half = item.halfProductId() == null ? null : productForBranch(branchId, item.halfProductId());
            if (half != null && (!product.isAvailableForHalf() || !half.isAvailableForHalf())) throw new IllegalArgumentException("Um dos sabores nao permite pizza meio a meio");
            int quantity = Math.max(1, item.quantity());
            BigDecimal base = half == null ? product.getPrice() : product.getPrice().max(half.getPrice());
            BigDecimal variant = variantAdjustment(product, item.variantName());
            BigDecimal extras = modifierPrice(item.modifiers());
            BigDecimal unitPrice = base.add(variant).add(extras).setScale(2, RoundingMode.HALF_UP);
            BigDecimal unitCost = half == null ? product.getCost() : product.getCost().add(half.getCost()).divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
            lines.add(SaleOrder.OrderLine.builder().productId(product.getId()).productName(product.getName())
                    .halfProductId(half == null ? null : half.getId()).halfProductName(half == null ? null : half.getName())
                    .quantity(quantity).unitPrice(unitPrice).unitCost(unitCost).variantName(item.variantName())
                    .modifiers(join(item.modifiers())).notes(item.notes()).lineTotal(lineTotal).build());
            subtotal = subtotal.add(lineTotal);
            maxPrep = Math.max(maxPrep, Math.max(orDefault(product.getPrepMinutes(), 15), half == null ? 0 : orDefault(half.getPrepMinutes(), 15)));
        }
        BusinessSettings business = settings.findByBranchId(branchId).orElse(null);
        BigDecimal serviceFee = type == SaleOrder.Type.DINE_IN
                ? amountOrCalculated(command.serviceFee(), subtotal, business == null ? BigDecimal.TEN : business.getServiceFeePercent()) : ZERO;
        BigDecimal deliveryFee = type == SaleOrder.Type.DELIVERY
                ? nvl(command.deliveryFee(), business == null ? new BigDecimal("8.00") : business.getDefaultDeliveryFee()) : ZERO;
        BigDecimal discount = couponDiscount(branchId, command.couponCode(), subtotal);
        BigDecimal total = subtotal.add(serviceFee).add(deliveryFee).subtract(discount).max(ZERO).setScale(2, RoundingMode.HALF_UP);
        List<SaleOrder.OrderPayment> payments = command.payments() == null ? new ArrayList<>() : command.payments().stream()
                .filter(p -> p.amount() != null && p.amount().signum() > 0)
                .map(p -> SaleOrder.OrderPayment.builder().method(p.method()).amount(p.amount()).build()).toList();
        BigDecimal paid = payments.stream().map(SaleOrder.OrderPayment::getAmount).reduce(ZERO, BigDecimal::add);
        String methods = payments.isEmpty() ? blankToDefault(command.paymentMethod(), "A definir")
                : String.join(" + ", payments.stream().map(SaleOrder.OrderPayment::getMethod).toList());
        String code = "AP-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd")) + "-" + String.format("%04d", orders.count() + 1);
        Customer customer = command.customerId() == null ? null : customerForBranch(branchId, command.customerId());
        SaleOrder order = SaleOrder.builder().branchId(branchId).code(code).status(SaleOrder.Status.RECEIVED).type(type)
                .tableNumber(command.tableNumber()).customerId(customer == null ? null : customer.getId())
                .customerName(customer == null ? blankToDefault(command.customerName(), "Cliente avulso") : customer.getName())
                .customerPhone(customer == null ? command.customerPhone() : customer.getPhone())
                .deliveryAddress(command.deliveryAddress()).deliveryDriver(command.deliveryDriver()).paymentMethod(methods)
                .couponCode(normalize(command.couponCode())).notes(command.notes()).subtotal(subtotal).discount(discount)
                .deliveryFee(deliveryFee).serviceFee(serviceFee).total(total).paidAmount(paid)
                .changeAmount(paid.subtract(total).max(ZERO)).items(lines).payments(payments)
                .createdAt(LocalDateTime.now()).estimatedAt(LocalDateTime.now().plusMinutes(maxPrep + (type == SaleOrder.Type.DELIVERY ? 20 : 0)))
                .createdBy(audit.actor()).build();
        if (type == SaleOrder.Type.DINE_IN && order.getTableNumber() != null) {
            tables.findByBranchIdAndNumber(branchId, order.getTableNumber()).ifPresent(table -> table.setStatus(DiningTable.Status.OCCUPIED));
        }
        SaleOrder saved = orders.save(order);
        audit.record(branchId, "CREATE", "SALE_ORDER", saved.getId(), saved.getCode() + " total " + saved.getTotal());
        commerce.queueAutomaticOrderMessage(saved);
        realtime.publish("ORDER_CREATED", branchId, saved);
        return saved;
    }

    @Transactional
    public SaleOrder updateOrderStatus(Long branchId, Long id, SaleOrder.Status status) {
        SaleOrder order = orderForBranch(branchId, id);
        if (order.getStatus() == SaleOrder.Status.CANCELED) throw new IllegalArgumentException("Pedido cancelado nao pode ser reaberto");
        order.setStatus(status);
        LocalDateTime now = LocalDateTime.now();
        if (status == SaleOrder.Status.PREPARING) {
            if (!order.isStockDeducted()) deductRecipeStock(order);
            order.setStartedAt(now);
        }
        if (status == SaleOrder.Status.READY) order.setReadyAt(now);
        if (status == SaleOrder.Status.COMPLETED || status == SaleOrder.Status.DELIVERED) {
            if (!order.isStockDeducted()) deductRecipeStock(order);
            order.setCompletedAt(now);
            completeCustomerAndFinance(order);
        }
        if ((status == SaleOrder.Status.COMPLETED || status == SaleOrder.Status.DELIVERED || status == SaleOrder.Status.CANCELED)
                && order.getTableNumber() != null) {
            tables.findByBranchIdAndNumber(branchId, order.getTableNumber()).ifPresent(table -> table.setStatus(DiningTable.Status.CLEANING));
        }
        SaleOrder saved = orders.save(order);
        audit.record(branchId, "STATUS", "SALE_ORDER", id, status.name());
        commerce.queueAutomaticOrderMessage(saved);
        realtime.publish("ORDER_UPDATED", branchId, saved);
        return saved;
    }

    public CouponResult validateCoupon(Long branchId, String code, BigDecimal subtotal) {
        Coupon coupon = activeCoupon(branchId, code);
        return new CouponResult(coupon.getCode(), coupon.getDescription(), calculateDiscount(coupon, subtotal));
    }

    public Map<String, Object> dashboard(Long branchId) {
        List<SaleOrder> allOrders = orders(branchId);
        List<InventoryItem> stock = inventory(branchId);
        List<DiningTable> branchTables = tables(branchId);
        LocalDate today = LocalDate.now();
        BigDecimal todayRevenue = sumOrders(allOrders.stream().filter(o -> o.getCreatedAt().toLocalDate().equals(today)).toList());
        List<SaleOrder> monthOrders = allOrders.stream().filter(o -> o.getCreatedAt().getYear() == today.getYear()
                && o.getCreatedAt().getMonth().equals(today.getMonth()) && o.getStatus() != SaleOrder.Status.CANCELED).toList();
        BigDecimal monthRevenue = sumOrders(monthOrders);
        long open = allOrders.stream().filter(o -> !isFinal(o.getStatus())).count();
        long occupied = branchTables.stream().filter(t -> t.getStatus() == DiningTable.Status.OCCUPIED).count();
        long lowStock = stock.stream().filter(i -> i.getQuantity().compareTo(i.getMinimumQuantity()) <= 0).count();
        List<Map<String, Object>> weekly = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            BigDecimal value = sumOrders(allOrders.stream().filter(o -> o.getCreatedAt().toLocalDate().equals(date)).toList());
            weekly.add(Map.of("label", date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("pt-BR")).replace(".", ""), "value", value));
        }
        long validCount = Math.max(1, allOrders.stream().filter(o -> o.getStatus() != SaleOrder.Status.CANCELED).count());
        List<Map<String, Object>> mix = List.of(
                mix("Salao", SaleOrder.Type.DINE_IN, allOrders, validCount),
                mix("Delivery", SaleOrder.Type.DELIVERY, allOrders, validCount),
                mix("Retirada", SaleOrder.Type.PICKUP, allOrders, validCount));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("revenueToday", todayRevenue);
        result.put("revenueMonth", monthRevenue);
        result.put("openOrders", open);
        result.put("averageTicket", monthOrders.isEmpty() ? ZERO : monthRevenue.divide(BigDecimal.valueOf(monthOrders.size()), 2, RoundingMode.HALF_UP));
        result.put("occupiedTables", occupied);
        result.put("availableTables", branchTables.stream().filter(t -> t.getStatus() == DiningTable.Status.AVAILABLE).count());
        result.put("lowStock", lowStock);
        result.put("customers", customers(branchId).size());
        result.put("weeklyRevenue", weekly);
        result.put("channelMix", mix);
        result.put("generatedAt", LocalDateTime.now());
        return result;
    }

    private Map<String, Object> mix(String label, SaleOrder.Type type, List<SaleOrder> source, long total) {
        long count = source.stream().filter(o -> o.getType() == type && o.getStatus() != SaleOrder.Status.CANCELED).count();
        return Map.of("label", label, "value", Math.round(count * 100.0 / total));
    }

    private void deductRecipeStock(SaleOrder order) {
        Map<Long, BigDecimal> required = new LinkedHashMap<>();
        for (SaleOrder.OrderLine line : order.getItems()) {
            BigDecimal units = BigDecimal.valueOf(line.getQuantity());
            addRecipe(required, line.getProductId(), line.getHalfProductId() == null ? units : units.multiply(new BigDecimal("0.5")));
            if (line.getHalfProductId() != null) addRecipe(required, line.getHalfProductId(), units.multiply(new BigDecimal("0.5")));
        }
        for (Map.Entry<Long, BigDecimal> request : required.entrySet()) {
            InventoryItem item = inventoryForBranch(order.getBranchId(), request.getKey());
            if (item.getQuantity().compareTo(request.getValue()) < 0) {
                throw new IllegalArgumentException("Estoque insuficiente de " + item.getName() + ". Necessario: " + request.getValue() + " " + item.getUnit());
            }
        }
        for (Map.Entry<Long, BigDecimal> request : required.entrySet()) {
            InventoryItem item = inventoryForBranch(order.getBranchId(), request.getKey());
            item.setQuantity(item.getQuantity().subtract(request.getValue()));
            stockMovements.save(StockMovement.builder().branchId(order.getBranchId()).inventoryItemId(item.getId())
                    .inventoryItemName(item.getName()).type(StockMovement.Type.SALE).quantity(request.getValue().negate())
                    .balanceAfter(item.getQuantity()).reason("Baixa automatica por ficha tecnica")
                    .referenceCode(order.getCode()).performedBy(audit.actor()).build());
        }
        order.setStockDeducted(true);
    }

    private void addRecipe(Map<Long, BigDecimal> required, Long productId, BigDecimal units) {
        for (RecipeComponent recipe : recipes.findAllByProductId(productId)) {
            required.merge(recipe.getInventoryItemId(), recipe.getQuantity().multiply(units), BigDecimal::add);
        }
    }

    private void completeCustomerAndFinance(SaleOrder order) {
        if (!order.isLoyaltyProcessed() && order.getCustomerId() != null) {
            Customer customer = customerForBranch(order.getBranchId(), order.getCustomerId());
            customer.setOrdersCount(customer.getOrdersCount() + 1);
            customer.setTotalSpent(nvl(customer.getTotalSpent(), ZERO).add(order.getTotal()));
            customer.setLoyaltyPoints(orDefault(customer.getLoyaltyPoints(), 0) + order.getTotal().setScale(0, RoundingMode.DOWN).intValue());
            customer.setLastOrderAt(LocalDateTime.now());
            loyaltyTransactions.save(LoyaltyTransaction.builder().branchId(order.getBranchId()).customerId(customer.getId())
                    .type(LoyaltyTransaction.Type.EARN).points(order.getTotal().setScale(0, RoundingMode.DOWN).intValue())
                    .description("Pontos da venda " + order.getCode()).referenceCode(order.getCode()).build());
            order.setLoyaltyProcessed(true);
        }
        if (!finance.existsByReferenceCode(order.getCode())) {
            finance.save(FinanceEntry.builder().branchId(order.getBranchId()).description("Venda " + order.getCode())
                    .category("Vendas").type(FinanceEntry.Type.INCOME).status(FinanceEntry.Status.PAID)
                    .amount(order.getTotal()).dueDate(LocalDate.now()).paidAt(LocalDate.now())
                    .paymentMethod(order.getPaymentMethod()).referenceCode(order.getCode()).build());
            cashSessions.findFirstByBranchIdAndStatusOrderByOpenedAtDesc(order.getBranchId(), CashSession.Status.OPEN).ifPresent(session -> {
                List<SaleOrder.OrderPayment> paymentList = order.getPayments().isEmpty()
                        ? List.of(SaleOrder.OrderPayment.builder().method(order.getPaymentMethod()).amount(order.getTotal()).build()) : order.getPayments();
                for (SaleOrder.OrderPayment payment : paymentList) {
                    cashMovements.save(CashMovement.builder().branchId(order.getBranchId()).cashSessionId(session.getId())
                            .type(CashMovement.Type.SALE).amount(payment.getAmount()).description("Venda " + order.getCode())
                            .paymentMethod(payment.getMethod()).referenceCode(order.getCode()).performedBy(audit.actor()).build());
                }
            });
        }
    }

    private BigDecimal couponDiscount(Long branchId, String code, BigDecimal subtotal) {
        if (code == null || code.isBlank()) return ZERO;
        return calculateDiscount(activeCoupon(branchId, code), subtotal);
    }
    private Coupon activeCoupon(Long branchId, String code) {
        Coupon coupon = coupons.findByBranchIdAndCodeIgnoreCaseAndActiveTrue(branchId, normalize(code))
                .orElseThrow(() -> new IllegalArgumentException("Cupom invalido"));
        if (coupon.getValidUntil() != null && coupon.getValidUntil().isBefore(LocalDate.now())) throw new IllegalArgumentException("Cupom expirado");
        return coupon;
    }
    private BigDecimal calculateDiscount(Coupon coupon, BigDecimal subtotal) {
        BigDecimal value = coupon.getType() == Coupon.Type.PERCENT
                ? subtotal.multiply(coupon.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP) : coupon.getValue();
        return value.min(subtotal).setScale(2, RoundingMode.HALF_UP);
    }
    private BigDecimal modifierPrice(List<String> modifiers) {
        if (modifiers == null) return ZERO;
        return modifiers.stream().map(name -> MODIFIER_PRICES.getOrDefault(name, ZERO)).reduce(ZERO, BigDecimal::add);
    }
    private BigDecimal variantAdjustment(Product product, String variantName) {
        if (variantName == null || variantName.isBlank() || product.getVariants() == null) return ZERO;
        return product.getVariants().stream().filter(v -> variantName.equalsIgnoreCase(v.getName())).findFirst()
                .map(Product.ProductVariant::getPriceAdjustment)
                .orElseThrow(() -> new IllegalArgumentException("Tamanho indisponivel para " + product.getName()));
    }
    private BigDecimal amountOrCalculated(BigDecimal explicit, BigDecimal base, BigDecimal percent) {
        return explicit != null ? explicit.max(ZERO) : base.multiply(nvl(percent, BigDecimal.TEN)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private Product productForBranch(Long branchId, Long id) {
        Product value = products.findById(id).orElseThrow(() -> new EntityNotFoundException("Produto nao encontrado: " + id));
        ensureBranch(branchId, value.getBranchId()); return value;
    }
    private Customer customerForBranch(Long branchId, Long id) {
        Customer value = customers.findById(id).orElseThrow(() -> new EntityNotFoundException("Cliente nao encontrado"));
        ensureBranch(branchId, value.getBranchId()); return value;
    }
    private DiningTable tableForBranch(Long branchId, Long id) {
        DiningTable value = tables.findById(id).orElseThrow(() -> new EntityNotFoundException("Mesa nao encontrada"));
        ensureBranch(branchId, value.getBranchId()); return value;
    }
    private InventoryItem inventoryForBranch(Long branchId, Long id) {
        InventoryItem value = inventory.findById(id).orElseThrow(() -> new EntityNotFoundException("Insumo nao encontrado"));
        ensureBranch(branchId, value.getBranchId()); return value;
    }
    private SaleOrder orderForBranch(Long branchId, Long id) {
        SaleOrder value = orders.findById(id).orElseThrow(() -> new EntityNotFoundException("Pedido nao encontrado"));
        ensureBranch(branchId, value.getBranchId()); return value;
    }
    private void ensureBranch(Long requested, Long actual) { if (!Objects.equals(requested, actual)) throw new EntityNotFoundException("Registro nao encontrado nesta unidade"); }
    private boolean isFinal(SaleOrder.Status status) { return status == SaleOrder.Status.COMPLETED || status == SaleOrder.Status.DELIVERED || status == SaleOrder.Status.CANCELED; }
    private BigDecimal sumOrders(List<SaleOrder> source) { return source.stream().filter(o -> o.getStatus() != SaleOrder.Status.CANCELED).map(SaleOrder::getTotal).reduce(ZERO, BigDecimal::add); }
    private String blankToDefault(String value, String fallback) { return value == null || value.isBlank() ? fallback : value.trim(); }
    private String normalize(String value) { return value == null ? null : value.trim().toUpperCase(Locale.ROOT); }
    private String join(List<String> values) { return values == null || values.isEmpty() ? null : String.join(", ", values); }
    private BigDecimal nvl(BigDecimal value, BigDecimal fallback) { return value == null ? fallback : value; }
    private int orDefault(Integer value, int fallback) { return value == null ? fallback : value; }

    public record RecipeInput(Long inventoryItemId, BigDecimal quantity) { }
    public record StockAdjustment(BigDecimal quantity, boolean absolute, StockMovement.Type type, String reason) { }
    public record CreateOrder(SaleOrder.Type type, Integer tableNumber, Long customerId, String customerName,
                              String customerPhone, String deliveryAddress, String deliveryDriver, String paymentMethod,
                              String couponCode, String notes, BigDecimal deliveryFee, BigDecimal serviceFee,
                              List<CreateOrderItem> items, List<PaymentCommand> payments) { }
    public record CreateOrderItem(Long productId, Long halfProductId, int quantity, String variantName,
                                  List<String> modifiers, String notes) { }
    public record PaymentCommand(String method, BigDecimal amount) { }
    public record CouponResult(String code, String description, BigDecimal discount) { }
}
