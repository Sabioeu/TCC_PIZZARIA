package com.integrador.api.pizza.web;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.service.OperationsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OperationsController {
    private final OperationsService service;

    @GetMapping("/health") public Map<String, String> health() { return Map.of("status", "UP", "service", "Aurora Pizza OS"); }
    @GetMapping("/dashboard") public Map<String, Object> dashboard() { return service.dashboard(); }
    @GetMapping("/products") public List<Product> products() { return service.products(); }
    @PostMapping("/products") @ResponseStatus(HttpStatus.CREATED) public Product product(@Valid @RequestBody Product value) { return service.saveProduct(value); }
    @GetMapping("/customers") public List<Customer> customers() { return service.customers(); }
    @PostMapping("/customers") @ResponseStatus(HttpStatus.CREATED) public Customer customer(@Valid @RequestBody Customer value) { return service.saveCustomer(value); }
    @GetMapping("/tables") public List<DiningTable> tables() { return service.tables(); }
    @PatchMapping("/tables/{id}/status") public DiningTable table(@PathVariable Long id, @RequestBody StatusRequest<DiningTable.Status> body) { return service.updateTable(id, body.status()); }
    @GetMapping("/inventory") public List<InventoryItem> inventory() { return service.inventory(); }
    @PatchMapping("/inventory/{id}") public InventoryItem stock(@PathVariable Long id, @RequestBody QuantityRequest body) { return service.adjustStock(id, body.quantity()); }
    @GetMapping("/orders") public List<SaleOrder> orders() { return service.orders(); }
    @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED) public SaleOrder order(@RequestBody OperationsService.CreateOrder body) { return service.createOrder(body); }
    @PatchMapping("/orders/{id}/status") public SaleOrder status(@PathVariable Long id, @RequestBody StatusRequest<SaleOrder.Status> body) { return service.updateOrderStatus(id, body.status()); }
    @GetMapping("/finance") public List<FinanceEntry> finance() { return service.finance(); }
    @PostMapping("/finance") @ResponseStatus(HttpStatus.CREATED) public FinanceEntry finance(@RequestBody FinanceEntry value) { return service.saveFinance(value); }

    public record StatusRequest<T>(T status) { }
    public record QuantityRequest(BigDecimal quantity) { }
}
