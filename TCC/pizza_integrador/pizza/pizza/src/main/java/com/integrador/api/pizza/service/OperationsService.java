package com.integrador.api.pizza.service;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OperationsService {
    private final ProductRepository products;
    private final CustomerRepository customers;
    private final DiningTableRepository tables;
    private final InventoryRepository inventory;
    private final SaleOrderRepository orders;
    private final FinanceRepository finance;

    public List<Product> products() { return products.findAll(); }
    public List<Customer> customers() { return customers.findAll(); }
    public List<DiningTable> tables() { return tables.findAll(); }
    public List<InventoryItem> inventory() { return inventory.findAll(); }
    public List<SaleOrder> orders() { return orders.findAllByOrderByCreatedAtDesc(); }
    public List<FinanceEntry> finance() { return finance.findAll(); }

    @Transactional
    public Product saveProduct(Product product) {
        product.setId(null);
        product.setActive(true);
        return products.save(product);
    }

    @Transactional
    public Customer saveCustomer(Customer customer) {
        customer.setId(null);
        customer.setCreatedAt(LocalDateTime.now());
        return customers.save(customer);
    }

    @Transactional
    public FinanceEntry saveFinance(FinanceEntry entry) {
        entry.setId(null);
        return finance.save(entry);
    }

    @Transactional
    public DiningTable updateTable(Long id, DiningTable.Status status) {
        DiningTable table = tables.findById(id).orElseThrow(() -> new EntityNotFoundException("Mesa nao encontrada"));
        table.setStatus(status);
        return tables.save(table);
    }

    @Transactional
    public InventoryItem adjustStock(Long id, BigDecimal quantity) {
        InventoryItem item = inventory.findById(id).orElseThrow(() -> new EntityNotFoundException("Insumo nao encontrado"));
        item.setQuantity(quantity.max(BigDecimal.ZERO));
        return inventory.save(item);
    }

    @Transactional
    public SaleOrder createOrder(CreateOrder command) {
        if (command.items() == null || command.items().isEmpty()) {
            throw new IllegalArgumentException("O pedido precisa de pelo menos um item");
        }
        List<SaleOrder.OrderLine> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (CreateOrderItem item : command.items()) {
            Product product = products.findById(item.productId())
                    .orElseThrow(() -> new EntityNotFoundException("Produto nao encontrado: " + item.productId()));
            int quantity = Math.max(1, item.quantity());
            lines.add(SaleOrder.OrderLine.builder().productId(product.getId()).productName(product.getName())
                    .quantity(quantity).unitPrice(product.getPrice()).build());
            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(quantity)));
        }
        String code = "A" + String.format("%04d", orders.count() + 1);
        SaleOrder order = SaleOrder.builder().code(code).status(SaleOrder.Status.RECEIVED)
                .type(command.type() == null ? SaleOrder.Type.DINE_IN : command.type())
                .tableNumber(command.tableNumber()).customerName(blankToDefault(command.customerName(), "Cliente avulso"))
                .paymentMethod(blankToDefault(command.paymentMethod(), "A definir"))
                .notes(command.notes()).total(total).items(lines).createdAt(LocalDateTime.now()).build();
        if (order.getType() == SaleOrder.Type.DINE_IN && order.getTableNumber() != null) {
            tables.findByNumber(order.getTableNumber()).ifPresent(table -> table.setStatus(DiningTable.Status.OCCUPIED));
        }
        return orders.save(order);
    }

    @Transactional
    public SaleOrder updateOrderStatus(Long id, SaleOrder.Status status) {
        SaleOrder order = orders.findById(id).orElseThrow(() -> new EntityNotFoundException("Pedido nao encontrado"));
        order.setStatus(status);
        if ((status == SaleOrder.Status.COMPLETED || status == SaleOrder.Status.CANCELED) && order.getTableNumber() != null) {
            tables.findByNumber(order.getTableNumber()).ifPresent(table -> table.setStatus(DiningTable.Status.CLEANING));
        }
        return orders.save(order);
    }

    public Map<String, Object> dashboard() {
        List<SaleOrder> allOrders = orders.findAll();
        LocalDate today = LocalDate.now();
        BigDecimal todayRevenue = sumOrders(allOrders.stream().filter(o -> o.getCreatedAt().toLocalDate().equals(today)).toList());
        BigDecimal monthRevenue = sumOrders(allOrders.stream().filter(o -> o.getCreatedAt().getMonth().equals(today.getMonth())).toList());
        long open = allOrders.stream().filter(o -> o.getStatus() != SaleOrder.Status.COMPLETED && o.getStatus() != SaleOrder.Status.CANCELED).count();
        long occupied = tables.findAll().stream().filter(t -> t.getStatus() == DiningTable.Status.OCCUPIED).count();
        long lowStock = inventory.findAll().stream().filter(i -> i.getQuantity().compareTo(i.getMinimumQuantity()) <= 0).count();
        List<Map<String, Object>> weekly = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            BigDecimal value = sumOrders(allOrders.stream().filter(o -> o.getCreatedAt().toLocalDate().equals(date)).toList());
            weekly.add(Map.of("label", date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("pt-BR")).replace(".", ""), "value", value));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("revenueToday", todayRevenue);
        result.put("revenueMonth", monthRevenue);
        result.put("openOrders", open);
        result.put("averageTicket", allOrders.isEmpty() ? BigDecimal.ZERO : monthRevenue.divide(BigDecimal.valueOf(allOrders.size()), 2, RoundingMode.HALF_UP));
        result.put("occupiedTables", occupied);
        result.put("availableTables", tables.count() - occupied);
        result.put("lowStock", lowStock);
        result.put("customers", customers.count());
        result.put("weeklyRevenue", weekly);
        result.put("channelMix", List.of(Map.of("label", "Salao", "value", 46), Map.of("label", "Delivery", "value", 38), Map.of("label", "Retirada", "value", 16)));
        result.put("generatedAt", LocalDateTime.now());
        return result;
    }

    private BigDecimal sumOrders(List<SaleOrder> source) {
        return source.stream().filter(o -> o.getStatus() != SaleOrder.Status.CANCELED)
                .map(SaleOrder::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    public record CreateOrder(SaleOrder.Type type, Integer tableNumber, String customerName,
                              String paymentMethod, String notes, List<CreateOrderItem> items) { }
    public record CreateOrderItem(Long productId, int quantity) { }
}
