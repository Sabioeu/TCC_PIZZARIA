package com.integrador.api.pizza.service;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ManagementService {
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private final BranchRepository branches;
    private final SupplierRepository suppliers;
    private final PurchaseOrderRepository purchases;
    private final InventoryRepository inventory;
    private final StockMovementRepository stockMovements;
    private final FinanceRepository finance;
    private final CashSessionRepository cashSessions;
    private final CashMovementRepository cashMovements;
    private final ReservationRepository reservations;
    private final DiningTableRepository tables;
    private final CustomerRepository customers;
    private final LoyaltyTransactionRepository loyalty;
    private final BusinessSettingsRepository settings;
    private final SaleOrderRepository orders;
    private final ProductRepository products;
    private final CouponRepository coupons;
    private final AuditService audit;
    private final OperationsService operations;

    public List<Branch> branches() { return branches.findAllByActiveTrueOrderByNameAsc(); }
    public List<Supplier> suppliers(Long branchId) { return suppliers.findAllByBranchIdOrderByNameAsc(branchId); }
    public List<PurchaseOrder> purchases(Long branchId) { return purchases.findAllByBranchIdOrderByCreatedAtDesc(branchId); }
    public List<Reservation> reservations(Long branchId) { return reservations.findAllByBranchIdOrderByReservedForAsc(branchId); }
    public List<LoyaltyTransaction> loyalty(Long branchId) { return loyalty.findTop100ByBranchIdOrderByCreatedAtDesc(branchId); }
    public BusinessSettings settings(Long branchId) { return settings.findByBranchId(branchId).orElseGet(() -> defaults(branchId)); }

    @Transactional
    public Branch saveBranch(Branch branch) {
        branch.setId(null);
        branch.setActive(true);
        Branch saved = branches.save(branch);
        settings.save(defaults(saved.getId()));
        audit.record(saved.getId(), "CREATE", "BRANCH", saved.getId(), saved.getName());
        return saved;
    }

    @Transactional
    public BusinessSettings saveSettings(Long branchId, BusinessSettings input) {
        BusinessSettings value = settings.findByBranchId(branchId).orElseGet(() -> defaults(branchId));
        value.setTradeName(input.getTradeName()); value.setDocument(input.getDocument()); value.setPhone(input.getPhone());
        value.setAddress(input.getAddress()); value.setServiceFeePercent(input.getServiceFeePercent());
        value.setMinimumDeliveryOrder(input.getMinimumDeliveryOrder()); value.setDefaultDeliveryFee(input.getDefaultDeliveryFee());
        value.setAveragePrepMinutes(input.getAveragePrepMinutes()); value.setMaxDeliveryRadiusKm(input.getMaxDeliveryRadiusKm());
        value.setAutomaticAcceptance(input.isAutomaticAcceptance()); value.setAllowNotes(input.isAllowNotes());
        value.setPrintTicket(input.isPrintTicket()); value.setPixEnabled(input.isPixEnabled());
        value.setCardEnabled(input.isCardEnabled()); value.setCashEnabled(input.isCashEnabled()); value.setPixKey(input.getPixKey());
        value.setWhatsappConnected(input.isWhatsappConnected()); value.setWhatsappMode(input.getWhatsappMode());
        value.setWhatsappPhoneNumber(input.getWhatsappPhoneNumber()); value.setPaymentProvider(input.getPaymentProvider());
        value.setFiscalProvider(input.getFiscalProvider()); value.setFiscalEnvironment(input.getFiscalEnvironment());
        BusinessSettings saved = settings.save(value);
        audit.record(branchId, "UPDATE", "SETTINGS", saved.getId(), "Parametros operacionais atualizados");
        return saved;
    }

    @Transactional
    public Supplier saveSupplier(Long branchId, Supplier supplier) {
        supplier.setId(null); supplier.setBranchId(branchId); supplier.setActive(true);
        Supplier saved = suppliers.save(supplier);
        audit.record(branchId, "CREATE", "SUPPLIER", saved.getId(), saved.getName());
        return saved;
    }

    @Transactional
    public PurchaseOrder createPurchase(Long branchId, PurchaseRequest request) {
        Supplier supplier = supplierForBranch(branchId, request.supplierId());
        if (request.items() == null || request.items().isEmpty()) throw new IllegalArgumentException("Inclua pelo menos um insumo na compra");
        List<PurchaseOrder.PurchaseItem> items = new ArrayList<>();
        BigDecimal total = ZERO;
        for (PurchaseItemRequest input : request.items()) {
            InventoryItem stock = inventoryForBranch(branchId, input.inventoryItemId());
            if (input.quantity() == null || input.quantity().signum() <= 0 || input.unitCost() == null || input.unitCost().signum() < 0)
                throw new IllegalArgumentException("Quantidade e custo da compra sao invalidos");
            BigDecimal lineTotal = input.quantity().multiply(input.unitCost()).setScale(2, RoundingMode.HALF_UP);
            total = total.add(lineTotal);
            items.add(PurchaseOrder.PurchaseItem.builder().inventoryItemId(stock.getId()).inventoryItemName(stock.getName())
                    .quantity(input.quantity()).unitCost(input.unitCost()).lineTotal(lineTotal).build());
        }
        String code = "PC-" + LocalDate.now().toString().replace("-", "") + "-" + String.format("%03d", purchases.count() + 1);
        PurchaseOrder order = PurchaseOrder.builder().branchId(branchId).code(code).supplierId(supplier.getId()).supplierName(supplier.getName())
                .status(PurchaseOrder.Status.SENT).expectedDate(request.expectedDate()).total(total).notes(request.notes())
                .createdBy(audit.actor()).items(items).build();
        PurchaseOrder saved = purchases.save(order);
        audit.record(branchId, "CREATE", "PURCHASE_ORDER", saved.getId(), saved.getCode() + " total " + total);
        return saved;
    }

    @Transactional
    public PurchaseOrder receivePurchase(Long branchId, Long id) {
        PurchaseOrder purchase = purchaseForBranch(branchId, id);
        if (purchase.getStatus() == PurchaseOrder.Status.RECEIVED) throw new IllegalArgumentException("Pedido de compra ja recebido");
        if (purchase.getStatus() == PurchaseOrder.Status.CANCELED) throw new IllegalArgumentException("Pedido de compra cancelado");
        for (PurchaseOrder.PurchaseItem line : purchase.getItems()) {
            InventoryItem item = inventoryForBranch(branchId, line.getInventoryItemId());
            item.setQuantity(item.getQuantity().add(line.getQuantity()));
            item.setCostPerUnit(line.getUnitCost());
            item.setSupplierId(purchase.getSupplierId()); item.setSupplier(purchase.getSupplierName());
            stockMovements.save(StockMovement.builder().branchId(branchId).inventoryItemId(item.getId()).inventoryItemName(item.getName())
                    .type(StockMovement.Type.PURCHASE).quantity(line.getQuantity()).balanceAfter(item.getQuantity())
                    .reason("Recebimento de compra").referenceCode(purchase.getCode()).performedBy(audit.actor()).build());
        }
        purchase.setStatus(PurchaseOrder.Status.RECEIVED); purchase.setReceivedDate(LocalDate.now());
        if (!finance.existsByReferenceCode(purchase.getCode())) {
            finance.save(FinanceEntry.builder().branchId(branchId).description("Compra " + purchase.getCode() + " · " + purchase.getSupplierName())
                    .category("Fornecedores").type(FinanceEntry.Type.EXPENSE).status(FinanceEntry.Status.PENDING)
                    .amount(purchase.getTotal()).dueDate(purchase.getExpectedDate() == null ? LocalDate.now() : purchase.getExpectedDate())
                    .referenceCode(purchase.getCode()).build());
        }
        audit.record(branchId, "RECEIVE", "PURCHASE_ORDER", id, purchase.getCode());
        return purchases.save(purchase);
    }

    @Transactional
    public Reservation createReservation(Long branchId, ReservationRequest request) {
        DiningTable table = tableForBranch(branchId, request.tableId());
        if (table.getStatus() == DiningTable.Status.OCCUPIED || table.getStatus() == DiningTable.Status.INACTIVE)
            throw new IllegalArgumentException("Mesa indisponivel para reserva");
        if (request.reservedFor() == null || request.reservedFor().isBefore(LocalDateTime.now().minusMinutes(5)))
            throw new IllegalArgumentException("Informe uma data futura para a reserva");
        Reservation reservation = Reservation.builder().branchId(branchId).tableId(table.getId()).tableNumber(table.getNumber())
                .customerId(request.customerId()).customerName(request.customerName()).phone(request.phone())
                .reservedFor(request.reservedFor()).partySize(request.partySize()).status(Reservation.Status.CONFIRMED).notes(request.notes()).build();
        table.setStatus(DiningTable.Status.RESERVED);
        Reservation saved = reservations.save(reservation);
        audit.record(branchId, "CREATE", "RESERVATION", saved.getId(), saved.getCustomerName() + " · mesa " + table.getNumber());
        return saved;
    }

    @Transactional
    public Reservation updateReservation(Long branchId, Long id, Reservation.Status status) {
        Reservation reservation = reservationForBranch(branchId, id);
        reservation.setStatus(status);
        DiningTable table = tableForBranch(branchId, reservation.getTableId());
        if (status == Reservation.Status.SEATED) table.setStatus(DiningTable.Status.OCCUPIED);
        if (status == Reservation.Status.COMPLETED || status == Reservation.Status.CANCELED || status == Reservation.Status.NO_SHOW)
            table.setStatus(DiningTable.Status.AVAILABLE);
        audit.record(branchId, "STATUS", "RESERVATION", id, status.name());
        return reservations.save(reservation);
    }

    @Transactional
    public Map<String, Object> openCash(Long branchId, CashOpenRequest request) {
        cashSessions.findFirstByBranchIdAndStatusOrderByOpenedAtDesc(branchId, CashSession.Status.OPEN)
                .ifPresent(value -> { throw new IllegalArgumentException("Ja existe um caixa aberto nesta unidade"); });
        BigDecimal opening = request.openingAmount() == null ? ZERO : request.openingAmount();
        CashSession session = cashSessions.save(CashSession.builder().branchId(branchId).status(CashSession.Status.OPEN)
                .openingAmount(opening).expectedAmount(opening).openedBy(audit.actor()).openedAt(LocalDateTime.now()).notes(request.notes()).build());
        audit.record(branchId, "OPEN", "CASH_SESSION", session.getId(), "Fundo " + opening);
        return cashSummary(session);
    }

    public Map<String, Object> currentCash(Long branchId) {
        return cashSessions.findFirstByBranchIdAndStatusOrderByOpenedAtDesc(branchId, CashSession.Status.OPEN)
                .map(this::cashSummary).orElseGet(() -> Map.of("status", "CLOSED", "movements", List.of(), "totals", Map.of()));
    }

    @Transactional
    public Map<String, Object> cashMovement(Long branchId, CashMovementRequest request) {
        CashSession session = openSession(branchId);
        if (request.amount() == null || request.amount().signum() <= 0) throw new IllegalArgumentException("Informe um valor positivo");
        cashMovements.save(CashMovement.builder().branchId(branchId).cashSessionId(session.getId()).type(request.type())
                .amount(request.amount()).description(request.description()).paymentMethod(request.paymentMethod())
                .performedBy(audit.actor()).build());
        audit.record(branchId, "MOVEMENT", "CASH_SESSION", session.getId(), request.type() + " " + request.amount());
        return cashSummary(session);
    }

    @Transactional
    public Map<String, Object> closeCash(Long branchId, CashCloseRequest request) {
        CashSession session = openSession(branchId);
        Map<String, Object> summary = cashSummary(session);
        BigDecimal expected = (BigDecimal) summary.get("expectedCash");
        BigDecimal counted = request.countedAmount() == null ? ZERO : request.countedAmount();
        session.setExpectedAmount(expected); session.setCountedAmount(counted); session.setDifferenceAmount(counted.subtract(expected));
        session.setClosedBy(audit.actor()); session.setClosedAt(LocalDateTime.now()); session.setStatus(CashSession.Status.CLOSED);
        session.setNotes(request.notes()); cashSessions.save(session);
        audit.record(branchId, "CLOSE", "CASH_SESSION", session.getId(), "Diferenca " + session.getDifferenceAmount());
        return cashSummary(session);
    }

    @Transactional
    public Customer adjustLoyalty(Long branchId, Long customerId, LoyaltyRequest request) {
        Customer customer = customerForBranch(branchId, customerId);
        int delta = request.type() == LoyaltyTransaction.Type.REDEEM ? -Math.abs(request.points()) : request.points();
        if (customer.getLoyaltyPoints() + delta < 0) throw new IllegalArgumentException("Saldo de pontos insuficiente");
        customer.setLoyaltyPoints(customer.getLoyaltyPoints() + delta);
        loyalty.save(LoyaltyTransaction.builder().branchId(branchId).customerId(customerId).type(request.type())
                .points(delta).description(request.description()).build());
        audit.record(branchId, "LOYALTY", "CUSTOMER", customerId, delta + " pontos");
        return customers.save(customer);
    }

    public Map<String, Object> intelligence(Long branchId) {
        List<SaleOrder> sales = orders.findAllByBranchIdOrderByCreatedAtDesc(branchId).stream()
                .filter(o -> o.getStatus() != SaleOrder.Status.CANCELED).toList();
        List<FinanceEntry> entries = finance.findAllByBranchIdOrderByDueDateDesc(branchId);
        BigDecimal revenue = sales.stream().map(SaleOrder::getTotal).reduce(ZERO, BigDecimal::add);
        BigDecimal productCost = sales.stream().flatMap(o -> o.getItems().stream())
                .map(line -> nvl(line.getUnitCost()).multiply(BigDecimal.valueOf(line.getQuantity()))).reduce(ZERO, BigDecimal::add);
        BigDecimal expenses = entries.stream().filter(e -> e.getType() == FinanceEntry.Type.EXPENSE)
                .map(FinanceEntry::getAmount).reduce(ZERO, BigDecimal::add);
        BigDecimal grossProfit = revenue.subtract(productCost);
        BigDecimal netResult = grossProfit.subtract(expenses);
        Map<Long, MenuAccumulator> menu = new LinkedHashMap<>();
        for (SaleOrder order : sales) for (SaleOrder.OrderLine line : order.getItems()) {
            MenuAccumulator item = menu.computeIfAbsent(line.getProductId(), key -> new MenuAccumulator(line.getProductName()));
            item.quantity += line.getQuantity();
            item.revenue = item.revenue.add(nvl(line.getLineTotal()).signum() == 0
                    ? line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity())) : line.getLineTotal());
            item.cost = item.cost.add(nvl(line.getUnitCost()).multiply(BigDecimal.valueOf(line.getQuantity())));
        }
        List<Map<String, Object>> menuRanking = menu.values().stream().sorted(Comparator.comparing((MenuAccumulator m) -> m.revenue).reversed()).map(m -> {
            Map<String, Object> row = new LinkedHashMap<>(); row.put("name", m.name); row.put("quantity", m.quantity);
            row.put("revenue", m.revenue); row.put("contribution", m.revenue.subtract(m.cost));
            row.put("classification", m.quantity >= 10 && m.revenue.subtract(m.cost).compareTo(BigDecimal.valueOf(300)) >= 0 ? "ESTRELA" : m.quantity >= 10 ? "POPULAR" : "OPORTUNIDADE");
            return row;
        }).toList();
        List<Map<String, Object>> hourly = new ArrayList<>();
        for (int hour = 11; hour <= 23; hour++) {
            int target = hour;
            long count = sales.stream().filter(o -> o.getCreatedAt().getHour() == target).count();
            hourly.add(Map.of("hour", hour + "h", "orders", count));
        }
        BigDecimal dailyAverage = sales.isEmpty() ? ZERO : revenue.divide(BigDecimal.valueOf(Math.max(1, sales.stream().map(o -> o.getCreatedAt().toLocalDate()).distinct().count())), 2, RoundingMode.HALF_UP);
        List<Map<String, Object>> forecast = new ArrayList<>();
        for (int i = 1; i <= 7; i++) {
            LocalDate date = LocalDate.now().plusDays(i);
            BigDecimal factor = date.getDayOfWeek() == DayOfWeek.FRIDAY || date.getDayOfWeek() == DayOfWeek.SATURDAY ? new BigDecimal("1.28") : new BigDecimal("0.94");
            forecast.add(Map.of("date", date, "projectedRevenue", dailyAverage.multiply(factor).setScale(2, RoundingMode.HALF_UP),
                    "projectedOrders", Math.max(1, Math.round(sales.size() / (double) Math.max(1, forecastDays(sales)) * factor.doubleValue()))));
        }
        List<InventoryItem> stock = inventory.findAllByBranchIdOrderByNameAsc(branchId);
        List<Map<String, Object>> suggestions = stock.stream().filter(i -> i.getQuantity().compareTo(i.getMinimumQuantity()) <= 0).map(i -> Map.<String, Object>of(
                "inventoryItemId", i.getId(), "name", i.getName(), "current", i.getQuantity(), "suggestedQuantity", i.getMinimumQuantity().multiply(BigDecimal.valueOf(3)).subtract(i.getQuantity()).max(BigDecimal.ZERO), "supplier", nvl(i.getSupplier(), "Fornecedor a definir"))).toList();
        List<Map<String, Object>> alerts = new ArrayList<>();
        if (!suggestions.isEmpty()) alerts.add(Map.of("level", "warning", "title", "Risco de ruptura", "message", suggestions.size() + " insumos precisam de reposicao"));
        long canceled = orders.findAllByBranchIdOrderByCreatedAtDesc(branchId).stream().filter(o -> o.getStatus() == SaleOrder.Status.CANCELED).count();
        if (canceled > Math.max(2, sales.size() / 10)) alerts.add(Map.of("level", "danger", "title", "Cancelamentos acima do padrao", "message", canceled + " pedidos cancelados no periodo"));
        alerts.add(Map.of("level", "success", "title", "Previsao de demanda", "message", "Prepare 28% mais massa para sexta e sabado"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("revenue", revenue); result.put("productCost", productCost); result.put("expenses", expenses);
        result.put("grossProfit", grossProfit); result.put("netResult", netResult);
        result.put("cmvPercent", percent(productCost, revenue)); result.put("grossMarginPercent", percent(grossProfit, revenue));
        result.put("menuEngineering", menuRanking); result.put("hourlyDemand", hourly); result.put("forecast", forecast);
        result.put("purchaseSuggestions", suggestions); result.put("alerts", alerts);
        return result;
    }

    public Map<String, Object> publicMenu(String token) {
        DiningTable table = tables.findByQrToken(token).orElseThrow(() -> new EntityNotFoundException("QR de mesa invalido"));
        BusinessSettings business = settings(table.getBranchId());
        return Map.of("table", table, "business", business, "products", products.findAllByBranchIdOrderByCategoryAscNameAsc(table.getBranchId()).stream().filter(Product::isActive).toList());
    }

    @Transactional
    public SaleOrder createPublicTableOrder(String token, OperationsService.CreateOrder request) {
        DiningTable table = tables.findByQrToken(token).orElseThrow(() -> new EntityNotFoundException("QR de mesa invalido"));
        OperationsService.CreateOrder sanitized = new OperationsService.CreateOrder(SaleOrder.Type.DINE_IN, table.getNumber(),
                request.customerId(), request.customerName(), request.customerPhone(), null, null, request.paymentMethod(),
                request.couponCode(), request.notes(), BigDecimal.ZERO, null, request.items(), request.payments());
        return operations.createOrder(table.getBranchId(), sanitized);
    }

    private Map<String, Object> cashSummary(CashSession session) {
        List<CashMovement> movements = cashMovements.findAllByCashSessionIdOrderByCreatedAtDesc(session.getId());
        BigDecimal cashSales = movements.stream().filter(m -> m.getType() == CashMovement.Type.SALE && isCash(m.getPaymentMethod())).map(CashMovement::getAmount).reduce(ZERO, BigDecimal::add);
        BigDecimal supplies = movements.stream().filter(m -> m.getType() == CashMovement.Type.SUPPLY).map(CashMovement::getAmount).reduce(ZERO, BigDecimal::add);
        BigDecimal out = movements.stream().filter(m -> m.getType() == CashMovement.Type.WITHDRAWAL || m.getType() == CashMovement.Type.REFUND).map(CashMovement::getAmount).reduce(ZERO, BigDecimal::add);
        BigDecimal allSales = movements.stream().filter(m -> m.getType() == CashMovement.Type.SALE).map(CashMovement::getAmount).reduce(ZERO, BigDecimal::add);
        BigDecimal expected = session.getOpeningAmount().add(cashSales).add(supplies).subtract(out);
        Map<String, Object> totals = new LinkedHashMap<>(); totals.put("sales", allSales); totals.put("cashSales", cashSales); totals.put("supplies", supplies); totals.put("outflows", out);
        Map<String, Object> result = new LinkedHashMap<>(); result.put("session", session); result.put("status", session.getStatus().name());
        result.put("expectedCash", expected); result.put("movements", movements); result.put("totals", totals); return result;
    }

    private CashSession openSession(Long branchId) { return cashSessions.findFirstByBranchIdAndStatusOrderByOpenedAtDesc(branchId, CashSession.Status.OPEN).orElseThrow(() -> new IllegalArgumentException("Abra o caixa antes de movimentar")); }
    private Supplier supplierForBranch(Long branchId, Long id) { Supplier value = suppliers.findById(id).orElseThrow(() -> new EntityNotFoundException("Fornecedor nao encontrado")); ensure(branchId, value.getBranchId()); return value; }
    private PurchaseOrder purchaseForBranch(Long branchId, Long id) { PurchaseOrder value = purchases.findById(id).orElseThrow(() -> new EntityNotFoundException("Compra nao encontrada")); ensure(branchId, value.getBranchId()); return value; }
    private InventoryItem inventoryForBranch(Long branchId, Long id) { InventoryItem value = inventory.findById(id).orElseThrow(() -> new EntityNotFoundException("Insumo nao encontrado")); ensure(branchId, value.getBranchId()); return value; }
    private DiningTable tableForBranch(Long branchId, Long id) { DiningTable value = tables.findById(id).orElseThrow(() -> new EntityNotFoundException("Mesa nao encontrada")); ensure(branchId, value.getBranchId()); return value; }
    private Reservation reservationForBranch(Long branchId, Long id) { Reservation value = reservations.findById(id).orElseThrow(() -> new EntityNotFoundException("Reserva nao encontrada")); ensure(branchId, value.getBranchId()); return value; }
    private Customer customerForBranch(Long branchId, Long id) { Customer value = customers.findById(id).orElseThrow(() -> new EntityNotFoundException("Cliente nao encontrado")); ensure(branchId, value.getBranchId()); return value; }
    private void ensure(Long expected, Long actual) { if (!Objects.equals(expected, actual)) throw new EntityNotFoundException("Registro nao encontrado nesta unidade"); }
    private boolean isCash(String method) { return method != null && method.toLowerCase(Locale.ROOT).contains("dinheiro"); }
    private BigDecimal nvl(BigDecimal value) { return value == null ? ZERO : value; }
    private String nvl(String value, String fallback) { return value == null || value.isBlank() ? fallback : value; }
    private BigDecimal percent(BigDecimal value, BigDecimal total) { return total.signum() == 0 ? ZERO : value.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP); }
    private long forecastDays(List<SaleOrder> sales) { return sales.stream().map(o -> o.getCreatedAt().toLocalDate()).distinct().count(); }
    private BusinessSettings defaults(Long branchId) { return BusinessSettings.builder().branchId(branchId).tradeName("Aurora Pizza Contemporanea")
            .serviceFeePercent(BigDecimal.TEN).minimumDeliveryOrder(new BigDecimal("35.00")).defaultDeliveryFee(new BigDecimal("8.00"))
            .averagePrepMinutes(35).maxDeliveryRadiusKm(8).pixKey("financeiro@aurorapizza.com.br").build(); }

    private static final class MenuAccumulator { private final String name; private int quantity; private BigDecimal revenue = ZERO; private BigDecimal cost = ZERO; private MenuAccumulator(String name) { this.name = name; } }
    public record PurchaseRequest(Long supplierId, LocalDate expectedDate, String notes, List<PurchaseItemRequest> items) { }
    public record PurchaseItemRequest(Long inventoryItemId, BigDecimal quantity, BigDecimal unitCost) { }
    public record ReservationRequest(Long tableId, Long customerId, String customerName, String phone, LocalDateTime reservedFor, Integer partySize, String notes) { }
    public record CashOpenRequest(BigDecimal openingAmount, String notes) { }
    public record CashMovementRequest(CashMovement.Type type, BigDecimal amount, String description, String paymentMethod) { }
    public record CashCloseRequest(BigDecimal countedAmount, String notes) { }
    public record LoyaltyRequest(LoyaltyTransaction.Type type, int points, String description) { }
}
