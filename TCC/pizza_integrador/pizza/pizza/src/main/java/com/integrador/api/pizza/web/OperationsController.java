package com.integrador.api.pizza.web;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.service.OperationsService;
import com.integrador.api.pizza.security.AppPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OperationsController {
    private final OperationsService service;

    @GetMapping("/health") public Map<String, String> health() { return Map.of("status", "UP", "service", "Aurora Pizza OS", "version", "2.0"); }
    @GetMapping("/dashboard") public Map<String, Object> dashboard(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.dashboard(branchId); }

    @GetMapping("/products") public List<Product> products(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.products(branchId); }
    @PostMapping("/products") @ResponseStatus(HttpStatus.CREATED) public Product product(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @Valid @RequestBody Product value) { return service.saveProduct(branchId, value); }
    @PutMapping("/products/{id}") public Product product(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @PathVariable Long id, @Valid @RequestBody Product value) { return service.updateProduct(branchId, id, value); }
    @GetMapping("/products/{id}/recipe") public List<RecipeComponent> recipe(@PathVariable Long id) { return service.recipe(id); }
    @PutMapping("/products/{id}/recipe") public List<RecipeComponent> recipe(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @PathVariable Long id, @RequestBody List<OperationsService.RecipeInput> values) { return service.saveRecipe(branchId, id, values); }

    @GetMapping("/customers") public List<Customer> customers(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.customers(branchId); }
    @PostMapping("/customers") @ResponseStatus(HttpStatus.CREATED) public Customer customer(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @Valid @RequestBody Customer value) { return service.saveCustomer(branchId, value); }

    @GetMapping("/tables") public List<DiningTable> tables(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.tables(branchId); }
    @PatchMapping("/tables/{id}/status") public DiningTable table(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @PathVariable Long id, @RequestBody StatusRequest<DiningTable.Status> body) { return service.updateTable(branchId, id, body.status()); }

    @GetMapping("/inventory") public List<InventoryItem> inventory(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.inventory(branchId); }
    @GetMapping("/inventory/movements") public List<StockMovement> stockMovements(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.stockMovements(branchId); }
    @PatchMapping("/inventory/{id}") public InventoryItem stock(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @PathVariable Long id, @RequestBody OperationsService.StockAdjustment body) { return service.adjustStock(branchId, id, body); }

    @GetMapping("/orders") public List<SaleOrder> orders(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.orders(branchId); }
    @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED) public SaleOrder order(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody OperationsService.CreateOrder body) { return service.createOrder(branchId, body); }
    @PatchMapping("/orders/{id}/status") public SaleOrder status(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @PathVariable Long id, @RequestBody StatusRequest<SaleOrder.Status> body,
                                                                   @AuthenticationPrincipal AppPrincipal principal) {
        if (principal.role() == AppUser.Role.DELIVERY && body.status() != SaleOrder.Status.DELIVERED) throw new AccessDeniedException("Entregador pode apenas confirmar entregas");
        if (principal.role() == AppUser.Role.KITCHEN && body.status() != SaleOrder.Status.PREPARING && body.status() != SaleOrder.Status.READY && body.status() != SaleOrder.Status.OUT_FOR_DELIVERY) throw new AccessDeniedException("Cozinha pode atualizar apenas etapas de produção");
        return service.updateOrderStatus(branchId, id, body.status());
    }
    @PostMapping("/coupons/validate") public OperationsService.CouponResult coupon(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody CouponRequest body) { return service.validateCoupon(branchId, body.code(), body.subtotal()); }
    @GetMapping("/coupons") public List<Coupon> coupons(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.coupons(branchId); }

    @GetMapping("/finance") public List<FinanceEntry> finance(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return service.finance(branchId); }
    @PostMapping("/finance") @ResponseStatus(HttpStatus.CREATED) public FinanceEntry finance(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody FinanceEntry value) { return service.saveFinance(branchId, value); }

    public record StatusRequest<T>(T status) { }
    public record CouponRequest(String code, BigDecimal subtotal) { }
}
